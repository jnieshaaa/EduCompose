"""
Enhanced Knowledge Graph Builder
Builds knowledge graphs with proper schema, node types, and edge types
Integrates concept extraction, OpenIE, and argument mining
"""
import networkx as nx
from typing import Dict, List, Any, Optional, Set, Tuple
from collections import defaultdict, Counter
import logging

from .kg_schema import NodeType, EdgeType, KGSchema
from .openie_extractor import OpenIEExtractor
from .spacy_utils import load_spacy_model
from .kg_metrics import KGMetricsCalculator
from .conceptnet_enricher import ConceptNetEnricher, get_conceptnet_enricher
from .wordnet_enricher import WordNetEnricher, get_wordnet_enricher

logger = logging.getLogger(__name__)


class EnhancedKnowledgeGraphBuilder:
    """
    Enhanced knowledge graph builder that:
    1. Extracts concepts and propositions
    2. Identifies claims, evidence, warrants, rebuttals
    3. Builds structured KG with proper node/edge types
    4. Computes KG-based metrics
    """
    
    def __init__(self, enable_conceptnet: bool = True, enable_wordnet: bool = True):
        """
        Initialize enhanced KG builder
        
        Args:
            enable_conceptnet: Enable ConceptNet enrichment (default: True)
            enable_wordnet: Enable WordNet enrichment (default: True)
        """
        self.nlp = None
        self.openie_extractor = OpenIEExtractor()
        self.metrics_calculator = KGMetricsCalculator()
        
        # Initialize enrichers (lazy loading - only if available)
        self.conceptnet_enricher = None
        self.wordnet_enricher = None
        
        if enable_conceptnet:
            self.conceptnet_enricher = get_conceptnet_enricher()
            if self.conceptnet_enricher:
                logger.info("ConceptNet enricher enabled")
            else:
                logger.debug("ConceptNet enricher not available")
        
        if enable_wordnet:
            self.wordnet_enricher = get_wordnet_enricher()
            if self.wordnet_enricher:
                logger.info("WordNet enricher enabled")
            else:
                logger.debug("WordNet enricher not available")
    
    def _ensure_nlp_loaded(self):
        """Ensure spaCy is loaded (lazy loading)"""
        if self.nlp is None:
            self.nlp = load_spacy_model("en_core_web_lg")
    
    def build(self, text: str, 
              essay_id: str = None,
              prompt_concepts: List[str] = None,
              argument_analysis: Dict[str, Any] = None,
              enable_enrichment: bool = True) -> Dict[str, Any]:
        """
        Build enhanced knowledge graph from essay text
        
        Args:
            text: Essay content
            essay_id: Optional essay ID
            prompt_concepts: Seed concepts from prompt (for drift detection)
            argument_analysis: Pre-computed argument analysis (optional)
            enable_enrichment: Enable external knowledge enrichment (ConceptNet/WordNet) (default: True)
            
        Returns:
            Dictionary containing KG structure, nodes, edges, and metrics
        """
        if not text or len(text.strip()) < 50:
            return self._empty_result()
        
        self._ensure_nlp_loaded()
        
        # Initialize graph
        graph = nx.MultiDiGraph()  # Directed graph with multiple edges
        
        # Extract concepts
        concepts = self._extract_concepts_enhanced(text)
        
        # Extract propositions (OpenIE triples)
        triples = self.openie_extractor.extract_triples(text)
        
        # Extract claims, evidence, etc. (if not provided)
        if not argument_analysis:
            argument_analysis = self._extract_argument_components(text)
        
        # Build nodes
        nodes = self._build_nodes(essay_id, concepts, triples, argument_analysis)
        
        # Build edges
        edges = self._build_edges(nodes, triples, argument_analysis, text)
        
        # Add nodes and edges to graph
        for node in nodes.values():
            graph.add_node(node["id"], **node)
        
        for edge in edges:
            if edge["source"] in graph and edge["target"] in graph:
                graph.add_edge(
                    edge["source"],
                    edge["target"],
                    type=edge["relation_type"],
                    weight=edge.get("weight", 1.0),
                    confidence=edge.get("confidence", 1.0),
                    **edge.get("metadata", {})
                )
        
        # Enrich with external knowledge (ConceptNet and WordNet)
        enrichment_stats = {}
        if enable_enrichment:
            enrichment_stats = self._enrich_graph(graph, nodes)
        
        # Compute metrics
        claims = [n for n in nodes.values() if n["type"] == NodeType.CLAIM.value]
        concept_nodes = [n for n in nodes.values() if n["type"] == NodeType.CONCEPT.value]
        
        metrics = self.metrics_calculator.compute_all_metrics(
            graph, claims, concept_nodes, prompt_concepts
        )
        
        return {
            "graph": graph,
            "nodes": list(nodes.values()),
            "edges": edges,
            "concepts": concepts,
            "triples": triples,
            "metrics": metrics,
            "enrichment": enrichment_stats,
            "graph_structure": {
                "nodes": graph.number_of_nodes(),
                "edges": graph.number_of_edges(),
                "density": nx.density(graph) if graph.number_of_nodes() > 1 else 0.0,
                "is_connected": nx.is_weakly_connected(graph) if graph.number_of_nodes() > 0 else False
            }
        }
    
    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure"""
        return {
            "graph": nx.MultiDiGraph(),
            "nodes": [],
            "edges": [],
            "concepts": [],
            "triples": [],
            "metrics": {},
            "graph_structure": {}
        }
    
    def _extract_concepts_enhanced(self, text: str) -> List[Dict[str, Any]]:
        """Extract concepts with enhanced NLP"""
        if not self.nlp:
            return []
        
        doc = self.nlp(text)
        concepts = []
        
        # Extract noun phrases
        noun_phrases = []
        for chunk in doc.noun_chunks:
            if len(chunk.text.split()) <= 3 and len(chunk.text) > 4:
                noun_phrases.append(chunk.text.lower())
        
        # Extract named entities
        entities = []
        for ent in doc.ents:
            if ent.label_ in ["PERSON", "ORG", "GPE", "EVENT", "PRODUCT", "WORK_OF_ART"]:
                entities.append(ent.text.lower())
        
        # Extract important nouns
        important_nouns = []
        for token in doc:
            if (token.pos_ in ["NOUN", "PROPN"] and 
                not token.is_stop and 
                not token.is_punct and
                len(token.text) > 3):
                important_nouns.append(token.lemma_.lower())
        
        # Combine and count
        all_concepts = noun_phrases + entities + important_nouns
        concept_counts = Counter(all_concepts)
        
        # Create concept objects
        for concept_text, frequency in concept_counts.most_common(20):
            concepts.append({
                "text": concept_text,
                "lemma": concept_text,  # Simplified
                "canonical_form": concept_text,
                "frequency": frequency,
                "importance": frequency * len(concept_text.split())
            })
        
        return concepts
    
    def _extract_argument_components(self, text: str) -> Dict[str, Any]:
        """Extract argument components (simplified - can use ArgumentMiner)"""
        # This is a simplified version - in practice, use ArgumentMiner
        return {
            "claims": [],
            "grounds": [],
            "warrants": [],
            "rebuttals": []
        }
    
    def _build_nodes(self, essay_id: str,
                    concepts: List[Dict[str, Any]],
                    triples: List[Dict[str, Any]],
                    argument_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Build all nodes in the KG"""
        nodes = {}
        node_counter = {"concept": 0, "claim": 0, "evidence": 0}
        
        # Add essay node
        if essay_id:
            nodes["essay"] = {
                "id": "essay",
                "type": NodeType.ESSAY.value,
                "essay_id": essay_id,
                "metadata": {}
            }
        
        # Add concept nodes
        for concept in concepts:
            node_id = f"concept_{node_counter['concept']}"
            node_counter['concept'] += 1
            
            nodes[node_id] = {
                "id": node_id,
                "type": NodeType.CONCEPT.value,
                "label": concept["text"],
                "lemma": concept.get("lemma", concept["text"]),
                "canonical_form": concept.get("canonical_form", concept["text"]),
                "frequency": concept.get("frequency", 1),
                "importance": concept.get("importance", 0.0)
            }
        
        # Add claim nodes
        for idx, claim in enumerate(argument_analysis.get("claims", [])):
            node_id = f"claim_{node_counter['claim']}"
            node_counter['claim'] += 1
            
            nodes[node_id] = {
                "id": node_id,
                "type": NodeType.CLAIM.value,
                "text": claim.get("sentence", ""),
                "claim_id": node_id,
                "stance": "support",
                "sentence_index": claim.get("sentence_index", idx),
                "confidence": 0.7
            }
        
        # Add evidence nodes
        for idx, ground in enumerate(argument_analysis.get("grounds", [])):
            node_id = f"evidence_{node_counter['evidence']}"
            node_counter['evidence'] += 1
            
            nodes[node_id] = {
                "id": node_id,
                "type": NodeType.EVIDENCE.value,
                "text": ground.get("sentence", ""),
                "source_sentence": ground.get("sentence_index", idx),
                "confidence": 0.7,
                "evidence_type": "general"
            }
        
        return nodes
    
    def _build_edges(self, nodes: Dict[str, Any],
                    triples: List[Dict[str, Any]],
                    argument_analysis: Dict[str, Any],
                    text: str) -> List[Dict[str, Any]]:
        """Build edges/relationships in the KG"""
        edges = []
        edge_counter = 0
        
        # Map concepts to node IDs
        concept_to_node = {}
        for node_id, node in nodes.items():
            if node["type"] == NodeType.CONCEPT.value:
                concept_to_node[node["label"].lower()] = node_id
        
        # Add MENTIONS edges (essay → concepts)
        if "essay" in nodes:
            for node_id, node in nodes.items():
                if node["type"] == NodeType.CONCEPT.value:
                    edges.append({
                        "edge_id": f"edge_{edge_counter}",
                        "source": "essay",
                        "target": node_id,
                        "relation_type": EdgeType.MENTIONS.value,
                        "weight": node.get("frequency", 1),
                        "confidence": 1.0
                    })
                    edge_counter += 1
        
        # Add RELATED_TO edges (concept ↔ concept) from triples
        for triple in triples[:30]:  # Limit to top 30
            subj = triple["subject"].lower()
            obj = triple["object"].lower()
            
            subj_node = concept_to_node.get(subj)
            obj_node = concept_to_node.get(obj)
            
            if subj_node and obj_node:
                edges.append({
                    "edge_id": f"edge_{edge_counter}",
                    "source": subj_node,
                    "target": obj_node,
                    "relation_type": EdgeType.RELATED_TO.value,
                    "weight": triple.get("confidence", 0.5),
                    "confidence": triple.get("confidence", 0.5),
                    "metadata": {"predicate": triple["predicate"]}
                })
                edge_counter += 1
        
        # Add SUPPORTS edges (evidence → claim)
        claim_nodes = {n["id"]: n for n in nodes.values() if n["type"] == NodeType.CLAIM.value}
        evidence_nodes = {n["id"]: n for n in nodes.values() if n["type"] == NodeType.EVIDENCE.value}
        
        # Simple heuristic: connect evidence to nearest claim
        for ev_id, ev_node in evidence_nodes.items():
            ev_sent_idx = ev_node.get("source_sentence", 0)
            
            # Find closest claim
            closest_claim = None
            min_distance = float('inf')
            
            for claim_id, claim_node in claim_nodes.items():
                claim_sent_idx = claim_node.get("sentence_index", 0)
                distance = abs(ev_sent_idx - claim_sent_idx)
                
                if distance < min_distance:
                    min_distance = distance
                    closest_claim = claim_id
            
            if closest_claim and min_distance < 5:  # Within 5 sentences
                edges.append({
                    "edge_id": f"edge_{edge_counter}",
                    "source": ev_id,
                    "target": closest_claim,
                    "relation_type": EdgeType.SUPPORTS.value,
                    "weight": 1.0,
                    "confidence": max(0.5, 1.0 - min_distance * 0.1)
                })
                edge_counter += 1
        
        return edges
    
    def _enrich_graph(self, graph: nx.MultiDiGraph, nodes: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enrich knowledge graph with external knowledge (ConceptNet and WordNet).
        
        Args:
            graph: NetworkX graph to enrich
            nodes: Dictionary of nodes in the graph
            
        Returns:
            Dictionary with enrichment statistics
        """
        enrichment_stats = {
            "conceptnet": {"status": "disabled", "edges_added": 0, "nodes_added": 0},
            "wordnet": {"status": "disabled", "edges_added": 0, "nodes_added": 0}
        }
        
        # Extract concept nodes
        concept_nodes = [
            {"id": node_id, "label": node_data.get("label", "")}
            for node_id, node_data in nodes.items()
            if node_data.get("type") == NodeType.CONCEPT.value
        ]
        
        if not concept_nodes:
            logger.debug("No concept nodes found for enrichment")
            return enrichment_stats
        
        # Enrich with ConceptNet
        if self.conceptnet_enricher:
            try:
                cn_stats = self.conceptnet_enricher.enrich_graph(graph, concept_nodes)
                enrichment_stats["conceptnet"] = cn_stats
                logger.info(f"ConceptNet enrichment: {cn_stats.get('edges_added', 0)} edges, {cn_stats.get('nodes_added', 0)} nodes")
            except Exception as e:
                logger.error(f"Error during ConceptNet enrichment: {e}")
                enrichment_stats["conceptnet"] = {"status": "error", "error": str(e)}
        else:
            enrichment_stats["conceptnet"]["status"] = "unavailable"
        
        # Enrich with WordNet
        if self.wordnet_enricher:
            try:
                wn_stats = self.wordnet_enricher.enrich_graph(graph, concept_nodes)
                enrichment_stats["wordnet"] = wn_stats
                logger.info(f"WordNet enrichment: {wn_stats.get('edges_added', 0)} edges, {wn_stats.get('nodes_added', 0)} nodes")
            except Exception as e:
                logger.error(f"Error during WordNet enrichment: {e}")
                enrichment_stats["wordnet"] = {"status": "error", "error": str(e)}
        else:
            enrichment_stats["wordnet"]["status"] = "unavailable"
        
        return enrichment_stats

