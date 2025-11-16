# AES Model Integration Guide

This guide explains how to integrate your custom Automated Essay Scoring (AES) model into EduCompose.

## Model Location

Place your AES model in:
```
backend/models/aes_model/
```

## Supported Model Formats

The AES loader supports multiple model formats:

### 1. PyTorch Models
- Files: `*.pth`, `*.pt`
- Example structure:
  ```
  backend/models/aes_model/
    └── model.pth
  ```

### 2. TensorFlow/Keras Models
- Files: `*.h5` or `saved_model/` directory
- Example structure:
  ```
  backend/models/aes_model/
    └── model.h5
  ```
  OR
  ```
  backend/models/aes_model/
    └── saved_model/
        ├── saved_model.pb
        └── variables/
  ```

### 3. Pickle Models
- Files: `*.pkl`, `*.pickle`
- Example structure:
  ```
  backend/models/aes_model/
    └── model.pkl
  ```

### 4. Joblib Models
- Files: `*.joblib`
- Example structure:
  ```
  backend/models/aes_model/
    └── model.joblib
  ```

### 5. Custom Loader Script
If your model has a unique format, create a custom loader:
```
backend/models/aes_model/
  └── load_model.py
```

Example `load_model.py`:
```python
def load_model(model_path: str):
    """
    Custom model loader
    
    Args:
        model_path: Path to the model directory
        
    Returns:
        Loaded model object
    """
    # Your custom loading code here
    # For example:
    # import your_custom_library
    # model = your_custom_library.load_from_path(model_path)
    # return model
    pass
```

## Customizing Model Preprocessing

If your model requires specific preprocessing (tokenization, feature extraction, etc.), edit:

`backend/app/nlp_modules/aes_scorer.py`

Specifically, update the `_preprocess_text()` method:

```python
def _preprocess_text(self, text: str) -> Any:
    """
    Preprocess essay text for model input
    
    Customize this based on your model's requirements
    """
    # Example: Using Hugging Face transformers
    # from transformers import AutoTokenizer
    # tokenizer = AutoTokenizer.from_pretrained('your-model-name')
    # return tokenizer(text, padding=True, truncation=True, max_length=512, return_tensors='pt')
    
    # Example: Using TF-IDF
    # from sklearn.feature_extraction.text import TfidfVectorizer
    # vectorizer = TfidfVectorizer(max_features=1000)
    # return vectorizer.transform([text])
    
    # Default: return text as-is
    return text
```

## Customizing Model Inference

If your model's prediction output format is different, update the `_predict_score()` method in the same file:

```python
def _predict_score(self, preprocessed_input: Any) -> float:
    """
    Get prediction from the model
    
    Customize this based on your model's output format
    """
    # Your custom inference code here
    # The method should return a float between 0-100
    pass
```

## How It Works

1. **Model Loading**: When the server starts, the AES model is loaded from `backend/models/aes_model/`
2. **Scoring**: When an essay is analyzed with `analysis_type="comprehensive"`, the AES model is used
3. **Score Integration**: 
   - If AES is available: It contributes 40% to the overall score
   - If AES is not available: Traditional scoring weights are used
4. **Results**: AES scores appear in the analysis response under `detailed_analysis.aes`

## Testing Your Model

1. Place your model in `backend/models/aes_model/`
2. Start the backend server:
   ```bash
   python backend/start.py
   ```
3. Check logs for model loading messages
4. Analyze an essay via the API or frontend
5. Verify the AES score appears in the results

## Troubleshooting

### Model Not Loading

Check the backend logs for error messages. Common issues:

1. **Model file not found**: Ensure your model is in `backend/models/aes_model/`
2. **Missing dependencies**: Install required packages (PyTorch, TensorFlow, etc.)
3. **Import errors**: Check that your model file format matches the loader expectations

### Score Not Appearing

1. Check if model loaded: Look for "AES model loaded successfully" in logs
2. Verify `analysis_type="comprehensive"` is used
3. Check that `aes_result["available"]` is `True` in the analysis response

### Custom Preprocessing Needed

If your model requires specific preprocessing:

1. Update `_preprocess_text()` in `aes_scorer.py`
2. Install any required tokenizers or feature extractors
3. Ensure preprocessing matches your training pipeline

## Example: Integrating a Hugging Face Model

If you have a Hugging Face transformers model:

1. Install dependencies:
   ```bash
   pip install transformers torch
   ```

2. Update `_preprocess_text()` in `aes_scorer.py`:
   ```python
   def _preprocess_text(self, text: str) -> Any:
       from transformers import AutoTokenizer
       if not hasattr(self, 'tokenizer'):
           self.tokenizer = AutoTokenizer.from_pretrained('path/to/your/model')
       return self.tokenizer(text, padding=True, truncation=True, max_length=512, return_tensors='pt')
   ```

3. Update `_predict_score()` if needed:
   ```python
   def _predict_score(self, preprocessed_input: Any) -> float:
       import torch
       self.model.eval()
       with torch.no_grad():
           outputs = self.model(**preprocessed_input)
           score = outputs.logits.item()  # Adjust based on your model output
           return max(0.0, min(100.0, score * 100))  # Normalize to 0-100
   ```

## Score Weights

When AES model is available:
- AES: 40%
- Grammar: 15%
- Readability: 10%
- Coherence: 15%
- Argument Strength: 15%
- Knowledge Graph: 5%

When AES model is not available (fallback):
- Grammar: 20%
- Readability: 20%
- Coherence: 25%
- Argument Strength: 25%
- Knowledge Graph: 10%

You can adjust these weights in `backend/app/services/essay_analysis_service.py` in the `_perform_analysis()` method.

