"""
AES Model Loader Utility
Loads Automated Essay Scoring models from the models directory
"""
import os
import logging
from pathlib import Path
from typing import Optional, Any, Dict

logger = logging.getLogger(__name__)

# Global cache for loaded model
_aes_model = None

def get_models_path() -> Path:
    """
    Get the path to the models directory
    
    Returns:
        Path object pointing to backend/app/models/ or backend/models/
    """
    # Get app directory (1 level up from this file: app/nlp_modules/aes_loader.py)
    app_path = Path(__file__).resolve().parents[1]
    models_path = app_path / "models"
    
    # Check if models exists in app/ directory, otherwise check backend/ directory
    if models_path.exists():
        return models_path
    
    # Fallback: check backend/models/
    backend_path = Path(__file__).resolve().parents[2]
    models_path_fallback = backend_path / "models"
    return models_path_fallback

def load_aes_model(model_name: str = "aes_model") -> Optional[Any]:
    """
    Load AES model from the models directory
    
    Args:
        model_name: Name of the model folder (default: "aes_model")
        
    Returns:
        Loaded model object or None if loading failed
        
    Supports common model formats:
    - PyTorch (.pth, .pt)
    - TensorFlow/Keras (.h5, .pb, saved_model)
    - Pickle (.pkl, .pickle)
    - Joblib (.joblib)
    """
    global _aes_model
    
    # Return cached model if already loaded
    if _aes_model is not None:
        return _aes_model
    
    models_path = get_models_path()
    model_path = models_path / model_name
    
    if not model_path.exists():
        logger.warning(f"AES model directory not found: {model_path}")
        logger.info(f"Expected location: {model_path.absolute()}")
        logger.info("Please ensure your AES model is placed in backend/models/aes_model/")
        return None
    
    logger.info(f"Loading AES model from: {model_path.absolute()}")
    
    # Try loading Hugging Face transformers model first (common for BERT-based models)
    try:
        from transformers import AutoModelForSequenceClassification, AutoModel
        # Check if this is a transformers model (has config.json)
        config_file = model_path / "config.json"
        if config_file.exists():
            logger.info(f"Loading Hugging Face transformers model from: {model_path}")
            # Try sequence classification first (most common for scoring)
            try:
                _aes_model = AutoModelForSequenceClassification.from_pretrained(str(model_path))
            except Exception:
                # Fallback to base model
                _aes_model = AutoModel.from_pretrained(str(model_path))
            logger.info("Hugging Face transformers model loaded successfully")
            return _aes_model
    except ImportError:
        logger.debug("transformers library not available, skipping transformers model loading")
    except Exception as e:
        logger.warning(f"Failed to load transformers model: {e}")
    
    # Try loading PyTorch model
    try:
        import torch
        model_files = list(model_path.glob("*.pth")) + list(model_path.glob("*.pt"))
        if model_files:
            model_file = model_files[0]  # Use first found
            logger.info(f"Loading PyTorch model: {model_file}")
            _aes_model = torch.load(model_file, map_location='cpu')
            logger.info("PyTorch model loaded successfully")
            return _aes_model
    except ImportError:
        logger.debug("PyTorch not available, skipping PyTorch model loading")
    except Exception as e:
        logger.warning(f"Failed to load PyTorch model: {e}")
    
    # Try loading TensorFlow/Keras model
    try:
        import tensorflow as tf
        # Try SavedModel format first
        saved_model_path = model_path / "saved_model"
        if saved_model_path.exists():
            logger.info(f"Loading TensorFlow SavedModel: {saved_model_path}")
            _aes_model = tf.saved_model.load(str(saved_model_path))
            logger.info("TensorFlow SavedModel loaded successfully")
            return _aes_model
        
        # Try .h5 format
        h5_files = list(model_path.glob("*.h5"))
        if h5_files:
            model_file = h5_files[0]
            logger.info(f"Loading Keras model: {model_file}")
            _aes_model = tf.keras.models.load_model(str(model_file))
            logger.info("Keras model loaded successfully")
            return _aes_model
    except ImportError:
        logger.debug("TensorFlow not available, skipping TensorFlow model loading")
    except Exception as e:
        logger.warning(f"Failed to load TensorFlow model: {e}")
    
    # Try loading Pickle model
    try:
        import pickle
        pickle_files = list(model_path.glob("*.pkl")) + list(model_path.glob("*.pickle"))
        if pickle_files:
            model_file = pickle_files[0]
            logger.info(f"Loading Pickle model: {model_file}")
            with open(model_file, 'rb') as f:
                _aes_model = pickle.load(f)
            logger.info("Pickle model loaded successfully")
            return _aes_model
    except Exception as e:
        logger.warning(f"Failed to load Pickle model: {e}")
    
    # Try loading Joblib model
    try:
        import joblib
        joblib_files = list(model_path.glob("*.joblib"))
        if joblib_files:
            model_file = joblib_files[0]
            logger.info(f"Loading Joblib model: {model_file}")
            _aes_model = joblib.load(model_file)
            logger.info("Joblib model loaded successfully")
            return _aes_model
    except ImportError:
        logger.debug("Joblib not available, skipping Joblib model loading")
    except Exception as e:
        logger.warning(f"Failed to load Joblib model: {e}")
    
    # Check for custom loader script
    loader_script = model_path / "load_model.py"
    if loader_script.exists():
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location("model_loader", loader_script)
            loader_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(loader_module)
            if hasattr(loader_module, 'load_model'):
                _aes_model = loader_module.load_model(str(model_path))
                logger.info("Custom model loader executed successfully")
                return _aes_model
        except Exception as e:
            logger.warning(f"Failed to use custom loader: {e}")
    
    logger.error(f"Could not load AES model from {model_path}. Supported formats: PyTorch (.pth, .pt), TensorFlow (.h5, saved_model), Pickle (.pkl), Joblib (.joblib), or custom load_model.py")
    return None

def get_model_info() -> Dict[str, Any]:
    """
    Get information about the loaded AES model
    
    Returns:
        Dictionary containing model information
    """
    if _aes_model is None:
        return {"status": "not_loaded", "message": "AES model not loaded"}
    
    models_path = get_models_path()
    model_path = models_path / "aes_model"
    
    info = {
        "status": "loaded",
        "model_path": str(model_path.absolute()),
        "model_type": type(_aes_model).__name__
    }
    
    # Try to get more specific info based on model type
    if hasattr(_aes_model, '__class__'):
        info["model_class"] = _aes_model.__class__.__name__
    
    # For PyTorch models
    if hasattr(_aes_model, 'state_dict'):
        info["framework"] = "pytorch"
        info["parameters"] = sum(p.numel() for p in _aes_model.parameters() if p.requires_grad)
    
    # For TensorFlow models
    elif hasattr(_aes_model, 'summary'):
        info["framework"] = "tensorflow"
    
    return info

