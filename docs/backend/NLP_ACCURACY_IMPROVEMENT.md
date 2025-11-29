# NLP Module Accuracy Improvement Guide

## Current Situation

Your NLP modules **do NOT have their own datasets**. They rely on:

### 1. Generic Pre-trained Models
- **spaCy** (`en_core_web_sm`) - General-purpose NLP, not trained on essays
- **SentenceTransformer** (`all-MiniLM-L6-v2`) - General semantic similarity
- **LanguageTool** - General grammar checking

### 2. Rule-Based Patterns
- Hardcoded indicator lists in `ArgumentMiner`
- Pattern matching for transitions and coherence
- No learning from examples

### 3. Why Results May Be Inaccurate
- Models are generic, not essay-specific
- Rules may miss domain-specific patterns
- No fine-tuning on essay data
- No learning from teacher feedback

## Solutions to Improve Accuracy

### Option 1: Expand Rule-Based Patterns (Quick Fix)

**Pros**: Fast to implement, no training needed
**Cons**: Still limited by manual rules

**Action Items**:
1. Expand indicator lists in `argument_miner.py`
2. Add more transition patterns in `coherence_analyzer.py`
3. Add essay-specific grammar rules in `grammar_analyzer.py`

### Option 2: Create Training Datasets (Recommended)

**Pros**: Significant accuracy improvement, learns from real examples
**Cons**: Requires data collection and annotation

**Steps**:

1. **Collect Essay Dataset**:
   - Gather 100-500 essays from your system
   - Include various quality levels (high, medium, low scores)
   - Cover different topics and genres

2. **Annotate Data**:
   - Label claims, evidence, warrants, rebuttals
   - Mark coherence issues
   - Tag grammar errors
   - Score readability levels

3. **Create Dataset Files**:
   ```
   backend/data/
   ├── essays/
   │   ├── training_essays.json
   │   ├── validation_essays.json
   │   └── test_essays.json
   ├── annotations/
   │   ├── argument_annotations.json
   │   ├── coherence_annotations.json
   │   └── grammar_annotations.json
   ```

4. **Fine-tune Models**:
   - Fine-tune SentenceTransformer on essay pairs
   - Train a classifier for argument components
   - Create custom spaCy model for essay analysis

### Option 3: Use Essay-Specific Pre-trained Models

**Pros**: Better than generic models, no training needed
**Cons**: May not perfectly match your domain

**Available Models**:
- **Essay-specific embeddings**: Look for models trained on academic writing
- **Argument mining models**: Pre-trained argumentation models
- **Educational NLP models**: Models trained on student writing

### Option 4: Hybrid Approach (Best Long-term)

Combine all approaches:
1. **Start with expanded rules** (immediate improvement)
2. **Collect and annotate data** (ongoing)
3. **Fine-tune models** as data grows
4. **Use essay-specific pre-trained models** as base

## Immediate Actions You Can Take

### 1. Expand Indicator Lists

Add more patterns to `argument_miner.py`:
```python
# More claim indicators
"i contend", "i maintain", "i assert", "the argument is",
"it is clear that", "it is evident that", "one can see that"

# More evidence indicators  
"as shown by", "as demonstrated in", "research by", "studies by",
"experts suggest", "scholars argue", "findings reveal"

# More warrant indicators
"this is because", "the reason is", "this explains why",
"it follows that", "this leads to", "as a consequence"
```

### 2. Add Context-Aware Detection

Instead of simple pattern matching, use:
- Sentence position (introduction vs. body)
- Paragraph structure
- Semantic similarity to known patterns

### 3. Implement Confidence Scores

Add confidence levels to detections:
- High: Multiple indicators + context match
- Medium: Single indicator + context match  
- Low: Pattern match only

### 4. Create Feedback Loop

Allow teachers to:
- Mark false positives/negatives
- Correct misclassifications
- Improve rules based on feedback

## Recommended Implementation Plan

### Phase 1: Quick Wins (1-2 weeks)
- [ ] Expand indicator lists
- [ ] Add more transition patterns
- [ ] Improve context-aware detection
- [ ] Add confidence scoring

### Phase 2: Data Collection (1-2 months)
- [ ] Collect 100+ essays from system
- [ ] Create annotation guidelines
- [ ] Annotate sample essays
- [ ] Create dataset structure

### Phase 3: Model Improvement (2-3 months)
- [ ] Fine-tune SentenceTransformer
- [ ] Train argument classifier
- [ ] Create custom spaCy pipeline
- [ ] Validate improvements

### Phase 4: Continuous Improvement (Ongoing)
- [ ] Collect feedback from teachers
- [ ] Update datasets regularly
- [ ] Retrain models periodically
- [ ] Monitor accuracy metrics

## Example Dataset Structure

```json
{
  "essay_id": 1,
  "text": "Essay content here...",
  "annotations": {
    "claims": [
      {
        "sentence": "Climate change is a pressing issue",
        "sentence_index": 2,
        "confidence": "high",
        "type": "thesis"
      }
    ],
    "evidence": [
      {
        "sentence": "Research shows temperatures rising",
        "sentence_index": 5,
        "supports_claim": 0
      }
    ],
    "coherence_issues": [
      {
        "type": "missing_transition",
        "location": "between sentences 3 and 4"
      }
    ],
    "grammar_errors": [
      {
        "type": "subject_verb_agreement",
        "location": "sentence 7",
        "correction": "..."
      }
    ]
  },
  "scores": {
    "grammar": 85,
    "coherence": 72,
    "argument": 78,
    "readability": 68
  }
}
```

## Next Steps

1. **Assess current accuracy**: Run analysis on known essays and compare with teacher scores
2. **Identify biggest gaps**: Which module is least accurate?
3. **Start with quick wins**: Expand rules first
4. **Plan data collection**: Begin gathering essays for annotation
5. **Set up feedback mechanism**: Allow teachers to provide corrections

## Resources

- **Essay Datasets**: 
  - ASAP-AES (Automated Student Assessment Prize)
  - Kaggle Essay Scoring datasets
  - Educational data repositories

- **Fine-tuning Guides**:
  - Sentence Transformers fine-tuning
  - spaCy training documentation
  - Hugging Face transformers

- **Annotation Tools**:
  - Label Studio
  - Prodigy (spaCy's annotation tool)
  - Doccano

