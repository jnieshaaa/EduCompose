"""
Transformer-based Claim Classifier
Uses pre-trained transformer models to classify sentences into argumentation components:
- Claim: Main assertions or thesis statements
- Premise: Supporting statements for claims
- Evidence: Factual support, examples, data
- Counterclaim: Opposing viewpoints or rebuttals
- Background: Contextual information
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum

logger = logging.getLogger(__name__)

# Lazy import to avoid startup errors
_transformers_available = None
_zero_shot_classifier = None
_sequence_classifier = None


class ArgumentComponent(str, Enum):
    """Argumentation component types"""
    CLAIM = "claim"
    PREMISE = "premise"
    EVIDENCE = "evidence"
    COUNTERCLAIM = "counterclaim"
    BACKGROUND = "background"
    UNKNOWN = "unknown"


def _check_transformers_available() -> bool:
    """Check if transformers library is available"""
    global _transformers_available
    if _transformers_available is None:
        try:
            import transformers
            import torch
            _transformers_available = True
            logger.info("Transformers library available")
        except ImportError as e:
            _transformers_available = False
            logger.warning(
                f"Transformers library not available: {e}. "
                "Install with: pip install transformers torch"
            )
    return _transformers_available


class TransformerClaimClassifier:
    """
    Transformer-based classifier for argumentation components.
    
    Uses a zero-shot classification approach with RoBERTa, which allows
    classifying sentences into argumentation components without fine-tuning.
    
    Alternatively, can use a fine-tuned model if available.
    """
    
    def __init__(self, model_name: str = "roberta-large-mnli", use_zero_shot: bool = True):
        """
        Initialize the transformer-based claim classifier.
        
        Args:
            model_name: Name of the transformer model to use.
                       For zero-shot: "roberta-large-mnli" (recommended) or "facebook/bart-large-mnli"
                       For fine-tuned: specify a model fine-tuned on argumentation tasks
            use_zero_shot: If True, use zero-shot classification (no fine-tuning needed).
                          If False, use sequence classification (requires fine-tuned model)
        """
        self.model_name = model_name
        self.use_zero_shot = use_zero_shot
        self.classifier = None
        self.tokenizer = None
        self.model = None
        self._initialized = False
        
        # Argumentation component labels for zero-shot classification
        self.component_labels = [
            "This is a claim or main argument",
            "This is a premise supporting an argument",
            "This is evidence like examples, data, or facts",
            "This is a counterclaim or opposing viewpoint",
            "This is background or contextual information"
        ]
        
        # Mapping from zero-shot labels to argumentation components
        self.label_mapping = {
            "claim": ArgumentComponent.CLAIM,
            "premise": ArgumentComponent.PREMISE,
            "evidence": ArgumentComponent.EVIDENCE,
            "counterclaim": ArgumentComponent.COUNTERCLAIM,
            "background": ArgumentComponent.BACKGROUND
        }
    
    def _initialize(self):
        """Lazy initialization of transformer model"""
        if self._initialized:
            return
        
        if not _check_transformers_available():
            logger.warning(
                "Transformers not available. Claim classifier will use fallback methods."
            )
            self._initialized = True
            return
        
        try:
            from transformers import (
                pipeline,
                AutoTokenizer,
                AutoModelForSequenceClassification
            )
            
            if self.use_zero_shot:
                # Use zero-shot classification pipeline
                logger.info(f"Loading zero-shot classifier: {self.model_name}")
                self.classifier = pipeline(
                    "zero-shot-classification",
                    model=self.model_name,
                    device=-1  # Use CPU by default (-1), set to 0+ for GPU
                )
            else:
                # Use sequence classification (requires fine-tuned model)
                logger.info(f"Loading sequence classifier: {self.model_name}")
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
                self.model.eval()
            
            self._initialized = True
            logger.info("Transformer-based claim classifier initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize transformer model: {e}")
            self._initialized = True  # Mark as initialized to avoid repeated attempts
    
    def is_available(self) -> bool:
        """Check if transformer-based classification is available"""
        self._initialize()
        return _check_transformers_available() and (
            self.classifier is not None or self.model is not None
        )
    
    def classify_sentence(
        self,
        sentence: str,
        return_confidence: bool = True
    ) -> Dict[str, Any]:
        """
        Classify a single sentence into an argumentation component.
        
        Args:
            sentence: Sentence text to classify
            return_confidence: If True, include confidence scores
            
        Returns:
            Dictionary with classification results:
            {
                "component": "claim" | "premise" | "evidence" | "counterclaim" | "background" | "unknown",
                "confidence": float,
                "all_scores": Dict[str, float]  # if return_confidence
            }
        """
        if not sentence or len(sentence.strip()) < 5:
            return {
                "component": ArgumentComponent.UNKNOWN.value,
                "confidence": 0.0,
                "all_scores": {}
            }
        
        self._initialize()
        
        if not self.is_available():
            # Fallback to simple heuristics if transformers not available
            return self._fallback_classify(sentence, return_confidence)
        
        try:
            if self.use_zero_shot:
                return self._zero_shot_classify(sentence, return_confidence)
            else:
                return self._sequence_classify(sentence, return_confidence)
        except Exception as e:
            logger.warning(f"Transformer classification failed: {e}. Using fallback.")
            return self._fallback_classify(sentence, return_confidence)
    
    def _zero_shot_classify(
        self,
        sentence: str,
        return_confidence: bool
    ) -> Dict[str, Any]:
        """Classify using zero-shot classification"""
        try:
            result = self.classifier(sentence, self.component_labels)
            
            # Map the predicted label to our argumentation components
            predicted_label = result["labels"][0]
            confidence = result["scores"][0]
            
            # Simple mapping based on label position
            # In practice, you might want more sophisticated mapping
            label_index = result["labels"].index(predicted_label)
            
            component_map = {
                0: ArgumentComponent.CLAIM,
                1: ArgumentComponent.PREMISE,
                2: ArgumentComponent.EVIDENCE,
                3: ArgumentComponent.COUNTERCLAIM,
                4: ArgumentComponent.BACKGROUND
            }
            
            component = component_map.get(label_index, ArgumentComponent.UNKNOWN)
            
            result_dict = {
                "component": component.value,
                "confidence": confidence
            }
            
            if return_confidence:
                result_dict["all_scores"] = dict(zip(result["labels"], result["scores"]))
            
            return result_dict
            
        except Exception as e:
            logger.error(f"Zero-shot classification error: {e}")
            return self._fallback_classify(sentence, return_confidence)
    
    def _sequence_classify(
        self,
        sentence: str,
        return_confidence: bool
    ) -> Dict[str, Any]:
        """Classify using sequence classification (requires fine-tuned model)"""
        try:
            import torch
            import torch.nn.functional as F
            
            # Tokenize and encode
            inputs = self.tokenizer(
                sentence,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            
            # Get model predictions
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probabilities = F.softmax(logits, dim=-1)
                predicted_class = torch.argmax(probabilities, dim=-1).item()
                confidence = probabilities[0][predicted_class].item()
            
            # Map predicted class to argumentation component
            # This assumes the model was fine-tuned with these classes in order
            component_map = {
                0: ArgumentComponent.CLAIM,
                1: ArgumentComponent.PREMISE,
                2: ArgumentComponent.EVIDENCE,
                3: ArgumentComponent.COUNTERCLAIM,
                4: ArgumentComponent.BACKGROUND
            }
            
            component = component_map.get(predicted_class, ArgumentComponent.UNKNOWN)
            
            result_dict = {
                "component": component.value,
                "confidence": confidence
            }
            
            if return_confidence:
                # Get all probabilities
                all_probs = probabilities[0].tolist()
                all_scores = {
                    component_map.get(i, "unknown"): prob
                    for i, prob in enumerate(all_probs)
                }
                result_dict["all_scores"] = all_scores
            
            return result_dict
            
        except Exception as e:
            logger.error(f"Sequence classification error: {e}")
            return self._fallback_classify(sentence, return_confidence)
    
    def _fallback_classify(
        self,
        sentence: str,
        return_confidence: bool
    ) -> Dict[str, Any]:
        """
        Fallback classification using simple heuristics.
        This is used when transformers are not available.
        """
        sentence_lower = sentence.lower()
        
        # Simple keyword-based classification
        claim_keywords = ["believe", "think", "argue", "claim", "propose", "should", "must", "thesis"]
        evidence_keywords = ["example", "according to", "research shows", "study", "data", "statistics"]
        counterclaim_keywords = ["however", "although", "despite", "nevertheless", "on the other hand"]
        
        # Score each component type
        scores = {
            ArgumentComponent.CLAIM: 0.0,
            ArgumentComponent.EVIDENCE: 0.0,
            ArgumentComponent.COUNTERCLAIM: 0.0,
            ArgumentComponent.PREMISE: 0.3,  # Default moderate score for premise
            ArgumentComponent.BACKGROUND: 0.2  # Default low score for background
        }
        
        # Check for claim indicators
        if any(keyword in sentence_lower for keyword in claim_keywords):
            scores[ArgumentComponent.CLAIM] = 0.8
        
        # Check for evidence indicators
        if any(keyword in sentence_lower for keyword in evidence_keywords):
            scores[ArgumentComponent.EVIDENCE] = 0.8
        
        # Check for counterclaim indicators
        if any(keyword in sentence_lower for keyword in counterclaim_keywords):
            scores[ArgumentComponent.COUNTERCLAIM] = 0.8
        
        # Find component with highest score
        best_component = max(scores.items(), key=lambda x: x[1])
        
        result_dict = {
            "component": best_component[0].value,
            "confidence": best_component[1]
        }
        
        if return_confidence:
            result_dict["all_scores"] = {
                comp.value: score for comp, score in scores.items()
            }
        
        return result_dict
    
    def classify_sentences(
        self,
        sentences: List[str],
        batch_size: int = 8,
        return_confidence: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Classify multiple sentences.
        
        Args:
            sentences: List of sentence strings
            batch_size: Batch size for processing (for sequence classification)
            return_confidence: If True, include confidence scores
            
        Returns:
            List of classification results
        """
        results = []
        
        self._initialize()
        
        if not self.is_available() or not self.use_zero_shot:
            # Process one by one
            for sentence in sentences:
                results.append(self.classify_sentence(sentence, return_confidence))
        else:
            # Batch processing for zero-shot (if supported by pipeline)
            try:
                for sentence in sentences:
                    results.append(self.classify_sentence(sentence, return_confidence))
            except Exception as e:
                logger.warning(f"Batch processing failed: {e}. Processing individually.")
                for sentence in sentences:
                    results.append(self.classify_sentence(sentence, return_confidence))
        
        return results
    
    def classify_text(
        self,
        text: str,
        return_confidence: bool = True
    ) -> Dict[str, Any]:
        """
        Classify all sentences in a text document.
        
        Args:
            text: Full text document
            return_confidence: If True, include confidence scores
            
        Returns:
            Dictionary with classification results for all sentences:
            {
                "sentences": List[Dict[str, Any]],
                "component_counts": Dict[str, int],
                "component_distribution": Dict[str, float]
            }
        """
        from .spacy_utils import load_spacy_model
        
        # Segment into sentences
        nlp = load_spacy_model("en_core_web_lg")
        if nlp:
            doc = nlp(text)
            sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        else:
            # Fallback to simple sentence splitting
            import re
            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 5]
        
        # Classify all sentences
        sentence_classifications = self.classify_sentences(sentences, return_confidence=return_confidence)
        
        # Calculate statistics
        component_counts = {}
        for result in sentence_classifications:
            comp = result["component"]
            component_counts[comp] = component_counts.get(comp, 0) + 1
        
        total = len(sentence_classifications)
        component_distribution = {
            comp: count / total if total > 0 else 0.0
            for comp, count in component_counts.items()
        }
        
        return {
            "sentences": sentence_classifications,
            "component_counts": component_counts,
            "component_distribution": component_distribution,
            "total_sentences": total
        }


# Convenience function for easy access
def get_claim_classifier(
    model_name: str = "roberta-large-mnli",
    use_zero_shot: bool = True
) -> TransformerClaimClassifier:
    """
    Get or create a claim classifier instance.
    
    Args:
        model_name: Transformer model name
        use_zero_shot: Whether to use zero-shot classification
        
    Returns:
        TransformerClaimClassifier instance
    """
    return TransformerClaimClassifier(model_name=model_name, use_zero_shot=use_zero_shot)

