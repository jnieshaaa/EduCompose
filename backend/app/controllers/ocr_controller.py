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
        # Read file content
        file_bytes = await file.read()
        
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        # Check file size (max 20MB)
        max_size = 20 * 1024 * 1024  # 20MB
        if len(file_bytes) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size / (1024*1024):.0f}MB"
            )
        
        # Extract text using OCR
        if is_pdf:
            logger.info(f"Processing PDF file: {filename}")
            result = ocr_service.extract_text_from_pdf(file_bytes, filename)
        else:
            logger.info(f"Processing image file: {filename}")
            result = ocr_service.extract_text_from_image(file_bytes, filename)
        
        # Check for errors
        if "error" in result:
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "OCR processing failed")
            )
        
        return {
            "text": result.get("text", ""),
            "word_count": result.get("word_count", 0),
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

