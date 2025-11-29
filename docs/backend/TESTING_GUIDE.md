# Testing Guide: Using Processed Persuade Data

## Quick Test (1-5 Essays)

Test with just a few essays to see how the system works:

```bash
cd backend
python scripts/quick_test.py 3
```

This will:
- Load 3 essays from `processed_persuade.json`
- Run comprehensive analysis on each
- Show scores, KG metrics, and recommendations
- Compare with human scores

## Full Test Suite

Test all 100 essays and get detailed statistics:

```bash
cd backend
python scripts/test_with_persuade_data.py
```

Options:
```bash
# Test only first 10 essays
python scripts/test_with_persuade_data.py --limit 10

# Custom input file
python scripts/test_with_persuade_data.py --input data/processed_persuade.json --limit 20

# Save detailed results
python scripts/test_with_persuade_data.py --detailed --output data/test_results.json
```

## Using in Python Code

### Load and Test Single Essay

```python
import json
import asyncio
from app.services.essay_analysis_service import essay_analysis_service

# Load essays
with open('data/processed_persuade.json', 'r') as f:
    essays = json.load(f)

# Test first essay
essay = essays[0]
print(f"Essay ID: {essay['id']}")
print(f"Human Score: {essay['metadata'].get('human_score')}")

# Analyze
results = await essay_analysis_service.analyze_text(
    text=essay['text'],
    analysis_type="comprehensive"
)

# Compare scores
human_score = essay['metadata'].get('human_score')
system_score = results['scores']['overall']
print(f"Human: {human_score}, System: {system_score:.1f}")
```

### Batch Testing

```python
import json
import asyncio
from app.services.essay_analysis_service import essay_analysis_service

# Load essays
with open('data/processed_persuade.json', 'r') as f:
    essays = json.load(f)

# Test multiple essays
results = []
for essay in essays[:10]:  # First 10
    analysis = await essay_analysis_service.analyze_text(
        text=essay['text'],
        analysis_type="comprehensive"
    )
    
    results.append({
        'id': essay['id'],
        'human_score': essay['metadata'].get('human_score'),
        'system_score': analysis['scores']['overall'],
        'kg_score': analysis['scores'].get('knowledge_graph', 0)
    })

# Compare
for r in results:
    print(f"{r['id']}: Human={r['human_score']}, System={r['system_score']:.1f}")
```

### Access KG Metrics

```python
results = await essay_analysis_service.analyze_text(
    text=essay['text'],
    analysis_type="comprehensive"
)

# Access KG metrics
kg_metrics = results['detailed_analysis']['knowledge_graph']['metrics']

print(f"Concept Coherence: {kg_metrics['concept_coherence']['score']}")
print(f"Argument Strength: {kg_metrics['argument_strength']['overall_score']}")
print(f"Structure Completeness: {kg_metrics['structure_completeness']['completeness_score']}")
print(f"Central Concepts: {kg_metrics['centrality_metrics']['central_concepts']}")
```

### Generate Teacher Reports

```python
from app.services.report_generator import TeacherReportGenerator

# Analyze essay
results = await essay_analysis_service.analyze_text(
    text=essay['text'],
    analysis_type="comprehensive"
)

# Generate report
generator = TeacherReportGenerator()
report = generator.generate_report(results)

# View summary
print(f"Overall Score: {report['summary']['overall_score']}")
print(f"Strengths: {report['summary']['strengths']}")
print(f"Weaknesses: {report['summary']['weaknesses']}")

# Get plain text report
text_report = generator.generate_plain_text_report(report)
print(text_report)
```

## Validation: Compare with Human Scores

```python
import json
import numpy as np
from scipy.stats import pearsonr, spearmanr

# Load essays and analyze
with open('data/processed_persuade.json', 'r') as f:
    essays = json.load(f)

human_scores = []
system_scores = []

for essay in essays[:50]:  # Test 50 essays
    human_score = essay['metadata'].get('human_score')
    if human_score is None:
        continue
    
    results = await essay_analysis_service.analyze_text(
        text=essay['text'],
        analysis_type="comprehensive"
    )
    
    human_scores.append(human_score)
    system_scores.append(results['scores']['overall'])

# Calculate correlation
pearson_corr, _ = pearsonr(human_scores, system_scores)
spearman_corr, _ = spearmanr(human_scores, system_scores)

print(f"Pearson Correlation: {pearson_corr:.3f}")
print(f"Spearman Correlation: {spearman_corr:.3f}")
print(f"Mean Human Score: {np.mean(human_scores):.2f}")
print(f"Mean System Score: {np.mean(system_scores):.2f}")
```

## Test Specific Features

### Test Grammar Analysis Only

```python
results = await essay_analysis_service.analyze_text(
    text=essay['text'],
    analysis_type="grammar"
)

print(f"Grammar Score: {results['scores']['grammar']}")
print(f"Errors: {results['detailed_analysis']['grammar']['errors'][:5]}")
```

### Test Argument Mining

```python
results = await essay_analysis_service.analyze_text(
    text=essay['text'],
    analysis_type="argument"
)

claims = results['detailed_analysis']['argumentation']['claims']
evidence = results['detailed_analysis']['argumentation']['grounds']

print(f"Claims found: {len(claims)}")
print(f"Evidence found: {len(evidence)}")
```

### Test Knowledge Graph

```python
results = await essay_analysis_service.analyze_text(
    text=essay['text'],
    analysis_type="comprehensive"
)

kg = results['detailed_analysis']['knowledge_graph']
print(f"Concepts: {len(kg['concepts'])}")
print(f"Relationships: {len(kg['relationships'])}")
print(f"KG Score: {kg['score']}")
```

## Expected Results

With 100 essays, you should see:
- **Success rate**: ~95-100% (most essays process successfully)
- **Processing time**: ~1-2 minutes for 100 essays
- **Correlation**: 0.3-0.6 with human scores (depends on system tuning)
- **KG metrics**: Available for all essays with sufficient content

## Troubleshooting

### Issue: "Essay too short"
**Solution**: Some essays may be filtered out. Check word count in metadata.

### Issue: Slow processing
**Solution**: 
- Test with fewer essays first (`--limit 10`)
- Use `analysis_type="grammar"` for faster testing

### Issue: Memory errors
**Solution**: Process in smaller batches (10-20 essays at a time)

## Next Steps

After testing with 100 essays:
1. **Validate metrics** against human scores
2. **Tune parameters** based on results
3. **Process full dataset** (25,996 essays) for final validation
4. **Generate reports** for teacher evaluation

