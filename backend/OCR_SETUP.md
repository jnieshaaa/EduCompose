# OCR Setup Instructions

The OCR functionality requires additional system dependencies beyond Python packages.

## System Dependencies

### For PDF Processing (pdf2image)

The `pdf2image` library requires `poppler-utils` to be installed on your system:

#### Ubuntu/Debian:
```bash
sudo apt-get install poppler-utils
```

#### macOS:
```bash
brew install poppler
```

#### Windows:
1. Download poppler from: https://github.com/oschwartz10612/poppler-windows/releases/
2. Extract and add the `bin` folder to your system PATH
3. Or use conda: `conda install -c conda-forge poppler`

## Python Dependencies

Install the required Python packages:

```bash
pip install pdf2image easyocr Pillow numpy
```

Note: EasyOCR will download its models on first use (this may take several minutes).

## Testing OCR

Once installed, you can test the OCR endpoint:

```bash
curl -X POST "http://localhost:8000/api/ocr/extract-text" \
  -F "file=@your_document.pdf"
```

## Troubleshooting

### "poppler not found" error
- Ensure poppler-utils is installed and in your system PATH
- On Windows, verify the poppler bin directory is in PATH

### EasyOCR model download issues
- First run will download models (~500MB)
- Ensure you have internet connection
- Models are cached in `~/.EasyOCR/model/`

### Memory issues with large PDFs
- OCR processing can be memory-intensive
- Consider processing PDFs page by page for very large documents
- Default DPI is 300; reduce to 200 for lower memory usage if needed

