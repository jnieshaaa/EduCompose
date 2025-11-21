"""
Knowledge Graph Accuracy Validator
Uses Neo4j knowledge graphs to validate and improve analysis accuracy
"""
import logging
from typing import Dict, List, Any, Optional
from collections import defaultdict

from .neo4j_exporter import Neo4jExporter

logger = logging.getLogger(__name__)


class KGAccuracyValidator:
    """
    Validates analysis accuracy using Neo4j knowledge graphs:
    1. Concept validation against known patterns
    2. Argument structure validation
    3. Coherence measurement using graph metrics
    4. Pattern comparison with high-scoring essays
    """
    
    def __init__(self):
        """Initialize KG accuracy validator"""
        self.exporter = Neo4jExporter()
    
    def validate_concepts(self, concepts: List[str], essay_id: str) -> Dict[str, Any]:
        """
        Validate concepts using knowledge graph patterns
        
        Args:
            concepts: List of extracted concept labels
            essay_id: Essay identifier
            
        Returns:
            Dictionary with validation results and confidence scores
        """
        if not concepts or not self.exporter.is_available():
            return {
                'validated_concepts': [],
                'accuracy_score': 0.0,
                'validated_count': 0
            }
        
        validated_concepts = []
        
        for concept in concepts:
            try:
                # Query for similar concepts in high-scoring essays
                query = """
                MATCH (c:Concept)
                WHERE toLower(c.label) CONTAINS toLower($concept)
                OPTIONAL MATCH (e:Essay {quality: 'high'})-[:CONTAINS]->(c)
                WITH c.label as concept, count(e) as high_score_count
                RETURN concept, high_score_count
                ORDER BY high_score_count DESC
                LIMIT 1
                """
                results = self.exporter.query(query, {"concept": concept})
                
                if results and results[0].get('high_score_count', 0) > 0:
                    validated_concepts.append({
                        'concept': concept,
                        'validated': True,
                        'confidence': min(1.0, results[0]['high_score_count'] / 10.0),
                        'pattern_match': True
                    })
                else:
                    # New concept - lower confidence
                    validated_concepts.append({
                        'concept': concept,
                        'validated': False,
                        'confidence': 0.3,
                        'pattern_match': False
                    })
            except Exception as e:
                logger.warning(f"Error validating concept {concept}: {e}")
                validated_concepts.append({
                    'concept': concept,
                    'validated': False,
                    'confidence': 0.2,
                    'pattern_match': False
                })
        
        # Calculate accuracy score
        if validated_concepts:
            accuracy_score = sum(c['confidence'] for c in validated_concepts) / len(validated_concepts)
            validated_count = sum(1 for c in validated_concepts if c['validated'])
        else:
            accuracy_score = 0.0
            validated_count = 0
        
        return {
            'validated_concepts': validated_concepts,
            'accuracy_score': accuracy_score,
            'validated_count': validated_count,
            'total_concepts': len(concepts)
        }
    
    def validate_argument_structure(self, claims: List[Dict], evidence_list: List[Dict], 
                                   essay_id: str) -> Dict[str, Any]:
        """
        Validate argument structure using graph patterns
        
        Args:
            claims: List of claim dictionaries
            evidence_list: List of evidence dictionaries
            essay_id: Essay identifier
            
        Returns:
            Dictionary with structure validation results
        """
        if not self.exporter.is_available():
            return {
                'structure_score': 0.5,
                'valid_relationships': 0,
                'total_claims': len(claims) if claims else 0
            }
        
        try:
            # Check claim-evidence relationships in Neo4j
            query = """
            MATCH (c:Claim {essay_id: $essay_id})
            OPTIONAL MATCH (c)<-[:SUPPORTS]-(e:Evidence {essay_id: $essay_id})
            WITH c, count(e) as evidence_count
            RETURN collect(evidence_count) as evidence_counts
            """
            results = self.exporter.query(query, {"essay_id": essay_id})
            
            evidence_counts = results[0].get('evidence_counts', []) if results else []
            
            # Good essays typically have 2-4 pieces of evidence per claim
            valid_relationships = 0
            total_claims = len(evidence_counts) if evidence_counts else len(claims) if claims else 0
            
            for count in evidence_counts:
                if 2 <= count <= 4:  # Optimal range
                    valid_relationships += 1
            
            # Calculate structure score
            if total_claims > 0:
                structure_score = valid_relationships / total_claims
            else:
                structure_score = 0.5  # Default if no claims
            
            return {
                'structure_score': structure_score,
                'valid_relationships': valid_relationships,
                'total_claims': total_claims,
                'evidence_counts': evidence_counts
            }
            
        except Exception as e:
            logger.warning(f"Error validating argument structure: {e}")
            return {
                'structure_score': 0.5,
                'valid_relationships': 0,
                'total_claims': len(claims) if claims else 0
            }
    
    def measure_coherence_with_kg(self, essay_id: str) -> Dict[str, Any]:
        """
        Measure coherence using graph connectivity metrics
        
        Args:
            essay_id: Essay identifier
            
        Returns:
            Dictionary with coherence metrics
        """
        if not self.exporter.is_available():
            return {
                'coherence_score': 0.5,
                'node_count': 0,
                'connectivity': 0.0
            }
        
        try:
            # Get graph connectivity metrics
            query = """
            MATCH (n:KGNode {essay_id: $essay_id})
            OPTIONAL MATCH path = shortestPath((n)-[*..5]-(m:KGNode {essay_id: $essay_id}))
            WHERE n <> m
            WITH count(DISTINCT n) as node_count, count(path) as path_count
            RETURN node_count, path_count,
                   CASE 
                       WHEN node_count > 1 THEN toFloat(path_count) / (node_count * (node_count - 1))
                       ELSE 0.0
                   END as connectivity
            """
            results = self.exporter.query(query, {"essay_id": essay_id})
            
            if results:
                node_count = results[0].get('node_count', 0)
                path_count = results[0].get('path_count', 0)
                connectivity = results[0].get('connectivity', 0.0)
                
                # Calculate coherence score (more connections = better)
                coherence_score = min(1.0, connectivity * 10) if connectivity else 0.0
                
                return {
                    'coherence_score': coherence_score,
                    'node_count': node_count,
                    'path_count': path_count,
                    'connectivity': connectivity
                }
            
            return {
                'coherence_score': 0.5,
                'node_count': 0,
                'connectivity': 0.0
            }
            
        except Exception as e:
            logger.warning(f"Error measuring coherence: {e}")
            return {
                'coherence_score': 0.5,
                'node_count': 0,
                'connectivity': 0.0
            }
    
    def compare_with_good_patterns(self, essay_id: str) -> float:
        """
        Compare essay structure with patterns from high-scoring essays
        
        Args:
            essay_id: Essay identifier
            
        Returns:
            Pattern similarity score (0-1)
        """
        if not self.exporter.is_available():
            return 0.5
        
        try:
            # Compare with high-scoring essays
            query = """
            MATCH (current:Essay {essay_id: $essay_id})
            OPTIONAL MATCH (current)-[:CONTAINS]->(c_claims:Claim)
            OPTIONAL MATCH (good:Essay {quality: 'high'})-[:CONTAINS]->(g_claims:Claim)
            WHERE good.essay_id <> $essay_id
            WITH 
                count(DISTINCT c_claims) as current_claims,
                avg(count(DISTINCT g_claims)) as good_claims_avg
            RETURN 
                CASE 
                    WHEN good_claims_avg > 0 
                    THEN 1.0 - abs(current_claims - good_claims_avg) / good_claims_avg
                    ELSE 0.5
                END as pattern_score
            """
            results = self.exporter.query(query, {"essay_id": essay_id})
            
            if results and results[0].get('pattern_score') is not None:
                pattern_score = max(0.0, min(1.0, results[0]['pattern_score']))
                return pattern_score
            
            return 0.5  # Default if no patterns available
            
        except Exception as e:
            logger.warning(f"Error comparing patterns: {e}")
            return 0.5
    
    def tag_high_quality_essay(self, essay_id: str, score: float, threshold: float = 80.0):
        """
        Tag high-scoring essays for pattern learning
        
        Args:
            essay_id: Essay identifier
            score: Essay score
            threshold: Score threshold for high quality (default: 80)
        """
        if not self.exporter.is_available() or score < threshold:
            return
        
        try:
            # Tag essay as high quality
            query = """
            MATCH (e:Essay {essay_id: $essay_id})
            SET e.quality = 'high'
            SET e.score = $score
            RETURN e
            """
            self.exporter.query(query, {"essay_id": essay_id, "score": score})
            logger.info(f"Tagged essay {essay_id} as high quality (score: {score})")
            
        except Exception as e:
            logger.warning(f"Error tagging essay: {e}")


def get_accuracy_validator() -> KGAccuracyValidator:
    """Get or create KG accuracy validator instance"""
    return KGAccuracyValidator()

