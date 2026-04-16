"""
Coherence Analysis Module
Implements entity-grid model and semantic similarity analysis for discourse coherence
"""
import re
from typing import Dict, List, Any, Set, Tuple
from collections import defaultdict, Counter
import logging
import numpy as np

logger = logging.getLogger(__name__)

# Lazy import helpers
from .spacy_utils import load_spacy_model

class CoherenceAnalyzer:
    """Analyzes textual coherence and organizational structure"""
    
    def __init__(self):
        """Initialize coherence analyzer"""
        self.nlp = None
        self.sentence_model = None
        # Don't initialize here - wait until first use to avoid import errors at startup
    
    def _ensure_nlp_loaded(self):
        """Ensure spaCy is loaded (lazy loading)"""
        if self.nlp is None:
            self.nlp = load_spacy_model("en_core_web_md")
    
    def _ensure_sentence_model_loaded(self):
        """Ensure SentenceTransformer is loaded (lazy loading)"""
        if self.sentence_model is None:
            try:
                from sentence_transformers import SentenceTransformer
                # Load sentence transformer for semantic similarity
                self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            except ImportError:
                logger.info("SentenceTransformer not installed, skipping semantic analysis fallback.")
                self.sentence_model = False # Mark as unavailable
            except Exception as e:
                logger.warning(f"SentenceTransformer initialization failed: {e}")
                self.sentence_model = False
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive coherence analysis
        
        Args:
            text: Essay content to analyze
            
        Returns:
            Dictionary containing coherence scores, entity-grid analysis, and structure assessment
        """
        results = {
            "score": 0.0,
            "entity_grid_score": 0.0,
            "semantic_similarity_score": 0.0,
            "transition_score": 0.0,
            "paragraph_unity": 0.0,
            "topic_sentences": [],
            "transitional_elements": [],
            "entity_mentions": {},
            "coherence_issues": [],
            "structure_analysis": {}
        }
        
        if not text or len(text.strip()) < 50:
            return results
        
        # Segment into paragraphs and sentences
        paragraphs = self._segment_paragraphs(text)
        sentences = self._segment_sentences(text)
        
        if len(paragraphs) < 2 or len(sentences) < 3:
            results["coherence_issues"].append({
                "type": "insufficient_text",
                "message": "Text is too short for meaningful coherence analysis",
                "suggestion": "Expand your essay with more content"
            })
            return results
        
        # Entity-grid analysis
        entity_grid_results = self._analyze_entity_grid(sentences)
        results["entity_grid_score"] = entity_grid_results["score"]
        results["entity_mentions"] = entity_grid_results["entities"]
        
        # Semantic similarity analysis (lazy load)
        self._ensure_sentence_model_loaded()
        if self.sentence_model:
            semantic_results = self._analyze_semantic_similarity(sentences)
            results["semantic_similarity_score"] = semantic_results["score"]
        else:
            results["semantic_similarity_score"] = 50.0  # Default if model unavailable
        
        # Transition analysis
        transition_results = self._analyze_transitions(sentences)
        results["transition_score"] = transition_results["score"]
        results["transitional_elements"] = transition_results["transitions"]
        
        # Paragraph unity analysis
        paragraph_results = self._analyze_paragraph_unity(paragraphs)
        results["paragraph_unity"] = paragraph_results["score"]
        results["topic_sentences"] = paragraph_results["topic_sentences"]
        
        # Structure analysis
        structure_results = self._analyze_structure(paragraphs, sentences)
        results["structure_analysis"] = structure_results
        
        # Identify coherence issues
        issues = self._identify_coherence_issues(results, paragraphs, sentences)
        results["coherence_issues"] = issues
        
        # Calculate overall coherence score
        results["score"] = self._calculate_coherence_score(results)
        
        return results
    
    def _segment_paragraphs(self, text: str) -> List[str]:
        """Segment text into paragraphs"""
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        if not paragraphs:
            # Fallback: split by double newlines or single newlines
            paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
        return paragraphs
    
    def _segment_sentences(self, text: str) -> List[str]:
        """Segment text into sentences"""
        if self.nlp:
            doc = self.nlp(text)
            return [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        else:
            # Fallback: simple sentence segmentation
            sentences = re.split(r'[.!?]+', text)
            return [s.strip() for s in sentences if s.strip()]
    
    def _analyze_entity_grid(self, sentences: List[str]) -> Dict[str, Any]:
        """
        Analyze coherence using entity-grid model
        Tracks how entities (nouns) are mentioned across sentences
        """
        if not self.nlp:
            return {"score": 50.0, "entities": {}}
        
        # Extract entities (nouns and proper nouns) from each sentence
        entity_grid = defaultdict(lambda: defaultdict(int))
        entity_positions = defaultdict(list)
        
        for i, sentence in enumerate(sentences):
            doc = self.nlp(sentence)
            entities = []
            
            # Extract nouns and proper nouns
            for token in doc:
                if token.pos_ in ["NOUN", "PROPN"] and not token.is_stop:
                    entity = token.lemma_.lower()
                    entities.append(entity)
                    entity_positions[entity].append(i)
            
            # Track entity roles (subject, object, other)
            for entity in set(entities):
                # Determine role (simplified: check if entity is subject)
                doc_entity = self.nlp(entity)
                is_subject = False
                for token in doc_entity:
                    if token.dep_ in ["nsubj", "nsubjpass"]:
                        is_subject = True
                        break
                
                role = "subject" if is_subject else "other"
                entity_grid[entity][role] += 1
        
        # Calculate coherence score based on entity continuation
        # Higher scores = more entities continue across sentences
        continuation_count = 0
        total_entities = len(entity_grid)
        
        for entity, positions in entity_positions.items():
            if len(positions) > 1:
                # Check if entity appears in consecutive sentences
                for i in range(len(positions) - 1):
                    if positions[i+1] == positions[i] + 1:
                        continuation_count += 1
        
        if total_entities > 0:
            score = min(100, (continuation_count / total_entities) * 100)
        else:
            score = 50.0
        
        return {
            "score": round(score, 2),
            "entities": {k: dict(v) for k, v in entity_grid.items()}
        }
    
    def _analyze_semantic_similarity(self, sentences: List[str]) -> Dict[str, Any]:
        """Analyze semantic similarity between consecutive sentences"""
        if not self.sentence_model or len(sentences) < 2:
            return {"score": 50.0, "similarities": []}
        
        try:
            # Get sentence embeddings
            embeddings = self.sentence_model.encode(sentences)
            
            # Calculate cosine similarity between consecutive sentences
            similarities = []
            for i in range(len(embeddings) - 1):
                similarity = np.dot(embeddings[i], embeddings[i+1]) / (
                    np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[i+1])
                )
                similarities.append(float(similarity))
            
            # Normalize to 0-100 scale
            if similarities:
                avg_similarity = np.mean(similarities)
                score = avg_similarity * 100
            else:
                score = 50.0
            
            return {
                "score": round(score, 2),
                "similarities": [round(s, 3) for s in similarities]
            }
        except Exception as e:
            logger.error(f"Error in semantic similarity analysis: {e}")
            return {"score": 50.0, "similarities": []}
    
    def _analyze_transitions(self, sentences: List[str]) -> Dict[str, Any]:
        """Identify and analyze transitional elements"""
        # Common transitional words and phrases
        transitions = {
            "addition": ["furthermore", "moreover", "additionally", "also", "and", "in addition"],
            "contrast": ["however", "nevertheless", "on the other hand", "in contrast", "but", "although"],
            "cause_effect": ["therefore", "thus", "consequently", "as a result", "because", "since"],
            "example": ["for example", "for instance", "specifically", "such as"],
            "conclusion": ["in conclusion", "to summarize", "in summary", "overall", "finally"]
        }
        
        found_transitions = []
        transition_count = 0
        
        for i, sentence in enumerate(sentences):
            sentence_lower = sentence.lower()
            for category, words in transitions.items():
                for word in words:
                    if word in sentence_lower:
                        found_transitions.append({
                            "sentence_index": i,
                            "category": category,
                            "word": word,
                            "sentence": sentence[:100]  # First 100 chars
                        })
                        transition_count += 1
                        break
        
        # Calculate transition score
        # Ideal: 1-2 transitions per paragraph
        num_sentences = len(sentences)
        ideal_transitions = num_sentences / 10  # Rough estimate
        
        if num_sentences > 0:
            if transition_count < ideal_transitions * 0.5:
                score = 40.0
            elif transition_count < ideal_transitions:
                score = 60.0
            elif transition_count <= ideal_transitions * 1.5:
                score = 85.0
            else:
                score = 70.0  # Too many transitions can be excessive
        else:
            score = 50.0
        
        return {
            "score": round(score, 2),
            "transitions": found_transitions,
            "count": transition_count
        }
    
    def _analyze_paragraph_unity(self, paragraphs: List[str]) -> Dict[str, Any]:
        """Analyze paragraph unity and identify topic sentences"""
        topic_sentences = []
        unity_scores = []
        
        for i, paragraph in enumerate(paragraphs):
            sentences = self._segment_sentences(paragraph)
            if not sentences:
                continue
            
            # First sentence is typically the topic sentence
            topic_sentence = sentences[0]
            topic_sentences.append({
                "paragraph_index": i,
                "sentence": topic_sentence[:150],
                "position": "first"
            })
            
            # Calculate paragraph unity (simplified: check if sentences relate to topic)
            if self.sentence_model and len(sentences) > 1:
                try:
                    embeddings = self.sentence_model.encode(sentences)
                    topic_embedding = embeddings[0]
                    
                    # Calculate similarity of other sentences to topic sentence
                    similarities = []
                    for j in range(1, len(embeddings)):
                        similarity = np.dot(topic_embedding, embeddings[j]) / (
                            np.linalg.norm(topic_embedding) * np.linalg.norm(embeddings[j])
                        )
                        similarities.append(float(similarity))
                    
                    if similarities:
                        avg_similarity = np.mean(similarities)
                        unity_scores.append(avg_similarity)
                except Exception as e:
                    logger.error(f"Error calculating paragraph unity: {e}")
        
        # Calculate overall paragraph unity score
        if unity_scores:
            overall_unity = np.mean(unity_scores) * 100
        else:
            overall_unity = 70.0  # Default if calculation fails
        
        return {
            "score": round(overall_unity, 2),
            "topic_sentences": topic_sentences,
            "paragraph_count": len(paragraphs)
        }
    
    def _analyze_structure(self, paragraphs: List[str], sentences: List[str]) -> Dict[str, Any]:
        """Analyze overall essay structure"""
        structure = {
            "has_introduction": False,
            "has_body": False,
            "has_conclusion": False,
            "paragraph_count": len(paragraphs),
            "sentence_count": len(sentences),
            "structure_quality": "needs_improvement"
        }
        
        if len(paragraphs) >= 3:
            structure["has_introduction"] = True
            structure["has_body"] = True
            structure["has_conclusion"] = True
            structure["structure_quality"] = "good"
        elif len(paragraphs) >= 2:
            structure["has_introduction"] = True
            structure["has_body"] = True
            structure["structure_quality"] = "fair"
        
        # Check for conclusion indicators
        if paragraphs:
            last_paragraph = paragraphs[-1].lower()
            conclusion_indicators = ["in conclusion", "to summarize", "in summary", "overall", "finally"]
            if any(indicator in last_paragraph for indicator in conclusion_indicators):
                structure["has_conclusion"] = True
        
        return structure
    
    def _identify_coherence_issues(self, results: Dict[str, Any], 
                                   paragraphs: List[str], sentences: List[str]) -> List[Dict[str, Any]]:
        """Identify specific coherence issues"""
        issues = []
        
        # Entity grid issues
        if results["entity_grid_score"] < 50:
            issues.append({
                "type": "entity_continuity",
                "severity": "medium",
                "message": "Limited continuity of key concepts across sentences",
                "suggestion": "Ensure key concepts are mentioned consistently throughout the essay to maintain coherence."
            })
        
        # Semantic similarity issues
        if results["semantic_similarity_score"] < 50:
            issues.append({
                "type": "semantic_coherence",
                "severity": "medium",
                "message": "Sentences may not connect well thematically",
                "suggestion": "Improve connections between sentences by using related concepts and maintaining thematic consistency."
            })
        
        # Transition issues
        if results["transition_score"] < 60:
            issues.append({
                "type": "transitions",
                "severity": "medium",
                "message": "Limited use of transitional elements",
                "suggestion": "Add transitional words and phrases to connect ideas and improve flow (e.g., 'however', 'furthermore', 'therefore')."
            })
        
        # Paragraph unity issues
        if results["paragraph_unity"] < 70:
            issues.append({
                "type": "paragraph_unity",
                "severity": "medium",
                "message": "Some paragraphs may lack unity",
                "suggestion": "Ensure each paragraph focuses on a single main idea and that all sentences support the paragraph's topic sentence."
            })
        
        # Structure issues
        structure = results["structure_analysis"]
        if not structure["has_conclusion"]:
            issues.append({
                "type": "structure",
                "severity": "high",
                "message": "No clear conclusion detected",
                "suggestion": "Add a concluding paragraph that summarizes main points and reinforces the thesis."
            })
        
        if structure["paragraph_count"] < 3:
            issues.append({
                "type": "structure",
                "severity": "medium",
                "message": f"Essay has only {structure['paragraph_count']} paragraph(s)",
                "suggestion": "Expand essay structure with introduction, body paragraphs, and conclusion."
            })
        
        return issues
    
    def _calculate_coherence_score(self, results: Dict[str, Any]) -> float:
        """Calculate overall coherence score (0-100)"""
        weights = {
            "entity_grid": 0.3,
            "semantic_similarity": 0.3,
            "transitions": 0.2,
            "paragraph_unity": 0.2
        }
        
        score = (
            results["entity_grid_score"] * weights["entity_grid"] +
            results["semantic_similarity_score"] * weights["semantic_similarity"] +
            results["transition_score"] * weights["transitions"] +
            results["paragraph_unity"] * weights["paragraph_unity"]
        )
        
        return round(score, 2)

