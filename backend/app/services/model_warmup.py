"""
Model Warmup Service
Preloads all NLP models on startup to avoid cold start delays
"""
import logging
import time
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Global flag to track warmup status
_warmup_complete = False
_warmup_start_time = None
_warmup_duration = None

def warmup_all_models() -> Dict[str, Any]:
    """
    Preload all NLP models to avoid cold start delays.
    This should be called on server startup.
    
    Uses the actual EssayAnalysisService instance to ensure models are shared.
    
    Returns:
        Dictionary with warmup status and timing information
    """
    global _warmup_complete, _warmup_start_time, _warmup_duration
    
    if _warmup_complete:
        return {
            "status": "already_warmed",
            "message": "Models already warmed up",
            "duration": _warmup_duration
        }
    
    _warmup_start_time = time.time()
    warmup_results = {
        "spacy": False,
        "sentence_transformer": False,
        "argument_miner": False,
        "grammar_llm": False,
        "errors": []
    }
    
    logger.info("Starting NLP model warmup...")
    
    # Use a dummy essay text for warmup (150+ words to pass validation)
    dummy_text = """
    This is a sample essay for warming up the NLP models. The purpose of this text is to 
    initialize all the machine learning models and natural language processing components 
    that will be used during actual essay analysis. By processing this text during server 
    startup, we ensure that when a real user submits an essay for analysis, all the models 
    are already loaded into memory and ready to use. This eliminates the cold start problem 
    where the first analysis request would otherwise take a very long time while models load.
    """
    
    # Warm up by calling the actual analysis service with dummy text
    try:
        logger.info("  → Warming up EssayAnalysisService...")
        from .essay_analysis_service import essay_analysis_service
        
        # Warm up each analyzer component individually
        logger.info("    → GrammarAnalyzer...")
        try:
            essay_analysis_service.grammar_analyzer._ensure_llm_loaded()
            if essay_analysis_service.grammar_analyzer.available_llm:
                warmup_results["grammar_llm"] = True
                logger.info("      GrammarAnalyzer LLM ready")
            else:
                logger.info("      ℹ GrammarAnalyzer LLM not available")
        except Exception as e:
            logger.debug(f"      GrammarAnalyzer warmup skipped: {e}")
        
        logger.info("    → CoherenceAnalyzer...")
        try:
            essay_analysis_service.coherence_analyzer._ensure_nlp_loaded()
            essay_analysis_service.coherence_analyzer._ensure_sentence_model_loaded()
            if essay_analysis_service.coherence_analyzer.sentence_model:
                warmup_results["sentence_transformer"] = True
            warmup_results["spacy"] = True
            logger.info("      CoherenceAnalyzer ready")
        except Exception as e:
            logger.debug(f"      CoherenceAnalyzer warmup skipped: {e}")
        
        logger.info("    → ArgumentMiner...")
        try:
            # Only warm up if using LOCAL models (to load weights into RAM/VRAM)
            # Remote models (HF/LLM) don't benefit from local warmup and waste API quota
            if not essay_analysis_service.argument_miner.use_transformer_classifier or \
               not essay_analysis_service.argument_miner._ensure_transformer_classifier_loaded() or \
               not essay_analysis_service.argument_miner.transformer_classifier.use_remote:
                
                _ = essay_analysis_service.argument_miner.analyze(dummy_text[:200])
                if essay_analysis_service.argument_miner._transformer_available:
                    warmup_results["argument_miner"] = True
                logger.info("      ArgumentMiner ready")
            else:
                logger.info("      ℹ ArgumentMiner uses remote API, skipping startup warmup")
                warmup_results["argument_miner"] = True
        except Exception as e:
            logger.debug(f"      ArgumentMiner warmup skipped: {e}")
            
    except Exception as e:
        logger.warning(f"  ⚠ Warmup partial: {e}")
    
    _warmup_duration = time.time() - _warmup_start_time
    _warmup_complete = True
    return warmup_results

def get_warmup_status() -> Dict[str, Any]:
    """Get current warmup status"""
    return {
        "warmed": _warmup_complete,
        "duration": _warmup_duration,
        "start_time": _warmup_start_time
    }

