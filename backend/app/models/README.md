# Machine Learning Models Directory

This directory stores machine learning models used by EduCompose, including the Automated Essay Scoring (AES) model.

## AES Model Setup

The AES model files are **too large to commit to Git** (>100MB). Follow these steps to set up the model:

### 1. Create the Model Directory

```bash
mkdir -p backend/app/models/aes_model
```

### 2. Place Your Model Files

Place your AES model files in `backend/app/models/aes_model/`. The required files are:

- `config.json` - Model configuration
- `model.safetensors` - Model weights (large file, ~100MB+)
- `tokenizer.json` - Tokenizer configuration
- `tokenizer_config.json` - Tokenizer settings
- `special_tokens_map.json` - Special tokens mapping
- `vocab.txt` - Vocabulary file
- `metadata.json` - Model metadata (optional)
- `training_args.bin` - Training arguments (optional)

### 3. Verify Model Location

The model loader will automatically find the model in:
```
backend/app/models/aes_model/
```

## Important Notes

- **Do NOT commit model files to Git** - They are excluded via `.gitignore`
- **Model files are required locally** - The application needs these files to run
- **For production deployment** - Copy model files to the server separately (not via Git)

## Alternative: Using Git LFS

If you need to version control the model files, you can use Git LFS (Large File Storage):

```bash
# Install Git LFS
git lfs install

# Track model files
git lfs track "app/models/aes_model/*.safetensors"
git lfs track "app/models/aes_model/*.pt"
git lfs track "app/models/aes_model/*.pth"

# Add and commit
git add .gitattributes
git add app/models/aes_model/
git commit -m "Add AES model with Git LFS"
```

Note: Git LFS requires a GitHub account with LFS support enabled.

## Checking Model Status

To verify your model is loaded correctly, check the backend logs when starting the server:

```
INFO: Loading AES model from: /path/to/backend/app/models/aes_model
INFO: Hugging Face transformers model loaded successfully
```

## Troubleshooting

If you see "AES model not available" in the logs:
1. Verify model files are in `backend/app/models/aes_model/`
2. Check that `config.json` exists
3. Ensure `model.safetensors` or other model weight files are present
4. Check file permissions

