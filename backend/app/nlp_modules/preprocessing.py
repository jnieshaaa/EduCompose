"""
Preprocessing Pipeline
Sentence splitting, tokenization, POS tagging, lemmatization, coreference resolution
"""
import logging
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict

logger = logging.getLogger(__name__)

# Lazy import helpers
from .spacy_utils import load_spacy_model


class PreprocessingPipeline:
    """
    Comprehensive preprocessing pipeline for essays
    Implements: sentence splitting, tokenization, POS tagging, lemmatization, coreference resolution
    """
    
    def __init__(self):
        """Initialize preprocessing pipeline"""
        self.nlp = None
        self.coref_model = None
    
    def _ensure_nlp_loaded(self):
        """Ensure spaCy is loaded (lazy loading)"""
        if self.nlp is None:
            self.nlp = load_spacy_model("en_core_web_sm")
    
    def preprocess(self, text: str, 
                  include_coref: bool = False) -> Dict[str, Any]:
        """
        Complete preprocessing pipeline
        
        Args:
            text: Input text to preprocess
            include_coref: Whether to perform coreference resolution
            
        Returns:
            Dictionary with preprocessed components
        """
        if not text or len(text.strip()) < 10:
            return self._empty_result()
        
        self._ensure_nlp_loaded()
        
        if not self.nlp:
            return self._empty_result()
        
        doc = self.nlp(text)
        
        # Sentence splitting
        sentences = self._sentence_split(doc)
        
        # Tokenization
        tokens = self._tokenize(doc)
        
        # POS tagging
        pos_tags = self._pos_tag(doc)
        
        # Lemmatization
        lemmas = self._lemmatize(doc)
        
        # Coreference resolution (optional)
        coref_chains = None
        if include_coref:
            coref_chains = self._coreference_resolve(text)
        
        return {
            "sentences": sentences,
            "tokens": tokens,
            "pos_tags": pos_tags,
            "lemmas": lemmas,
            "coref_chains": coref_chains,
            "sentence_count": len(sentences),
            "token_count": len(tokens),
            "word_count": len([t for t in tokens if not t.get("is_punct", False)])
        }
    
    def _sentence_split(self, doc) -> List[Dict[str, Any]]:
        """Split text into sentences"""
        sentences = []
        
        for sent_idx, sent in enumerate(doc.sents):
            sentences.append({
                "index": sent_idx,
                "text": sent.text.strip(),
                "start_char": sent.start_char,
                "end_char": sent.end_char,
                "token_count": len(list(sent))
            })
        
        return sentences
    
    def _tokenize(self, doc) -> List[Dict[str, Any]]:
        """Tokenize text"""
        tokens = []
        
        for token in doc:
            tokens.append({
                "text": token.text,
                "start_char": token.idx,
                "end_char": token.idx + len(token.text),
                "is_space": token.is_space,
                "is_punct": token.is_punct,
                "is_stop": token.is_stop
            })
        
        return tokens
    
    def _pos_tag(self, doc) -> List[Dict[str, Any]]:
        """POS tagging"""
        pos_tags = []
        
        for token in doc:
            pos_tags.append({
                "text": token.text,
                "pos": token.pos_,
                "tag": token.tag_,
                "dep": token.dep_,
                "head": token.head.text if token.head else None
            })
        
        return pos_tags
    
    def _lemmatize(self, doc) -> List[Dict[str, Any]]:
        """Lemmatization"""
        lemmas = []
        
        for token in doc:
            lemmas.append({
                "text": token.text,
                "lemma": token.lemma_,
                "pos": token.pos_
            })
        
        return lemmas
    
    def _coreference_resolve(self, text: str) -> Optional[List[Dict[str, Any]]]:
        """
        Coreference resolution
        
        Note: Requires neuralcoref or HuggingFace coreference models
        Falls back to basic pronoun resolution if not available
        """
        try:
            # Try NeuralCoref (spaCy extension)
            import neuralcoref
            if not hasattr(self.nlp, 'pipe_names') or 'neuralcoref' not in self.nlp.pipe_names:
                # Add neuralcoref to pipeline if not already added
                neuralcoref.add_to_pipe(self.nlp)
            
            doc = self.nlp(text)
            
            if hasattr(doc, '_.coref_clusters'):
                clusters = doc._.coref_clusters
                coref_chains = []
                
                for cluster in clusters:
                    mentions = []
                    for mention in cluster:
                        mentions.append({
                            "text": mention.text,
                            "start": mention.start,
                            "end": mention.end
                        })
                    
                    coref_chains.append({
                        "main": mentions[0] if mentions else None,
                        "mentions": mentions
                    })
                
                return coref_chains
        except ImportError:
            logger.debug("NeuralCoref not available. Install with: pip install neuralcoref")
        except Exception as e:
            logger.warning(f"Coreference resolution failed: {e}")
        
        # Fallback: basic pronoun detection
        return self._basic_pronoun_detection(text)
    
    def _basic_pronoun_detection(self, text: str) -> List[Dict[str, Any]]:
        """Basic pronoun detection as fallback"""
        pronouns = ['he', 'she', 'it', 'they', 'this', 'that', 'these', 'those', 'his', 'her', 'its', 'their']
        
        # Simple detection - can be enhanced
        detected = []
        words = text.lower().split()
        
        for i, word in enumerate(words):
            if word in pronouns:
                detected.append({
                    "text": word,
                    "position": i,
                    "type": "pronoun"
                })
        
        if detected:
            return [{
                "main": {"text": "pronouns", "type": "detected"},
                "mentions": detected
            }]
        
        return None
    
    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure"""
        return {
            "sentences": [],
            "tokens": [],
            "pos_tags": [],
            "lemmas": [],
            "coref_chains": None,
            "sentence_count": 0,
            "token_count": 0,
            "word_count": 0
        }
    
    def preprocess_batch(self, texts: List[str], 
                        include_coref: bool = False) -> List[Dict[str, Any]]:
        """Preprocess multiple texts"""
        results = []
        
        for text in texts:
            try:
                result = self.preprocess(text, include_coref)
                results.append(result)
            except Exception as e:
                logger.error(f"Error preprocessing text: {e}")
                results.append(self._empty_result())
        
        return results

