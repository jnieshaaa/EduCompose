from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import logging
import io
import PyPDF2

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text from uploaded files (Image or PDF)
    """
    try:
        content_type = file.content_type
        filename = file.filename
        
        logger.info(f"Extracting text from {filename} ({content_type})")
        
        content = await file.read()
        extracted_text = ""
        
        if "text" in content_type or filename.endswith('.txt'):
            try:
                extracted_text = content.decode("utf-8")
            except UnicodeDecodeError:
                # Fallback to latin-1 if utf-8 fails
                extracted_text = content.decode("latin-1")
        
        elif "pdf" in content_type or filename.endswith('.pdf'):
            try:
                # Use PyPDF2 for text-based PDF extraction
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                text_parts = []
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                
                extracted_text = "\n".join(text_parts)
                
                # If extraction failed but it's a valid PDF (e.g. scanned image)
                if not extracted_text.strip():
                    extracted_text = "[OCR Warning: This PDF seems to be an image. Please upload a text-based PDF or wait for further OCR updates.]"
                    
            except Exception as pdf_err:
                logger.error(f"PDF extraction error: {str(pdf_err)}")
                extracted_text = f"[Error reading PDF: {str(pdf_err)}]"
        
        else:
            # For images or other types, we might want easyocr later
            extracted_text = f"[Unsupported file type: {content_type}. Please upload a PDF or TXT file.]"
            
        # Clean up text a bit
        final_text = extracted_text.strip()
        
        # Calculate word count for feedback
        word_count = len(final_text.split()) if final_text else 0
        
        return JSONResponse(content={
            "success": True,
            "text": final_text,
            "word_count": word_count,
            "filename": filename
        })
        
    except Exception as e:
        logger.error(f"OCR Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
