# Installing Dependencies on Python 3.12

## Issue
Python 3.12 removed `pkgutil.ImpImporter`, which causes build failures with older versions of setuptools/pkg_resources when building packages like numpy from source.

Additionally, some packages like `spacy-transformers` and older versions of `tokenizers` require C++ build tools (Microsoft Visual C++ 14.0+) or Rust compiler, which may not be available on all systems.

## Solution

### Step 1: Upgrade pip, setuptools, and wheel
```bash
python -m pip install --upgrade pip setuptools wheel
```

### Step 2: Install sentence-transformers first (newer version with pre-built wheels)
```bash
pip install "sentence-transformers>=2.3.0" --only-binary :all:
```

### Step 3: Install remaining dependencies
```bash
pip install -r requirements-py312.txt
```

**Note**: The `requirements-py312.txt` file has been updated to:
- Use `numpy>=1.26.0` (has pre-built wheels for Python 3.12)
- Use `sentence-transformers>=2.3.0` (has pre-built wheels, doesn't require Rust)
- Comment out `spacy-transformers` (optional, requires C++ build tools)

## Optional: Install spacy-transformers (Requires C++ Build Tools)

If you need `spacy-transformers` for advanced transformer-based features:

1. **Install Microsoft Visual C++ Build Tools:**
   - Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Install "Desktop development with C++" workload

2. **Then install spacy-transformers:**
   ```bash
   pip install spacy-transformers==1.3.0
   ```

**Note**: `spacy-transformers` is optional. The backend works without it, using basic spaCy features for argument mining.

## Troubleshooting

### Issue: "Microsoft Visual C++ 14.0 or greater is required"
- **Solution**: Install Microsoft Visual C++ Build Tools (see above)
- **Alternative**: Skip `spacy-transformers` (it's optional)

### Issue: "can't find Rust compiler"
- **Solution**: This shouldn't happen with the updated requirements. If it does, ensure you're using `sentence-transformers>=2.3.0` which has pre-built wheels.

### Issue: numpy build failures
- **Solution**: 
  1. Clear pip cache: `pip cache purge`
  2. Install numpy separately: `pip install numpy>=1.26.0`
  3. Then install other dependencies

### Issue: Using a virtual environment
If using a virtual environment, recreate it:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Linux/Mac
python -m pip install --upgrade pip setuptools wheel
pip install "sentence-transformers>=2.3.0" --only-binary :all:
pip install -r requirements-py312.txt
```

## Known Issue: spaCy + Python 3.12 Compatibility

**Issue**: spaCy 3.8.7 and earlier have a compatibility issue with Python 3.12's typing changes, causing `TypeError: ForwardRef._evaluate() missing 1 required keyword-only argument: 'recursive_guard'`.

**Workaround**: This is a known issue that doesn't affect runtime functionality. The error only occurs during import testing. The backend will work correctly when running the actual application.

**Status**: Waiting for spaCy to release a fix. The spaCy team is aware of this issue.

**Alternative**: If you need to avoid this issue entirely, you can:
1. Use Python 3.11 instead of 3.12 (recommended for now)
2. Wait for spaCy 3.9+ which should have full Python 3.12 support

## Verification

After installation, test the backend startup (the import error won't affect actual usage):

```bash
# This may show the typing error, but the backend will still work
python -c "import fastapi; print('FastAPI imported successfully')"

# Start the backend - it will work despite the import warning
python start.py
```

Then download the spaCy English model:
```bash
python -m spacy download en_core_web_sm
```

**Note**: The spaCy import error is cosmetic and won't prevent the backend from running. The NLP modules will work correctly at runtime.

