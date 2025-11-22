"""
Heuristic Refinement System
Learns from teacher feedback to improve extraction heuristics.

This module:
- Analyzes feedback patterns
- Refines extraction rules based on feedback
- Adjusts confidence thresholds
- Improves pattern matching
"""
import logging
from typing import Dict, List, Any, Optional, Set
from collections import defaultdict, Counter
import json
from pathlib import Path
from datetime import datetime

from .feedback_collector import FeedbackCollector, FeedbackType

logger = logging.getLogger(__name__)


class HeuristicRefiner:
    """
    Refines extraction heuristics based on teacher feedback.
    
    Uses feedback to:
    - Identify patterns in false positives/negatives
    - Adjust confidence thresholds
    - Refine extraction patterns
    - Learn domain-specific patterns
    """
    
    def __init__(self, feedback_collector: FeedbackCollector = None):
        """
        Initialize heuristic refiner.
        
        Args:
            feedback_collector: FeedbackCollector instance (optional, creates new one if not provided)
        """
        from .feedback_collector import FeedbackCollector
        self.feedback_collector = feedback_collector or FeedbackCollector()
        self.refinement_history = []
    
    def analyze_feedback(self, component_type: str = None) -> Dict[str, Any]:
        """
        Analyze feedback to identify patterns and issues.
        
        Args:
            component_type: Optional filter by component type
            
        Returns:
            Dictionary with analysis results
        """
        false_positives = self.feedback_collector.get_false_positives(component_type)
        false_negatives = self.feedback_collector.get_false_negatives(component_type)
        
        analysis = {
            "component_type": component_type or "all",
            "total_false_positives": len(false_positives),
            "total_false_negatives": len(false_negatives),
            "false_positive_patterns": self._analyze_patterns(false_positives),
            "false_negative_patterns": self._analyze_patterns(false_negatives),
            "recommendations": []
        }
        
        # Generate recommendations
        if false_positives:
            analysis["recommendations"].extend(
                self._recommend_false_positive_fixes(false_positives)
            )
        
        if false_negatives:
            analysis["recommendations"].extend(
                self._recommend_false_negative_fixes(false_negatives)
            )
        
        return analysis
    
    def _analyze_patterns(self, feedback_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze patterns in feedback items.
        
        Args:
            feedback_items: List of feedback records
            
        Returns:
            Dictionary with pattern analysis
        """
        if not feedback_items:
            return {}
        
        patterns = {
            "common_indicators": Counter(),
            "common_contexts": Counter(),
            "common_sentences": Counter(),
            "confidence_scores": []
        }
        
        for item in feedback_items:
            detected_item = item.get("detected_item", {})
            
            # Analyze indicators (for false positives)
            if "indicator" in detected_item:
                patterns["common_indicators"][detected_item["indicator"]] += 1
            
            # Analyze context
            if "sentence" in detected_item:
                sentence = detected_item["sentence"]
                patterns["common_sentences"][sentence[:100]] += 1  # First 100 chars
            
            # Collect confidence scores
            if "confidence" in detected_item:
                patterns["confidence_scores"].append(detected_item["confidence"])
        
        # Calculate average confidence
        if patterns["confidence_scores"]:
            patterns["average_confidence"] = sum(patterns["confidence_scores"]) / len(patterns["confidence_scores"])
        
        return patterns
    
    def _recommend_false_positive_fixes(self, false_positives: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate recommendations for fixing false positives.
        
        Args:
            false_positives: List of false positive feedback
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        # Analyze confidence scores
        confidence_scores = [
            fp.get("detected_item", {}).get("confidence", 0.5)
            for fp in false_positives
            if fp.get("detected_item", {}).get("confidence") is not None
        ]
        
        if confidence_scores:
            avg_confidence = sum(confidence_scores) / len(confidence_scores)
            
            if avg_confidence < 0.7:
                recommendations.append({
                    "type": "threshold_adjustment",
                    "component": false_positives[0].get("analysis_component"),
                    "recommendation": f"Consider lowering detection threshold (current avg: {avg_confidence:.2f})",
                    "action": "Increase minimum confidence threshold to reduce false positives"
                })
        
        # Analyze common indicators
        indicators = Counter()
        for fp in false_positives:
            indicator = fp.get("detected_item", {}).get("indicator", "")
            if indicator:
                indicators[indicator] += 1
        
        if indicators:
            most_common = indicators.most_common(1)[0]
            if most_common[1] > len(false_positives) * 0.3:  # >30% of cases
                recommendations.append({
                    "type": "pattern_refinement",
                    "component": false_positives[0].get("analysis_component"),
                    "recommendation": f"Indicator '{most_common[0]}' causes many false positives ({most_common[1]} cases)",
                    "action": f"Refine or add context checks for indicator '{most_common[0]}'"
                })
        
        return recommendations
    
    def _recommend_false_negative_fixes(self, false_negatives: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate recommendations for fixing false negatives.
        
        Args:
            false_negatives: List of false negative feedback
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        # Analyze missed items
        missed_patterns = Counter()
        for fn in false_negatives:
            correction = fn.get("teacher_correction", {})
            sentence = correction.get("sentence", "")
            if sentence:
                # Extract key phrases (simple heuristic)
                words = sentence.lower().split()
                for word in words:
                    if len(word) > 4:  # Longer words are more likely to be significant
                        missed_patterns[word] += 1
        
        if missed_patterns:
            most_common = missed_patterns.most_common(3)
            recommendations.append({
                "type": "pattern_addition",
                "component": false_negatives[0].get("analysis_component"),
                "recommendation": "Common patterns in missed items detected",
                "action": f"Consider adding indicators for: {', '.join([p[0] for p in most_common])}"
            })
        
        return recommendations
    
    def generate_refined_heuristics(self, component_type: str) -> Dict[str, Any]:
        """
        Generate refined heuristics based on feedback analysis.
        
        Args:
            component_type: Component type to refine
            
        Returns:
            Dictionary with refined heuristics
        """
        analysis = self.analyze_feedback(component_type)
        
        refined_heuristics = {
            "component_type": component_type,
            "original_heuristics": {},  # Would load from actual module
            "refined_heuristics": {},
            "changes": [],
            "confidence_threshold": 0.7,
            "new_patterns": [],
            "modified_patterns": []
        }
        
        # Adjust confidence threshold based on false positives
        false_positives = self.feedback_collector.get_false_positives(component_type)
        if false_positives:
            # Increase threshold to reduce false positives
            avg_confidence = sum(
                fp.get("detected_item", {}).get("confidence", 0.5)
                for fp in false_positives
                if fp.get("detected_item", {}).get("confidence")
            ) / len(false_positives)
            
            if avg_confidence < 0.8:
                refined_heuristics["confidence_threshold"] = min(0.9, avg_confidence + 0.1)
                refined_heuristics["changes"].append({
                    "type": "threshold_increase",
                    "reason": "Reduce false positives",
                    "old_value": 0.7,
                    "new_value": refined_heuristics["confidence_threshold"]
                })
        
        # Extract new patterns from false negatives
        false_negatives = self.feedback_collector.get_false_negatives(component_type)
        if false_negatives:
            # Extract common patterns from corrections
            new_patterns = []
            for fn in false_negatives[:10]:  # Limit to first 10
                correction = fn.get("teacher_correction", {})
                sentence = correction.get("sentence", "")
                if sentence:
                    # Simple pattern extraction (could be improved)
                    words = sentence.lower().split()
                    for i, word in enumerate(words):
                        if len(word) > 5:  # Significant words
                            # Create n-gram patterns
                            if i > 0:
                                pattern = f"{words[i-1]} {word}"
                                new_patterns.append(pattern)
            
            if new_patterns:
                # Get most common patterns
                pattern_counts = Counter(new_patterns)
                refined_heuristics["new_patterns"] = [
                    pattern for pattern, count in pattern_counts.most_common(5)
                    if count >= 2  # At least 2 occurrences
                ]
                
                refined_heuristics["changes"].append({
                    "type": "pattern_addition",
                    "reason": "Learn from false negatives",
                    "new_patterns": refined_heuristics["new_patterns"]
                })
        
        # Record refinement
        refinement_record = {
            "component_type": component_type,
            "timestamp": datetime.utcnow().isoformat(),
            "analysis": analysis,
            "refined_heuristics": refined_heuristics,
            "applied": False
        }
        
        self.refinement_history.append(refinement_record)
        
        logger.info(
            f"Generated refined heuristics for {component_type}: "
            f"{len(refined_heuristics['changes'])} changes proposed"
        )
        
        return refined_heuristics
    
    def apply_refinement(self, refined_heuristics: Dict[str, Any]) -> bool:
        """
        Apply refined heuristics (would integrate with actual modules).
        
        Note: This is a framework - actual application would need
        integration with specific extraction modules.
        
        Args:
            refined_heuristics: Refined heuristics dictionary
            
        Returns:
            True if applied successfully
        """
        # In a real implementation, this would:
        # 1. Update extraction module configurations
        # 2. Adjust pattern lists
        # 3. Update confidence thresholds
        # 4. Reload modules if needed
        
        logger.info(
            f"Refinement framework ready for {refined_heuristics['component_type']}. "
            "Actual application requires module-specific integration."
        )
        
        return True
    
    def export_refinement_report(self, filepath: str = None) -> str:
        """
        Export refinement analysis report.
        
        Args:
            filepath: Optional file path
            
        Returns:
            Path to exported file
        """
        import os
        from datetime import datetime
        
        if filepath is None:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            os.makedirs("refinement_reports", exist_ok=True)
            filepath = os.path.join("refinement_reports", f"refinement_{timestamp}.json")
        
        report = {
            "refinement_history": self.refinement_history,
            "feedback_statistics": self.feedback_collector.get_statistics(),
            "generated_at": datetime.utcnow().isoformat()
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Exported refinement report to {filepath}")
        return filepath


def get_heuristic_refiner(feedback_collector: FeedbackCollector = None) -> HeuristicRefiner:
    """
    Factory function to get heuristic refiner.
    
    Args:
        feedback_collector: Optional FeedbackCollector instance
        
    Returns:
        HeuristicRefiner instance
    """
    return HeuristicRefiner(feedback_collector)

