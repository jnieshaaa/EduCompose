"""
Transformer-based Claim Classifier with Fine-tuned Model Support

Uses a fine-tuned DistilBERT model for fast and accurate argument classification.
"""

import logging
import os
import time
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from enum import Enum

# Use httpx for remote API calls
import httpx

# Conditional imports for local ML
try:
    import torch
    import torch.nn.functional as F
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

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
    DistilBERT classifier for argumentation components.
    Supports both local execution (PyTorch) and remote execution (HF Inference API).
    """

    def __init__(
        self,
        model_name: str = "distilbert-base-uncased",
        use_fine_tuned: bool = True,
        fine_tuned_model_path: Optional[str] = None,
        device: str = "cpu"
    ):
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

        # HF API Configuration
        self.hf_token = (
            (os.getenv("HUGGING_FACE_HUB_TOKEN") or 
             os.getenv("HF_API_TOKEN") or 
             os.getenv("HUGGINGFACE_API_TOKEN") or "")
            .strip()
        )
        self.hf_repo = os.getenv("HUGGING_FACE_MODEL_ID", "nt-prgrmr/my_finetuned_distilbert").strip()
        
        # Decide whether to use remote API or local
        # If torch is missing but token is present, force remote
        self.use_remote = bool(self.hf_token and (not TORCH_AVAILABLE or os.getenv("FORCE_REMOTE_NLP") == "1"))
        
        if self.use_remote:
            logger.info(f"Claim Classifier: Using Hugging Face Inference API (Repo: {self.hf_repo})")
            self._initialized = True
            return

        # Local initialization logic
        if not TORCH_AVAILABLE:
            logger.warning("PyTorch/Transformers not available and no HF token found. Classifier will be unavailable.")
            return

        if use_fine_tuned and self.fine_tuned_model_path is None:
            backend_root = Path(__file__).parent.parent.parent
            default_path = backend_root / "my_finetuned_distilbert"
            self.fine_tuned_model_path = str(default_path)

        if use_fine_tuned and self.fine_tuned_model_path:
            if not Path(self.fine_tuned_model_path).exists():
                if self.hf_token:
                    logger.info(f"Local model not found, but token exists. Switching to Remote API for Repo: {self.hf_repo}")
                    self.use_remote = True
                    self._initialized = True
                    return
                else:
                    logger.warning(f"Local model not found at {self.fine_tuned_model_path} and no HF token. Falling back to base model.")
                    use_fine_tuned = False
                    self.fine_tuned_model_path = None

        self._initialize_local(use_fine_tuned, self.fine_tuned_model_path)

    def _initialize_local(self, use_fine_tuned: bool = False, model_path: Optional[str] = None):
        """Load tokenizer and model locally"""
        if not TORCH_AVAILABLE or self._initialized:
            return

        try:
            load_path = model_path if (use_fine_tuned and model_path) else self.model_name
            logger.info(f"Loading local model: {load_path}")

            self.tokenizer = AutoTokenizer.from_pretrained(load_path, token=self.hf_token)
            if use_fine_tuned and model_path:
                self.model = AutoModelForSequenceClassification.from_pretrained(load_path, token=self.hf_token)
                if hasattr(self.model.config, 'id2label') and self.model.config.id2label:
                    self.id2label = self.model.config.id2label
                    self.label2id = {v: int(k) for k, v in self.id2label.items()}
            else:
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    load_path, num_labels=5, id2label=self.id2label, label2id=self.label2id
                )

            self.model.to(self.device).eval()
            self._initialized = True
            logger.info(f"Local model initialized on {self.device}")
        except Exception as e:
            logger.error(f"Failed to initialize local model: {e}")
            self._initialized = False

    async def _classify_llm(self, sentences: List[str]) -> List[Dict[str, Any]]:
        """Fallback to Gemini for classification if HF fails"""
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            return [{"component": "unknown", "confidence": 0.0} for _ in sentences]

        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            
            # Prepare model candidates
            env_model = os.getenv("GEMINI_MODEL_NAME")
            if env_model:
                env_model = env_model.replace("models/", "")
            
            model_candidates = []
            if env_model:
                model_candidates.append(env_model)
            
            stable_fallbacks = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-pro-latest']
            for m in stable_fallbacks:
                if m not in model_candidates:
                    model_candidates.append(m)
            
            response = None
            last_error = None
            
            for m_name in model_candidates:
                try:
                    # Verify and use
                    response = client.models.generate_content(
                        model=m_name,
                        contents=prompt,
                        config={
                            'response_mime_type': 'application/json',
                            'max_output_tokens': 4096
                        }
                    )
                    if response and response.text:
                        logger.info(f"✓ Classification successful using Gemini model: {m_name}")
                        break
                except Exception as model_err:
                    last_error = model_err
                    logger.debug(f"Gemini model {m_name} failed for classification: {model_err}")
                    continue
            
            if not response or not response.text:
                logger.error(f"All Gemini models failed for classification. Last error: {last_error}")
                return self._heuristic_classify(sentences)
            
            if not response or not response.text:
                return self._heuristic_classify(sentences)
                
            data = json.loads(response.text)
            results = []
            for item in data:
                results.append({
                    "component": str(item.get('label', 'unknown')).lower(),
                    "confidence": float(item.get('score', 0.0))
                })
            return results
        except Exception as e:
            logger.warning(f"Classification fallback triggered ({e}). Using local heuristics.")
            return self._heuristic_classify(sentences)

    def _heuristic_classify(self, sentences: List[str]) -> List[Dict[str, Any]]:
        """Last resort: use broad keywords to detect claims and evidence"""
        results = []
        # Significantly expanded keywords
        claim_indicators = [
            "argue", "claim", "must", "should", "Therefore", "Hence", "believe", "point is",
            "conclude", "opinion", "view", "necessary", "ought to", "thesis", "position",
            "in conclusion", "clearly", "obviously", "essential", "important", "main idea",
            "suggest", "propose", "think", "appears that", "shows that"
        ]
        evidence_indicators = [
            "study", "research", "According to", "data", "found", "statistics", "report", "example",
            "fact", "shows", "demonstrates", "proof", "source", "instance", "illustrates",
            "specifically", "for one", "evidence", "data", "results", "analysis", "case"
        ]
        premise_indicators = [
            "because", "since", "given that", "as shown by", "follows from", "reason",
            "due to", "owing to", "account of", "considering", "if"
        ]
        
        for s in sentences:
            s_lower = s.lower()
            # Check for indicators with word boundaries to avoid partial matches
            has_claim = any(ind.lower() in s_lower for ind in claim_indicators)
            has_evidence = any(ind.lower() in s_lower for ind in evidence_indicators)
            has_premise = any(ind.lower() in s_lower for ind in premise_indicators)

            if has_claim:
                results.append({"component": "claim", "confidence": 0.85})
            elif has_evidence:
                results.append({"component": "evidence", "confidence": 0.85})
            elif has_premise:
                results.append({"component": "premise", "confidence": 0.80})
            elif len(s.split()) > 15:
                # Long sentences are often background or warrants
                results.append({"component": "background", "confidence": 0.5})
            else:
                results.append({"component": "unknown", "confidence": 0.1})
        return results

    async def _classify_remote(self, sentences: List[str]) -> List[Dict[str, Any]]:
        """Call Hugging Face Inference API for classification with robust fallback"""
        if not self.hf_token:
            return self._heuristic_classify(sentences)

        url = f"https://api-inference.huggingface.co/models/{self.hf_repo}"
        headers = {
            "Authorization": f"Bearer {self.hf_token}",
            "Content-Type": "application/json",
            "x-use-cache": "false"
        }
        
        results = []
        batch_size = 5
        for i in range(0, len(sentences), batch_size):
            batch = sentences[i:i + batch_size]
            payload = {"inputs": batch, "options": {"wait_for_model": True}}
            
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    for item in data:
                        if isinstance(item, list) and len(item) > 0:
                            best = max(item, key=lambda x: x.get('score', 0))
                            results.append({
                                "component": str(best.get('label', 'unknown')).lower(),
                                "confidence": float(best.get('score', 0.0))
                            })
                        elif isinstance(item, dict) and 'label' in item:
                            results.append({
                                "component": str(item.get('label', 'unknown')).lower(),
                                "confidence": float(item.get('score', 0.0))
                            })
                        else:
                            results.append({"component": "unknown", "confidence": 0.0})
                else:
                    # On any non-200 status, trigger LLM fallback then heuristics
                    logger.warning(f"HF API returned {response.status_code}. Attempting LLM fallback...")
                    try:
                        llm_results = await self._classify_llm(batch)
                        results.extend(llm_results)
                    except Exception as llm_err:
                        logger.error(f"LLM fallback also failed: {llm_err}. Using heuristics.")
                        results.extend(self._heuristic_classify(batch))
            except Exception as e:
                logger.error(f"HF API request failed: {e}. Attempting LLM fallback...")
                try:
                    llm_results = await self._classify_llm(batch)
                    results.extend(llm_results)
                except Exception as llm_err:
                    logger.error(f"LLM fallback also failed: {llm_err}. Using heuristics.")
                    results.extend(self._heuristic_classify(batch))
                
        return results

    def _classify_local(self, sentences: List[str]) -> List[Dict[str, Any]]:
        """Local classification using PyTorch"""
        if not self.model or not self.tokenizer:
            return []
            
        results = []
        batch_size = 16
        for i in range(0, len(sentences), batch_size):
            batch = sentences[i:i+batch_size]
            inputs = self.tokenizer(batch, return_tensors="pt", truncation=True, max_length=128, padding=True).to(self.device)
            with torch.no_grad():
                outputs = self.model(**inputs)
            probs = F.softmax(outputs.logits, dim=-1)
            classes = torch.argmax(probs, dim=-1)
            for j in range(len(batch)):
                idx = classes[j].item()
                results.append({
                    "component": self.id2label.get(idx, "unknown"),
                    "confidence": probs[j][idx].item()
                })
        return results

    async def classify_sentences(self, sentences: List[str]) -> List[Dict[str, Any]]:
        """Asynchronous classification"""
        if not self._initialized:
            return [{"component": "unknown", "confidence": 0.0} for _ in sentences]

        if self.use_remote:
            try:
                return await self._classify_remote(sentences)
            except Exception as e:
                logger.error(f"Remote classification failed: {e}")
                return [{"component": "unknown", "confidence": 0.0} for _ in sentences]
        else:
            return self._classify_local(sentences)

    async def classify_text(self, text: str) -> Dict[str, Any]:
        """Split text and classify components"""
        import re
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 5]
        
        classifications = await self.classify_sentences(sentences)
        
        counts = {}
        for c in classifications:
            comp = c["component"]
            counts[comp] = counts.get(comp, 0) + 1
            
        total = len(classifications)
        dist = {k: v/total for k, v in counts.items()} if total > 0 else {}
        
        return {
            "sentences": classifications,
            "component_counts": counts,
            "component_distribution": dist,
            "total_sentences": total
        }

    def is_available(self) -> bool:
        return self._initialized

def get_claim_classifier(**kwargs) -> TransformerClaimClassifier:
    return TransformerClaimClassifier(**kwargs)
