# Quick Test Example: Using 100 Essays from processed_persuade.json

## 🚀 Quick Start

### Option 1: Quick Test (3 essays - ~30 seconds)

```bash
cd backend
python scripts/quick_test.py 3
```

This will:
- Load 3 essays from `processed_persuade.json`
- Run comprehensive analysis
- Show scores, KG metrics, and recommendations
- Compare with human scores

### Option 2: Test All 100 Essays (~5-10 minutes)

```bash
cd backend
python scripts/test_with_persuade_data.py
```

This will:
- Test all 100 essays
- Calculate correlation with human scores
- Generate statistics
- Save results to `data/test_results.json`

### Option 3: Test Subset

```bash
# Test first 10 essays
python scripts/test_with_persuade_data.py --limit 10

# Test first 20 essays
python scripts/test_with_persuade_data.py --limit 20
```

## 📊 What You'll See

### Quick Test Output

```
============================================================
Essay 1/3: 423A1CA112E2
============================================================
Human Score: 3.0
Word Count: 378

Text Preview: Phones

Modern humans today are always on their phone...

Running analysis...

System Scores:
  Overall: 68.5/100
  Grammar: 72.3/100
  Readability: 65.1/100
  Coherence: 70.2/100
  Argument Strength: 65.8/100
  Knowledge Graph: 68.0/100

KG Metrics:
  Concept Coherence: 72.5
  Argument Strength: 65.8

Top Recommendations:
  [MEDIUM] Readability concerns identified
  [HIGH] Coherence needs improvement
```

### Full Test Output

```
Test Results:
  Total tested: 100
  Successful: 98
  Failed: 2
  Success rate: 98.0%

Score Comparison (98 essays with both scores):
  Human score - Mean: 3.32, Range: (1.0, 6.0)
  System score - Mean: 68.5, Range: (45.2, 85.3)

Correlation (Human vs System): 0.452
```

## 💻 Using in Python Code

### Simple Example

```python
import json
import asyncio
from app.services.essay_analysis_service import essay_analysis_service

# Load essays
with open('data/processed_persuade.json', 'r') as f:
    essays = json.load(f)

# Test first essay
essay = essays[0]

# Analyze
results = await essay_analysis_service.analyze_text(
    text=essay['text'],
    analysis_type="comprehensive"
)

# Compare
human_score = essay['metadata']['human_score']
system_score = results['scores']['overall']
print(f"Human: {human_score}, System: {system_score:.1f}")
```

### Batch Testing

```python
import json
import asyncio
from app.services.essay_analysis_service import essay_analysis_service

with open('data/processed_persuade.json', 'r') as f:
    essays = json.load(f)

# Test first 10 essays
for essay in essays[:10]:
    results = await essay_analysis_service.analyze_text(
        text=essay['text'],
        analysis_type="comprehensive"
    )
    
    print(f"{essay['id']}: "
          f"Human={essay['metadata'].get('human_score')}, "
          f"System={results['scores']['overall']:.1f}")
```

### Access KG Metrics

```python
results = await essay_analysis_service.analyze_text(
    text=essay['text'],
    analysis_type="comprehensive"
)

# Get KG metrics
kg_metrics = results['detailed_analysis']['knowledge_graph']['metrics']

print(f"Concept Coherence: {kg_metrics['concept_coherence']['score']}")
print(f"Argument Strength: {kg_metrics['argument_strength']['overall_score']}")
print(f"Central Concepts: {kg_metrics['centrality_metrics']['central_concepts'][:5]}")
```

## 📈 Validation: Compare with Human Scores

```python
import json
import numpy as np
from scipy.stats import pearsonr

with open('data/processed_persuade.json', 'r') as f:
    essays = json.load(f)

human_scores = []
system_scores = []

for essay in essays[:50]:  # Test 50
    human = essay['metadata'].get('human_score')
    if human is None:
        continue
    
    results = await essay_analysis_service.analyze_text(
        text=essay['text'],
        analysis_type="comprehensive"
    )
    
    human_scores.append(human)
    system_scores.append(results['scores']['overall'])

# Calculate correlation
corr, _ = pearsonr(human_scores, system_scores)
print(f"Correlation: {corr:.3f}")
print(f"Human Mean: {np.mean(human_scores):.2f}")
print(f"System Mean: {np.mean(system_scores):.2f}")
```

## 🎯 Test Specific Features

### Grammar Only
```python
results = await essay_analysis_service.analyze_text(
    text=essay['text'],
    analysis_type="grammar"
)
print(f"Grammar Errors: {len(results['detailed_analysis']['grammar']['errors'])}")
```

### Argument Mining Only
```python
results = await essay_analysis_service.analyze_text(
    text=essay['text'],
    analysis_type="argument"
)
print(f"Claims: {len(results['detailed_analysis']['argumentation']['claims'])}")
```

## 📝 Files Created

- ✅ `scripts/quick_test.py` - Quick test with 1-5 essays
- ✅ `scripts/test_with_persuade_data.py` - Full test suite
- ✅ `TESTING_GUIDE.md` - Complete testing documentation

## 🚀 Next Steps

1. **Run quick test**: `python scripts/quick_test.py 3`
2. **Review results**: Check scores and recommendations
3. **Test more essays**: `python scripts/test_with_persuade_data.py --limit 20`
4. **Compare with human scores**: Use validation code above
5. **Process full dataset**: After testing, process all 25,996 essays in Colab

