"""
Rubric Scoring Service
Maps essay analysis results to rubric criteria and calculates rubric-based scores
"""
import logging
from typing import Dict, List, Any, Optional
import json

logger = logging.getLogger(__name__)

class RubricScoringService:
    """
    Service to apply rubrics to essay analysis results
    Maps analysis dimensions to rubric criteria and calculates scores
    """
    
    def __init__(self):
        pass
    
    def score_with_rubric(
        self, 
        rubric_data: Dict[str, Any], 
        analysis_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Score an essay based on rubric criteria using analysis results
        
        Args:
            rubric_data: Rubric data from database (with criteria array)
            analysis_results: Full analysis results from essay_analysis_service
        
        Returns:
            Dictionary with rubric scores, criterion scores, and feedback
        """
        criteria = rubric_data.get("criteria", [])
        if not criteria or not isinstance(criteria, list):
            logger.warning("Rubric has no criteria or invalid format")
            return {
                "error": "Invalid rubric: no criteria found",
                "rubric_scores": {},
                "criterion_scores": []
            }
        
        criterion_scores = []
        total_points = 0
        max_points = 0
        
        for criterion in criteria:
            criterion_id = criterion.get("id")
            criterion_title = criterion.get("title", "Unknown")
            score_levels = criterion.get("scores", [])
            
            if not score_levels:
                continue
            
            # Map analysis results to this criterion
            criterion_score = self._score_criterion(
                criterion_title,
                criterion,
                analysis_results
            )
            
            # Find the best matching score level
            best_match = self._find_best_score_level(
                criterion_score,
                score_levels
            )
            
            points_earned = best_match.get("points", 0)
            max_criterion_points = max((s.get("points", 0) for s in score_levels), default=4)
            
            total_points += points_earned
            max_points += max_criterion_points
            
            criterion_scores.append({
                "criterion_id": criterion_id,
                "criterion_title": criterion_title,
                "points_earned": points_earned,
                "max_points": max_criterion_points,
                "score_level": best_match.get("title", ""),
                "score_level_description": best_match.get("description", ""),
                "analysis_score": criterion_score,
                "feedback": self._generate_criterion_feedback(
                    criterion_title,
                    criterion_score,
                    best_match,
                    analysis_results
                )
            })
        
        # Calculate overall rubric score (percentage)
        rubric_percentage = (total_points / max_points * 100) if max_points > 0 else 0
        
        return {
            "rubric_id": rubric_data.get("id"),
            "rubric_name": rubric_data.get("name", "Unknown Rubric"),
            "total_points": total_points,
            "max_points": max_points,
            "rubric_score": round(rubric_percentage, 2),
            "criterion_scores": criterion_scores,
            "rubric_applied": True
        }
    
    def _score_criterion(
        self,
        criterion_title: str,
        criterion: Dict[str, Any],
        analysis_results: Dict[str, Any]
    ) -> float:
        """
        Map analysis results to a score for a specific criterion
        
        Returns a score from 0-100 that can be mapped to rubric score levels
        """
        # Normalize criterion title for matching
        title_lower = criterion_title.lower()
        
        # Get analysis scores
        scores = analysis_results.get("scores", {})
        detailed = analysis_results.get("detailed_analysis", {})
        
        # Map common criterion titles to analysis dimensions
        if "thesis" in title_lower or "focus" in title_lower:
            # Thesis & Focus -> Argument strength + coherence
            arg_score = scores.get("argument_strength", 0)
            coherence_score = scores.get("coherence", 0)
            return (arg_score * 0.6 + coherence_score * 0.4)
        
        elif "evidence" in title_lower or "support" in title_lower:
            # Evidence & Support -> Argument evidence score
            arg_analysis = detailed.get("argumentation", {})
            evidence_score = arg_analysis.get("evidence_score", 0)
            arg_score = scores.get("argument_strength", 0)
            return (evidence_score * 0.7 + arg_score * 0.3)
        
        elif "organization" in title_lower or "structure" in title_lower:
            # Organization -> Coherence score
            coherence_score = scores.get("coherence", 0)
            coherence_analysis = detailed.get("coherence", {})
            structure_score = coherence_analysis.get("structure_analysis", {})
            # Boost if has intro/body/conclusion
            structure_bonus = 0
            if structure_score.get("has_introduction") and \
               structure_score.get("has_body") and \
               structure_score.get("has_conclusion"):
                structure_bonus = 10
            return min(100, coherence_score + structure_bonus)
        
        elif "grammar" in title_lower or "mechanics" in title_lower:
            # Grammar & Mechanics -> Grammar score
            grammar_score = scores.get("grammar", 0)
            grammar_analysis = detailed.get("grammar", {})
            error_count = grammar_analysis.get("error_count", 0)
            # Penalize based on error count
            error_penalty = min(20, error_count * 2)
            return max(0, grammar_score - error_penalty)
        
        elif "critical" in title_lower or "analysis" in title_lower:
            # Critical Analysis -> Argument strength + knowledge graph
            arg_score = scores.get("argument_strength", 0)
            kg_score = scores.get("knowledge_graph", 0)
            return (arg_score * 0.7 + kg_score * 0.3)
        
        elif "argument" in title_lower or "development" in title_lower:
            # Argument Development -> Argument strength
            return scores.get("argument_strength", 0)
        
        elif "research" in title_lower or "integration" in title_lower:
            # Research Integration -> Knowledge graph + argument evidence
            kg_score = scores.get("knowledge_graph", 0)
            arg_analysis = detailed.get("argumentation", {})
            evidence_score = arg_analysis.get("evidence_score", 0)
            return (kg_score * 0.5 + evidence_score * 0.5)
        
        elif "style" in title_lower or "voice" in title_lower:
            # Academic Style & Voice -> Readability + grammar
            readability_score = scores.get("readability", 0)
            grammar_score = scores.get("grammar", 0)
            return (readability_score * 0.6 + grammar_score * 0.4)
        
        elif "citation" in title_lower or "documentation" in title_lower:
            # Citation & Documentation -> Knowledge graph (concept coverage)
            kg_analysis = detailed.get("knowledge_graph", {})
            # This is harder to assess automatically, use knowledge graph as proxy
            return scores.get("knowledge_graph", 0) * 0.8
        
        elif "technical" in title_lower or "accuracy" in title_lower:
            # Technical Accuracy -> Knowledge graph depth
            kg_analysis = detailed.get("knowledge_graph", {})
            depth_score = kg_analysis.get("depth_score", 0)
            return depth_score
        
        elif "clarity" in title_lower or "precision" in title_lower:
            # Clarity & Precision -> Readability + coherence
            readability_score = scores.get("readability", 0)
            coherence_score = scores.get("coherence", 0)
            return (readability_score * 0.5 + coherence_score * 0.5)
        
        elif "visual" in title_lower or "elements" in title_lower:
            # Visual Elements -> Not assessable from text, return neutral
            return 50.0
        
        elif "practical" in title_lower or "application" in title_lower:
            # Practical Application -> Knowledge graph connectivity
            kg_analysis = detailed.get("knowledge_graph", {})
            connectivity = kg_analysis.get("connectivity_score", 0)
            return connectivity
        
        else:
            # Default: use overall score
            return scores.get("overall", 0)
    
    def _find_best_score_level(
        self,
        score: float,
        score_levels: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Find the best matching score level for a given score (0-100)
        Maps to rubric points (typically 1-4)
        """
        if not score_levels:
            return {"points": 0, "title": "No Score", "description": ""}
        
        # Sort score levels by points (descending)
        sorted_levels = sorted(
            score_levels,
            key=lambda x: x.get("points", 0),
            reverse=True
        )
        
        # Map score (0-100) to points (typically 1-4)
        # Score ranges: 90-100 = 4, 75-89 = 3, 60-74 = 2, 0-59 = 1
        if score >= 90:
            target_points = 4
        elif score >= 75:
            target_points = 3
        elif score >= 60:
            target_points = 2
        else:
            target_points = 1
        
        # Find the score level with matching points
        for level in sorted_levels:
            if level.get("points") == target_points:
                return level
        
        # Fallback to highest or lowest
        if score >= 75:
            return sorted_levels[0]  # Highest
        else:
            return sorted_levels[-1]  # Lowest
    
    def _generate_criterion_feedback(
        self,
        criterion_title: str,
        analysis_score: float,
        score_level: Dict[str, Any],
        analysis_results: Dict[str, Any]
    ) -> str:
        """
        Generate feedback for a criterion based on analysis results
        """
        detailed = analysis_results.get("detailed_analysis", {})
        
        # Generate specific feedback based on criterion type
        title_lower = criterion_title.lower()
        
        if "thesis" in title_lower or "focus" in title_lower:
            arg_analysis = detailed.get("argumentation", {})
            thesis = arg_analysis.get("thesis_statement", {})
            if thesis and thesis.get("sentence"):
                return f"Thesis statement identified: '{thesis.get('sentence', '')[:100]}...'"
            return "Thesis statement could be more clearly defined."
        
        elif "evidence" in title_lower:
            arg_analysis = detailed.get("argumentation", {})
            grounds = arg_analysis.get("grounds", [])
            return f"Found {len(grounds)} pieces of evidence supporting claims."
        
        elif "organization" in title_lower:
            coherence_analysis = detailed.get("coherence", {})
            structure = coherence_analysis.get("structure_analysis", {})
            para_count = structure.get("paragraph_count", 0)
            return f"Essay has {para_count} paragraphs with {'good' if para_count >= 5 else 'basic'} structure."
        
        elif "grammar" in title_lower:
            grammar_analysis = detailed.get("grammar", {})
            error_count = grammar_analysis.get("error_count", 0)
            if error_count == 0:
                return "No grammar errors detected."
            return f"Found {error_count} grammar error(s) that need attention."
        
        # Default feedback
        return score_level.get("description", "")

# Singleton instance
rubric_scoring_service = RubricScoringService()

