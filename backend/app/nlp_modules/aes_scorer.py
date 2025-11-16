"""
AES (Automated Essay Scoring) Module
Integrates custom AES model for essay scoring
"""
import logging
from typing import Dict, Any, Optional
import numpy as np

from .aes_loader import load_aes_model, get_model_info

logger = logging.getLogger(__name__)

class AESScorer:
    """Automated Essay Scoring using custom trained model"""
    
    def __init__(self):
        """Initialize AES scorer with loaded model"""
        self.model = None
        self.tokenizer = None
        self.model_info = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Load the AES model (lazy loading)"""
        try:
            self.model = load_aes_model("aes_model")
            if self.model:
                self.model_info = get_model_info()
                logger.info(f"AES model initialized: {self.model_info}")
            else:
                logger.warning("AES model not available. Scoring will use default methods.")
        except Exception as e:
            logger.error(f"Failed to initialize AES model: {e}")
            self.model = None
    
    def _ensure_model_loaded(self):
        """Ensure model is loaded before use"""
        if self.model is None:
            self._initialize_model()
    
    def _preprocess_text(self, text: str) -> Any:
        """
        Preprocess essay text for model input
        
        Supports Hugging Face transformers models (BERT, etc.) with automatic tokenization.
        
        Args:
            text: Raw essay text
            
        Returns:
            Preprocessed text/features ready for model input
        """
        # Try Hugging Face transformers tokenizer
        if self.model and hasattr(self.model, 'config') and hasattr(self.model.config, 'model_type'):
            try:
                from transformers import AutoTokenizer
                from pathlib import Path
                
                # Load tokenizer if not already loaded
                if self.tokenizer is None:
                    # Try to find the model directory
                    from .aes_loader import get_models_path
                    models_path = get_models_path()
                    model_path = models_path / "aes_model"
                    
                    if model_path.exists():
                        logger.info(f"Loading tokenizer from: {model_path}")
                        self.tokenizer = AutoTokenizer.from_pretrained(str(model_path))
                    else:
                        # Fallback: try to load tokenizer from model name if available
                        logger.warning("Tokenizer directory not found, attempting to infer from model")
                        return text
                
                # Tokenize text
                if self.tokenizer:
                    # Use max_length=512 (BERT's default) or model's max_position_embeddings
                    max_length = getattr(self.model.config, 'max_position_embeddings', 512)
                    encoded = self.tokenizer(
                        text,
                        padding=True,
                        truncation=True,
                        max_length=max_length,
                        return_tensors='pt'
                    )
                    return encoded
            except ImportError:
                logger.debug("transformers not available for tokenization")
            except Exception as e:
                logger.warning(f"Failed to tokenize with transformers: {e}")
        
        # Fallback: return text as-is (for non-transformers models)
        return text
    
    def _predict_score(self, preprocessed_input: Any) -> float:
        """
        Get prediction from the model
        
        Args:
            preprocessed_input: Preprocessed text/features
            
        Returns:
            Predicted score (0-100)
        """
        if self.model is None:
            return None
        
        try:
            # Hugging Face transformers model inference (BertForSequenceClassification, etc.)
            if hasattr(self.model, 'config') and hasattr(self.model.config, 'model_type'):
                import torch
                from transformers.tokenization_utils_base import BatchEncoding
                
                self.model.eval()
                with torch.no_grad():
                    # Preprocessed input should be a dict or BatchEncoding with 'input_ids', 'attention_mask', etc.
                    if isinstance(preprocessed_input, (dict, BatchEncoding)):
                        # Convert BatchEncoding to dict if needed
                        if isinstance(preprocessed_input, BatchEncoding):
                            preprocessed_input = dict(preprocessed_input)
                        
                        # Move inputs to same device as model
                        device = next(self.model.parameters()).device
                        preprocessed_input = {k: v.to(device) if isinstance(v, torch.Tensor) else v 
                                            for k, v in preprocessed_input.items()}
                        # Always unpack dict as kwargs for transformers models
                        output = self.model(**preprocessed_input)
                    elif isinstance(preprocessed_input, torch.Tensor):
                        # If it's already a tensor, pass directly
                        device = next(self.model.parameters()).device
                        preprocessed_input = preprocessed_input.to(device)
                        output = self.model(preprocessed_input)
                    else:
                        # For other types, try to pass directly (may not work for transformers)
                        output = self.model(preprocessed_input)
                    
                    # Extract score from transformers output
                    # For regression models, output might be SequenceClassifierOutput with loss/logits
                    if hasattr(output, 'logits'):
                        logits = output.logits
                        # For regression (problem_type="regression"), logits is the score
                        # For classification, we'd need to apply softmax or take max
                        # Check config to see if it's regression
                        if hasattr(self.model.config, 'problem_type') and self.model.config.problem_type == 'regression':
                            score = logits.item() if logits.dim() == 0 else logits[0].item()
                        else:
                            # Classification: take the first (and likely only) logit as score
                            score = logits[0].item() if logits.numel() == 1 else logits[0][0].item()
                    elif hasattr(output, 'item'):
                        score = output.item()
                    else:
                        # Direct output
                        score = output
                        if isinstance(score, torch.Tensor):
                            score = score.item() if score.numel() == 1 else score[0].item()
                    
                    # Normalize to 0-100 if needed (assuming model outputs 0-1 or similar range)
                    score = float(score)
                    # If score seems to be in 0-1 range, scale to 0-100
                    if 0 <= score <= 1:
                        score = score * 100
                    
                    # Ensure score is in 0-100 range
                    score = max(0.0, min(100.0, score))
                    return score
            
            # PyTorch model inference (generic)
            elif hasattr(self.model, '__call__') and hasattr(self.model, 'eval'):
                import torch
                self.model.eval()
                with torch.no_grad():
                    # If input is a dict or tensor
                    if isinstance(preprocessed_input, dict):
                        output = self.model(**preprocessed_input)
                    else:
                        output = self.model(preprocessed_input)
                    
                    # Extract score from output
                    if isinstance(output, (list, tuple)):
                        score = output[0]
                    elif hasattr(output, 'logits'):
                        score = output.logits
                    elif hasattr(output, 'item'):
                        score = output.item()
                    else:
                        score = output
                    
                    # Convert to numpy if tensor
                    if hasattr(score, 'cpu'):
                        score = score.cpu().numpy()
                    if hasattr(score, 'item'):
                        score = score.item()
                    
                    # Normalize to 0-100 if needed
                    if isinstance(score, (list, np.ndarray)):
                        score = float(score[0] if len(score) > 0 else 0)
                    else:
                        score = float(score)
                    
                    # Ensure score is in 0-100 range
                    score = max(0.0, min(100.0, score))
                    return score
            
            # TensorFlow/Keras model inference
            elif hasattr(self.model, 'predict'):
                import tensorflow as tf
                if tf.is_tensor(preprocessed_input) or isinstance(preprocessed_input, np.ndarray):
                    prediction = self.model.predict(preprocessed_input, verbose=0)
                else:
                    # If input needs preprocessing, handle it here
                    prediction = self.model.predict([preprocessed_input], verbose=0)
                
                score = float(prediction[0] if isinstance(prediction, (list, np.ndarray)) else prediction)
                score = max(0.0, min(100.0, score))
                return score
            
            # Generic callable (sklearn, custom functions, etc.)
            elif callable(self.model):
                prediction = self.model(preprocessed_input)
                
                if isinstance(prediction, (list, np.ndarray)):
                    score = float(prediction[0] if len(prediction) > 0 else 0)
                else:
                    score = float(prediction)
                
                score = max(0.0, min(100.0, score))
                return score
            
            else:
                logger.warning(f"Unknown model type: {type(self.model)}. Cannot predict.")
                return None
                
        except Exception as e:
            logger.error(f"Error during model prediction: {e}", exc_info=True)
            return None
    
    def score(self, text: str) -> Dict[str, Any]:
        """
        Score an essay using the AES model
        
        Args:
            text: Essay content to score
            
        Returns:
            Dictionary containing AES score and metadata
        """
        self._ensure_model_loaded()
        
        if not text or len(text.strip()) < 50:
            return {
                "score": 0.0,
                "available": False,
                "error": "Text too short for scoring"
            }
        
        if self.model is None:
            return {
                "score": None,
                "available": False,
                "error": "AES model not loaded",
                "message": "Using default scoring methods"
            }
        
        try:
            # Preprocess text
            preprocessed = self._preprocess_text(text)
            
            # Get prediction
            predicted_score = self._predict_score(preprocessed)
            
            if predicted_score is None:
                return {
                    "score": None,
                    "available": False,
                    "error": "Prediction failed"
                }
            
            return {
                "score": round(predicted_score, 2),
                "available": True,
                "model_info": self.model_info.get("model_type", "unknown") if self.model_info else None
            }
            
        except Exception as e:
            logger.error(f"Error scoring essay with AES model: {e}", exc_info=True)
            return {
                "score": None,
                "available": False,
                "error": str(e)
            }
    
    def is_available(self) -> bool:
        """Check if AES model is available"""
        self._ensure_model_loaded()
        return self.model is not None

