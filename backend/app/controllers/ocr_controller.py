from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import logging
import os

ocr_router = APIRouter()
logger = logging.getLogger(__name__)

@ocr_router.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text from uploaded files (Image or PDF)
    """
    try:
        content_type = file.content_type
        filename = file.filename
        
        logger.info(f"OCR: Received file {filename} with type {content_type}")
        
        # Read file content
        content = await file.read()
        
        # Simple extraction logic for text files
        extracted_text = ""
        
        if "text" in content_type or filename.endswith('.txt'):
            extracted_text = content.decode("utf-8")
        elif "pdf" in content_type:
            # Placeholder for PDF extraction (requires pypdf or similar)
            extracted_text = "[PDF Content Extraction Ready] This feature requires a PDF library like pypdf."
        else:
            # Placeholder for Image OCR (requires pytesseract or similar)
            extracted_text = "[Image OCR Ready] This feature requires an OCR library like Tesseract."
            
        return JSONResponse(content={
            "success": True,
            "text": extracted_text,
            "filename": filename
        })
        
    except Exception as e:
        logger.error(f"OCR Controller Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")
