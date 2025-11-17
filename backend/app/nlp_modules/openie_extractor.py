"""
Open Information Extraction (OpenIE) Module
Extracts propositions (subject-predicate-object triples) from text
"""
import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict

logger = logging.getLogger(__name__)

# Lazy import helpers
from .spacy_utils import load_spacy_model


class OpenIEExtractor:
    """
    Extracts propositions (triples) from text using rule-based and NLP-based methods
    Falls back to spaCy-based extraction if Stanford OpenIE is unavailable
    """
    
    def __init__(self):
        """Initialize OpenIE extractor"""
        self.nlp = None
        # Don't initialize here - wait until first use
    
    def _ensure_nlp_loaded(self):
        """Ensure spaCy is loaded (lazy loading)"""
        if self.nlp is None:
            self.nlp = load_spacy_model("en_core_web_sm")
    
    def extract_triples(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract subject-predicate-object triples from text
        
        Args:
            text: Input text to extract triples from
            
        Returns:
            List of triples with confidence scores
        """
        if not text or len(text.strip()) < 10:
            return []
        
        self._ensure_nlp_loaded()
        
        # Try Stanford OpenIE first (if available)
        try:
            return self._extract_with_stanford_openie(text)
        except Exception as e:
            logger.debug(f"Stanford OpenIE not available, using spaCy-based extraction: {e}")
            return self._extract_with_spacy(text)
    
    def _extract_with_stanford_openie(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract triples using Stanford OpenIE
        Requires Stanford CoreNLP server to be running
        """
        try:
            from stanfordnlp.server import CoreNLPClient
            
            with CoreNLPClient(annotators=['openie'], timeout=30000) as client:
                ann = client.annotate(text)
                triples = []
                
                for sentence in ann.sentence:
                    for triple in sentence.openieTriple:
                        triples.append({
                            "subject": triple.subject,
                            "predicate": triple.relation,
                            "object": triple.object,
                            "confidence": triple.confidence if hasattr(triple, 'confidence') else 0.5,
                            "sentence_index": sentence.sentenceIndex
                        })
                
                return triples
        except ImportError:
            logger.warning("Stanford CoreNLP not available. Install with: pip install stanfordnlp")
            raise
        except Exception as e:
            logger.error(f"Error with Stanford OpenIE: {e}")
            raise
    
    def _extract_with_spacy(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract triples using spaCy dependency parsing
        Rule-based extraction from dependency trees
        """
        if not self.nlp:
            return []
        
        doc = self.nlp(text)
        triples = []
        
        for sent_idx, sent in enumerate(doc.sents):
            # Extract SVO (Subject-Verb-Object) patterns
            svo_triples = self._extract_svo_patterns(sent, sent_idx)
            triples.extend(svo_triples)
            
            # Extract other common patterns
            other_triples = self._extract_other_patterns(sent, sent_idx)
            triples.extend(other_triples)
        
        # Deduplicate and score triples
        triples = self._deduplicate_triples(triples)
        triples = self._score_triples(triples)
        
        return triples
    
    def _extract_svo_patterns(self, sent, sent_idx: int) -> List[Dict[str, Any]]:
        """Extract Subject-Verb-Object patterns"""
        triples = []
        
        # Find root verb
        root = [token for token in sent if token.dep_ == "ROOT" and token.pos_ == "VERB"]
        
        for verb in root:
            # Find subject (nsubj or nsubjpass)
            subjects = [token for token in sent 
                       if token.head == verb and token.dep_ in ["nsubj", "nsubjpass"]]
            
            # Find direct object (dobj)
            objects = [token for token in sent 
                      if token.head == verb and token.dep_ == "dobj"]
            
            # Find prepositional objects (pobj)
            prep_objects = []
            for token in sent:
                if token.head.pos_ == "ADP" and token.dep_ == "pobj":
                    # Check if the preposition is attached to the verb
                    prep = token.head
                    if prep.head == verb:
                        prep_objects.append(token)
            
            # Combine all objects
            all_objects = objects + prep_objects
            
            # Extract subject phrase
            for subj in subjects:
                subj_phrase = self._extract_phrase(subj, sent)
                
                # Extract object phrase
                for obj in all_objects:
                    obj_phrase = self._extract_phrase(obj, sent)
                    
                    # Extract verb phrase
                    verb_phrase = self._extract_verb_phrase(verb, sent)
                    
                    if subj_phrase and verb_phrase and obj_phrase:
                        triples.append({
                            "subject": subj_phrase,
                            "predicate": verb_phrase,
                            "object": obj_phrase,
                            "confidence": 0.7,  # Default confidence for SVO
                            "sentence_index": sent_idx,
                            "pattern": "SVO"
                        })
        
        return triples
    
    def _extract_other_patterns(self, sent, sent_idx: int) -> List[Dict[str, Any]]:
        """Extract other common patterns (copula, attributive, etc.)"""
        triples = []
        
        # Copula patterns: "X is Y"
        for token in sent:
            if token.pos_ == "VERB" and token.lemma_ in ["be", "become", "seem", "appear"]:
                # Find subject
                subjects = [t for t in sent if t.head == token and t.dep_ in ["nsubj", "nsubjpass"]]
                # Find attribute/complement
                attrs = [t for t in sent if t.head == token and t.dep_ in ["attr", "acomp", "xcomp"]]
                
                for subj in subjects:
                    for attr in attrs:
                        subj_phrase = self._extract_phrase(subj, sent)
                        attr_phrase = self._extract_phrase(attr, sent)
                        
                        if subj_phrase and attr_phrase:
                            triples.append({
                                "subject": subj_phrase,
                                "predicate": token.text,
                                "object": attr_phrase,
                                "confidence": 0.6,
                                "sentence_index": sent_idx,
                                "pattern": "COPULA"
                            })
        
        return triples
    
    def _extract_phrase(self, token, sent) -> str:
        """Extract a complete phrase starting from a token"""
        # Start with the token itself
        phrase_tokens = [token]
        
        # Add children that are part of the phrase (determiners, adjectives, etc.)
        for child in token.children:
            if child.dep_ in ["det", "amod", "compound", "nmod", "nummod"]:
                phrase_tokens.append(child)
        
        # Sort by position in sentence
        phrase_tokens.sort(key=lambda t: t.i)
        
        # Extract text
        phrase = " ".join([t.text for t in phrase_tokens])
        
        # Clean up
        phrase = re.sub(r'\s+', ' ', phrase).strip()
        
        return phrase if len(phrase) > 0 else None
    
    def _extract_verb_phrase(self, verb, sent) -> str:
        """Extract complete verb phrase including auxiliaries and particles"""
        phrase_tokens = [verb]
        
        # Add auxiliaries
        for child in verb.children:
            if child.dep_ in ["aux", "auxpass", "neg"]:
                phrase_tokens.append(child)
        
        # Add particles (phrasal verbs)
        for child in verb.children:
            if child.dep_ == "prt":
                phrase_tokens.append(child)
        
        # Sort by position
        phrase_tokens.sort(key=lambda t: t.i)
        
        phrase = " ".join([t.text for t in phrase_tokens])
        return re.sub(r'\s+', ' ', phrase).strip()
    
    def _deduplicate_triples(self, triples: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate triples"""
        seen = set()
        unique_triples = []
        
        for triple in triples:
            # Create a key from subject, predicate, object
            key = (
                triple["subject"].lower().strip(),
                triple["predicate"].lower().strip(),
                triple["object"].lower().strip()
            )
            
            if key not in seen:
                seen.add(key)
                unique_triples.append(triple)
        
        return unique_triples
    
    def _score_triples(self, triples: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Score triples based on quality indicators"""
        for triple in triples:
            score = triple.get("confidence", 0.5)
            
            # Boost score for longer, more informative phrases
            subj_len = len(triple["subject"].split())
            obj_len = len(triple["object"].split())
            
            if subj_len > 1 and obj_len > 1:
                score += 0.1
            
            # Boost for specific patterns
            if triple.get("pattern") == "SVO":
                score += 0.1
            
            # Penalize very short or very long phrases
            if len(triple["subject"]) < 2 or len(triple["object"]) < 2:
                score -= 0.2
            
            triple["confidence"] = min(1.0, max(0.0, score))
        
        # Sort by confidence
        triples.sort(key=lambda x: x["confidence"], reverse=True)
        
        return triples
    
    def extract_from_sentences(self, sentences: List[str]) -> List[Dict[str, Any]]:
        """Extract triples from a list of sentences"""
        all_triples = []
        
        for sent_idx, sentence in enumerate(sentences):
            triples = self.extract_triples(sentence)
            # Update sentence indices
            for triple in triples:
                triple["sentence_index"] = sent_idx
            all_triples.extend(triples)
        
        return all_triples

