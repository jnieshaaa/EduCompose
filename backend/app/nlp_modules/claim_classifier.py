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
        self.hf_repo = os.getenv("HUGGING_FACE_MODEL_ID", "taritree/distilbert-base-uncased-finetuned-argumentation").strip()
        
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

    async def _classify_remote(self, sentences: List[str]) -> List[Dict[str, Any]]:
        """Call Hugging Face Inference API for classification"""
        if not self.hf_token:
            return []

        url = f"https://api-inference.huggingface.co/models/{self.hf_repo}"
        headers = {"Authorization": f"Bearer {self.hf_token}"}
        
        results = []
        # Process in small batches for API stability
        batch_size = 5
        for i in range(0, len(sentences), batch_size):
            batch = sentences[i:i + batch_size]
            payload = {"inputs": batch, "options": {"wait_for_model": True}}
            
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    # HF API returns list of lists of dicts (for multi-sentence) or list of dicts
                    # We need to map it back to our format
                    for item in data:
                        # Find highest score
                        if isinstance(item, list):
                            best = max(item, key=lambda x: x['score'])
                            results.append({
                                "component": best['label'].lower(),
                                "confidence": best['score']
                            })
                        else:
                            # Unexpected format fallback
                            results.append({"component": "unknown", "confidence": 0.0})
                else:
                    logger.error(f"HF API Error {response.status_code}: {response.text}")
                    for _ in batch: results.append({"component": "unknown", "confidence": 0.0})
            except Exception as e:
                logger.error(f"HF API request failed: {e}")
                for _ in batch: results.append({"component": "unknown", "confidence": 0.0})
                
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

    def classify_sentences(self, sentences: List[str]) -> List[Dict[str, Any]]:
        """Synchronous wrapper for classification"""
        if not self._initialized:
            return [{"component": "unknown", "confidence": 0.0} for _ in sentences]

        if self.use_remote:
            import asyncio
            try:
                # Use a loop if we are already in one, or run a new one
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # This is tricky in a sync wrapper, but for small batches it's usually via a controller
                        # In FastAPI, we are usually in an async context anyway if called from router
                        import nest_asyncio
                        nest_asyncio.apply()
                        return loop.run_until_complete(self._classify_remote(sentences))
                    return loop.run_until_complete(self._classify_remote(sentences))
                except RuntimeError:
                    return asyncio.run(self._classify_remote(sentences))
            except Exception as e:
                logger.error(f"Remote classification failed: {e}")
                return [{"component": "unknown", "confidence": 0.0} for _ in sentences]
        else:
            return self._classify_local(sentences)

    def classify_text(self, text: str) -> Dict[str, Any]:
        """Split text and classify components"""
        import re
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 5]
        
        classifications = self.classify_sentences(sentences)
        
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
