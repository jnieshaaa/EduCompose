"""
WordNet Knowledge Graph Enricher
Enriches knowledge graphs with lexical relationships from WordNet.

WordNet is a lexical database that groups words into sets of synonyms (synsets)
and provides relationships like hypernyms, hyponyms, meronyms, etc.
"""
import logging
from typing import Dict, List, Any, Optional, Set
from collections import defaultdict

logger = logging.getLogger(__name__)

# Try to import NLTK WordNet
_wordnet_available = None
try:
    from nltk.corpus import wordnet as wn
    from nltk import download as nltk_download
    import nltk
    
    # Try to download WordNet if not available
    try:
        wn.synsets('test')
        _wordnet_available = True
    except LookupError:
        try:
            nltk_download('wordnet', quiet=True)
            nltk_download('omw-1.4', quiet=True)  # Open Multilingual Wordnet
            wn.synsets('test')
            _wordnet_available = True
            logger.info("WordNet downloaded successfully")
        except Exception as e:
            logger.warning(f"Could not download WordNet: {e}")
            _wordnet_available = False
except ImportError:
    _wordnet_available = False
    logger.warning("NLTK not available. Install with: pip install nltk")


class WordNetEnricher:
    """
    Enriches knowledge graphs with WordNet relationships.
    
    Adds lexical relationships like hypernyms, hyponyms, synonyms,
    meronyms, holonyms, etc. from WordNet.
    """
    
    def __init__(self,
                 max_synonyms: int = 3,
                 max_hypernyms: int = 2,
                 max_hyponyms: int = 3,
                 include_meronyms: bool = True,
                 include_holonyms: bool = True):
        """
        Initialize WordNet enricher.
        
        Args:
            max_synonyms: Maximum synonym relationships to add (default: 3)
            max_hypernyms: Maximum hypernym (more general) relationships (default: 2)
            max_hyponyms: Maximum hyponym (more specific) relationships (default: 3)
            include_meronyms: Include part-whole relationships (default: True)
            include_holonyms: Include whole-part relationships (default: True)
        """
        self.max_synonyms = max_synonyms
        self.max_hypernyms = max_hypernyms
        self.max_hyponyms = max_hyponyms
        self.include_meronyms = include_meronyms
        self.include_holonyms = include_holonyms
        self._available = _wordnet_available is True
    
    def is_available(self) -> bool:
        """Check if WordNet enricher is available"""
        return self._available
    
    def _get_synsets(self, word: str) -> List:
        """
        Get WordNet synsets for a word.
        
        Args:
            word: Word to look up
            
        Returns:
            List of synsets
        """
        if not self._available:
            return []
        
        try:
            # Try exact match first
            synsets = wn.synsets(word.lower())
            
            # If no synsets found, try with underscores (for multi-word)
            if not synsets:
                synsets = wn.synsets(word.lower().replace(" ", "_"))
            
            return synsets
        except Exception as e:
            logger.debug(f"Error getting synsets for '{word}': {e}")
            return []
    
    def _extract_word_from_concept(self, concept: str) -> str:
        """
        Extract the main word from a concept phrase.
        
        Args:
            concept: Concept phrase (e.g., "renewable energy" -> "energy")
            
        Returns:
            Main word to look up in WordNet
        """
        # For multi-word concepts, try the last word first (often the head noun)
        words = concept.lower().split()
        if len(words) > 1:
            # Try last word (head noun)
            return words[-1]
        return concept.lower()
    
    def enrich_concept(self, concept: str) -> List[Dict[str, Any]]:
        """
        Enrich a single concept with WordNet relationships.
        
        Args:
            concept: Concept text to enrich
            
        Returns:
            List of edge dictionaries to add to the graph
        """
        if not self._available:
            return []
        
        edges = []
        main_word = self._extract_word_from_concept(concept)
        synsets = self._get_synsets(main_word)
        
        if not synsets:
            return []
        
        # Use the first (most common) synset
        primary_synset = synsets[0]
        
        # 1. Synonyms
        synonyms = set()
        for synset in synsets[:3]:  # Check first 3 synsets
            for lemma in synset.lemmas():
                synonym = lemma.name().replace("_", " ")
                if synonym.lower() != concept.lower() and synonym.lower() != main_word.lower():
                    synonyms.add(synonym)
                    if len(synonyms) >= self.max_synonyms:
                        break
            if len(synonyms) >= self.max_synonyms:
                break
        
        for synonym in list(synonyms)[:self.max_synonyms]:
            edges.append({
                "source": concept,
                "target": synonym,
                "relation": "SYNONYM",
                "weight": 0.9,
                "source": "wordnet"
            })
        
        # 2. Hypernyms (more general concepts)
        hypernyms = primary_synset.hypernyms()
        for hypernym in hypernyms[:self.max_hypernyms]:
            hypernym_name = hypernym.lemmas()[0].name().replace("_", " ")
            edges.append({
                "source": concept,
                "target": hypernym_name,
                "relation": "HYPERNYM",
                "weight": 0.8,
                "source": "wordnet"
            })
        
        # 3. Hyponyms (more specific concepts)
        hyponyms = primary_synset.hyponyms()
        for hyponym in hyponyms[:self.max_hyponyms]:
            hyponym_name = hyponym.lemmas()[0].name().replace("_", " ")
            edges.append({
                "source": concept,
                "target": hyponym_name,
                "relation": "HYPONYM",
                "weight": 0.8,
                "source": "wordnet"
            })
        
        # 4. Meronyms (part-of relationships)
        if self.include_meronyms:
            meronyms = primary_synset.part_meronyms() + primary_synset.substance_meronyms() + primary_synset.member_meronyms()
            for meronym in meronyms[:2]:  # Limit to 2
                meronym_name = meronym.lemmas()[0].name().replace("_", " ")
                edges.append({
                    "source": concept,
                    "target": meronym_name,
                    "relation": "MERONYM",
                    "weight": 0.7,
                    "source": "wordnet"
                })
        
        # 5. Holonyms (whole-of relationships)
        if self.include_holonyms:
            holonyms = primary_synset.part_holonyms() + primary_synset.substance_holonyms() + primary_synset.member_holonyms()
            for holonym in holonyms[:2]:  # Limit to 2
                holonym_name = holonym.lemmas()[0].name().replace("_", " ")
                edges.append({
                    "source": concept,
                    "target": holonym_name,
                    "relation": "HOLONYM",
                    "weight": 0.7,
                    "source": "wordnet"
                })
        
        logger.debug(f"Enriched concept '{concept}' with {len(edges)} WordNet edges")
        
        return edges
    
    def enrich_graph(self,
                    graph: Any,  # NetworkX graph
                    concept_nodes: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Enrich a knowledge graph with WordNet relationships.
        
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
            
            # Fetch WordNet edges
            wn_edges = self.enrich_concept(concept_label)
            
            if not wn_edges:
                continue
            
            concepts_enriched += 1
            concept_node_id = concept_node.get("id")
            
            # Add edges to graph
            for edge_data in wn_edges:
                target_label = edge_data["target"]
                relation = edge_data["relation"]
                weight = edge_data.get("weight", 0.7)
                
                # Find or create target node
                target_node_id = None
                
                # First, try to find existing node with same label
                for node_id, node_data in graph.nodes(data=True):
                    if node_data.get("label", "").lower() == target_label.lower():
                        target_node_id = node_id
                        break
                
                # If not found, create new node
                if target_node_id is None:
                    target_node_id = f"wordnet_{target_label.lower().replace(' ', '_').replace('-', '_')}"
                    new_nodes[target_node_id] = {
                        "id": target_node_id,
                        "type": "Concept",
                        "label": target_label,
                        "source": "wordnet",
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
                            type=f"WORDNET_{relation}",
                            weight=weight,
                            source="wordnet",
                            confidence=weight
                        )
                        edges_added += 1
        
        # Add new nodes to graph
        for node_id, node_data in new_nodes.items():
            graph.add_node(node_id, **node_data)
        
        logger.info(
            f"WordNet enrichment: {concepts_enriched} concepts enriched, "
            f"{edges_added} edges added, {nodes_added} nodes added"
        )
        
        return {
            "status": "success",
            "edges_added": edges_added,
            "nodes_added": nodes_added,
            "concepts_enriched": concepts_enriched
        }


def get_wordnet_enricher(**kwargs) -> Optional[WordNetEnricher]:
    """
    Factory function to get WordNet enricher if available.
    
    Returns:
        WordNetEnricher instance if available, None otherwise
    """
    enricher = WordNetEnricher(**kwargs)
    if enricher.is_available():
        return enricher
    return None

