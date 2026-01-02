"""
OCR Controller
Handles PDF/image OCR endpoints
"""
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional

from ..services import ocr_service

ocr_router = APIRouter()
logger = logging.getLogger(__name__)

@ocr_router.post("/extract-text")
async def extract_text_from_file(
    file: UploadFile = File(...)
):
    """
    Extract text from uploaded PDF or image file using OCR
    
    Supports:
    - PDF files (.pdf)
    - Image files (.jpg, .jpeg, .png, .bmp, .tiff)
    
    Returns extracted text that can be used for essay analysis
    """
    # Validate file type
    content_type = file.content_type or ""
    filename = file.filename or "unknown"
    
    # Check if it's a PDF
    is_pdf = content_type == "application/pdf" or filename.lower().endswith(".pdf")
    
    # Check if it's an image
    is_image = content_type.startswith("image/") or any(
        filename.lower().endswith(ext) 
        for ext in [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif"]
    )
    
    if not (is_pdf or is_image):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF or image file."
        )
    
    try:
        # Read file content - FastAPI's UploadFile.read() must be awaited
        file_bytes = await file.read()
        logger.info(f"Received file: {filename}, size: {len(file_bytes)} bytes, content_type: {content_type}")
        
        if len(file_bytes) == 0:
            logger.error(f"File {filename} is empty after reading")
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        # Verify it's actually PDF bytes
        pdf_magic = None
        if len(file_bytes) >= 4:
            pdf_magic = file_bytes[:4]
            logger.info(f"File {filename} first 4 bytes: {pdf_magic!r}")
            if not pdf_magic.startswith(b'%PDF'):
                logger.error(f"File {filename} does not have PDF magic bytes: {pdf_magic!r}")
        
        # Check file size (max 20MB)
        max_size = 20 * 1024 * 1024  # 20MB
        if len(file_bytes) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size / (1024*1024):.0f}MB"
            )
        
        # Extract text using OCR
        # Note: OCR processing is CPU-intensive, so we run it in a thread pool
        # to avoid blocking the async event loop
        import asyncio
        if is_pdf:
            logger.info(f"Processing PDF file: {filename} ({len(file_bytes)} bytes)")
            try:
                result = await asyncio.to_thread(ocr_service.extract_text_from_pdf, file_bytes, filename)
            except Exception as e:
                logger.error(f"Exception in OCR thread for {filename}: {e}", exc_info=True)
                raise HTTPException(
                    status_code=500,
                    detail=f"Error during OCR processing: {str(e)}"
                )
        else:
            logger.info(f"Processing image file: {filename} ({len(file_bytes)} bytes)")
            try:
                result = await asyncio.to_thread(ocr_service.extract_text_from_image, file_bytes, filename)
            except Exception as e:
                logger.error(f"Exception in OCR thread for {filename}: {e}", exc_info=True)
                raise HTTPException(
                    status_code=500,
                    detail=f"Error during OCR processing: {str(e)}"
                )
        
        # Validate result structure
        if not isinstance(result, dict):
            logger.error(f"OCR service returned invalid result type: {type(result)} for {filename}")
            raise HTTPException(
                status_code=500,
                detail="OCR service returned invalid response"
            )
        
        logger.info(f"OCR result for {filename}: result_keys={list(result.keys())}, text_length={len(result.get('text', ''))}, word_count={result.get('word_count', 0)}, error={'error' in result}")
        
        # Check for errors
        if "error" in result:
            logger.error(f"OCR error for {filename}: {result.get('message', 'Unknown error')}")
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "OCR processing failed")
            )
        
        # Calculate word_count if missing or invalid, but text exists
        text = result.get("text", "")
        word_count = result.get("word_count", 0)
        
        # If we got empty text but should have content, log detailed warning
        if not text or not text.strip():
            logger.warning(f"OCR returned empty text for {filename} ({len(file_bytes)} bytes file)")
            logger.warning(f"Result structure: {result}")
            logger.warning(f"Result keys: {list(result.keys())}")
            logger.warning(f"File first 50 bytes: {file_bytes[:50]!r}")
            
            # Check if this is a text-based PDF that should have worked with direct extraction
            if pdf_magic and pdf_magic.startswith(b'%PDF') and not result.get("error"):
                logger.error(f"Text-based PDF returned empty text - this should not happen!")
                # Return an error instead of empty text
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to extract text from PDF. The file appears to be a valid PDF but text extraction returned empty results. Please check backend logs for details."
                )
        else:
            if not word_count or word_count == 0:
                word_count = len(text.split())
        
        return {
            "text": text,
            "word_count": word_count,
            "confidence": result.get("confidence", 0.0),
            "page_count": result.get("page_count", 1),
            "filename": filename
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing file {filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while processing file: {str(e)}"
        )

