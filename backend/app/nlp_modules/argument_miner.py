"""
Argument Mining Module
Implements Toulmin's Model of Argumentation: Claims, Grounds, Warrants, Rebuttals
"""
import re
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

# Lazy import helpers
from .spacy_utils import load_spacy_model

class ArgumentMiner:
    """Analyzes argumentative structure using Toulmin's model"""
    
    def __init__(self, use_transformer_classifier: bool = True):
        """
        Initialize argument miner
        
        Args:
            use_transformer_classifier: If True, use transformer-based claim classifier
                                       for enhanced accuracy (default: True).
                                       Falls back to pattern-based if transformers unavailable.
        """
        self.nlp = None
        # Don't initialize here - wait until first use to avoid import errors at startup
        self.use_transformer_classifier = use_transformer_classifier
        self.transformer_classifier = None
        
        # Claim indicators
        self.claim_indicators = [
            "i believe", "i think", "i argue", "i claim", "i propose",
            "thesis", "main point", "position", "viewpoint", "opinion",
            "should", "must", "ought to", "need to", "is necessary"
        ]
        
        # Evidence/ground indicators
        self.evidence_indicators = [
            "for example", "for instance", "specifically", "according to",
            "research shows", "studies indicate", "evidence suggests",
            "data shows", "statistics", "findings", "demonstrates",
            "proves", "illustrates", "supports", "indicates"
        ]
        
        # Warrant indicators (reasoning/justification)
        self.warrant_indicators = [
            "because", "since", "due to", "as a result of", "therefore",
            "thus", "consequently", "hence", "so", "this means",
            "which implies", "suggests that", "indicates that"
        ]
        
        # Rebuttal indicators
        self.rebuttal_indicators = [
            "however", "although", "even though", "despite", "nevertheless",
            "on the other hand", "in contrast", "some may argue",
            "it could be argued", "critics claim", "opponents argue",
            "admittedly", "granted", "while it is true"
        ]
    
    def _ensure_nlp_loaded(self):
        """Ensure spaCy is loaded (lazy loading)"""
        if self.nlp is None:
            self.nlp = load_spacy_model("en_core_web_sm")
    
    def _ensure_transformer_classifier_loaded(self):
        """Lazy load transformer-based claim classifier if requested and available"""
        if not self.use_transformer_classifier:
            return None
        
        if self.transformer_classifier is None:
            try:
                from .claim_classifier import TransformerClaimClassifier
                self.transformer_classifier = TransformerClaimClassifier()
                # Check if it's actually available
                if not self.transformer_classifier.is_available():
                    logger.info(
                        "Transformer classifier not available. "
                        "Using pattern-based classification."
                    )
                    self.transformer_classifier = False  # Mark as unavailable
            except ImportError as e:
                logger.debug(f"Transformer classifier import failed: {e}")
                self.transformer_classifier = False  # Mark as unavailable
        
        return self.transformer_classifier if self.transformer_classifier is not False else None
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive argument analysis using Toulmin's model
        
        Args:
            text: Essay content to analyze
            
        Returns:
            Dictionary containing argument components, structure, and quality assessment
        """
        results = {
            "score": 0.0,
            "claim_score": 0.0,
            "evidence_score": 0.0,
            "warrant_score": 0.0,
            "rebuttal_score": 0.0,
            "claims": [],
            "grounds": [],
            "warrants": [],
            "rebuttals": [],
            "argument_structure": {},
            "argument_issues": [],
            "toulmin_analysis": {}
        }
        
        if not text or len(text.strip()) < 50:
            return results
        
        # Segment text
        paragraphs = self._segment_paragraphs(text)
        sentences = self._segment_sentences(text)
        
        # Identify thesis statement (usually in introduction)
        thesis = self._identify_thesis(paragraphs)
        results["thesis_statement"] = thesis
        
        # Extract claims
        claims = self._extract_claims(text, sentences)
        results["claims"] = claims
        results["claim_score"] = self._calculate_claim_score(claims, thesis)
        
        # Extract evidence/grounds
        grounds = self._extract_grounds(text, sentences)
        results["grounds"] = grounds
        results["evidence_score"] = self._calculate_evidence_score(grounds, claims)
        
        # Extract warrants
        warrants = self._extract_warrants(text, sentences)
        results["warrants"] = warrants
        results["warrant_score"] = self._calculate_warrant_score(warrants, claims)
        
        # Extract rebuttals
        rebuttals = self._extract_rebuttals(text, sentences)
        results["rebuttals"] = rebuttals
        results["rebuttal_score"] = self._calculate_rebuttal_score(rebuttals)
        
        # Analyze argument structure
        structure = self._analyze_argument_structure(claims, grounds, warrants, rebuttals)
        results["argument_structure"] = structure
        
        # Toulmin model completeness
        toulmin_analysis = self._analyze_toulmin_completeness(claims, grounds, warrants, rebuttals)
        results["toulmin_analysis"] = toulmin_analysis
        
        # Identify argument issues
        issues = self._identify_argument_issues(results)
        results["argument_issues"] = issues
        
        # Calculate overall argument strength score
        results["score"] = self._calculate_argument_score(results)
        
        return results
    
    def _segment_paragraphs(self, text: str) -> List[str]:
        """Segment text into paragraphs"""
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        if not paragraphs:
            paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
        return paragraphs
    
    def _segment_sentences(self, text: str) -> List[str]:
        """Segment text into sentences"""
        self._ensure_nlp_loaded()
        if self.nlp:
            doc = self.nlp(text)
            return [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        else:
            sentences = re.split(r'[.!?]+', text)
            return [s.strip() for s in sentences if s.strip()]
    
    def _identify_thesis(self, paragraphs: List[str]) -> Optional[Dict[str, Any]]:
        """Identify thesis statement, typically in first paragraph"""
        if not paragraphs:
            return None
        
        first_paragraph = paragraphs[0].lower()
        text_lower = first_paragraph
        
        # Check for thesis indicators
        for indicator in self.claim_indicators:
            if indicator in text_lower:
                # Find sentence containing indicator
                sentences = self._segment_sentences(paragraphs[0])
                for sentence in sentences:
                    if indicator in sentence.lower():
                        return {
                            "sentence": sentence,
                            "paragraph": 0,
                            "confidence": "high"
                        }
        
        # If no clear indicator, return first sentence as potential thesis
        if paragraphs[0]:
            sentences = self._segment_sentences(paragraphs[0])
            if sentences:
                return {
                    "sentence": sentences[0],
                    "paragraph": 0,
                    "confidence": "medium"
                }
        
        return None
    
    def _extract_claims(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Extract claim statements using pattern matching or transformer classifier"""
        claims = []
        
        # Try transformer-based classification first if available
        transformer_classifier = self._ensure_transformer_classifier_loaded()
        if transformer_classifier:
            try:
                # Classify all sentences with transformer
                classifications = transformer_classifier.classify_sentences(sentences)
                
                # Extract sentences classified as claims
                for i, (sentence, classification) in enumerate(zip(sentences, classifications)):
                    component = classification.get("component", "unknown")
                    confidence = classification.get("confidence", 0.0)
                    
                    # Map transformer components to claims
                    if component in ["claim", "premise"] and confidence > 0.5:
                        claims.append({
                            "sentence_index": i,
                            "sentence": sentence,
                            "indicator": f"transformer-{component}",
                            "type": "claim",
                            "confidence": confidence,
                            "classification_method": "transformer"
                        })
                
                # If transformer found claims, return them (optionally filter by confidence)
                if claims:
                    logger.debug(f"Found {len(claims)} claims using transformer classifier")
                    return claims
            except Exception as e:
                logger.warning(f"Transformer classification failed: {e}. Falling back to pattern matching.")
        
        # Fallback to pattern-based extraction
        text_lower = text.lower()
        
        for i, sentence in enumerate(sentences):
            sentence_lower = sentence.lower()
            for indicator in self.claim_indicators:
                if indicator in sentence_lower:
                    claims.append({
                        "sentence_index": i,
                        "sentence": sentence,
                        "indicator": indicator,
                        "type": "claim",
                        "classification_method": "pattern"
                    })
                    break
        
        # If no explicit claims found, identify assertive statements
        self._ensure_nlp_loaded()
        if not claims and self.nlp:
            for i, sentence in enumerate(sentences[:5]):  # Check first 5 sentences
                doc = self.nlp(sentence)
                sentence_lower = sentence.lower()
                # Check for modal verbs indicating claims
                has_modal = any(token.tag_ in ["MD"] for token in doc)
                if has_modal or any(word in sentence_lower for word in ["should", "must", "is", "are"]):
                    claims.append({
                        "sentence_index": i,
                        "sentence": sentence,
                        "indicator": "implicit",
                        "type": "claim",
                        "classification_method": "pattern"
                    })
        
        return claims
    
    def _extract_grounds(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Extract evidence/ground statements using pattern matching or transformer classifier"""
        grounds = []
        
        # Try transformer-based classification first if available
        transformer_classifier = self._ensure_transformer_classifier_loaded()
        if transformer_classifier:
            try:
                classifications = transformer_classifier.classify_sentences(sentences)
                
                # Extract sentences classified as evidence
                for i, (sentence, classification) in enumerate(zip(sentences, classifications)):
                    component = classification.get("component", "unknown")
                    confidence = classification.get("confidence", 0.0)
                    
                    if component == "evidence" and confidence > 0.5:
                        grounds.append({
                            "sentence_index": i,
                            "sentence": sentence,
                            "indicator": f"transformer-{component}",
                            "type": "evidence",
                            "confidence": confidence,
                            "classification_method": "transformer"
                        })
                
                # If transformer found evidence, use it (but also check pattern-based for completeness)
                if grounds:
                    logger.debug(f"Found {len(grounds)} evidence statements using transformer classifier")
            except Exception as e:
                logger.debug(f"Transformer evidence classification issue: {e}. Using pattern matching.")
        
        # Also check pattern-based indicators (union with transformer results)
        text_lower = text.lower()
        pattern_found_indices = {g["sentence_index"] for g in grounds}
        
        for i, sentence in enumerate(sentences):
            if i in pattern_found_indices:
                continue  # Already found by transformer
            
            sentence_lower = sentence.lower()
            for indicator in self.evidence_indicators:
                if indicator in sentence_lower:
                    grounds.append({
                        "sentence_index": i,
                        "sentence": sentence,
                        "indicator": indicator,
                        "type": "evidence",
                        "classification_method": "pattern"
                    })
                    break
        
        return grounds
    
    def _extract_warrants(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Extract warrant statements (reasoning/justification)"""
        warrants = []
        text_lower = text.lower()
        
        for i, sentence in enumerate(sentences):
            sentence_lower = sentence.lower()
            for indicator in self.warrant_indicators:
                if indicator in sentence_lower:
                    warrants.append({
                        "sentence_index": i,
                        "sentence": sentence,
                        "indicator": indicator,
                        "type": "warrant"
                    })
                    break
        
        return warrants
    
    def _extract_rebuttals(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Extract rebuttal/counterargument statements using pattern matching or transformer classifier"""
        rebuttals = []
        
        # Try transformer-based classification first if available
        transformer_classifier = self._ensure_transformer_classifier_loaded()
        if transformer_classifier:
            try:
                classifications = transformer_classifier.classify_sentences(sentences)
                
                # Extract sentences classified as counterclaims
                for i, (sentence, classification) in enumerate(zip(sentences, classifications)):
                    component = classification.get("component", "unknown")
                    confidence = classification.get("confidence", 0.0)
                    
                    if component == "counterclaim" and confidence > 0.5:
                        rebuttals.append({
                            "sentence_index": i,
                            "sentence": sentence,
                            "indicator": f"transformer-{component}",
                            "type": "rebuttal",
                            "confidence": confidence,
                            "classification_method": "transformer"
                        })
                
                if rebuttals:
                    logger.debug(f"Found {len(rebuttals)} rebuttals using transformer classifier")
            except Exception as e:
                logger.debug(f"Transformer rebuttal classification issue: {e}. Using pattern matching.")
        
        # Also check pattern-based indicators (union with transformer results)
        text_lower = text.lower()
        pattern_found_indices = {r["sentence_index"] for r in rebuttals}
        
        for i, sentence in enumerate(sentences):
            if i in pattern_found_indices:
                continue  # Already found by transformer
            
            sentence_lower = sentence.lower()
            for indicator in self.rebuttal_indicators:
                if indicator in sentence_lower:
                    rebuttals.append({
                        "sentence_index": i,
                        "sentence": sentence,
                        "indicator": indicator,
                        "type": "rebuttal",
                        "classification_method": "pattern"
                    })
                    break
        
        return rebuttals
    
    def _calculate_claim_score(self, claims: List[Dict], thesis: Optional[Dict]) -> float:
        """Calculate score for claim presence and quality"""
        if not claims:
            return 30.0
        
        score = 50.0  # Base score for having claims
        
        # Bonus for having thesis
        if thesis:
            score += 20.0
        
        # Bonus for multiple claims
        if len(claims) >= 2:
            score += 15.0
        
        # Bonus for claims in introduction
        intro_claims = [c for c in claims if c["sentence_index"] < 3]
        if intro_claims:
            score += 15.0
        
        return min(100.0, score)
    
    def _calculate_evidence_score(self, grounds: List[Dict], claims: List[Dict]) -> float:
        """Calculate score for evidence quality"""
        if not grounds:
            return 20.0
        
        score = 40.0  # Base score for having evidence
        
        # Bonus for multiple pieces of evidence
        if len(grounds) >= 2:
            score += 20.0
        if len(grounds) >= 3:
            score += 15.0
        
        # Bonus for evidence-to-claim ratio
        if claims:
            ratio = len(grounds) / len(claims)
            if ratio >= 1.5:
                score += 25.0
            elif ratio >= 1.0:
                score += 15.0
        
        return min(100.0, score)
    
    def _calculate_warrant_score(self, warrants: List[Dict], claims: List[Dict]) -> float:
        """Calculate score for warrant quality"""
        if not warrants:
            return 40.0  # Warrants can be implicit
        
        score = 50.0  # Base score
        
        # Bonus for multiple warrants
        if len(warrants) >= 2:
            score += 20.0
        
        # Bonus for warrants connecting claims to evidence
        if claims and len(warrants) >= len(claims) * 0.5:
            score += 30.0
        
        return min(100.0, score)
    
    def _calculate_rebuttal_score(self, rebuttals: List[Dict]) -> float:
        """Calculate score for rebuttal presence"""
        if not rebuttals:
            return 60.0  # Rebuttals are optional but valuable
        
        score = 70.0  # Base score for having rebuttals
        
        # Bonus for multiple rebuttals
        if len(rebuttals) >= 2:
            score += 20.0
        
        return min(100.0, score)
    
    def _analyze_argument_structure(self, claims: List[Dict], grounds: List[Dict],
                                   warrants: List[Dict], rebuttals: List[Dict]) -> Dict[str, Any]:
        """Analyze overall argument structure"""
        return {
            "total_claims": len(claims),
            "total_grounds": len(grounds),
            "total_warrants": len(warrants),
            "total_rebuttals": len(rebuttals),
            "grounds_per_claim": len(grounds) / len(claims) if claims else 0,
            "has_thesis": len(claims) > 0,
            "has_evidence": len(grounds) > 0,
            "has_reasoning": len(warrants) > 0,
            "has_counterarguments": len(rebuttals) > 0
        }
    
    def _analyze_toulmin_completeness(self, claims: List[Dict], grounds: List[Dict],
                                     warrants: List[Dict], rebuttals: List[Dict]) -> Dict[str, Any]:
        """Analyze completeness of Toulmin's model components"""
        completeness = {
            "has_claim": len(claims) > 0,
            "has_ground": len(grounds) > 0,
            "has_warrant": len(warrants) > 0,
            "has_rebuttal": len(rebuttals) > 0,
            "completeness_score": 0.0
        }
        
        # Calculate completeness (claims and grounds are essential)
        score = 0.0
        if completeness["has_claim"]:
            score += 40.0
        if completeness["has_ground"]:
            score += 40.0
        if completeness["has_warrant"]:
            score += 15.0
        if completeness["has_rebuttal"]:
            score += 5.0
        
        completeness["completeness_score"] = score
        
        return completeness
    
    def _identify_argument_issues(self, results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify argumentation issues"""
        issues = []
        
        # Claim issues
        if results["claim_score"] < 60:
            issues.append({
                "type": "claims",
                "severity": "high",
                "message": "Weak or unclear thesis statement and main claims",
                "suggestion": "Ensure your essay has a clear thesis statement in the introduction that states your main argument."
            })
        
        # Evidence issues
        if results["evidence_score"] < 50:
            issues.append({
                "type": "evidence",
                "severity": "high",
                "message": "Insufficient supporting evidence for claims",
                "suggestion": "Provide specific examples, statistics, research findings, or other evidence to support your claims."
            })
        
        # Warrant issues
        if results["warrant_score"] < 50:
            issues.append({
                "type": "reasoning",
                "severity": "medium",
                "message": "Limited explanation of how evidence supports claims",
                "suggestion": "Explain the reasoning connecting your evidence to your claims. Show why the evidence supports your argument."
            })
        
        # Structure issues
        structure = results["argument_structure"]
        if not structure["has_thesis"]:
            issues.append({
                "type": "structure",
                "severity": "high",
                "message": "No clear thesis statement identified",
                "suggestion": "Include a clear thesis statement in your introduction that states your main argument."
            })
        
        if structure["grounds_per_claim"] < 1.0 and structure["total_claims"] > 0:
            issues.append({
                "type": "evidence_ratio",
                "severity": "medium",
                "message": f"Insufficient evidence per claim ({structure['grounds_per_claim']:.1f} evidence per claim)",
                "suggestion": "Provide at least one piece of evidence for each main claim you make."
            })
        
        # Rebuttal (optional but valuable)
        if not structure["has_counterarguments"]:
            issues.append({
                "type": "counterarguments",
                "severity": "low",
                "message": "No counterarguments addressed",
                "suggestion": "Consider acknowledging and addressing opposing viewpoints to strengthen your argument."
            })
        
        return issues
    
    def _calculate_argument_score(self, results: Dict[str, Any]) -> float:
        """Calculate overall argument strength score"""
        weights = {
            "claim": 0.35,
            "evidence": 0.35,
            "warrant": 0.20,
            "rebuttal": 0.10
        }
        
        score = (
            results["claim_score"] * weights["claim"] +
            results["evidence_score"] * weights["evidence"] +
            results["warrant_score"] * weights["warrant"] +
            results["rebuttal_score"] * weights["rebuttal"]
        )
        
        return round(score, 2)

