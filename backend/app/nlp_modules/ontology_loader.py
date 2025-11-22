"""
Ontology Loader
Loads and integrates domain-specific ontologies for knowledge graph enrichment.

Supports:
- Loading ontologies from JSON/OWL files
- Integrating ontology concepts into knowledge graphs
- Domain-specific relationship discovery
"""
import logging
from typing import Dict, List, Any, Optional, Set
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class OntologyLoader:
    """
    Loads and manages domain-specific ontologies.
    
    Ontologies define:
    - Domain concepts and their properties
    - Relationships between concepts
    - Hierarchical structures (taxonomies)
    - Domain-specific rules
    """
    
    def __init__(self, ontology_path: str = None):
        """
        Initialize ontology loader.
        
        Args:
            ontology_path: Path to ontology file (JSON format)
        """
        self.ontology_path = ontology_path
        self.ontology = {}
        self.concepts = {}  # concept_id -> concept_data
        self.relationships = []  # List of relationships
        
        if ontology_path:
            self.load_ontology(ontology_path)
    
    def load_ontology(self, ontology_path: str) -> Dict[str, Any]:
        """
        Load ontology from JSON file.
        
        Expected JSON format:
        {
            "name": "Ontology Name",
            "domain": "science|history|literature|etc",
            "concepts": [
                {
                    "id": "concept_1",
                    "label": "Concept Name",
                    "type": "entity|process|property",
                    "definition": "Concept definition",
                    "aliases": ["alias1", "alias2"],
                    "properties": {"key": "value"}
                }
            ],
            "relationships": [
                {
                    "source": "concept_1",
                    "target": "concept_2",
                    "type": "SUBTYPE_OF|PART_OF|RELATED_TO",
                    "properties": {"key": "value"}
                }
            ]
        }
        
        Args:
            ontology_path: Path to ontology JSON file
            
        Returns:
            Loaded ontology dictionary
        """
        try:
            with open(ontology_path, 'r', encoding='utf-8') as f:
                self.ontology = json.load(f)
            
            self.ontology_path = ontology_path
            
            # Index concepts
            self.concepts = {}
            for concept in self.ontology.get("concepts", []):
                concept_id = concept.get("id") or concept.get("label", "").lower().replace(" ", "_")
                self.concepts[concept_id] = concept
            
            # Store relationships
            self.relationships = self.ontology.get("relationships", [])
            
            logger.info(
                f"Loaded ontology '{self.ontology.get('name', 'Unknown')}' "
                f"with {len(self.concepts)} concepts and {len(self.relationships)} relationships"
            )
            
            return self.ontology
            
        except FileNotFoundError:
            logger.error(f"Ontology file not found: {ontology_path}")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in ontology file {ontology_path}: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error loading ontology from {ontology_path}: {e}")
            return {}
    
    def find_concept(self, concept_label: str) -> Optional[Dict[str, Any]]:
        """
        Find a concept in the ontology by label or alias.
        
        Args:
            concept_label: Concept label to search for
            
        Returns:
            Concept dictionary if found, None otherwise
        """
        concept_label_lower = concept_label.lower().strip()
        
        # Search by exact label match
        for concept_id, concept in self.concepts.items():
            if concept.get("label", "").lower() == concept_label_lower:
                return concept
            
            # Search in aliases
            aliases = concept.get("aliases", [])
            for alias in aliases:
                if alias.lower() == concept_label_lower:
                    return concept
        
        return None
    
    def get_related_concepts(self, concept_label: str, relation_type: str = None) -> List[Dict[str, Any]]:
        """
        Get concepts related to a given concept.
        
        Args:
            concept_label: Concept to find relationships for
            relation_type: Optional filter by relation type
            
        Returns:
            List of related concepts
        """
        concept = self.find_concept(concept_label)
        if not concept:
            return []
        
        concept_id = concept.get("id") or concept.get("label", "").lower().replace(" ", "_")
        related = []
        
        for rel in self.relationships:
            # Check if this concept is source
            if rel.get("source") == concept_id:
                if relation_type is None or rel.get("type") == relation_type:
                    target_id = rel.get("target")
                    if target_id in self.concepts:
                        related.append({
                            "concept": self.concepts[target_id],
                            "relationship": rel
                        })
            
            # Check if this concept is target
            elif rel.get("target") == concept_id:
                if relation_type is None or rel.get("type") == relation_type:
                    source_id = rel.get("source")
                    if source_id in self.concepts:
                        related.append({
                            "concept": self.concepts[source_id],
                            "relationship": rel
                        })
        
        return related
    
    def enrich_graph_with_ontology(self,
                                   graph: Any,  # NetworkX graph
                                   concept_nodes: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Enrich knowledge graph with ontology relationships.
        
        Args:
            graph: NetworkX graph to enrich
            concept_nodes: List of concept nodes (optional, will extract from graph if not provided)
            
        Returns:
            Dictionary with enrichment statistics
        """
        if not self.concepts:
            logger.warning("No ontology loaded. Cannot enrich graph.")
            return {
                "status": "unavailable",
                "edges_added": 0,
                "nodes_added": 0,
                "concepts_matched": 0
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
        concepts_matched = 0
        new_nodes = {}
        
        for concept_node in concept_nodes:
            concept_label = concept_node.get("label", "")
            if not concept_label:
                continue
            
            # Find concept in ontology
            ontology_concept = self.find_concept(concept_label)
            if not ontology_concept:
                continue
            
            concepts_matched += 1
            concept_node_id = concept_node.get("id")
            
            # Get related concepts from ontology
            related = self.get_related_concepts(concept_label)
            
            for rel_data in related:
                related_concept = rel_data["concept"]
                relationship = rel_data["relationship"]
                
                target_label = related_concept.get("label", "")
                relation_type = relationship.get("type", "RELATED_TO")
                
                # Find or create target node
                target_node_id = None
                
                # First, try to find existing node
                for node_id, node_data in graph.nodes(data=True):
                    if node_data.get("label", "").lower() == target_label.lower():
                        target_node_id = node_id
                        break
                
                # If not found, create new node
                if target_node_id is None:
                    target_node_id = f"ontology_{target_label.lower().replace(' ', '_')}"
                    new_nodes[target_node_id] = {
                        "id": target_node_id,
                        "type": "Concept",
                        "label": target_label,
                        "source": "ontology",
                        "definition": related_concept.get("definition", ""),
                        "domain": self.ontology.get("domain", "general")
                    }
                    nodes_added += 1
                
                # Add edge
                if concept_node_id and target_node_id:
                    if not graph.has_edge(concept_node_id, target_node_id):
                        graph.add_edge(
                            concept_node_id,
                            target_node_id,
                            type=f"ONTOLOGY_{relation_type}",
                            weight=1.0,
                            source="ontology",
                            confidence=1.0
                        )
                        edges_added += 1
        
        # Add new nodes to graph
        for node_id, node_data in new_nodes.items():
            graph.add_node(node_id, **node_data)
        
        logger.info(
            f"Ontology enrichment: {concepts_matched} concepts matched, "
            f"{edges_added} edges added, {nodes_added} nodes added"
        )
        
        return {
            "status": "success",
            "edges_added": edges_added,
            "nodes_added": nodes_added,
            "concepts_matched": concepts_matched
        }
    
    def create_sample_ontology(self, domain: str = "science") -> Dict[str, Any]:
        """
        Create a sample ontology for testing/development.
        
        Args:
            domain: Domain for the sample ontology
            
        Returns:
            Sample ontology dictionary
        """
        if domain == "science":
            return {
                "name": "Science Education Ontology",
                "domain": "science",
                "concepts": [
                    {
                        "id": "hypothesis",
                        "label": "Hypothesis",
                        "type": "process",
                        "definition": "A proposed explanation for a phenomenon",
                        "aliases": ["proposal", "explanation"]
                    },
                    {
                        "id": "experiment",
                        "label": "Experiment",
                        "type": "process",
                        "definition": "A procedure to test a hypothesis",
                        "aliases": ["test", "trial"]
                    },
                    {
                        "id": "evidence",
                        "label": "Evidence",
                        "type": "entity",
                        "definition": "Data that supports or refutes a hypothesis",
                        "aliases": ["data", "proof"]
                    }
                ],
                "relationships": [
                    {
                        "source": "experiment",
                        "target": "hypothesis",
                        "type": "TESTS"
                    },
                    {
                        "source": "experiment",
                        "target": "evidence",
                        "type": "PRODUCES"
                    },
                    {
                        "source": "evidence",
                        "target": "hypothesis",
                        "type": "SUPPORTS"
                    }
                ]
            }
        
        return {
            "name": "Sample Ontology",
            "domain": domain,
            "concepts": [],
            "relationships": []
        }


def get_ontology_loader(ontology_path: str = None) -> OntologyLoader:
    """
    Factory function to get ontology loader.
    
    Args:
        ontology_path: Optional path to ontology file
        
    Returns:
        OntologyLoader instance
    """
    return OntologyLoader(ontology_path)

