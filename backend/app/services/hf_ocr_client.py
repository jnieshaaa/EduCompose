"""
Hugging Face Inference API — OCR (remote)

Set HF_API_TOKEN (or HUGGINGFACE_API_TOKEN) so scanned PDFs / images can use HF
Inference API instead of only EasyOCR (when OCR_BACKEND=auto and token is set).

Default model: microsoft/trocr-base-handwritten (essays / sulat-kamay).
Printed text: HF_OCR_MODEL=microsoft/trocr-base-printed. Free tier: cold starts may return 503.

Env:
  HF_API_TOKEN / HUGGINGFACE_API_TOKEN / HUGGING_FACE_HUB_TOKEN — isa lang kailangan (Inference API)
  HF_OCR_MODEL                           — optional (see default above)
  HF_OCR_MAX_SIDE                        — optional, default 1024 (resize before API call)
  OCR_BACKEND                            — auto | hf | local (see ocr_service)
"""
from __future__ import annotations

import io
import logging
import os
import time
from typing import Any, Optional

import httpx
from PIL import Image

logger = logging.getLogger(__name__)

INFERENCE_BASE = "https://api-inference.huggingface.co/models"


def get_hf_token() -> Optional[str]:
    return (
        os.getenv("HF_API_TOKEN") or 
        os.getenv("HUGGINGFACE_API_TOKEN") or 
        os.getenv("HUGGING_FACE_HUB_TOKEN") or 
        ""
    ).strip() or None


def is_configured() -> bool:
    return get_hf_token() is not None


def _default_model() -> str:
    return os.getenv("HF_OCR_MODEL", "microsoft/trocr-base-handwritten").strip()


def _max_side() -> int:
    try:
        return max(256, min(2048, int(os.getenv("HF_OCR_MAX_SIDE", "1024"))))
    except ValueError:
        return 1024


def _resize_if_needed(image: Image.Image) -> Image.Image:
    max_s = _max_side()
    w, h = image.size
    if max(w, h) <= max_s:
        return image
    ratio = max_s / max(w, h)
    nw, nh = int(w * ratio), int(h * ratio)
    return image.resize((nw, nh), Image.Resampling.LANCZOS)


def _pil_to_jpeg_bytes(image: Image.Image) -> bytes:
    if image.mode != "RGB":
        image = image.convert("RGB")
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90, optimize=True)
    return buf.getvalue()


def _parse_inference_response(payload: Any) -> Optional[str]:
    if payload is None:
        return None
    if isinstance(payload, list) and len(payload) > 0:
        first = payload[0]
        if isinstance(first, dict):
            if "generated_text" in first:
                return str(first["generated_text"]).strip()
            if "text" in first:
                return str(first["text"]).strip()
    if isinstance(payload, dict):
        if "generated_text" in payload:
            return str(payload["generated_text"]).strip()
        if isinstance(payload.get("error"), str):
            logger.warning("HF OCR API error field: %s", payload.get("error")[:200])
    return None


def ocr_pil_image(image: Image.Image, timeout: float = 120.0) -> Optional[str]:
    """
    Send a PIL image to HF Inference API; return recognized text or None.
    Includes a fallback logic to ensure successful extraction for defense.
    """
    token = get_hf_token()
    if not token:
        logger.warning("HF OCR: No API token found in environment.")
        return None

    # Primary model (user defined or stable default)
    primary_model = _default_model()
    # Secondary model as reliable fallback
    fallback_model = "microsoft/trocr-base-handwritten" if primary_model != "microsoft/trocr-base-handwritten" else "facebook/nougat-small"
    
    models_to_try = [primary_model]
    if primary_model != fallback_model:
        models_to_try.append(fallback_model)

    img = None
    try:
        img = _resize_if_needed(image)
        data = _pil_to_jpeg_bytes(img)
    except Exception as e:
        logger.error("HF OCR: failed to encode image: %s", e)
        return None

    headers = {"Authorization": f"Bearer {token}"}
    
    for model in models_to_try:
        url = f"{INFERENCE_BASE}/{model}"
        logger.info("HF OCR: Attempting extraction with model: %s", model)
        
        for attempt in range(2):
            try:
                with httpx.Client(timeout=timeout) as client:
                    r = client.post(url, content=data, headers=headers)
                
                if r.status_code == 503:
                    wait = 15 + attempt * 10
                    logger.warning("HF OCR model %s cold-start, retrying in %ss...", model, wait)
                    time.sleep(wait)
                    continue
                    
                if r.status_code == 404:
                    logger.warning("HF OCR model %s not available (404). Trying next model...", model)
                    break # Break inner loop, try next model in models_to_try
                
                if r.status_code != 200:
                    logger.error("HF OCR request failed for %s (HTTP %s): %s", model, r.status_code, r.text[:200])
                    break # Try next model
                
                try:
                    payload = r.json()
                except Exception as je:
                    logger.error("HF OCR invalid JSON from %s: %s", model, je)
                    break

                text = _parse_inference_response(payload)
                if text and len(text.strip()) > 5:
                    logger.info("HF OCR success with model %s (%d chars)", model, len(text))
                    return text
                
                logger.warning("HF OCR empty result from %s, trying next model/attempt...", model)
            except httpx.TimeoutException:
                logger.warning("HF OCR timeout with model %s (attempt %s/2)", model, attempt + 1)
                time.sleep(5)
            except Exception as e:
                logger.error("HF OCR request error for %s: %s", model, e)
                break
                
    return None
