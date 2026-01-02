"""
Test OCR functionality from terminal
Usage: python test_ocr.py <path_to_file>
"""
import sys
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the app directory to the path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Import OCR service directly without going through __init__.py to avoid schema dependencies
import importlib.util
ocr_service_path = backend_dir / "app" / "services" / "ocr_service.py"
spec = importlib.util.spec_from_file_location("ocr_service", ocr_service_path)
ocr_service_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ocr_service_module)
ocr_service = ocr_service_module.ocr_service

def print_separator():
    """Print a visual separator"""
    print("\n" + "="*80 + "\n")

def test_ocr(file_path: str, save_debug_images: bool = False):
    """Test OCR extraction on a file"""
    file_path_obj = Path(file_path)
    
    if not file_path_obj.exists():
        print(f"Error: File not found: {file_path}")
        return
    
    print_separator()
    print(f"Testing OCR on: {file_path}")
    print(f"File type: {file_path_obj.suffix}")
    print_separator()
    
    # Read the file
    try:
        with open(file_path, 'rb') as f:
            file_bytes = f.read()
        logger.info(f"Read {len(file_bytes)} bytes from file")
    except Exception as e:
        print(f"Error reading file: {e}")
        return
    
    # Extract text using OCR
    try:
        if file_path_obj.suffix.lower() == '.pdf':
            print("Extracting text from PDF...")
            result = ocr_service.extract_text_from_pdf(file_bytes, file_path_obj.name)
        else:
            print("Extracting text from image...")
            result = ocr_service.extract_text_from_image(file_bytes, file_path_obj.name)
        
        if 'error' in result:
            print(f"Error: {result['error']}")
            if 'message' in result:
                print(f"Message: {result['message']}")
            return
        
        # Debug: Check if OCR actually found anything
        if result.get('detections', 0) == 0:
            print("\n⚠️  WARNING: OCR found 0 text detections!")
            print("This could mean:")
            print("  - The image/PDF has no readable text")
            print("  - The text is too small or low quality")
            print("  - The image preprocessing is too aggressive")
            print("  - OCR parameters need adjustment")
            print("\nTrying with less strict OCR parameters...")
            
            # Try with more lenient parameters (if we can access the reader directly)
            # For now, just show what we got
            print(f"\nRaw result keys: {list(result.keys())}")
            print(f"Text length: {len(result.get('text', ''))}")
            print(f"Text preview (first 200 chars): {result.get('text', '')[:200]}")
        
        # Display results
        print_separator()
        print("EXTRACTION RESULTS:")
        print_separator()
        print(f"Filename: {result.get('filename', 'N/A')}")
        print(f"Word Count: {result.get('word_count', 0)}")
        print(f"Confidence: {result.get('confidence', 0):.2f}%")
        if 'page_count' in result:
            print(f"Page Count: {result.get('page_count', 0)}")
        print_separator()
        
        # Print extracted text with paragraph structure
        extracted_text = result.get('text', '')
        print("EXTRACTED TEXT:")
        print_separator()
        print(extracted_text)
        print_separator()
        
        # Show paragraph analysis
        paragraphs = [p.strip() for p in extracted_text.split('\n\n') if p.strip()]
        print(f"Paragraph Analysis:")
        print(f"  - Total paragraphs detected: {len(paragraphs)}")
        print(f"  - Total characters: {len(extracted_text)}")
        print(f"  - Total words: {result.get('word_count', 0)}")
        print_separator()
        
        # Show each paragraph
        if paragraphs:
            print("Paragraphs (separated by double newlines):")
            for i, para in enumerate(paragraphs, 1):
                print(f"\n--- Paragraph {i} ({len(para)} chars, ~{len(para.split())} words) ---")
                print(para)
        
    except Exception as e:
        print(f"Error during OCR extraction: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python test_ocr.py <path_to_file> [--debug-images]")
        print("\nExample:")
        print("  python test_ocr.py test.pdf")
        print("  python test_ocr.py test.png")
        print("  python test_ocr.py test.jpg --debug-images")
        sys.exit(1)
    
    file_path = sys.argv[1]
    save_debug_images = '--debug-images' in sys.argv
    
    # Run the test
    test_ocr(file_path, save_debug_images)

if __name__ == "__main__":
    main()

