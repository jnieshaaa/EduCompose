"""
Readability Analysis Module
Implements multiple readability metrics: Flesch Reading Ease, Flesch-Kincaid Grade Level,
SMOG Index, and Coleman-Liau Index
"""
import re
import textstat
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class ReadabilityAnalyzer:
    """Analyzes readability and lexical sophistication of essays"""
    
    def __init__(self):
        """Initialize readability analyzer"""
        pass
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive readability analysis
        
        Args:
            text: Essay content to analyze
            
        Returns:
            Dictionary containing readability scores, metrics, and lexical analysis
        """
        results = {
            "flesch_reading_ease": 0.0,
            "flesch_kincaid_grade": 0.0,
            "smog_index": 0.0,
            "coleman_liau_index": 0.0,
            "lexical_diversity": 0.0,
            "avg_sentence_length": 0.0,
            "avg_word_length": 0.0,
            "syllable_count": 0,
            "vocabulary_sophistication": 0.0,
            "score": 0.0,  # Normalized score 0-100
            "issues": []
        }
        
        if not text or len(text.strip()) < 50:
            return results
        
        # Basic text statistics
        words = text.split()
        sentences = self._segment_sentences(text)
        
        if not words or not sentences:
            return results
        
        # Calculate readability metrics using textstat
        try:
            results["flesch_reading_ease"] = textstat.flesch_reading_ease(text)
            results["flesch_kincaid_grade"] = textstat.flesch_kincaid_grade(text)
            results["smog_index"] = textstat.smog_index(text)
            results["coleman_liau_index"] = textstat.coleman_liau_index(text)
        except Exception as e:
            logger.warning(f"Error calculating readability metrics: {e}")
        
        # Calculate average sentence length
        results["avg_sentence_length"] = len(words) / len(sentences) if sentences else 0
        
        # Calculate average word length
        results["avg_word_length"] = sum(len(word) for word in words) / len(words) if words else 0
        
        # Calculate lexical diversity (Type-Token Ratio)
        unique_words = set(word.lower() for word in words)
        results["lexical_diversity"] = len(unique_words) / len(words) if words else 0
        
        # Calculate vocabulary sophistication (percentage of words > 6 characters)
        long_words = [w for w in words if len(w) > 6]
        results["vocabulary_sophistication"] = len(long_words) / len(words) if words else 0
        
        # Count syllables
        results["syllable_count"] = sum(self._count_syllables(word) for word in words)
        
        # Generate issues and recommendations
        issues = self._identify_readability_issues(results)
        results["issues"] = issues
        
        # Calculate normalized score (0-100)
        # Higher scores = more appropriate for academic level
        results["score"] = self._calculate_readability_score(results)
        
        return results
    
    def _segment_sentences(self, text: str) -> List[str]:
        """Segment text into sentences"""
        # Simple sentence segmentation
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _count_syllables(self, word: str) -> int:
        """Count syllables in a word"""
        word = word.lower()
        if len(word) <= 3:
            return 1
        
        # Remove silent 'e' at the end
        if word.endswith('e'):
            word = word[:-1]
        
        # Count vowel groups
        vowels = 'aeiouy'
        syllable_count = 0
        prev_was_vowel = False
        
        for char in word:
            is_vowel = char in vowels
            if is_vowel and not prev_was_vowel:
                syllable_count += 1
            prev_was_vowel = is_vowel
        
        # Ensure at least 1 syllable
        return max(1, syllable_count)
    
    def _identify_readability_issues(self, results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify readability issues and generate recommendations"""
        issues = []
        
        # Flesch Reading Ease interpretation
        # 90-100: Very easy, 80-89: Easy, 70-79: Fairly easy, 60-69: Standard,
        # 50-59: Fairly difficult, 30-49: Difficult, 0-29: Very difficult
        flesch = results["flesch_reading_ease"]
        
        if flesch < 30:
            issues.append({
                "type": "readability",
                "severity": "high",
                "message": "Text is very difficult to read (Flesch Reading Ease < 30)",
                "suggestion": "Consider using simpler words and shorter sentences. Break complex ideas into multiple sentences."
            })
        elif flesch < 50:
            issues.append({
                "type": "readability",
                "severity": "medium",
                "message": "Text is difficult to read (Flesch Reading Ease < 50)",
                "suggestion": "Consider simplifying some complex sentences and using more common vocabulary."
            })
        elif flesch > 80:
            issues.append({
                "type": "readability",
                "severity": "low",
                "message": "Text may be too simple for academic writing (Flesch Reading Ease > 80)",
                "suggestion": "Consider using more sophisticated vocabulary and complex sentence structures appropriate for academic level."
            })
        
        # Sentence length issues
        avg_sent_len = results["avg_sentence_length"]
        if avg_sent_len > 25:
            issues.append({
                "type": "sentence_length",
                "severity": "medium",
                "message": f"Average sentence length ({avg_sent_len:.1f} words) is quite long",
                "suggestion": "Consider breaking long sentences into shorter, more manageable ones."
            })
        elif avg_sent_len < 10:
            issues.append({
                "type": "sentence_length",
                "severity": "low",
                "message": f"Average sentence length ({avg_sent_len:.1f} words) is quite short",
                "suggestion": "Consider combining some sentences to create more complex, varied sentence structures."
            })
        
        # Lexical diversity issues
        lexical_div = results["lexical_diversity"]
        if lexical_div < 0.4:
            issues.append({
                "type": "lexical_diversity",
                "severity": "medium",
                "message": f"Low lexical diversity ({lexical_div:.2%}) - many repeated words",
                "suggestion": "Use more varied vocabulary and synonyms to avoid repetition."
            })
        
        # Grade level appropriateness
        grade_level = results["flesch_kincaid_grade"]
        if grade_level > 16:
            issues.append({
                "type": "grade_level",
                "severity": "medium",
                "message": f"Text complexity suggests college graduate level ({grade_level:.1f})",
                "suggestion": "Ensure the complexity is appropriate for your target audience."
            })
        
        return issues
    
    def _calculate_readability_score(self, results: Dict[str, Any]) -> float:
        """
        Calculate normalized readability score (0-100)
        Higher scores indicate more appropriate readability for academic writing
        """
        flesch = results["flesch_reading_ease"]
        lexical_div = results["lexical_diversity"]
        avg_sent_len = results["avg_sentence_length"]
        
        # Ideal Flesch Reading Ease for academic writing: 50-70
        if 50 <= flesch <= 70:
            flesch_score = 100
        elif 40 <= flesch < 50 or 70 < flesch <= 80:
            flesch_score = 80
        elif 30 <= flesch < 40 or 80 < flesch <= 90:
            flesch_score = 60
        else:
            flesch_score = 40
        
        # Lexical diversity score (0-100)
        lexical_score = min(100, lexical_div * 200)
        
        # Sentence length score (ideal: 15-20 words)
        if 15 <= avg_sent_len <= 20:
            sent_score = 100
        elif 10 <= avg_sent_len < 15 or 20 < avg_sent_len <= 25:
            sent_score = 80
        elif 5 <= avg_sent_len < 10 or 25 < avg_sent_len <= 30:
            sent_score = 60
        else:
            sent_score = 40
        
        # Weighted average
        overall_score = (flesch_score * 0.5 + lexical_score * 0.3 + sent_score * 0.2)
        
        return round(overall_score, 2)

