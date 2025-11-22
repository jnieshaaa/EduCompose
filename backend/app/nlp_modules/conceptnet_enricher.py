"""
ConceptNet Knowledge Graph Enricher
Enriches knowledge graphs with semantic relationships from ConceptNet API.

ConceptNet is a semantic network that connects words and phrases to commonsense concepts.
This enricher adds relationships like IsA, UsedFor, RelatedTo, PartOf, Causes, etc.
"""
import logging
import time
from typing import Dict, List, Any, Optional, Set
import httpx
from urllib.parse import quote

logger = logging.getLogger(__name__)

# ConceptNet API endpoint
CONCEPTNET_API_URL = "http://api.conceptnet.io"

# Relations to fetch from ConceptNet
CONCEPTNET_RELATIONS = [
    "IsA",           # Type relationships (e.g., "dog" IsA "animal")
    "UsedFor",       # Purpose relationships (e.g., "hammer" UsedFor "building")
    "RelatedTo",     # General relatedness
    "PartOf",        # Part-whole relationships
    "Causes",        # Causal relationships
    "HasProperty",   # Property relationships
    "CapableOf",     # Capability relationships
    "LocatedNear",   # Spatial relationships
    "AtLocation",    # Location relationships
    "Synonym"        # Synonym relationships
]


class ConceptNetEnricher:
    """
    Enriches knowledge graphs with ConceptNet relationships.
    
    Fetches semantic relationships from ConceptNet API and adds them
    to the knowledge graph as new edges and potentially new nodes.
    """
    
    def __init__(self, 
                 api_url: str = CONCEPTNET_API_URL,
                 relations: List[str] = None,
                 max_edges_per_concept: int = 5,
                 min_weight: float = 0.5,
                 rate_limit_delay: float = 0.1):
        """
        Initialize ConceptNet enricher.
        
        Args:
            api_url: ConceptNet API URL (default: http://api.conceptnet.io)
            relations: List of relations to fetch (default: CONCEPTNET_RELATIONS)
            max_edges_per_concept: Maximum edges to add per concept (default: 5)
            min_weight: Minimum weight threshold for edges (default: 0.5)
            rate_limit_delay: Delay between API calls in seconds (default: 0.1)
        """
        self.api_url = api_url
        self.relations = relations or CONCEPTNET_RELATIONS
        self.max_edges_per_concept = max_edges_per_concept
        self.min_weight = min_weight
        self.rate_limit_delay = rate_limit_delay
        self._last_request_time = 0.0
        
        # Check if ConceptNet is available
        self._available = self._check_availability()
    
    def _check_availability(self) -> bool:
        """Check if ConceptNet API is available"""
        try:
            # Simple connectivity check
            response = httpx.get(f"{self.api_url}/c/en/test", timeout=5.0)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"ConceptNet API not available: {e}")
            return False
    
    def is_available(self) -> bool:
        """Check if ConceptNet enricher is available"""
        return self._available
    
    def _rate_limit(self):
        """Enforce rate limiting between API calls"""
        current_time = time.time()
        time_since_last = current_time - self._last_request_time
        if time_since_last < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - time_since_last)
        self._last_request_time = time.time()
    
    def _normalize_concept(self, concept: str) -> str:
        """
        Normalize concept text for ConceptNet API.
        
        ConceptNet uses /c/en/ prefix for English concepts.
        """
        # Convert to lowercase and replace spaces with underscores
        normalized = concept.lower().strip()
        normalized = normalized.replace(" ", "_")
        # Remove special characters (keep alphanumeric and underscore)
        normalized = "".join(c for c in normalized if c.isalnum() or c == "_")
        return normalized
    
    def _fetch_conceptnet_edges(self, concept: str) -> List[Dict[str, Any]]:
        """
        Fetch edges for a concept from ConceptNet API.
        
        Args:
            concept: Concept text to look up
            
        Returns:
            List of edge dictionaries with source, target, relation, weight
        """
        if not self._available:
            return []
        
        normalized = self._normalize_concept(concept)
        if not normalized:
            return []
        
        edges = []
        
        try:
            self._rate_limit()
            
            # Query ConceptNet API
            # Format: /c/en/{concept}?rel=/r/{relation}
            url = f"{self.api_url}/c/en/{normalized}"
            
            response = httpx.get(url, timeout=10.0)
            
            if response.status_code != 200:
                logger.debug(f"ConceptNet API returned {response.status_code} for {concept}")
                return []
            
            data = response.json()
            
            # Parse edges from ConceptNet response
            for edge in data.get("edges", []):
                relation = edge.get("rel", {}).get("label", "")
                weight = edge.get("weight", 0.0)
                
                # Filter by relation type and weight
                if relation in self.relations and weight >= self.min_weight:
                    start_node = edge.get("start", {}).get("label", "")
                    end_node = edge.get("end", {}).get("label", "")
                    
                    # Only include edges where start is our concept
                    if start_node.lower() == concept.lower():
                        edges.append({
                            "source": concept,
                            "target": end_node,
                            "relation": relation,
                            "weight": weight,
                            "source_lang": edge.get("start", {}).get("language", "en"),
                            "target_lang": edge.get("end", {}).get("language", "en")
                        })
            
            # Sort by weight and limit
            edges.sort(key=lambda x: x["weight"], reverse=True)
            edges = edges[:self.max_edges_per_concept]
            
        except httpx.TimeoutException:
            logger.warning(f"Timeout fetching ConceptNet data for {concept}")
        except httpx.RequestError as e:
            logger.warning(f"Request error fetching ConceptNet data for {concept}: {e}")
        except Exception as e:
            logger.error(f"Error fetching ConceptNet data for {concept}: {e}")
        
        return edges
    
    def enrich_concept(self, concept: str) -> List[Dict[str, Any]]:
        """
        Enrich a single concept with ConceptNet relationships.
        
        Args:
            concept: Concept text to enrich
            
        Returns:
            List of edge dictionaries to add to the graph
        """
        if not self._available:
            return []
        
        edges = self._fetch_conceptnet_edges(concept)
        
        logger.debug(f"Enriched concept '{concept}' with {len(edges)} ConceptNet edges")
        
        return edges
    
    def enrich_graph(self, 
                    graph: Any,  # NetworkX graph
                    concept_nodes: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Enrich a knowledge graph with ConceptNet relationships.
        
        Args:
            graph: NetworkX graph to enrich
            concept_nodes: List of concept node dictionaries (optional, will extract from graph if not provided)
            
        Returns:
            Dictionary with enrichment statistics
        """
        if not self._available:
            return {
                "status": "unavailable",
                "edges_added": 0,
                "nodes_added": 0,
                "concepts_enriched": 0
            }
        
        # Extract concept nodes from graph if not provided
        if concept_nodes is None:
            concept_nodes = []
            for node_id, node_data in graph.nodes(data=True):
                if node_data.get("type") == "Concept":
                    concept_nodes.append({
                        "id": node_id,
                        "label": node_data.get("label", str(node_id))
                    })
        
        edges_added = 0
        nodes_added = 0
        concepts_enriched = 0
        new_nodes = {}  # Track new nodes to add
        
        for concept_node in concept_nodes:
            concept_label = concept_node.get("label", "")
            if not concept_label:
                continue
            
            # Fetch ConceptNet edges
            cn_edges = self.enrich_concept(concept_label)
            
            if not cn_edges:
                continue
            
            concepts_enriched += 1
            concept_node_id = concept_node.get("id")
            
            # Add edges to graph
            for edge_data in cn_edges:
                target_label = edge_data["target"]
                relation = edge_data["relation"]
                weight = edge_data["weight"]
                
                # Find or create target node
                target_node_id = None
                
                # First, try to find existing node with same label
                for node_id, node_data in graph.nodes(data=True):
                    if node_data.get("label", "").lower() == target_label.lower():
                        target_node_id = node_id
                        break
                
                # If not found, create new node
                if target_node_id is None:
                    target_node_id = f"conceptnet_{target_label.lower().replace(' ', '_')}"
                    new_nodes[target_node_id] = {
                        "id": target_node_id,
                        "type": "Concept",
                        "label": target_label,
                        "source": "conceptnet",
                        "frequency": 1
                    }
                    nodes_added += 1
                
                # Add edge if both nodes exist
                if concept_node_id and target_node_id:
                    # Check if edge already exists
                    if not graph.has_edge(concept_node_id, target_node_id):
                        graph.add_edge(
                            concept_node_id,
                            target_node_id,
                            type=f"CONCEPTNET_{relation.upper()}",
                            weight=weight,
                            source="conceptnet",
                            confidence=weight
                        )
                        edges_added += 1
        
        # Add new nodes to graph
        for node_id, node_data in new_nodes.items():
            graph.add_node(node_id, **node_data)
        
        logger.info(
            f"ConceptNet enrichment: {concepts_enriched} concepts enriched, "
            f"{edges_added} edges added, {nodes_added} nodes added"
        )
        
        return {
            "status": "success",
            "edges_added": edges_added,
            "nodes_added": nodes_added,
            "concepts_enriched": concepts_enriched
        }


def get_conceptnet_enricher(**kwargs) -> Optional[ConceptNetEnricher]:
    """
    Factory function to get ConceptNet enricher if available.
    
    Returns:
        ConceptNetEnricher instance if available, None otherwise
    """
    enricher = ConceptNetEnricher(**kwargs)
    if enricher.is_available():
        return enricher
    return None

