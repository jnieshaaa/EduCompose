# Gemini API Integration Guide

This guide explains how to integrate Google's Gemini API for generating more sophisticated summaries and explanations for thesis statements and recommendations.

## Overview

The system currently uses template-based summaries that work without any external API. Gemini API integration is **optional** and provides more sophisticated, contextual explanations.

## Benefits of Gemini API

- **More Natural Language**: Generates human-like, contextual explanations
- **Better Context Understanding**: Can incorporate full essay context for better summaries
- **Dynamic Content**: Adapts explanations based on specific essay content
- **Educational Focus**: Can be prompted specifically for teacher-friendly explanations

## Setup Instructions

### 1. Install Dependencies

```bash
pip install google-generativeai
```

### 2. Get API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 3. Configure Environment Variable

Add to your `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
```

### 4. Usage

The system automatically falls back to template-based summaries if:
- Gemini API key is not set
- `google-generativeai` package is not installed
- API call fails for any reason

## Current Integration Points

### Thesis Statement Summaries

The `ThesisSummarizer` class in `backend/app/utils/thesis_summarizer.py` supports both:

1. **Template-based** (default, no API needed)
2. **Gemini API** (optional, enhanced)

#### Using Gemini for Thesis Summaries

```python
from app.utils.thesis_summarizer import thesis_summarizer

# Generate with Gemini
summary = await thesis_summarizer.generate_with_gemini(
    thesis_statement=thesis_dict,
    argument_analysis=argument_analysis_dict,
    scores=scores_dict,
    essay_text=full_essay_text  # Optional, provides more context
)

# Access results
print(summary["title"])  # e.g., "Thesis statement identified (5 claims, 8 evidence pieces)"
print(summary["explanation"])  # Gemini-generated explanation
print(summary["gemini_summary"])  # Raw Gemini output
```

### Recommendation Summaries (Future Enhancement)

You can extend the recommendation generation to use Gemini API for more contextual explanations:

```python
# Example: Enhanced recommendation generation
async def generate_recommendation_with_gemini(
    recommendation: Dict[str, Any],
    analysis_context: Dict[str, Any]
) -> Dict[str, Any]:
    import google.generativeai as genai
    import os
    
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-pro')
    
    prompt = f"""
    Generate a teacher-friendly explanation for this essay analysis recommendation:
    
    Category: {recommendation['dimension']}
    Priority: {recommendation['priority']}
    Current Message: {recommendation['message']}
    
    Context:
    - Grammar Score: {analysis_context.get('grammar_score', 0)}
    - Argument Score: {analysis_context.get('argument_score', 0)}
    - Error Count: {analysis_context.get('error_count', 0)}
    
    Provide a concise 2-3 sentence explanation that helps teachers understand:
    1. What the issue is
    2. Why it matters
    3. How to address it
    
    Keep it brief and actionable.
    """
    
    response = await model.generate_content_async(prompt)
    enhanced_explanation = response.text.strip()
    
    return {
        **recommendation,
        "enhanced_explanation": enhanced_explanation
    }
```

## Cost Considerations

- Gemini API has a free tier with generous limits
- Template-based fallback ensures system works without API
- API calls are only made when explicitly requested
- Consider caching results for repeated analyses

## Implementation in Essay Analysis Service

To integrate Gemini summaries into the analysis service:

```python
# In essay_analysis_service.py
from app.utils.thesis_summarizer import thesis_summarizer

async def _perform_analysis(self, content: str, analysis_type: str = "comprehensive"):
    # ... existing analysis code ...
    
    # Generate thesis summary with Gemini (if available)
    if argument_analysis.get("thesis_statement"):
        thesis_summary = await thesis_summarizer.generate_with_gemini(
            thesis_statement=argument_analysis["thesis_statement"],
            argument_analysis=argument_analysis,
            scores=scores,
            essay_text=content
        )
        
        # Add to detailed analysis
        argument_analysis["thesis_summary"] = thesis_summary
    
    # ... rest of analysis ...
```

## Frontend Integration

The frontend already supports displaying summaries. If you add Gemini summaries to the backend response, you can display them like:

```typescript
// In InlineAnalysisResults.tsx
{analysis.detailed_analysis.argumentation.thesis_summary?.gemini_summary ? (
  <p className="text-sm text-neutral-600">
    {analysis.detailed_analysis.argumentation.thesis_summary.gemini_summary}
  </p>
) : (
  <p className="text-sm text-neutral-600">
    {analysis.detailed_analysis.argumentation.thesis_summary?.explanation}
  </p>
)}
```

## Best Practices

1. **Always have fallback**: Template-based summaries ensure system works without API
2. **Error handling**: Wrap API calls in try-except blocks
3. **Rate limiting**: Be mindful of API rate limits in production
4. **Caching**: Consider caching summaries for identical inputs
5. **Prompt engineering**: Fine-tune prompts for best educational value

## Testing

Test both modes:

```python
# Test template-based (no API needed)
summary_template = thesis_summarizer.generate_summary(
    thesis_statement, argument_analysis, scores
)

# Test Gemini-based (requires API key)
summary_gemini = await thesis_summarizer.generate_with_gemini(
    thesis_statement, argument_analysis, scores, essay_text
)

print("Template:", summary_template["explanation"])
print("Gemini:", summary_gemini["explanation"])
```

## Troubleshooting

- **Import Error**: Install `google-generativeai`: `pip install google-generativeai`
- **API Key Error**: Check `.env` file has `GEMINI_API_KEY` set
- **Rate Limits**: Implement exponential backoff for retries
- **Timeout Errors**: Increase timeout for longer essays

## Future Enhancements

- Batch processing for multiple essays
- Fine-tuned models for educational contexts
- Multi-language support
- Integration with recommendation summaries
- Custom prompt templates for different analysis types

