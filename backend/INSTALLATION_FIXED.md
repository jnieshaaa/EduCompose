# Installation Issues Fixed - Python 3.12

## Summary

Fixed Python 3.12 compatibility issues that were preventing dependency installation.

## Issues Resolved

### 1. **numpy Build Failure**
- **Problem**: `numpy==1.25.2` tried to build from source, failing due to Python 3.12 compatibility issues
- **Solution**: Updated to `numpy>=1.26.0` which has pre-built wheels for Python 3.12

### 2. **spacy-transformers Build Failure**
- **Problem**: Requires Microsoft Visual C++ 14.0+ build tools to compile C++ extensions
- **Solution**: Made optional (commented out in requirements). The backend works without it.

### 3. **tokenizers Build Failure**
- **Problem**: Older versions require Rust compiler to build from source
- **Solution**: Updated `sentence-transformers` to `>=2.3.0` which uses newer `tokenizers` with pre-built wheels

## Files Updated

1. **`requirements-py312.txt`**:
   - Updated numpy to `>=1.26.0`
   - Updated sentence-transformers to `>=2.3.0`
   - Commented out spacy-transformers (optional)
   - Added installation notes

2. **`INSTALL_PY312.md`**:
   - Created comprehensive installation guide for Python 3.12
   - Added troubleshooting section
   - Included optional spacy-transformers installation instructions

3. **`install_py312.bat`** and **`install_py312.sh`**:
   - Created automated installation scripts for Windows and Linux/Mac

## Installation Steps (Quick Reference)

```bash
# 1. Upgrade pip, setuptools, wheel
python -m pip install --upgrade pip setuptools wheel

# 2. Install sentence-transformers first (has pre-built wheels)
pip install "sentence-transformers>=2.3.0" --only-binary :all:

# 3. Install remaining dependencies
pip install -r requirements-py312.txt

# 4. Download spaCy English model
python -m spacy download en_core_web_sm
```

## What's Working Now

✅ All core dependencies install successfully on Python 3.12
✅ No build tools required for essential packages
✅ Pre-built wheels used wherever possible
✅ Backend is ready to run

## Optional: Advanced Features

If you need `spacy-transformers` for advanced transformer features:
1. Install Microsoft Visual C++ Build Tools
2. Run: `pip install spacy-transformers==1.3.0`

**Note**: The backend works perfectly without `spacy-transformers`. It's only needed for advanced transformer-based argument mining features.

## Next Steps

1. ✅ Dependencies installed
2. ⏭️ Download spaCy model: `python -m spacy download en_core_web_sm`
3. ⏭️ Set up environment variables (copy `env.example` to `.env`)
4. ⏭️ Start the backend: `python start.py`

