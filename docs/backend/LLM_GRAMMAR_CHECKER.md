# LLM-Based Grammar Checker Integration

## Overview

The `GrammarAnalyzer` now supports LLM-based grammar checking using OpenAI or Google Gemini APIs. This provides more accurate and context-aware grammar checking compared to traditional rule-based tools like LanguageTool.

## Features

- **Dual LLM Support**: Works with both OpenAI (GPT-4o-mini) and Google Gemini
- **Automatic Fallback**: Falls back to LanguageTool if LLM is unavailable
- **Smart Error Detection**: Identifies grammar, spelling, punctuation, and style issues
- **Context-Aware**: Provides suggestions with surrounding context
- **Configurable**: Choose LLM provider or use auto-detection

## Setup

### Option 1: OpenAI (Recommended for accuracy)

1. **Install OpenAI package**:
   ```bash
   pip install openai
   ```

2. **Get API Key**:
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy the key

3. **Configure Environment**:
   Add to your `.env` file:
   ```env
   OPENAI_API_KEY=your_api_key_here
   ```

### Option 2: Google Gemini (Free tier available)

1. **Install Gemini package**:
   ```bash
   pip install google-generativeai
   ```

2. **Get API Key**:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key

3. **Configure Environment**:
   Add to your `.env` file:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

## Usage

### Default Usage (Auto-detect)

The grammar analyzer will automatically use the first available LLM:

```python
from app.nlp_modules import GrammarAnalyzer

# Auto-detect and use available LLM
analyzer = GrammarAnalyzer(use_llm=True, llm_provider="auto", prefer_llm=True)
result = analyzer.analyze(essay_text)
```

### Specify LLM Provider

```python
# Use OpenAI specifically
analyzer = GrammarAnalyzer(use_llm=True, llm_provider="openai", prefer_llm=True)

# Use Gemini specifically
analyzer = GrammarAnalyzer(use_llm=True, llm_provider="gemini", prefer_llm=True)

# Disable LLM, use only LanguageTool
analyzer = GrammarAnalyzer(use_llm=False)
```

### Configuration Options

- `use_llm`: Enable/disable LLM checking (default: `True`)
- `llm_provider`: Which LLM to use:
  - `"auto"`: Auto-detect available provider (default)
  - `"openai"`: Use OpenAI only
  - `"gemini"`: Use Gemini only
  - `"none"`: Disable LLM
- `prefer_llm`: If `True`, use LLM when available; otherwise use LanguageTool first (default: `True`)

## How It Works

1. **LLM Detection**: On first use, the analyzer checks for available API keys
2. **Grammar Checking**: 
   - If `prefer_llm=True`: Tries LLM first, falls back to LanguageTool if LLM fails
   - If `prefer_llm=False`: Uses LanguageTool first, enhances with LLM if available
3. **Error Formatting**: LLM errors are converted to the same format as LanguageTool errors
4. **Error Merging**: When both tools are used, errors are merged and deduplicated

## Error Format

LLM-detected errors follow the same format as LanguageTool errors:

```python
{
    "type": "grammar|spelling|punctuation|style",
    "message": "Brief description of the error",
    "category": "LLM Detected",
    "offset": 123,  # Character position in text
    "errorLength": 5,  # Length of error
    "replacements": ["corrected text"],
    "suggestion": "corrected text",
    "context": "surrounding text...",
    "source": "openai"  # or "gemini"
}
```

## Cost Considerations

### OpenAI
- **Model**: GPT-4o-mini (cheapest GPT-4 model)
- **Cost**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Typical Essay**: ~500 words ≈ ~700 tokens ≈ $0.0001-0.0002 per essay

### Gemini
- **Model**: Gemini Pro
- **Free Tier**: 60 requests per minute, generous daily limits
- **Cost**: Free for most educational use cases

## Performance

- **LLM Response Time**: 2-5 seconds per essay (depending on length)
- **LanguageTool**: < 1 second per essay
- **Hybrid Approach**: Best of both worlds - fast with LanguageTool, enhanced with LLM

## Fallback Behavior

The system gracefully falls back if:
- API key is not set
- API package is not installed
- API call fails
- Rate limits are exceeded

In all cases, LanguageTool will be used as a fallback.

## Integration with Essay Analysis

The grammar analyzer is automatically used by `EssayAnalysisService`. No changes needed - just set your API key and it will work!

```python
from app.services import essay_analysis_service

# LLM grammar checking happens automatically
result = await essay_analysis_service.analyze_text(essay_text)
```

## Troubleshooting

### LLM Not Being Used

1. **Check API Key**: Verify your `.env` file has the correct key
2. **Check Package**: Ensure `openai` or `google-generativeai` is installed
3. **Check Logs**: Look for initialization messages in logs
4. **Manual Test**: Try creating analyzer with explicit provider:
   ```python
   analyzer = GrammarAnalyzer(llm_provider="openai")
   ```

### Errors Not Detected

- LLMs are better at context-aware errors but may miss some rule-based errors
- Consider using `prefer_llm=False` to use both tools
- LanguageTool catches more mechanical errors (spelling, punctuation)

### Rate Limits

- OpenAI: Check your usage dashboard
- Gemini: Free tier has 60 requests/minute limit
- System automatically falls back to LanguageTool if rate limited

## Best Practices

1. **Development**: Use LanguageTool only (faster, no cost)
2. **Production**: Use LLM for better accuracy
3. **Hybrid**: Use both for comprehensive checking
4. **Cost Control**: Monitor API usage, set up billing alerts

## Example

```python
from app.nlp_modules import GrammarAnalyzer

# Initialize with LLM support
analyzer = GrammarAnalyzer(
    use_llm=True,
    llm_provider="auto",  # Auto-detect OpenAI or Gemini
    prefer_llm=True  # Use LLM when available
)

# Analyze essay
text = """
The student's essay contain several error. 
They should of been more careful with there grammar.
"""

result = analyzer.analyze(text)

# Check results
print(f"Grammar Score: {result['score']}")
print(f"Errors Found: {result['error_count']}")

for error in result['errors']:
    print(f"- {error['message']} at position {error['offset']}")
    print(f"  Suggestion: {error.get('suggestion', 'N/A')}")
```

## Future Enhancements

- Async/await support for faster batch processing
- Custom prompts for specific error types
- Learning from teacher corrections
- Multi-language support

