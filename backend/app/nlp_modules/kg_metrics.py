"""
Knowledge Graph Metrics Computation
Computes coherence, argument strength, and structure completeness metrics
"""
import networkx as nx
import numpy as np
from typing import Dict, List, Any, Optional, Set, Tuple
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class KGMetricsCalculator:
    """
    Computes various metrics from knowledge graphs:
    - Concept Graph Coherence
    - Argument Strength Score
    - Argument Structure Completeness
    - Concept Drift / Off-topic Detection
    - Centrality & Relevance
    """
    
    def __init__(self):
        """Initialize metrics calculator"""
        pass
    
    def compute_all_metrics(self, graph: nx.Graph, 
                           claims: List[Dict[str, Any]] = None,
                           concepts: List[Dict[str, Any]] = None,
                           prompt_concepts: List[str] = None) -> Dict[str, Any]:
        """
        Compute all KG-based metrics
        
        Args:
            graph: NetworkX graph representing the knowledge graph
            claims: List of claim nodes (optional, for argument metrics)
            concepts: List of concept nodes (optional, for concept metrics)
            prompt_concepts: Seed concepts from essay prompt (optional, for drift detection)
            
        Returns:
            Dictionary containing all computed metrics
        """
        metrics = {
            "concept_coherence": self.compute_concept_coherence(graph, concepts),
            "argument_strength": self.compute_argument_strength(graph, claims),
            "structure_completeness": self.compute_structure_completeness(graph, claims),
            "concept_drift": self.compute_concept_drift(graph, concepts, prompt_concepts),
            "centrality_metrics": self.compute_centrality_metrics(graph, concepts),
            "overall_score": 0.0
        }
        
        # Calculate overall score (weighted average)
        weights = {
            "coherence": 0.3,
            "argument_strength": 0.3,
            "structure_completeness": 0.2,
            "concept_drift": 0.1,
            "centrality": 0.1
        }
        
        metrics["overall_score"] = (
            metrics["concept_coherence"]["score"] * weights["coherence"] +
            metrics["argument_strength"]["overall_score"] * weights["argument_strength"] +
            metrics["structure_completeness"]["completeness_score"] * weights["structure_completeness"] +
            (100 - metrics["concept_drift"]["drift_score"]) * weights["concept_drift"] +
            metrics["centrality_metrics"]["relevance_score"] * weights["centrality"]
        )
        
        return metrics
    
    def compute_concept_coherence(self, graph: nx.Graph, 
                                  concepts: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Compute concept graph coherence metrics
        
        Metrics:
        - Connectedness: number of connected components
        - Average shortest path length (main claim → evidence concepts)
        - Isolated node detection
        """
        if graph.number_of_nodes() == 0:
            return {
                "score": 0.0,
                "connected_components": 0,
                "avg_path_length": 0.0,
                "isolated_nodes": [],
                "is_connected": False
            }
        
        # Find connected components
        components = list(nx.connected_components(graph))
        num_components = len(components)
        is_connected = num_components == 1
        
        # Calculate average shortest path length
        # Only for connected graphs or within largest component
        if is_connected:
            try:
                avg_path_length = nx.average_shortest_path_length(graph)
            except:
                avg_path_length = 0.0
        else:
            # Calculate for largest component
            largest_component = max(components, key=len)
            subgraph = graph.subgraph(largest_component)
            if subgraph.number_of_nodes() > 1:
                try:
                    avg_path_length = nx.average_shortest_path_length(subgraph)
                except:
                    avg_path_length = 0.0
            else:
                avg_path_length = 0.0
        
        # Find isolated nodes (degree 0)
        isolated_nodes = [node for node in graph.nodes() if graph.degree(node) == 0]
        
        # Calculate coherence score
        # Higher score = more connected, fewer isolated nodes
        if graph.number_of_nodes() == 0:
            score = 0.0
        elif graph.number_of_nodes() == 1:
            score = 50.0
        else:
            # Penalize disconnected components
            component_penalty = (num_components - 1) * 20
            # Penalize isolated nodes
            isolation_penalty = len(isolated_nodes) * 10
            # Reward connectivity (lower path length = better)
            path_bonus = max(0, 30 - avg_path_length * 5) if avg_path_length > 0 else 0
            
            score = max(0, 100 - component_penalty - isolation_penalty + path_bonus)
        
        return {
            "score": round(score, 2),
            "connected_components": num_components,
            "avg_path_length": round(avg_path_length, 2),
            "isolated_nodes": isolated_nodes[:10],  # Limit to 10
            "is_connected": is_connected,
            "largest_component_size": len(max(components, key=len)) if components else 0
        }
    
    def compute_argument_strength(self, graph: nx.Graph, 
                                 claims: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Compute argument strength score for each claim
        
        Formula: sum(confidence_of_supporting_evidence) × (1 - contradiction_score)
        """
        if not claims or graph.number_of_nodes() == 0:
            return {
                "overall_score": 0.0,
                "claim_scores": [],
                "avg_evidence_per_claim": 0.0,
                "contradiction_count": 0
            }
        
        claim_scores = []
        total_evidence = 0
        contradiction_count = 0
        
        for claim in claims:
            claim_id = claim.get("id") or claim.get("claim_id", "")
            claim_text = claim.get("text", claim.get("sentence", ""))
            
            if not claim_id or claim_id not in graph:
                continue
            
            # Find supporting evidence (SUPPORTS edges)
            supporting_edges = [
                e for e in graph.edges(claim_id, data=True)
                if e[2].get("type") == "SUPPORTS" or e[2].get("relation_type") == "SUPPORTS"
            ]
            
            # Count contradictions (CONTRADICTS edges)
            contradicting_edges = [
                e for e in graph.edges(claim_id, data=True)
                if e[2].get("type") == "CONTRADICTS" or e[2].get("relation_type") == "CONTRADICTS"
            ]
            
            # Calculate evidence confidence sum
            evidence_confidence_sum = sum(
                e[2].get("confidence", 0.5) for e in supporting_edges
            )
            
            # Calculate contradiction score (0-1)
            contradiction_score = min(1.0, len(contradicting_edges) * 0.3)
            
            # Calculate argument strength
            strength = evidence_confidence_sum * (1 - contradiction_score)
            
            claim_scores.append({
                "claim_id": claim_id,
                "claim": claim_text[:100],  # Truncate for display
                "strength": round(strength, 2),
                "evidence_count": len(supporting_edges),
                "contradiction_count": len(contradicting_edges),
                "avg_evidence_confidence": round(
                    evidence_confidence_sum / len(supporting_edges) if supporting_edges else 0, 2
                )
            })
            
            total_evidence += len(supporting_edges)
            contradiction_count += len(contradicting_edges)
        
        # Calculate overall argument strength
        if claim_scores:
            overall_score = sum(cs["strength"] for cs in claim_scores) / len(claim_scores)
            # Normalize to 0-100 scale
            overall_score = min(100, overall_score * 10)
        else:
            overall_score = 0.0
        
        avg_evidence = total_evidence / len(claims) if claims else 0.0
        
        return {
            "overall_score": round(overall_score, 2),
            "claim_scores": sorted(claim_scores, key=lambda x: x["strength"], reverse=True),
            "avg_evidence_per_claim": round(avg_evidence, 2),
            "contradiction_count": contradiction_count
        }
    
    def compute_structure_completeness(self, graph: nx.Graph,
                                      claims: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Check argument structure completeness
        
        - Claims with at least one SUPPORTS edge
        - Claims without evidence (flagged as weak)
        """
        if not claims or graph.number_of_nodes() == 0:
            return {
                "completeness_score": 0.0,
                "claims_with_evidence": 0,
                "claims_without_evidence": [],
                "total_claims": 0,
                "evidence_coverage": 0.0
            }
        
        claims_with_evidence = 0
        claims_without_evidence = []
        
        for claim in claims:
            claim_id = claim.get("id") or claim.get("claim_id", "")
            if not claim_id or claim_id not in graph:
                continue
            
            # Check for SUPPORTS edges
            supporting_edges = [
                e for e in graph.edges(claim_id, data=True)
                if e[2].get("type") == "SUPPORTS" or e[2].get("relation_type") == "SUPPORTS"
            ]
            
            if supporting_edges:
                claims_with_evidence += 1
            else:
                claims_without_evidence.append({
                    "claim_id": claim_id,
                    "claim": claim.get("text", claim.get("sentence", ""))[:100]
                })
        
        # Calculate completeness score
        total_claims = len(claims)
        if total_claims > 0:
            evidence_coverage = claims_with_evidence / total_claims
            completeness_score = evidence_coverage * 100
        else:
            evidence_coverage = 0.0
            completeness_score = 0.0
        
        return {
            "completeness_score": round(completeness_score, 2),
            "claims_with_evidence": claims_with_evidence,
            "claims_without_evidence": claims_without_evidence[:10],  # Limit to 10
            "total_claims": total_claims,
            "evidence_coverage": round(evidence_coverage, 2)
        }
    
    def compute_concept_drift(self, graph: nx.Graph,
                             concepts: List[Dict[str, Any]] = None,
                             prompt_concepts: List[str] = None) -> Dict[str, Any]:
        """
        Detect concept drift / off-topic content
        
        Compare essay concepts to prompt seed concepts
        Calculate semantic distance
        """
        if not concepts:
            return {
                "drift_score": 0.0,
                "on_topic_concepts": [],
                "off_topic_concepts": [],
                "topic_alignment": 0.0
            }
        
        essay_concept_texts = {c.get("text", c.get("label", "")).lower() for c in concepts}
        
        if not prompt_concepts:
            # No prompt concepts provided, can't compute drift
            return {
                "drift_score": 0.0,
                "on_topic_concepts": list(essay_concept_texts),
                "off_topic_concepts": [],
                "topic_alignment": 1.0,
                "note": "No prompt concepts provided for comparison"
            }
        
        prompt_concept_set = {c.lower() for c in prompt_concepts}
        
        # Simple keyword matching (can be enhanced with semantic similarity)
        on_topic = []
        off_topic = []
        
        for concept in concepts:
            concept_text = concept.get("text", concept.get("label", "")).lower()
            
            # Check exact match or substring match
            is_on_topic = any(
                prompt_concept in concept_text or concept_text in prompt_concept
                for prompt_concept in prompt_concept_set
            )
            
            if is_on_topic:
                on_topic.append(concept_text)
            else:
                off_topic.append(concept_text)
        
        # Calculate drift score (higher = more off-topic)
        total_concepts = len(essay_concept_texts)
        if total_concepts > 0:
            off_topic_ratio = len(off_topic) / total_concepts
            drift_score = off_topic_ratio * 100
            topic_alignment = (len(on_topic) / total_concepts) * 100
        else:
            drift_score = 0.0
            topic_alignment = 0.0
        
        return {
            "drift_score": round(drift_score, 2),
            "on_topic_concepts": on_topic[:20],
            "off_topic_concepts": off_topic[:20],
            "topic_alignment": round(topic_alignment, 2)
        }
    
    def compute_centrality_metrics(self, graph: nx.Graph,
                                   concepts: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Compute centrality metrics to identify key concepts
        
        - Degree centrality
        - Betweenness centrality
        - PageRank / Eigenvector centrality
        """
        if graph.number_of_nodes() == 0:
            return {
                "relevance_score": 0.0,
                "central_concepts": [],
                "peripheral_concepts": [],
                "centrality_distribution": {}
            }
        
        # Calculate various centrality measures
        degree_centrality = nx.degree_centrality(graph)
        
        # Betweenness centrality (can be slow for large graphs)
        try:
            betweenness_centrality = nx.betweenness_centrality(graph, k=min(100, graph.number_of_nodes()))
        except:
            betweenness_centrality = {}
        
        # PageRank
        try:
            pagerank = nx.pagerank(graph, max_iter=100)
        except:
            pagerank = {}
        
        # Combine centrality scores (normalized)
        combined_centrality = {}
        for node in graph.nodes():
            degree = degree_centrality.get(node, 0)
            betweenness = betweenness_centrality.get(node, 0)
            pr = pagerank.get(node, 0)
            
            # Weighted combination
            combined = (degree * 0.4 + betweenness * 0.3 + pr * 0.3)
            combined_centrality[node] = combined
        
        # Sort by centrality
        sorted_nodes = sorted(combined_centrality.items(), key=lambda x: x[1], reverse=True)
        
        # Identify central and peripheral concepts
        if sorted_nodes:
            top_n = min(10, len(sorted_nodes) // 3)
            central_concepts = [node for node, _ in sorted_nodes[:top_n]]
            peripheral_concepts = [node for node, _ in sorted_nodes[-top_n:]]
        else:
            central_concepts = []
            peripheral_concepts = []
        
        # Calculate relevance score (based on centrality distribution)
        if combined_centrality:
            avg_centrality = np.mean(list(combined_centrality.values()))
            # Higher average centrality = more focused essay
            relevance_score = min(100, avg_centrality * 200)
        else:
            relevance_score = 0.0
        
        return {
            "relevance_score": round(relevance_score, 2),
            "central_concepts": central_concepts[:10],
            "peripheral_concepts": peripheral_concepts[:10],
            "centrality_distribution": {
                "mean": round(np.mean(list(combined_centrality.values())), 3) if combined_centrality else 0,
                "std": round(np.std(list(combined_centrality.values())), 3) if combined_centrality else 0
            },
            "top_central_nodes": [
                {"node": node, "centrality": round(score, 3)}
                for node, score in sorted_nodes[:10]
            ]
        }

