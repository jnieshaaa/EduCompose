"""
Grammar and Syntactic Analysis Module
Analyzes grammatical correctness, syntax patterns, and mechanical errors
"""
import re
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Lazy import spaCy to avoid Python 3.12 compatibility issues at startup
from .spacy_utils import get_spacy, load_spacy_model

class GrammarAnalyzer:
    """Analyzes grammatical correctness and syntactic patterns in essays"""
    
    def __init__(self):
        """Initialize grammar analyzer with spaCy and LanguageTool"""
        self.nlp = None
        self.language_tool = None
        # Don't initialize here - wait until first use to avoid import errors at startup
    
    def _ensure_nlp_loaded(self):
        """Ensure spaCy is loaded (lazy loading)"""
        if self.nlp is None:
            self.nlp = load_spacy_model("en_core_web_sm")
    
    def _ensure_language_tool_loaded(self):
        """Ensure LanguageTool is loaded (lazy loading)"""
        if self.language_tool is None:
            try:
                from language_tool_python import LanguageTool
                # Initialize LanguageTool for grammar checking
                self.language_tool = LanguageTool('en-US')
            except Exception as e:
                logger.warning(f"LanguageTool initialization failed: {e}")
                self.language_tool = None
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive grammar analysis
        
        Args:
            text: Essay content to analyze
            
        Returns:
            Dictionary containing grammar scores, errors, and patterns
        """
        results = {
            "score": 100.0,
            "errors": [],
            "syntax_patterns": {},
            "error_count": 0,
            "sentence_count": 0,
            "avg_sentence_length": 0.0,
            "syntax_complexity": 0.0
        }
        
        if not text or len(text.strip()) < 50:
            return results
        
        # Basic sentence segmentation
        sentences = self._segment_sentences(text)
        results["sentence_count"] = len(sentences)
        
        if results["sentence_count"] == 0:
            return results
        
        # Calculate average sentence length
        total_words = sum(len(s.split()) for s in sentences)
        results["avg_sentence_length"] = total_words / results["sentence_count"]
        
        # LanguageTool grammar checking (lazy load)
        self._ensure_language_tool_loaded()
        if self.language_tool:
            grammar_errors = self._check_with_languagetool(text)
            results["errors"].extend(grammar_errors)
            results["error_count"] = len(grammar_errors)
        
        # spaCy-based syntactic analysis (lazy load)
        self._ensure_nlp_loaded()
        if self.nlp:
            syntax_analysis = self._analyze_syntax(text)
            results["syntax_patterns"] = syntax_analysis
            results["syntax_complexity"] = syntax_analysis.get("complexity_score", 0.0)
        
        # Basic rule-based checks
        basic_errors = self._check_basic_rules(text, sentences)
        results["errors"].extend(basic_errors)
        results["error_count"] += len(basic_errors)
        
        # Calculate grammar score (0-100)
        # Penalize based on error density
        total_words = len(text.split())
        if total_words > 0:
            error_density = results["error_count"] / total_words
            results["score"] = max(0.0, 100.0 - (error_density * 1000))
        else:
            results["score"] = 0.0
        
        return results
    
    def _segment_sentences(self, text: str) -> List[str]:
        """Segment text into sentences"""
        self._ensure_nlp_loaded()
        if self.nlp:
            doc = self.nlp(text)
            return [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        else:
            # Fallback: simple sentence segmentation
            sentences = re.split(r'[.!?]+', text)
            return [s.strip() for s in sentences if s.strip()]
    
    def _check_with_languagetool(self, text: str) -> List[Dict[str, Any]]:
        """Check grammar using LanguageTool"""
        errors = []
        
        try:
            matches = self.language_tool.check(text)
            
            for match in matches[:50]:  # Limit to first 50 errors
                errors.append({
                    "type": "grammar",
                    "message": match.message,
                    "category": match.category,
                    "offset": match.offset,
                    "errorLength": match.errorLength,
                    "replacements": match.replacements[:5] if match.replacements else [],
                    "context": match.context[:100] if hasattr(match, 'context') else ""
                })
        except Exception as e:
            logger.error(f"LanguageTool error: {e}")
        
        return errors
    
    def _analyze_syntax(self, text: str) -> Dict[str, Any]:
        """Analyze syntactic patterns using spaCy"""
        if not self.nlp:
            return {}
        
        doc = self.nlp(text)
        
        # Count different sentence structures
        sentence_types = {
            "simple": 0,
            "compound": 0,
            "complex": 0,
            "compound_complex": 0
        }
        
        # Analyze dependency patterns
        dependency_tags = {}
        pos_tags = {}
        
        for sent in doc.sents:
            # Count clauses
            num_verbs = len([token for token in sent if token.pos_ == "VERB"])
            num_conjunctions = len([token for token in sent if token.dep_ == "cc"])
            
            if num_verbs == 1 and num_conjunctions == 0:
                sentence_types["simple"] += 1
            elif num_verbs > 1 and num_conjunctions > 0:
                sentence_types["compound_complex"] += 1
            elif num_verbs > 1:
                sentence_types["complex"] += 1
            elif num_conjunctions > 0:
                sentence_types["compound"] += 1
            
            # Count dependency tags
            for token in sent:
                dep = token.dep_
                pos = token.pos_
                dependency_tags[dep] = dependency_tags.get(dep, 0) + 1
                pos_tags[pos] = pos_tags.get(pos, 0) + 1
        
        # Calculate syntax complexity score
        total_sentences = len(list(doc.sents))
        if total_sentences > 0:
            complexity_score = (
                sentence_types["complex"] * 2 +
                sentence_types["compound_complex"] * 3 +
                sentence_types["compound"] * 1
            ) / total_sentences * 100
        else:
            complexity_score = 0.0
        
        return {
            "sentence_types": sentence_types,
            "dependency_tags": dependency_tags,
            "pos_tags": pos_tags,
            "complexity_score": complexity_score,
            "avg_dependency_depth": self._calculate_avg_dependency_depth(doc)
        }
    
    def _calculate_avg_dependency_depth(self, doc) -> float:
        """Calculate average dependency tree depth"""
        depths = []
        for sent in doc.sents:
            for token in sent:
                depth = 0
                current = token
                while current.head != current:
                    depth += 1
                    current = current.head
                    if depth > 20:  # Prevent infinite loops
                        break
                depths.append(depth)
        
        return sum(depths) / len(depths) if depths else 0.0
    
    def _check_basic_rules(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Check basic grammar rules"""
        errors = []
        
        # Check capitalization
        for i, sentence in enumerate(sentences):
            if sentence and not sentence[0].isupper():
                errors.append({
                    "type": "capitalization",
                    "sentence_index": i,
                    "message": "Sentence should start with a capital letter",
                    "suggestion": sentence[0].upper() + sentence[1:] if len(sentence) > 1 else sentence.upper()
                })
        
        # Check for common word errors
        common_errors = {
            r'\bthere\b': "their/they're",
            r'\byour\b': "you're",
            r'\bits\b': "it's",
            r'\bto\b': "too",
            r'\bthen\b': "than"
        }
        
        for pattern, suggestion in common_errors.items():
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in list(matches)[:5]:  # Limit matches
                errors.append({
                    "type": "word_choice",
                    "offset": match.start(),
                    "message": f"Consider using '{suggestion}' instead",
                    "context": text[max(0, match.start()-20):match.end()+20]
                })
        
        return errors

