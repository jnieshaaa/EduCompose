from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import logging
from ..services.ocr_service import ocr_service

ocr_router = APIRouter()
logger = logging.getLogger(__name__)

@ocr_router.get("/test")
async def test_ocr():
    return {"status": "ok", "message": "OCR Router is reachable"}

@ocr_router.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text from uploaded files (Image or PDF)
    """
    try:
        content_type = file.content_type
        filename = file.filename
        
        logger.info(f"OCR: Extracting text from {filename} ({content_type})")
        
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        result = {}
        
        # Determine extraction strategy based on content type
        if "text" in content_type or filename.endswith('.txt'):
            try:
                extracted_text = content.decode("utf-8")
            except UnicodeDecodeError:
                extracted_text = content.decode("latin-1")
            
            result = {
                "text": extracted_text,
                "word_count": len(extracted_text.split()),
                "filename": filename,
                "success": True
            }
        
        elif "pdf" in content_type or filename.endswith('.pdf'):
            # Use the robust OCR service for PDFs (handles text and scanned)
            ocr_result = ocr_service.extract_text_from_pdf(content, filename)
            if "error" in ocr_result:
                raise HTTPException(status_code=500, detail=ocr_result.get("message", "PDF extraction failed"))
            result = ocr_result
            
        elif "image" in content_type or any(filename.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".bmp", ".tiff"]):
            # Use the robust OCR service for images
            ocr_result = ocr_service.extract_text_from_image(content, filename)
            if "error" in ocr_result:
                raise HTTPException(status_code=500, detail=ocr_result.get("message", "Image OCR failed"))
            result = ocr_result
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")

        # Ensure word count is present
        if "word_count" not in result and "text" in result:
            result["word_count"] = len(result["text"].split()) if result["text"] else 0
            
        logger.info(f"OCR: Extracted {result.get('word_count', 0)} words from {filename}")
        
        return JSONResponse(content={
            "success": True,
            **result,
            "filename": filename
        })
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"OCR Controller Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal OCR error: {str(e)}")
