"""
OCR Service
Extracts text from PDF files using EasyOCR
Based on ocr.ipynb implementation
"""
import logging
import tempfile
import os
import warnings
from typing import Dict, Any, Optional
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter, ExifTags
import numpy as np

# Suppress known warnings from EasyOCR and PyTorch
warnings.filterwarnings('ignore', category=RuntimeWarning, module='easyocr')
warnings.filterwarnings('ignore', message='.*pin_memory.*', category=UserWarning)

try:
    from pdf2image import convert_from_path, convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    logging.warning("pdf2image not available. PDF OCR will not work.")

try:
    import PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False
    logging.warning("PyPDF2 not available. Direct text extraction from PDFs will not work.")

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    logging.warning("easyocr not available. OCR will not work.")

logger = logging.getLogger(__name__)

class OCRService:
    """
    OCR service for extracting text from PDF files
    Uses EasyOCR for text recognition
    """
    
    def __init__(self):
        self.reader = None
        if EASYOCR_AVAILABLE:
            try:
                # Initialize EasyOCR reader (English only for now)
                # This may take time on first run as it downloads models
                logger.info("Initializing EasyOCR reader...")
                self.reader = easyocr.Reader(['en'], gpu=False)
                logger.info("EasyOCR reader initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize EasyOCR: {e}")
                self.reader = None
    
    def _correct_orientation(self, image: Image.Image) -> Image.Image:
        """Correct image orientation based on EXIF metadata"""
        try:
            for orientation in ExifTags.TAGS.keys():
                if ExifTags.TAGS[orientation] == 'Orientation':
                    break
            exif = image._getexif()
            if exif is not None:
                orientation_value = exif.get(orientation)
                if orientation_value == 3:
                    image = image.rotate(180, expand=True)
                elif orientation_value == 6:
                    image = image.rotate(270, expand=True)
                elif orientation_value == 8:
                    image = image.rotate(90, expand=True)
        except (AttributeError, KeyError, IndexError, TypeError):
            # No EXIF orientation tag or image doesn't support it
            pass
        return image
    
    def _preprocess_image(self, image: Image.Image, aggressive: bool = False) -> Image.Image:
        """
        Preprocess image to improve OCR accuracy
        Applies contrast enhancement, sharpening, and binarization
        
        Args:
            image: PIL Image to preprocess
            aggressive: If True, applies more aggressive preprocessing for imperfect images
        """
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 1. Enhance Contrast (more aggressive for imperfect images)
        contrast_factor = 2.0 if aggressive else 1.5
        contrast_enhancer = ImageEnhance.Contrast(image)
        contrasted_image = contrast_enhancer.enhance(contrast_factor)
        
        # 2. Enhance Brightness if aggressive mode (helps with dark images)
        if aggressive:
            brightness_enhancer = ImageEnhance.Brightness(contrasted_image)
            contrasted_image = brightness_enhancer.enhance(1.1)
        
        # 3. Sharpen (apply multiple times if aggressive)
        sharpened_image = contrasted_image.filter(ImageFilter.SHARPEN)
        if aggressive:
            sharpened_image = sharpened_image.filter(ImageFilter.SHARPEN)
        
        # 4. Binarization (Thresholding)
        # Convert to grayscale first for binarization
        grayscale_image = sharpened_image.convert('L')
        
        if aggressive:
            # For aggressive mode, try adaptive thresholding approach
            # First enhance contrast in grayscale
            grayscale_enhancer = ImageEnhance.Contrast(grayscale_image)
            grayscale_image = grayscale_enhancer.enhance(1.3)
            
            # Use a lower threshold for darker images
            threshold_value = 110
        else:
            threshold_value = 128
        
        # Apply binary threshold
        binarized_image = grayscale_image.point(lambda p: 255 if p > threshold_value else 0)
        
        return binarized_image
    
    def _extract_text_directly_from_pdf(self, pdf_bytes: bytes) -> Optional[str]:
        """
        Try to extract text directly from PDF (for text-based PDFs)
        Returns None if extraction fails or PDF is image-based
        """
        if not PYPDF2_AVAILABLE:
            return None
        
        try:
            pdf_file = BytesIO(pdf_bytes)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            num_pages = len(pdf_reader.pages)
            logger.info(f"PDF has {num_pages} pages")
            
            # Limit direct extraction to first 20 pages if it's huge
            page_limit = 20
            pages_to_extract = min(num_pages, page_limit)
            
            text_parts = []
            for i in range(pages_to_extract):
                try:
                    page = pdf_reader.pages[i]
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        text_parts.append(page_text)
                        logger.debug(f"Page {i+1}: extracted {len(page_text)} characters")
                    else:
                        logger.debug(f"Page {i+1}: no text extracted")
                except Exception as e:
                    logger.warning(f"Error extracting text from page {i+1}: {e}")
            
            if text_parts:
                combined_text = '\n\n'.join(text_parts)
                # Check if we got meaningful text (more than just whitespace/formatting)
                if len(combined_text.strip()) > 50:  # At least 50 characters
                    logger.info(f"Successfully extracted {len(combined_text)} characters directly from PDF")
                    return combined_text
                else:
                    logger.warning(f"Extracted text too short: {len(combined_text.strip())} characters")
            
            logger.info("Direct extraction returned None - will fall back to OCR")
            return None
        except Exception as e:
            logger.warning(f"Direct text extraction failed (likely image-based PDF): {e}", exc_info=True)
            return None
    
    def extract_text_from_pdf(self, pdf_bytes: bytes, filename: str = "document.pdf") -> Dict[str, Any]:
        """
        Extract text from PDF file
        First tries direct text extraction (for text-based PDFs)
        Falls back to OCR (for scanned/image-based PDFs)
        
        Args:
            pdf_bytes: PDF file content as bytes
            filename: Original filename (for logging)
        
        Returns:
            Dictionary with extracted text and metadata
        """
        logger.info(f"extract_text_from_pdf called for {filename}, received {len(pdf_bytes)} bytes")
        
        if not pdf_bytes or len(pdf_bytes) == 0:
            logger.error(f"Empty PDF bytes received for {filename}")
            return {
                "error": "Empty file",
                "message": "Received empty PDF file"
            }
        
        # Verify PDF bytes start with PDF magic bytes
        pdf_header = pdf_bytes[:4] if len(pdf_bytes) >= 4 else b''
        if not pdf_header.startswith(b'%PDF'):
            logger.warning(f"File {filename} does not appear to be a valid PDF (header: {pdf_header!r}, expected: b'%PDF')")
            logger.warning(f"First 100 bytes: {pdf_bytes[:100]!r}")
            # Still try to process it in case it's a valid PDF with unusual encoding
        else:
            logger.info(f"PDF header verified: {pdf_header!r}")
        
        # First, try direct text extraction (faster and more accurate for text-based PDFs)
        direct_text = None
        try:
            direct_text = self._extract_text_directly_from_pdf(pdf_bytes)
            if direct_text and direct_text.strip():
                word_count = len(direct_text.split())
                logger.info(f"Direct extraction successful for {filename}: {word_count} words, {len(direct_text)} chars")
                return {
                    "text": direct_text,
                    "word_count": word_count,
                    "page_count": 1,  # We don't count pages in direct extraction
                    "confidence": 100.0,  # Direct extraction is 100% accurate
                    "detections": 1,
                    "extraction_method": "direct"
                }
            else:
                logger.info(f"Direct extraction returned empty text for {filename}")
        except Exception as e:
            logger.warning(f"Direct extraction exception for {filename}: {e}", exc_info=True)
        
        # If direct extraction failed, use OCR (for scanned PDFs)
        logger.info(f"Direct text extraction failed or returned empty for {filename}, falling back to OCR...")
        
        if not PDF2IMAGE_AVAILABLE:
            return {
                "error": "PDF processing not available",
                "message": "pdf2image library is not installed. Please install it to use PDF OCR."
            }
        
        if not EASYOCR_AVAILABLE or self.reader is None:
            return {
                "error": "OCR not available",
                "message": "EasyOCR library is not installed or failed to initialize."
            }
        
        try:
            # Convert PDF to images
            logger.info(f"Converting PDF to images: {filename}")
            
            # Try to find Poppler path on Windows
            poppler_path = None
            if os.name == 'nt':  # Windows
                import shutil
                # First, try to find pdftoppm in PATH
                pdftoppm_path = shutil.which("pdftoppm")
                if pdftoppm_path:
                    poppler_path = os.path.dirname(pdftoppm_path)
                    logger.info(f"Found Poppler in PATH at: {poppler_path}")
                else:
                    # Common Poppler installation paths (fallback)
                    username = os.getenv('USERNAME', '')
                    possible_paths = [
                        os.path.expanduser(rf"~\AppData\Local\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin"),
                        r"C:\Program Files\poppler\bin",
                        r"C:\poppler\bin",
                    ]
                    for path in possible_paths:
                        if os.path.exists(path) and os.path.exists(os.path.join(path, "pdftoppm.exe")):
                            poppler_path = path
                            logger.info(f"Found Poppler at: {poppler_path}")
                            break
            
            # Convert PDF to images with Poppler path if found
            # DPI = 200 (Lower to save memory, 300 can OOM)
            # Max 10 pages for OCR to prevent OOM
            try:
                if poppler_path:
                    images = convert_from_bytes(pdf_bytes, dpi=200, poppler_path=poppler_path, last_page=10)
                else:
                    images = convert_from_bytes(pdf_bytes, dpi=200, last_page=10)
            except Exception as e:
                error_msg = str(e)
                if "poppler" in error_msg.lower() or "path" in error_msg.lower():
                    # Poppler not found, try with explicit path
                    logger.warning(f"Poppler not found in PATH: {e}. Trying explicit path...")
                    username = os.getenv('USERNAME', os.getenv('USER', ''))
                    explicit_path = os.path.expanduser(rf"~\AppData\Local\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin")
                    if os.path.exists(explicit_path):
                        logger.info(f"Using explicit Poppler path: {explicit_path}")
                        images = convert_from_bytes(pdf_bytes, dpi=200, poppler_path=explicit_path, last_page=10)
                    else:
                        raise Exception(f"Poppler not found. Please ensure Poppler is installed. Error: {error_msg}")
                else:
                    raise
            
            if not images:
                return {
                    "error": "No pages found",
                    "message": "Could not extract any pages from the PDF."
                }
            
            logger.info(f"Extracted {len(images)} pages from PDF")
            
            # Extract text from all pages
            all_text = []
            total_confidence = 0.0
            total_detections = 0
            
            import gc
            for page_num, image in enumerate(images, 1):
                logger.info(f"Processing page {page_num}/{len(images)}")
                
                # Correct orientation
                image = self._correct_orientation(image)
                
                # Preprocess image for better OCR
                preprocessed_image = self._preprocess_image(image)
                
                # Run OCR with optimized parameters
                try:
                    # First try with standard parameters
                    bounds = self.reader.readtext(
                        np.array(preprocessed_image),
                        min_size=0,
                        slope_ths=0.2,
                        ycenter_ths=0.7,
                        height_ths=0.6,
                        width_ths=0.8,
                        decoder='beamsearch',
                        beamWidth=10,
                        paragraph=True,  # Group text into paragraphs
                        text_threshold=0.5,
                        low_text=0.3
                    )
                    
                    # If no detections, try with more lenient parameters
                    if len(bounds) == 0:
                        logger.warning(f"No text detected with standard parameters on page {page_num}, trying lenient parameters...")
                        bounds = self.reader.readtext(
                            np.array(preprocessed_image),
                            paragraph=True,
                            text_threshold=0.3,  # Lower threshold
                            low_text=0.2,  # Lower threshold
                            width_ths=0.5,  # More lenient
                            height_ths=0.5  # More lenient
                        )
                        logger.info(f"Lenient parameters found {len(bounds)} text regions")
                    
                    # If still no detections, try without preprocessing
                    if len(bounds) == 0:
                        logger.warning(f"No text detected with preprocessing on page {page_num}, trying original image...")
                        bounds = self.reader.readtext(
                            np.array(image),
                            paragraph=True,
                            text_threshold=0.3,
                            low_text=0.2
                        )
                        logger.info(f"Original image found {len(bounds)} text regions")
                    
                    # Extract text and calculate confidence
                    page_text = []
                    page_confidence = 0.0
                    detection_count = 0
                    
                    for bound in bounds:
                        if len(bound) >= 3:
                            text = bound[1]  # Extracted text
                            confidence = bound[2] if len(bound) > 2 else 0.0
                            
                            page_text.append(text)
                            page_confidence += confidence
                            detection_count += 1
                    
                    # Combine page text
                    page_text_combined = '\n'.join(page_text)
                    all_text.append(page_text_combined)
                    
                    if detection_count > 0:
                        total_confidence += page_confidence
                        total_detections += detection_count
                    
                    logger.info(f"Page {page_num}: Extracted {detection_count} text regions")
                
                except Exception as e:
                    logger.error(f"Error processing page {page_num}: {e}")
                    all_text.append("")  # Add empty string for failed page
                
                # Explicit cleanup
                del image
                del preprocessed_image
                if 'bounds' in locals(): del bounds
                gc.collect()
            
            # Combine all pages
            extracted_text = '\n\n'.join(all_text)
            
            # Calculate average confidence
            avg_confidence = (total_confidence / total_detections) if total_detections > 0 else 0.0
            
            # Word count
            word_count = len(extracted_text.split()) if extracted_text.strip() else 0
            
            logger.info(f"OCR completed: {word_count} words extracted from {len(images)} pages, avg confidence: {avg_confidence:.2f}")
            
            # If no text was extracted, log a warning
            if not extracted_text or not extracted_text.strip():
                logger.warning(f"OCR completed but no text was extracted from {filename}. Total detections: {total_detections}")
            
            return {
                "text": extracted_text,
                "word_count": word_count,
                "page_count": len(images),
                "confidence": round(avg_confidence, 2),
                "detections": total_detections
            }
        
        except Exception as e:
            logger.error(f"Error extracting text from PDF {filename}: {e}", exc_info=True)
            return {
                "error": "OCR processing failed",
                "message": f"Failed to extract text from PDF: {str(e)}"
            }
    
    def extract_text_from_image(self, image_bytes: bytes, filename: str = "image.jpg") -> Dict[str, Any]:
        """
        Extract text from image file using OCR
        Uses multiple strategies to handle imperfect images:
        1. Standard preprocessing with standard OCR parameters
        2. Aggressive preprocessing with standard parameters
        3. Aggressive preprocessing with lenient OCR parameters
        4. Original image with lenient OCR parameters
        
        Args:
            image_bytes: Image file content as bytes
            filename: Original filename (for logging)
        
        Returns:
            Dictionary with extracted text and metadata
        """
        if not EASYOCR_AVAILABLE or self.reader is None:
            return {
                "error": "OCR not available",
                "message": "EasyOCR library is not installed or failed to initialize."
            }
        
        try:
            # Load image
            image = Image.open(BytesIO(image_bytes))
            
            # Correct orientation
            image = self._correct_orientation(image)
            
            # Strategy 1: Standard preprocessing with standard parameters
            logger.info(f"Trying standard preprocessing for {filename}")
            preprocessed_image = self._preprocess_image(image, aggressive=False)
            bounds = self.reader.readtext(
                np.array(preprocessed_image),
                min_size=0,
                slope_ths=0.2,
                ycenter_ths=0.7,
                height_ths=0.6,
                width_ths=0.8,
                decoder='beamsearch',
                beamWidth=10,
                paragraph=True,
                text_threshold=0.5,
                low_text=0.3
            )
            
            # Strategy 2: If no detections, try aggressive preprocessing with standard parameters
            if len(bounds) == 0:
                logger.warning(f"No text detected with standard preprocessing for {filename}, trying aggressive preprocessing...")
                preprocessed_image = self._preprocess_image(image, aggressive=True)
                bounds = self.reader.readtext(
                    np.array(preprocessed_image),
                    min_size=0,
                    slope_ths=0.2,
                    ycenter_ths=0.7,
                    height_ths=0.6,
                    width_ths=0.8,
                    decoder='beamsearch',
                    beamWidth=10,
                    paragraph=True,
                    text_threshold=0.5,
                    low_text=0.3
                )
                logger.info(f"Aggressive preprocessing found {len(bounds)} text regions")
            
            # Strategy 3: If still no detections, try aggressive preprocessing with lenient parameters
            if len(bounds) == 0:
                logger.warning(f"No text detected with aggressive preprocessing for {filename}, trying lenient OCR parameters...")
                bounds = self.reader.readtext(
                    np.array(preprocessed_image),
                    paragraph=True,
                    text_threshold=0.3,  # Lower threshold for imperfect images
                    low_text=0.2,  # Lower threshold
                    width_ths=0.5,  # More lenient width threshold
                    height_ths=0.5,  # More lenient height threshold
                    slope_ths=0.1,  # More lenient slope threshold
                    ycenter_ths=0.5  # More lenient center threshold
                )
                logger.info(f"Lenient parameters found {len(bounds)} text regions")
            
            # Strategy 4: If still no detections, try original image with very lenient parameters
            if len(bounds) == 0:
                logger.warning(f"No text detected with preprocessing for {filename}, trying original image with very lenient parameters...")
                bounds = self.reader.readtext(
                    np.array(image),
                    paragraph=True,
                    text_threshold=0.25,  # Even lower threshold
                    low_text=0.15,  # Even lower threshold
                    width_ths=0.4,  # Very lenient
                    height_ths=0.4,  # Very lenient
                    slope_ths=0.1,
                    ycenter_ths=0.5,
                    min_size=0  # Allow very small text
                )
                logger.info(f"Original image with lenient parameters found {len(bounds)} text regions")
            
            # Extract text
            all_text = []
            total_confidence = 0.0
            detection_count = 0
            
            for bound in bounds:
                if len(bound) >= 3:
                    text = bound[1]
                    confidence = bound[2] if len(bound) > 2 else 0.0
                    
                    # Include text even with lower confidence for imperfect images
                    # (EasyOCR will have already filtered based on thresholds)
                    all_text.append(text)
                    total_confidence += confidence
                    detection_count += 1
            
            extracted_text = '\n'.join(all_text)
            avg_confidence = (total_confidence / detection_count) if detection_count > 0 else 0.0
            word_count = len(extracted_text.split()) if extracted_text.strip() else 0
            
            logger.info(f"OCR completed for {filename}: {word_count} words, {detection_count} detections, {avg_confidence:.2f} avg confidence")
            
            return {
                "text": extracted_text,
                "word_count": word_count,
                "confidence": round(avg_confidence, 2),
                "detections": detection_count
            }
        
        except Exception as e:
            logger.error(f"Error extracting text from image: {e}", exc_info=True)
            return {
                "error": "OCR processing failed",
                "message": f"Failed to extract text from image: {str(e)}"
            }

# Singleton instance
ocr_service = OCRService()

