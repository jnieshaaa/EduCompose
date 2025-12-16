"""
Transformer-based Claim Classifier with Fine-tuned Model Support

Uses a fine-tuned DistilBERT model for fast and accurate argument classification.
"""

import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from enum import Enum
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch.nn.functional as F

logger = logging.getLogger(__name__)

class ArgumentComponent(str, Enum):
    """Argumentation component types"""
    CLAIM = "claim"
    PREMISE = "premise"
    EVIDENCE = "evidence"
    COUNTERCLAIM = "counterclaim"
    BACKGROUND = "background"
    UNKNOWN = "unknown"

class TransformerClaimClassifier:
    """
    Fine-tuned DistilBERT classifier for argumentation components.
    Fast, accurate, and optimized for production use.
    """

    def __init__(
        self,
        model_name: str = "distilbert-base-uncased",
        use_fine_tuned: bool = True,
        fine_tuned_model_path: Optional[str] = None,
        device: str = "cpu"
    ):
        """
        Initialize the classifier.

        Args:
            model_name: Base model name or path
                - "distilbert-base-uncased" (default, fastest)
                - "przvl/persuasive_essays_distilbert_uncased" (pre-fine-tuned)
                - Custom path to fine-tuned model
            use_fine_tuned: If True, load a fine-tuned model (preferred)
            fine_tuned_model_path: Path to fine-tuned model
            device: "cuda" or "cpu"
        """
        self.model_name = model_name
        self.device = device
        self.fine_tuned_model_path = fine_tuned_model_path
        self.tokenizer = None
        self.model = None
        self._initialized = False

        # Label mapping
        self.label2id = {
            "claim": 0,
            "premise": 1,
            "evidence": 2,
            "counterclaim": 3,
            "background": 4
        }
        self.id2label = {v: k for k, v in self.label2id.items()}

        # Prefer the local fine-tuned model by default; require it if requested
        if use_fine_tuned and self.fine_tuned_model_path is None:
            backend_root = Path(__file__).parent.parent.parent
            default_path = backend_root / "my_finetuned_distilbert"
            self.fine_tuned_model_path = str(default_path)

        if use_fine_tuned and self.fine_tuned_model_path:
            if not Path(self.fine_tuned_model_path).exists():
                error_msg = (
                    f"Fine-tuned DistilBERT expected at {self.fine_tuned_model_path} "
                    "but was not found. Provide a valid fine_tuned_model_path or set "
                    "use_fine_tuned=False explicitly."
                )
                logger.error(error_msg)
                raise FileNotFoundError(error_msg)

        # Initialize model
        self._initialize(use_fine_tuned, self.fine_tuned_model_path)

    def _initialize(self, use_fine_tuned: bool = False, model_path: Optional[str] = None):
        """Load tokenizer and model"""
        if self._initialized:
            return

        try:
            # Choose model path
            if use_fine_tuned and model_path:
                load_path = model_path
                logger.info(f"Loading fine-tuned model from: {load_path}")
            else:
                load_path = self.model_name
                logger.info(f"Loading base model: {load_path}")

            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(load_path)

            # Load model
            # For fine-tuned models, don't pass num_labels/id2label/label2id as they're in the model config
            # For base models, we need to specify them
            if use_fine_tuned and model_path:
                # Fine-tuned model: let it load its own config
                self.model = AutoModelForSequenceClassification.from_pretrained(load_path)
                # Update label mappings from model config if available
                if hasattr(self.model.config, 'id2label') and self.model.config.id2label:
                    self.id2label = self.model.config.id2label
                    # Convert id2label to label2id
                    self.label2id = {v: int(k) for k, v in self.id2label.items()}
            else:
                # Base model: specify labels
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    load_path,
                    num_labels=5,
                    id2label=self.id2label,
                    label2id=self.label2id
                )

            # Move to device
            self.model.to(self.device)
            self.model.eval()

            self._initialized = True
            logger.info(f"Model initialized successfully on device: {self.device}")

        except Exception as e:
            logger.error(f"Failed to initialize model: {e}")
            self._initialized = False
            raise

    def classify_sentence(
        self,
        sentence: str,
        return_confidence: bool = True,
        return_all_scores: bool = False
    ) -> Dict[str, Any]:
        """
        Classify a single sentence.

        Args:
            sentence: Text to classify
            return_confidence: Include confidence score
            return_all_scores: Include scores for all classes

        Returns:
            Dictionary with classification results
        """
        if not sentence or len(sentence.strip()) < 5:
            return {
                "component": ArgumentComponent.UNKNOWN.value,
                "confidence": 0.0,
                "all_scores": {} if return_all_scores else None
            }

        try:
            # Tokenize
            inputs = self.tokenizer(
                sentence,
                return_tensors="pt",
                truncation=True,
                max_length=128,
                padding=True
            ).to(self.device)

            # Forward pass
            with torch.no_grad():
                outputs = self.model(**inputs)

            # Get predictions
            logits = outputs.logits
            probabilities = F.softmax(logits, dim=-1)
            predicted_class = torch.argmax(probabilities, dim=-1).item()
            confidence = probabilities[0][predicted_class].item()

            # Map to component
            component = self.id2label.get(predicted_class, "unknown")

            result = {
                "component": component,
                "confidence": confidence
            }

            if return_all_scores:
                all_scores = probabilities[0].detach().cpu().numpy().tolist()
                result["all_scores"] = {
                    self.id2label[i]: score for i, score in enumerate(all_scores)
                }

            return result

        except Exception as e:
            logger.error(f"Classification error: {e}")
            return {
                "component": ArgumentComponent.UNKNOWN.value,
                "confidence": 0.0,
                "all_scores": {} if return_all_scores else None
            }

    def classify_sentences(
        self,
        sentences: List[str],
        batch_size: int = 16,
        return_confidence: bool = True,
        return_all_scores: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Classify multiple sentences with batching.

        Args:
            sentences: List of sentences
            batch_size: Batch size for processing
            return_confidence: Include confidence scores
            return_all_scores: Include all class scores

        Returns:
            List of classification results
        """
        results = []

        # Process in batches for efficiency
        for i in range(0, len(sentences), batch_size):
            batch_sentences = sentences[i:i + batch_size]

            try:
                # Tokenize batch
                inputs = self.tokenizer(
                    batch_sentences,
                    return_tensors="pt",
                    truncation=True,
                    max_length=128,
                    padding=True
                ).to(self.device)

                # Forward pass
                with torch.no_grad():
                    outputs = self.model(**inputs)

                # Get predictions
                logits = outputs.logits
                probabilities = F.softmax(logits, dim=-1)
                predicted_classes = torch.argmax(probabilities, dim=-1)

                # Process each result in batch
                for j, sentence in enumerate(batch_sentences):
                    predicted_class = predicted_classes[j].item()
                    confidence = probabilities[j][predicted_class].item()
                    component = self.id2label.get(predicted_class, "unknown")

                    result = {
                        "component": component,
                        "confidence": confidence
                    }

                    if return_all_scores:
                        all_scores = probabilities[j].detach().cpu().numpy().tolist()
                        result["all_scores"] = {
                            self.id2label[k]: score for k, score in enumerate(all_scores)
                        }

                    results.append(result)

            except Exception as e:
                logger.error(f"Batch classification error: {e}")
                # Add fallback results
                for _ in batch_sentences:
                    results.append({
                        "component": ArgumentComponent.UNKNOWN.value,
                        "confidence": 0.0,
                        "all_scores": {} if return_all_scores else None
                    })

        return results

    def classify_text(
        self,
        text: str,
        return_confidence: bool = True,
        return_all_scores: bool = False
    ) -> Dict[str, Any]:
        """
        Classify all sentences in a text.

        Args:
            text: Full text document
            return_confidence: Include confidence scores
            return_all_scores: Include all class scores

        Returns:
            Dictionary with overall classification results
        """
        # Prioritize regex-based sentence splitting (no spaCy dependency)
        # Fine-tuned models work better without spaCy dependency
        import re
        # Use regex for sentence splitting - works well for most texts
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if s.strip() and len(s) > 5]
        # Fallback to simpler splitting if needed
        if not sentences:
            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip() and len(s) > 5]

        # Classify all sentences
        sentence_classifications = self.classify_sentences(
            sentences,
            return_confidence=return_confidence,
            return_all_scores=return_all_scores
        )

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

    def is_available(self) -> bool:
        """Check if model is ready"""
        return self._initialized and self.model is not None and self.tokenizer is not None


# Convenience function
def get_claim_classifier(
    use_fine_tuned: bool = True,
    fine_tuned_model_path: Optional[str] = None,
    device: str = "cpu"
) -> TransformerClaimClassifier:
    """
    Get a claim classifier instance.

    Args:
        use_fine_tuned: Load fine-tuned model (default: True)
        fine_tuned_model_path: Path to fine-tuned model
        device: "cuda" or "cpu"

    Returns:
        TransformerClaimClassifier instance
    """
    return TransformerClaimClassifier(
        use_fine_tuned=use_fine_tuned,
        fine_tuned_model_path=fine_tuned_model_path,
        device=device
    )
