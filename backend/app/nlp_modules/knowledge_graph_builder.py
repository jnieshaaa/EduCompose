"""
Knowledge Graph Builder Module
Extracts key concepts and builds semantic networks from essay text
"""
import re
import spacy
import networkx as nx
from typing import Dict, List, Any, Set, Tuple, Optional
from collections import defaultdict, Counter
import logging

logger = logging.getLogger(__name__)

class KnowledgeGraphBuilder:
    """Builds semantic networks (knowledge graphs) from essay text"""
    
    def __init__(self):
        """Initialize knowledge graph builder"""
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("spaCy English model not found. Please install: python -m spacy download en_core_web_sm")
            self.nlp = None
    
    def build(self, text: str) -> Dict[str, Any]:
        """
        Build knowledge graph from essay text
        
        Args:
            text: Essay content to analyze
            
        Returns:
            Dictionary containing knowledge graph structure, concepts, and analysis
        """
        results = {
            "concepts": [],
            "relationships": [],
            "graph_structure": {},
            "concept_coverage": {},
            "conceptual_gaps": [],
            "connectivity_score": 0.0,
            "depth_score": 0.0,
            "score": 0.0
        }
        
        if not text or len(text.strip()) < 50:
            return results
        
        # Extract key concepts
        concepts = self._extract_concepts(text)
        results["concepts"] = concepts
        
        # Build relationships between concepts
        relationships = self._extract_relationships(text, concepts)
        results["relationships"] = relationships
        
        # Build NetworkX graph
        graph = self._build_networkx_graph(concepts, relationships)
        results["graph_structure"] = self._analyze_graph_structure(graph)
        
        # Analyze concept coverage
        coverage = self._analyze_concept_coverage(concepts, text)
        results["concept_coverage"] = coverage
        
        # Identify conceptual gaps
        gaps = self._identify_conceptual_gaps(graph, concepts, relationships)
        results["conceptual_gaps"] = gaps
        
        # Calculate scores
        results["connectivity_score"] = self._calculate_connectivity_score(graph)
        results["depth_score"] = self._calculate_depth_score(concepts, relationships)
        results["score"] = (results["connectivity_score"] + results["depth_score"]) / 2
        
        return results
    
    def _extract_concepts(self, text: str) -> List[Dict[str, Any]]:
        """Extract key concepts from text using NLP"""
        concepts = []
        
        if not self.nlp:
            # Fallback: extract noun phrases
            words = text.split()
            # Simple extraction of capitalized words and common nouns
            for word in words:
                if word[0].isupper() and len(word) > 3:
                    concepts.append({
                        "text": word.lower(),
                        "frequency": 1,
                        "type": "proper_noun"
                    })
            return concepts
        
        doc = self.nlp(text)
        
        # Extract noun phrases and important entities
        noun_phrases = []
        for chunk in doc.noun_chunks:
            # Filter out very short phrases and common words
            if len(chunk.text.split()) <= 3 and len(chunk.text) > 4:
                noun_phrases.append(chunk.text.lower())
        
        # Extract named entities
        entities = []
        for ent in doc.ents:
            if ent.label_ in ["PERSON", "ORG", "GPE", "EVENT", "PRODUCT"]:
                entities.append(ent.text.lower())
        
        # Extract important nouns (not stop words)
        important_nouns = []
        for token in doc:
            if (token.pos_ in ["NOUN", "PROPN"] and 
                not token.is_stop and 
                not token.is_punct and
                len(token.text) > 3):
                important_nouns.append(token.lemma_.lower())
        
        # Combine and count frequencies
        all_concepts = noun_phrases + entities + important_nouns
        concept_counts = Counter(all_concepts)
        
        # Select top concepts (by frequency and importance)
        top_concepts = concept_counts.most_common(20)  # Top 20 concepts
        
        for concept_text, frequency in top_concepts:
            # Calculate importance (TF-IDF-like scoring)
            importance = frequency * len(concept_text.split())  # Longer phrases might be more important
            
            concepts.append({
                "text": concept_text,
                "frequency": frequency,
                "importance": importance,
                "type": "concept"
            })
        
        # Sort by importance
        concepts.sort(key=lambda x: x["importance"], reverse=True)
        
        return concepts[:15]  # Return top 15 concepts
    
    def _extract_relationships(self, text: str, concepts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract relationships between concepts"""
        relationships = []
        
        if not self.nlp or not concepts:
            return relationships
        
        # Create concept set for quick lookup
        concept_texts = {c["text"].lower() for c in concepts}
        
        doc = self.nlp(text)
        sentences = [sent.text for sent in doc.sents]
        
        # Find co-occurrences of concepts in same sentences
        for i, sentence in enumerate(sentences):
            sentence_lower = sentence.lower()
            sentence_concepts = [c for c in concepts if c["text"] in sentence_lower]
            
            # Create relationships between concepts in same sentence
            for j, concept1 in enumerate(sentence_concepts):
                for concept2 in sentence_concepts[j+1:]:
                    # Check if relationship already exists
                    existing = next(
                        (r for r in relationships 
                         if ((r["source"] == concept1["text"] and r["target"] == concept2["text"]) or
                             (r["source"] == concept2["text"] and r["target"] == concept1["text"]))),
                        None
                    )
                    
                    if existing:
                        existing["weight"] += 1
                        existing["sentences"].append(i)
                    else:
                        # Determine relationship type based on sentence structure
                        rel_type = self._determine_relationship_type(sentence, concept1["text"], concept2["text"])
                        
                        relationships.append({
                            "source": concept1["text"],
                            "target": concept2["text"],
                            "type": rel_type,
                            "weight": 1,
                            "sentences": [i]
                        })
        
        # Sort by weight (strength of relationship)
        relationships.sort(key=lambda x: x["weight"], reverse=True)
        
        return relationships[:30]  # Return top 30 relationships
    
    def _determine_relationship_type(self, sentence: str, concept1: str, concept2: str) -> str:
        """Determine type of relationship between concepts"""
        sentence_lower = sentence.lower()
        
        # Check for explicit relationship indicators
        if any(word in sentence_lower for word in ["causes", "leads to", "results in", "creates"]):
            return "causes"
        elif any(word in sentence_lower for word in ["is", "are", "refers to", "means"]):
            return "defines"
        elif any(word in sentence_lower for word in ["includes", "contains", "consists of", "has"]):
            return "contains"
        elif any(word in sentence_lower for word in ["related to", "connected to", "associated with"]):
            return "related"
        elif any(word in sentence_lower for word in ["opposes", "contrasts", "differs from"]):
            return "opposes"
        else:
            return "related"  # Default relationship type
    
    def _build_networkx_graph(self, concepts: List[Dict[str, Any]], 
                             relationships: List[Dict[str, Any]]) -> nx.Graph:
        """Build NetworkX graph from concepts and relationships"""
        G = nx.Graph()
        
        # Add nodes (concepts)
        for concept in concepts:
            G.add_node(concept["text"], 
                      frequency=concept["frequency"],
                      importance=concept.get("importance", 0))
        
        # Add edges (relationships)
        for rel in relationships:
            if G.has_node(rel["source"]) and G.has_node(rel["target"]):
                G.add_edge(rel["source"], rel["target"],
                          weight=rel["weight"],
                          type=rel["type"],
                          sentences=rel.get("sentences", []))
        
        return G
    
    def _analyze_graph_structure(self, graph: nx.Graph) -> Dict[str, Any]:
        """Analyze graph structure metrics"""
        if graph.number_of_nodes() == 0:
            return {
                "nodes": 0,
                "edges": 0,
                "density": 0.0,
                "clusters": 0,
                "avg_clustering": 0.0
            }
        
        return {
            "nodes": graph.number_of_nodes(),
            "edges": graph.number_of_edges(),
            "density": nx.density(graph),
            "clusters": len(list(nx.connected_components(graph))),
            "avg_clustering": nx.average_clustering(graph),
            "is_connected": nx.is_connected(graph)
        }
    
    def _analyze_concept_coverage(self, concepts: List[Dict[str, Any]], text: str) -> Dict[str, Any]:
        """Analyze how well concepts are covered in the text"""
        if not concepts:
            return {"coverage_score": 0.0, "concept_distribution": {}}
        
        total_words = len(text.split())
        concept_distribution = {}
        
        for concept in concepts:
            concept_text = concept["text"]
            # Count occurrences
            occurrences = len(re.findall(r'\b' + re.escape(concept_text) + r'\b', text.lower()))
            concept_distribution[concept_text] = {
                "frequency": occurrences,
                "coverage": occurrences / total_words if total_words > 0 else 0
            }
        
        # Calculate overall coverage score
        avg_frequency = sum(c["frequency"] for c in concepts) / len(concepts) if concepts else 0
        coverage_score = min(100, (avg_frequency / 5) * 100)  # Normalize to 0-100
        
        return {
            "coverage_score": round(coverage_score, 2),
            "concept_distribution": concept_distribution
        }
    
    def _identify_conceptual_gaps(self, graph: nx.Graph, concepts: List[Dict[str, Any]],
                                  relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify gaps in conceptual connections"""
        gaps = []
        
        if graph.number_of_nodes() == 0:
            return gaps
        
        # Check for isolated concepts (no connections)
        isolated = [node for node in graph.nodes() if graph.degree(node) == 0]
        if isolated:
            gaps.append({
                "type": "isolated_concepts",
                "severity": "medium",
                "message": f"Found {len(isolated)} isolated concept(s) with no connections",
                "concepts": isolated[:5],  # Limit to 5
                "suggestion": "Connect these concepts to other ideas in your essay to improve coherence."
            })
        
        # Check for disconnected clusters
        clusters = list(nx.connected_components(graph))
        if len(clusters) > 1:
            gaps.append({
                "type": "disconnected_clusters",
                "severity": "medium",
                "message": f"Essay contains {len(clusters)} disconnected concept clusters",
                "suggestion": "Improve connections between different parts of your essay to create a more unified argument."
            })
        
        # Check for low connectivity
        if graph.number_of_nodes() > 1:
            density = nx.density(graph)
            if density < 0.2:
                gaps.append({
                    "type": "low_connectivity",
                    "severity": "low",
                    "message": "Low connectivity between concepts",
                    "suggestion": "Strengthen relationships between concepts by using more explicit connections and transitions."
                })
        
        return gaps
    
    def _calculate_connectivity_score(self, graph: nx.Graph) -> float:
        """Calculate score based on graph connectivity"""
        if graph.number_of_nodes() == 0:
            return 0.0
        
        if graph.number_of_nodes() == 1:
            return 50.0
        
        # Calculate density (0-1 scale)
        density = nx.density(graph)
        
        # Check connectivity
        if nx.is_connected(graph):
            connectivity_bonus = 20.0
        else:
            connectivity_bonus = 0.0
        
        # Calculate score
        score = (density * 80) + connectivity_bonus
        
        return min(100.0, round(score, 2))
    
    def _calculate_depth_score(self, concepts: List[Dict[str, Any]], 
                              relationships: List[Dict[str, Any]]) -> float:
        """Calculate score based on concept depth and relationship quality"""
        if not concepts:
            return 0.0
        
        # Score based on number of concepts
        concept_score = min(50, len(concepts) * 3)
        
        # Score based on relationships per concept
        if concepts:
            rels_per_concept = len(relationships) / len(concepts)
            relationship_score = min(50, rels_per_concept * 10)
        else:
            relationship_score = 0.0
        
        return round(concept_score + relationship_score, 2)

