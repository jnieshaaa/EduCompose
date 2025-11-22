"""
Feedback Collector for System Refinement
Collects teacher feedback on analysis results to improve extraction heuristics.

This module enables:
- Collecting corrections to false positives/negatives
- Recording teacher annotations
- Storing feedback for heuristic refinement
- Learning from teacher expertise
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum
import json

logger = logging.getLogger(__name__)


class FeedbackType(str, Enum):
    """Types of feedback that can be collected"""
    FALSE_POSITIVE = "false_positive"  # System detected something incorrectly
    FALSE_NEGATIVE = "false_negative"  # System missed something
    CORRECTION = "correction"  # Teacher provides correct analysis
    ANNOTATION = "annotation"  # Additional teacher notes
    ACCURACY_RATING = "accuracy_rating"  # Teacher rates accuracy (1-5)


class FeedbackCollector:
    """
    Collects and manages teacher feedback on analysis results.
    
    Feedback is used to:
    - Refine extraction heuristics
    - Improve pattern matching
    - Adjust confidence thresholds
    - Learn domain-specific patterns
    """
    
    def __init__(self, storage_path: str = "feedback_data"):
        """
        Initialize feedback collector.
        
        Args:
            storage_path: Path to store feedback data (JSON files)
        """
        self.storage_path = storage_path
        self.feedback_history = []
    
    def collect_feedback(self,
                        essay_id: str,
                        teacher_id: str,
                        feedback_type: FeedbackType,
                        analysis_component: str,  # e.g., "claim", "evidence", "concept"
                        detected_item: Dict[str, Any],
                        teacher_correction: Optional[Dict[str, Any]] = None,
                        notes: Optional[str] = None,
                        accuracy_rating: Optional[int] = None) -> Dict[str, Any]:
        """
        Collect feedback from teacher.
        
        Args:
            essay_id: ID of the essay being reviewed
            teacher_id: ID of the teacher providing feedback
            feedback_type: Type of feedback
            analysis_component: Component being reviewed (claim, evidence, concept, etc.)
            detected_item: What the system detected (original analysis)
            teacher_correction: Teacher's correction (if applicable)
            notes: Additional teacher notes
            accuracy_rating: Teacher's accuracy rating (1-5, if applicable)
            
        Returns:
            Feedback record dictionary
        """
        feedback_record = {
            "id": f"fb_{len(self.feedback_history) + 1}",
            "essay_id": essay_id,
            "teacher_id": teacher_id,
            "feedback_type": feedback_type.value,
            "analysis_component": analysis_component,
            "detected_item": detected_item,
            "teacher_correction": teacher_correction,
            "notes": notes,
            "accuracy_rating": accuracy_rating,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.feedback_history.append(feedback_record)
        logger.info(
            f"Collected {feedback_type.value} feedback for essay {essay_id}, "
            f"component: {analysis_component}"
        )
        
        return feedback_record
    
    def mark_false_positive(self,
                           essay_id: str,
                           teacher_id: str,
                           detected_item: Dict[str, Any],
                           component_type: str,
                           notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Mark a detected item as false positive (incorrectly detected).
        
        Args:
            essay_id: Essay ID
            teacher_id: Teacher ID
            detected_item: Item that was incorrectly detected
            component_type: Type of component (claim, evidence, etc.)
            notes: Optional explanation
            
        Returns:
            Feedback record
        """
        return self.collect_feedback(
            essay_id=essay_id,
            teacher_id=teacher_id,
            feedback_type=FeedbackType.FALSE_POSITIVE,
            analysis_component=component_type,
            detected_item=detected_item,
            notes=notes
        )
    
    def mark_false_negative(self,
                           essay_id: str,
                           teacher_id: str,
                           component_type: str,
                           missed_item: Dict[str, Any],
                           notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Mark a missed item as false negative (should have been detected).
        
        Args:
            essay_id: Essay ID
            teacher_id: Teacher ID
            component_type: Type of component that was missed
            missed_item: Item that should have been detected
            notes: Optional explanation
            
        Returns:
            Feedback record
        """
        return self.collect_feedback(
            essay_id=essay_id,
            teacher_id=teacher_id,
            feedback_type=FeedbackType.FALSE_NEGATIVE,
            analysis_component=component_type,
            detected_item={},  # Empty - nothing was detected
            teacher_correction=missed_item,
            notes=notes
        )
    
    def provide_correction(self,
                          essay_id: str,
                          teacher_id: str,
                          original_detection: Dict[str, Any],
                          correction: Dict[str, Any],
                          component_type: str,
                          notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Provide a correction to system detection.
        
        Args:
            essay_id: Essay ID
            teacher_id: Teacher ID
            original_detection: What the system detected
            correction: Teacher's correction
            component_type: Type of component
            notes: Optional explanation
            
        Returns:
            Feedback record
        """
        return self.collect_feedback(
            essay_id=essay_id,
            teacher_id=teacher_id,
            feedback_type=FeedbackType.CORRECTION,
            analysis_component=component_type,
            detected_item=original_detection,
            teacher_correction=correction,
            notes=notes
        )
    
    def rate_accuracy(self,
                     essay_id: str,
                     teacher_id: str,
                     component_type: str,
                     rating: int,  # 1-5 scale
                     notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Rate the accuracy of analysis for a component.
        
        Args:
            essay_id: Essay ID
            teacher_id: Teacher ID
            component_type: Type of component being rated
            rating: Accuracy rating (1=poor, 5=excellent)
            notes: Optional explanation
            
        Returns:
            Feedback record
        """
        if not (1 <= rating <= 5):
            raise ValueError("Rating must be between 1 and 5")
        
        return self.collect_feedback(
            essay_id=essay_id,
            teacher_id=teacher_id,
            feedback_type=FeedbackType.ACCURACY_RATING,
            analysis_component=component_type,
            detected_item={},
            notes=notes,
            accuracy_rating=rating
        )
    
    def get_feedback_for_component(self, component_type: str) -> List[Dict[str, Any]]:
        """
        Get all feedback for a specific component type.
        
        Args:
            component_type: Component type to filter by
            
        Returns:
            List of feedback records
        """
        return [
            fb for fb in self.feedback_history
            if fb["analysis_component"] == component_type
        ]
    
    def get_false_positives(self, component_type: str = None) -> List[Dict[str, Any]]:
        """
        Get all false positive feedback.
        
        Args:
            component_type: Optional filter by component type
            
        Returns:
            List of false positive feedback records
        """
        false_positives = [
            fb for fb in self.feedback_history
            if fb["feedback_type"] == FeedbackType.FALSE_POSITIVE.value
        ]
        
        if component_type:
            false_positives = [
                fb for fb in false_positives
                if fb["analysis_component"] == component_type
            ]
        
        return false_positives
    
    def get_false_negatives(self, component_type: str = None) -> List[Dict[str, Any]]:
        """
        Get all false negative feedback.
        
        Args:
            component_type: Optional filter by component type
            
        Returns:
            List of false negative feedback records
        """
        false_negatives = [
            fb for fb in self.feedback_history
            if fb["feedback_type"] == FeedbackType.FALSE_NEGATIVE.value
        ]
        
        if component_type:
            false_negatives = [
                fb for fb in false_negatives
                if fb["analysis_component"] == component_type
            ]
        
        return false_negatives
    
    def export_feedback(self, filepath: str = None) -> str:
        """
        Export feedback history to JSON file.
        
        Args:
            filepath: Optional file path (defaults to storage_path/feedback_{timestamp}.json)
            
        Returns:
            Path to exported file
        """
        import os
        from pathlib import Path
        
        if filepath is None:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            os.makedirs(self.storage_path, exist_ok=True)
            filepath = os.path.join(self.storage_path, f"feedback_{timestamp}.json")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.feedback_history, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Exported {len(self.feedback_history)} feedback records to {filepath}")
        return filepath
    
    def load_feedback(self, filepath: str):
        """
        Load feedback history from JSON file.
        
        Args:
            filepath: Path to feedback JSON file
        """
        with open(filepath, 'r', encoding='utf-8') as f:
            self.feedback_history = json.load(f)
        
        logger.info(f"Loaded {len(self.feedback_history)} feedback records from {filepath}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get feedback statistics.
        
        Returns:
            Dictionary with feedback statistics
        """
        stats = {
            "total_feedback": len(self.feedback_history),
            "by_type": {},
            "by_component": {},
            "false_positives": len(self.get_false_positives()),
            "false_negatives": len(self.get_false_negatives()),
            "average_accuracy_rating": None
        }
        
        # Count by type
        for fb in self.feedback_history:
            fb_type = fb["feedback_type"]
            stats["by_type"][fb_type] = stats["by_type"].get(fb_type, 0) + 1
            
            component = fb["analysis_component"]
            stats["by_component"][component] = stats["by_component"].get(component, 0) + 1
        
        # Calculate average accuracy rating
        ratings = [
            fb["accuracy_rating"]
            for fb in self.feedback_history
            if fb["accuracy_rating"] is not None
        ]
        if ratings:
            stats["average_accuracy_rating"] = sum(ratings) / len(ratings)
        
        return stats


def get_feedback_collector(**kwargs) -> FeedbackCollector:
    """
    Factory function to get feedback collector.
    
    Returns:
        FeedbackCollector instance
    """
    return FeedbackCollector(**kwargs)

