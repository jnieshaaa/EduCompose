"""
Claim Classification Service
Service wrapper for the transformer-based claim classifier with fine-tuned model support.
"""
import json
import sys
import os
from pathlib import Path
from typing import Dict, Any, Optional, List

from ..nlp_modules.claim_classifier import get_claim_classifier

# Get the backend root directory (parent of app/)
BACKEND_ROOT = Path(__file__).parent.parent.parent
FINE_TUNED_MODEL_PATH = BACKEND_ROOT / "my_finetuned_distilbert"


def get_model_path() -> str:
    """Get the absolute path to the fine-tuned model"""
    return str(FINE_TUNED_MODEL_PATH)


def classify_argument(
    text: str,
    use_fine_tuned: bool = True,
    fine_tuned_model_path: Optional[str] = None,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Classify a text using the claim classifier.
    
    Args:
        text: Text to classify
        use_fine_tuned: Whether to use fine-tuned model
        fine_tuned_model_path: Path to fine-tuned model (defaults to backend/my_finetuned_distilbert)
        device: "cuda" or "cpu"
    
    Returns:
        Dictionary with classification results
    """
    if fine_tuned_model_path is None:
        fine_tuned_model_path = get_model_path()
    
    # Load the classifier
    classifier = get_claim_classifier(
        use_fine_tuned=use_fine_tuned,
        fine_tuned_model_path=fine_tuned_model_path,
        device=device
    )
    
    # Classify
    result = classifier.classify_sentence(text)
    return result


def classify_sentences(
    sentences: List[str],
    use_fine_tuned: bool = True,
    fine_tuned_model_path: Optional[str] = None,
    device: str = "cpu",
    batch_size: int = 16
) -> list[Dict[str, Any]]:
    """
    Classify multiple sentences.
    
    Args:
        sentences: List of sentences to classify
        use_fine_tuned: Whether to use fine-tuned model
        fine_tuned_model_path: Path to fine-tuned model
        device: "cuda" or "cpu"
        batch_size: Batch size for processing
    
    Returns:
        List of classification results
    """
    if fine_tuned_model_path is None:
        fine_tuned_model_path = get_model_path()
    
    # Load the classifier
    classifier = get_claim_classifier(
        use_fine_tuned=use_fine_tuned,
        fine_tuned_model_path=fine_tuned_model_path,
        device=device
    )
    
    # Classify
    results = classifier.classify_sentences(sentences, batch_size=batch_size)
    return results


if __name__ == "__main__":
    """
    Command-line interface for claim classification.
    Can be called from external systems (e.g., PHP).
    
    Usage:
        python -m app.services.claim_classification_service "Your text here"
    """
    # Read input from command line
    if len(sys.argv) > 1:
        text = sys.argv[1]
        try:
            result = classify_argument(text)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        print(json.dumps({"error": "No text provided"}))

