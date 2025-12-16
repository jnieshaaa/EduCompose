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
    
    logger.info("🔥 Starting NLP model warmup...")
    
    # Use a dummy essay text for warmup (150+ words to pass validation)
    dummy_text = """
    This is a sample essay for warming up the NLP models. The purpose of this text is to 
    initialize all the machine learning models and natural language processing components 
    that will be used during actual essay analysis. By processing this text during server 
    startup, we ensure that when a real user submits an essay for analysis, all the models 
    are already loaded into memory and ready to use. This eliminates the cold start problem 
    where the first analysis request would otherwise take a very long time while models load.
    
    The warmup process includes loading spaCy models for syntactic analysis, SentenceTransformer 
    models for semantic similarity calculations, transformer-based classifiers for argument 
    mining, and LLM clients for grammar checking. Each of these components requires significant 
    memory and processing time to initialize, so preloading them dramatically improves the user 
    experience by making the first analysis request as fast as subsequent ones.
    """
    
    # Warm up by calling the actual analysis service with dummy text
    # This ensures we're using the exact same code path as real requests
    try:
        logger.info("  → Warming up EssayAnalysisService...")
        from .essay_analysis_service import essay_analysis_service
        
        # Warm up each analyzer component individually
        logger.info("    → GrammarAnalyzer...")
        try:
            essay_analysis_service.grammar_analyzer._ensure_llm_loaded()
            if essay_analysis_service.grammar_analyzer.available_llm:
                warmup_results["grammar_llm"] = True
                logger.info("      ✓ GrammarAnalyzer LLM ready")
            else:
                logger.info("      ℹ GrammarAnalyzer LLM not available (no API keys)")
        except Exception as e:
            warmup_results["errors"].append(f"GrammarAnalyzer: {str(e)}")
            logger.warning(f"      ✗ GrammarAnalyzer: {e}")
        
        logger.info("    → CoherenceAnalyzer...")
        try:
            essay_analysis_service.coherence_analyzer._ensure_nlp_loaded()
            essay_analysis_service.coherence_analyzer._ensure_sentence_model_loaded()
            warmup_results["spacy"] = True
            warmup_results["sentence_transformer"] = True
            logger.info("      ✓ CoherenceAnalyzer ready")
        except Exception as e:
            warmup_results["errors"].append(f"CoherenceAnalyzer: {str(e)}")
            logger.warning(f"      ✗ CoherenceAnalyzer: {e}")
        
        logger.info("    → ArgumentMiner...")
        try:
            # Trigger lazy loading by analyzing dummy text
            _ = essay_analysis_service.argument_miner.analyze(dummy_text[:200])
            warmup_results["argument_miner"] = True
            logger.info("      ✓ ArgumentMiner ready")
        except Exception as e:
            warmup_results["errors"].append(f"ArgumentMiner: {str(e)}")
            logger.warning(f"      ✗ ArgumentMiner: {e}")
        
        logger.info("    → KnowledgeGraphBuilder...")
        try:
            essay_analysis_service.knowledge_graph_builder._ensure_nlp_loaded()
            logger.info("      ✓ KnowledgeGraphBuilder ready")
        except Exception as e:
            warmup_results["errors"].append(f"KnowledgeGraphBuilder: {str(e)}")
            logger.warning(f"      ✗ KnowledgeGraphBuilder: {e}")
        
        # Note: We skip full test analysis here to avoid blocking startup too long
        # The individual component warmups above are sufficient
        
    except Exception as e:
        warmup_results["errors"].append(f"Service warmup: {str(e)}")
        logger.error(f"  ✗ Service warmup failed: {e}")
    
    _warmup_duration = time.time() - _warmup_start_time
    _warmup_complete = True
    
    success_count = sum([
        warmup_results["spacy"],
        warmup_results["sentence_transformer"],
        warmup_results["argument_miner"],
        warmup_results["grammar_llm"]
    ])
    
    logger.info(f"🔥 Model warmup complete in {_warmup_duration:.2f}s")
    logger.info(f"  ✓ {success_count} core models warmed up successfully")
    if warmup_results["errors"]:
        logger.warning(f"  ⚠ {len(warmup_results['errors'])} warnings/errors")
    
    warmup_results["status"] = "complete"
    warmup_results["duration"] = round(_warmup_duration, 2)
    warmup_results["success_count"] = success_count
    
    return warmup_results

def get_warmup_status() -> Dict[str, Any]:
    """Get current warmup status"""
    return {
        "warmed": _warmup_complete,
        "duration": _warmup_duration,
        "start_time": _warmup_start_time
    }

