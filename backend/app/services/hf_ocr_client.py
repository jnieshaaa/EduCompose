"""
Hugging Face Inference API — OCR (remote)

Set HF_API_TOKEN (or HUGGINGFACE_API_TOKEN) so scanned PDFs / images can use HF
Inference API instead of only EasyOCR (when OCR_BACKEND=auto and token is set).

Default model: microsoft/trocr-base-printed (printed English).
Override with HF_OCR_MODEL. Free tier: cold starts may return 503 once.

Env:
  HF_API_TOKEN or HUGGINGFACE_API_TOKEN  — required for HF OCR
  HF_OCR_MODEL                           — optional, default microsoft/trocr-base-printed
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
    return (os.getenv("HF_API_TOKEN") or os.getenv("HUGGINGFACE_API_TOKEN") or "").strip() or None


def is_configured() -> bool:
    return get_hf_token() is not None


def _default_model() -> str:
    return os.getenv("HF_OCR_MODEL", "microsoft/trocr-base-printed").strip()


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
    """
    token = get_hf_token()
    if not token:
        return None

    model = _default_model()
    url = f"{INFERENCE_BASE}/{model}"
    try:
        img = _resize_if_needed(image)
        data = _pil_to_jpeg_bytes(img)
    except Exception as e:
        logger.error("HF OCR: failed to encode image: %s", e)
        return None

    headers = {"Authorization": f"Bearer {token}"}
    last_error = None
    for attempt in range(2):
        try:
            with httpx.Client(timeout=timeout) as client:
                r = client.post(url, content=data, headers=headers)
            if r.status_code == 503:
                wait = 12 + attempt * 8
                logger.warning(
                    "HF OCR model cold-start (503), retrying in %ss (attempt %s/2)",
                    wait,
                    attempt + 1,
                )
                time.sleep(wait)
                continue
            if r.status_code != 200:
                last_error = f"HTTP {r.status_code}: {r.text[:400]}"
                logger.error("HF OCR request failed: %s", last_error)
                return None
            try:
                payload = r.json()
            except Exception as je:
                logger.error("HF OCR invalid JSON: %s", je)
                return None
            text = _parse_inference_response(payload)
            if text:
                return text
            logger.warning("HF OCR empty result payload: %s", str(payload)[:300])
            return None
        except httpx.TimeoutException as e:
            last_error = str(e)
            logger.warning("HF OCR timeout (attempt %s): %s", attempt + 1, e)
            time.sleep(5)
        except Exception as e:
            logger.error("HF OCR request error: %s", e)
            return None

    if last_error:
        logger.error("HF OCR gave up: %s", last_error)
    return None
