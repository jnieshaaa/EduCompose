"""
Argument Mining Module
Implements Toulmin's Model of Argumentation: Claims, Grounds, Warrants, Rebuttals
"""
import re
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class ArgumentMiner:
    """Analyzes argumentative structure using Toulmin's model"""
    
    def __init__(
        self, 
        use_transformer_classifier: bool = True,
        use_fine_tuned: bool = True,
        fine_tuned_model_path: Optional[str] = None,
        device: str = "cpu"
    ):
        """
        Initialize argument miner
        
        Args:
            use_transformer_classifier: If True, use transformer-based claim classifier
                                       for enhanced accuracy (default: True).
                                       Falls back to pattern-based if transformers unavailable.
            use_fine_tuned: If True, use fine-tuned model (default: True)
            fine_tuned_model_path: Path to fine-tuned model (defaults to backend/my_finetuned_distilbert)
            device: "cuda" or "cpu" (default: "cpu")
        """
        self.use_transformer_classifier = use_transformer_classifier
        self.use_fine_tuned = use_fine_tuned
        self.fine_tuned_model_path = fine_tuned_model_path
        self.device = device
        self.transformer_classifier = None
        self._transformer_available = False  # Track if transformer is actually available
        
        # Claim indicators
        self.claim_indicators = [
            "i believe", "i think", "i argue", "i claim", "i propose",
            "thesis", "main point", "position", "viewpoint", "opinion",
            "should", "must", "ought to", "need to", "is necessary",
            "the primary", "the main", "the key", "the central",
            "ultimately", "in conclusion", "requires", "defines",
            "presents", "demonstrates that", "shows that"
        ]
        
        # Evidence/ground indicators
        self.evidence_indicators = [
            "for example", "for instance", "specifically", "according to",
            "research shows", "studies indicate", "evidence suggests",
            "data shows", "statistics", "findings", "demonstrates",
            "proves", "illustrates", "supports", "indicates",
            "today", "in", "when", "if one", "the user",
            "streaming", "online", "platform", "services offer",
            "can become", "leads to", "results in"
        ]
        
        # Warrant indicators (reasoning/justification)
        self.warrant_indicators = [
            "because", "since", "due to", "as a result of", "therefore",
            "thus", "consequently", "hence", "so", "this means",
            "which implies", "suggests that", "indicates that",
            "makes", "forces", "causes", "overwhelmed by",
            "the brain", "defaults to", "attributed to",
            "the promise of", "makes the reality", "leads to"
        ]
        
        # Rebuttal indicators
        self.rebuttal_indicators = [
            "however", "although", "even though", "despite", "nevertheless",
            "on the other hand", "in contrast", "some may argue",
            "it could be argued", "critics claim", "opponents argue",
            "admittedly", "granted", "while it is true",
            "yet", "but", "rather", "instead"
        ]
        
        # Qualifier indicators (degree of certainty)
        self.qualifier_indicators = [
            "certainly", "probably", "presumably", "likely", "possibly",
            "perhaps", "maybe", "in most cases", "always", "never",
            "definitely", "absolutely", "clearly", "obviously",
            "conceivably", "for the most part", "usually", "frequently"
        ]
    
    def _ensure_transformer_classifier_loaded(self):
        """Lazy load transformer-based claim classifier if requested and available"""
        if not self.use_transformer_classifier:
            return None
        
        if self.transformer_classifier is None:
            try:
                from .claim_classifier import TransformerClaimClassifier
                from pathlib import Path
                
                # Get default model path if not provided
                if self.use_fine_tuned and self.fine_tuned_model_path is None:
                    # Get backend root (parent of app/)
                    backend_root = Path(__file__).parent.parent.parent
                    self.fine_tuned_model_path = str(backend_root / "my_finetuned_distilbert")
                
                # Initialize classifier with fine-tuned model if requested
                if self.use_fine_tuned and self.fine_tuned_model_path:
                    self.transformer_classifier = TransformerClaimClassifier(
                        use_fine_tuned=True,
                        fine_tuned_model_path=self.fine_tuned_model_path,
                        device=self.device
                    )
                else:
                    self.transformer_classifier = TransformerClaimClassifier(device=self.device)
                
                # Check if it's actually available
                if not self.transformer_classifier.is_available():
                    logger.info(
                        "Transformer classifier not available. "
                        "Using pattern-based classification."
                    )
                    self.transformer_classifier = False  # Mark as unavailable
                    self._transformer_available = False
                else:
                    # Transformer is available (DistilBERT or fine-tuned)
                    self._transformer_available = True
                    if self.use_fine_tuned:
                        logger.info("Fine-tuned DistilBERT available")
                    else:
                        logger.info("DistilBERT available")
            except ImportError as e:
                logger.debug(f"Transformer classifier import failed: {e}")
                self.transformer_classifier = False  # Mark as unavailable
                self._transformer_available = False
            except Exception as e:
                logger.warning(f"Failed to load transformer classifier: {e}. Using pattern-based classification.")
                self.transformer_classifier = False  # Mark as unavailable
                self._transformer_available = False
        
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
            "qualifiers": [],
            "argument_structure": {},
            "argument_issues": [],
            "toulmin_analysis": {}
        }
        
        if not text or len(text.strip()) < 50:
            return results
        
        # Ensure transformer is loaded early to set _transformer_available flag
        if self.use_transformer_classifier:
            self._ensure_transformer_classifier_loaded()
        
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
        
        # Extract qualifiers
        qualifiers = self._extract_qualifiers(text, sentences)
        results["qualifiers"] = qualifiers
        results["qualifier_score"] = self._calculate_qualifier_score(qualifiers)
        
        # Analyze argument structure
        structure = self._analyze_argument_structure(claims, grounds, warrants, rebuttals, qualifiers)
        results["argument_structure"] = structure
        
        # Toulmin model completeness
        toulmin_analysis = self._analyze_toulmin_completeness(claims, grounds, warrants, rebuttals, qualifiers)
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
        """Segment text into sentences using regex-based splitting"""
        # Use regex-based sentence splitting (no spaCy dependency)
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if s.strip() and len(s) > 1]
        # Also handle cases where punctuation might be missing spaces
        if not sentences:
            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip() and len(s) > 1]
        return sentences
    
    def _identify_thesis(self, paragraphs: List[str]) -> Optional[Dict[str, Any]]:
        """Identify thesis statement, typically in first paragraph"""
        if not paragraphs:
            return None
        
        first_paragraph = paragraphs[0]
        text_lower = first_paragraph.lower()
        sentences = self._segment_sentences(first_paragraph)
        
        if not sentences:
            return None
        
        # Check for explicit thesis indicators
        for indicator in self.claim_indicators:
            if indicator in text_lower:
                # Find sentence containing indicator
                for sentence in sentences:
                    if indicator in sentence.lower():
                        return {
                            "sentence": sentence,
                            "paragraph": 0,
                            "confidence": "high"
                        }
        
        # Enhanced: Look for thesis patterns - often contains contrast/paradox language
        thesis_patterns = [
            "paradox", "yet", "however", "but", "although",
            "while", "despite", "tension between", "conflict",
            "challenge", "problem", "issue"
        ]
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            # Thesis often contains contrasting ideas
            has_contrast = any(pattern in sentence_lower for pattern in thesis_patterns)
            # Thesis is usually substantial (not too short)
            is_substantial = len(sentence.split()) >= 10
            # Thesis often appears early in first paragraph
            if has_contrast and is_substantial:
                return {
                    "sentence": sentence,
                    "paragraph": 0,
                    "confidence": "high"
                }
        
        # Look for the longest, most complex sentence in first paragraph (often the thesis)
        if sentences:
            longest_sentence = max(sentences, key=lambda s: len(s.split()))
            # If it's substantial and appears in first half of paragraph
            if len(longest_sentence.split()) >= 15 and sentences.index(longest_sentence) < len(sentences) / 2:
                return {
                    "sentence": longest_sentence,
                    "paragraph": 0,
                    "confidence": "medium"
                }
        
        # Fallback: return first sentence as potential thesis
        if sentences:
            return {
                "sentence": sentences[0],
                "paragraph": 0,
                "confidence": "medium"
            }
        
        return None
    
    def _extract_claims(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Extract claim statements using a hybrid of transformer classifier and pattern matching"""
        claims = []
        found_indices = set()
        
        # 1. Try transformer-based classification
        transformer_classifier = self._ensure_transformer_classifier_loaded()
        if transformer_classifier:
            try:
                classifications = transformer_classifier.classify_sentences(sentences)
                for i, (sentence, classification) in enumerate(zip(sentences, classifications)):
                    component = classification.get("component", "unknown")
                    confidence = classification.get("confidence", 0.0)
                    
                    if component in ["claim", "premise"] and confidence > 0.4: # Lowered threshold slightly for base model
                        claims.append({
                            "sentence_index": i,
                            "sentence": sentence,
                            "indicator": f"transformer-{component}",
                            "type": "claim",
                            "confidence": confidence,
                            "classification_method": "transformer"
                        })
                        found_indices.add(i)
            except Exception as e:
                logger.warning(f"Transformer classification failed: {e}")
        
        # 2. Pattern-based extraction (supplemental)
        for i, sentence in enumerate(sentences):
            if i in found_indices:
                continue
            
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
                    found_indices.add(i)
                    break
                    
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
                
                # If transformer found evidence, use it
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
            
            # Pattern-based indicators
            for indicator in self.evidence_indicators:
                if indicator in sentence_lower:
                    grounds.append({
                        "sentence_index": i,
                        "sentence": sentence,
                        "indicator": indicator,
                        "type": "evidence",
                        "classification_method": "pattern"
                    })
                    pattern_found_indices.add(i)
                    break
        
        return grounds
    
    def _extract_warrants(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Extract warrant statements (reasoning/justification)"""
        warrants = []
        text_lower = text.lower()
        found_indices = set()
        
        # Pattern-based extraction
        for i, sentence in enumerate(sentences):
            sentence_lower = sentence.lower()
            for indicator in self.warrant_indicators:
                if indicator in sentence_lower:
                    warrants.append({
                        "sentence_index": i,
                        "sentence": sentence,
                        "indicator": indicator,
                        "type": "warrant",
                        "classification_method": "pattern"
                    })
                    found_indices.add(i)
                    break
        
        # Enhanced: Detect explanatory/causal reasoning sentences using pattern matching
        causal_verbs = ["causes", "leads to", "results in", "creates", "produces",
                       "generates", "triggers", "forces", "makes", "enables",
                       "allows", "prevents", "blocks", "defaults to"]
        explanatory_phrases = ["this means", "which means", "this suggests",
                              "this indicates", "this implies", "as a result",
                              "the result is", "the consequence"]
        
        for i, sentence in enumerate(sentences):
            if i in found_indices:
                continue
            
            sentence_lower = sentence.lower()
            
            # Check for causal verbs
            has_causal = any(verb in sentence_lower for verb in causal_verbs)
            
            # Check for explanatory phrases
            has_explanatory = any(phrase in sentence_lower for phrase in explanatory_phrases)
            
            # Check for sentences that explain "why" (often contain "for" or "to" + verb)
            has_reasoning = any(word in sentence_lower for word in ["due to", "because of", 
                                                                   "attributed to", "the fault lies"])
            
            # Check for sentences explaining psychological/mental processes
            mental_terms = ["brain", "mind", "cognitive", "psychological", "mental",
                           "overwhelmed", "exhausting", "feel", "think", "perceive"]
            has_mental = any(term in sentence_lower for term in mental_terms)
            
            # Warrants often explain consequences or mechanisms
            # Check length using simple word count (no spaCy dependency)
            is_substantial = len(sentence.split()) >= 10
            
            if (has_causal or has_explanatory or has_reasoning) or \
               (has_mental and is_substantial):
                warrants.append({
                    "sentence_index": i,
                    "sentence": sentence,
                    "indicator": "explanatory_reasoning",
                    "type": "warrant",
                    "classification_method": "pattern"
                })
                found_indices.add(i)
        
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

    def _extract_qualifiers(self, text: str, sentences: List[str]) -> List[Dict[str, Any]]:
        """Extract qualifier statements (words indicating degree of certainty)"""
        qualifiers = []
        for i, sentence in enumerate(sentences):
            sentence_lower = sentence.lower()
            found_indicators = []
            for indicator in self.qualifier_indicators:
                if indicator in sentence_lower:
                    found_indicators.append(indicator)
            
            if found_indicators:
                qualifiers.append({
                    "sentence_index": i,
                    "sentence": sentence,
                    "indicators": found_indicators,
                    "type": "qualifier",
                    "classification_method": "pattern"
                })
        return qualifiers

    def _calculate_qualifier_score(self, qualifiers: List[Dict]) -> float:
        """Calculate score for presence of qualifiers"""
        if not qualifiers:
            return 50.0  # Qualifiers are good but simple presence is enough
        
        score = 80.0
        if len(qualifiers) >= 2:
            score += 20.0
        
        return min(100.0, score)
    
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
                                   warrants: List[Dict], rebuttals: List[Dict],
                                   qualifiers: List[Dict]) -> Dict[str, Any]:
        """Analyze overall argument structure"""
        return {
            "total_claims": len(claims),
            "total_grounds": len(grounds),
            "total_warrants": len(warrants),
            "total_rebuttals": len(rebuttals),
            "total_qualifiers": len(qualifiers),
            "grounds_per_claim": len(grounds) / len(claims) if claims else 0,
            "has_thesis": len(claims) > 0,
            "has_evidence": len(grounds) > 0,
            "has_reasoning": len(warrants) > 0,
            "has_counterarguments": len(rebuttals) > 0,
            "has_qualifiers": len(qualifiers) > 0
        }
    
    def _analyze_toulmin_completeness(self, claims: List[Dict], grounds: List[Dict],
                                     warrants: List[Dict], rebuttals: List[Dict],
                                     qualifiers: List[Dict]) -> Dict[str, Any]:
        """Analyze completeness of Toulmin's model components"""
        completeness = {
            "has_claim": len(claims) > 0,
            "has_ground": len(grounds) > 0,
            "has_warrant": len(warrants) > 0,
            "has_rebuttal": len(rebuttals) > 0,
            "has_qualifier": len(qualifiers) > 0,
            "completeness_score": 0.0
        }
        
        # Calculate completeness
        score = 0.0
        if completeness["has_claim"]:
            score += 30.0
        if completeness["has_ground"]:
            score += 30.0
        if completeness["has_warrant"]:
            score += 20.0
        if completeness["has_rebuttal"]:
            score += 10.0
        if completeness["has_qualifier"]:
            score += 10.0
        
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
            
        # Qualifier issues
        if not structure["has_qualifiers"]:
            issues.append({
                "type": "qualifiers",
                "severity": "low",
                "message": "No qualifiers used to moderate claims",
                "suggestion": "Use qualifiers (e.g., 'probably', 'mostly', 'certainly') to indicate the strength or limits of your claims."
            })
        
        return issues
    
    def _calculate_argument_score(self, results: Dict[str, Any]) -> float:
        """Calculate overall argument strength score"""
        weights = {
            "claim": 0.30,
            "evidence": 0.30,
            "warrant": 0.20,
            "rebuttal": 0.10,
            "qualifier": 0.10
        }
        
        score = (
            results["claim_score"] * weights["claim"] +
            results["evidence_score"] * weights["evidence"] +
            results["warrant_score"] * weights["warrant"] +
            results["rebuttal_score"] * weights["rebuttal"] +
            results.get("qualifier_score", 50.0) * weights["qualifier"]
        )
        
        return round(score, 2)

