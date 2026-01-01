"""
OCR Service
Extracts text from PDF files using EasyOCR
Based on ocr.ipynb implementation
"""
import logging
import tempfile
import os
from typing import Dict, Any, Optional
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter, ExifTags
import numpy as np

try:
    from pdf2image import convert_from_path, convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    logging.warning("pdf2image not available. PDF OCR will not work.")

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
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image to improve OCR accuracy
        Applies contrast enhancement, sharpening, and binarization
        """
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 1. Enhance Contrast
        contrast_enhancer = ImageEnhance.Contrast(image)
        contrasted_image = contrast_enhancer.enhance(1.5)  # Factor 1.5 for moderate enhancement
        
        # 2. Sharpen
        sharpened_image = contrasted_image.filter(ImageFilter.SHARPEN)
        
        # 3. Binarization (Thresholding)
        # Convert to grayscale first for binarization
        grayscale_image = sharpened_image.convert('L')
        # Apply a binary threshold (128 for a common midpoint)
        threshold_value = 128
        binarized_image = grayscale_image.point(lambda p: p > threshold_value and 255)
        
        return binarized_image
    
    def extract_text_from_pdf(self, pdf_bytes: bytes, filename: str = "document.pdf") -> Dict[str, Any]:
        """
        Extract text from PDF file using OCR
        
        Args:
            pdf_bytes: PDF file content as bytes
            filename: Original filename (for logging)
        
        Returns:
            Dictionary with extracted text and metadata
        """
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
            images = convert_from_bytes(pdf_bytes, dpi=300)  # Higher DPI for better quality
            
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
            
            for page_num, image in enumerate(images, 1):
                logger.info(f"Processing page {page_num}/{len(images)}")
                
                # Correct orientation
                image = self._correct_orientation(image)
                
                # Preprocess image for better OCR
                preprocessed_image = self._preprocess_image(image)
                
                # Run OCR with optimized parameters
                try:
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
            
            # Combine all pages
            extracted_text = '\n\n'.join(all_text)
            
            # Calculate average confidence
            avg_confidence = (total_confidence / total_detections) if total_detections > 0 else 0.0
            
            # Word count
            word_count = len(extracted_text.split()) if extracted_text.strip() else 0
            
            logger.info(f"OCR completed: {word_count} words extracted, avg confidence: {avg_confidence:.2f}")
            
            return {
                "text": extracted_text,
                "word_count": word_count,
                "page_count": len(images),
                "confidence": round(avg_confidence, 2),
                "detections": total_detections
            }
        
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}", exc_info=True)
            return {
                "error": "OCR processing failed",
                "message": f"Failed to extract text from PDF: {str(e)}"
            }
    
    def extract_text_from_image(self, image_bytes: bytes, filename: str = "image.jpg") -> Dict[str, Any]:
        """
        Extract text from image file using OCR
        
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
            
            # Preprocess image
            preprocessed_image = self._preprocess_image(image)
            
            # Run OCR
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
            
            # Extract text
            all_text = []
            total_confidence = 0.0
            detection_count = 0
            
            for bound in bounds:
                if len(bound) >= 3:
                    text = bound[1]
                    confidence = bound[2] if len(bound) > 2 else 0.0
                    
                    all_text.append(text)
                    total_confidence += confidence
                    detection_count += 1
            
            extracted_text = '\n'.join(all_text)
            avg_confidence = (total_confidence / detection_count) if detection_count > 0 else 0.0
            word_count = len(extracted_text.split()) if extracted_text.strip() else 0
            
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

