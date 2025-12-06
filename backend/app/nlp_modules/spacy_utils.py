"""
Utility module for lazy loading spaCy to avoid Python 3.12 compatibility issues
"""
import logging

logger = logging.getLogger(__name__)

# Global cache for spaCy module
_spacy_module = None

def get_spacy():
    """
    Lazy import spaCy - only import when actually needed.
    This avoids Python 3.12 typing compatibility issues at startup.
    """
    global _spacy_module
    if _spacy_module is None:
        try:
            import spacy
            _spacy_module = spacy
        except Exception as e:
            logger.error(f"Failed to import spaCy: {e}")
            _spacy_module = False
    return _spacy_module if _spacy_module is not False else None

def load_spacy_model(model_name: str = "en_core_web_md"):
    """
    Load a spaCy model with lazy loading and error handling.
    
    Args:
        model_name: Name of the spaCy model to load
        
    Returns:
        Loaded spaCy model or None if loading failed
    """
    spacy = get_spacy()
    if not spacy:
        return None
    
    try:
        return spacy.load(model_name)
    except OSError:
        logger.warning(f"spaCy model '{model_name}' not found. Please install: python -m spacy download {model_name}")
        return None
    except Exception as e:
        logger.error(f"Failed to load spaCy model '{model_name}': {e}")
        return None

