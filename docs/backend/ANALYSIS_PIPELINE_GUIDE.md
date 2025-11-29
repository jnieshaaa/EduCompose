# Analysis Pipeline Guide
## Processing Full Persuade 2.0 Dataset

## 🚀 Quick Start

### Process All Essays

```bash
cd backend
python scripts/analysis_pipeline.py data/processed_persuade_full.json
```

This will:
- Load all essays from `processed_persuade_full.json`
- Run comprehensive analysis on each essay
- Process in batches (default: 50 at a time)
- Save results, statistics, and sample reports
- Generate correlation with human scores

**Estimated time**: 2-4 hours for 15,000-20,000 essays

## 📋 Options

### Process Subset (for testing)

```bash
# Process first 100 essays
python scripts/analysis_pipeline.py data/processed_persuade_full.json --limit 100

# Process first 1000 essays
python scripts/analysis_pipeline.py data/processed_persuade_full.json --limit 1000
```

### Adjust Batch Size

```bash
# Smaller batches (if memory issues)
python scripts/analysis_pipeline.py data/processed_persuade_full.json --batch-size 25

# Larger batches (faster, but more memory)
python scripts/analysis_pipeline.py data/processed_persuade_full.json --batch-size 100
```

### Different Analysis Types

```bash
# Grammar only (faster)
python scripts/analysis_pipeline.py data/processed_persuade_full.json --analysis-type grammar

# Argument mining only
python scripts/analysis_pipeline.py data/processed_persuade_full.json --analysis-type argument

# Comprehensive (default - includes KG)
python scripts/analysis_persuade_full.json --analysis-type comprehensive
```

### Custom Output Directory

```bash
python scripts/analysis_pipeline.py data/processed_persuade_full.json --output-dir results/run1
```

## 📊 Output Files

The pipeline creates several output files in `data/analysis_results/`:

### 1. `all_analysis_results.json`
Complete analysis results for all essays:
```json
[
  {
    "essay_id": "423A1CA112E2",
    "human_score": 3.0,
    "word_count": 378,
    "analysis": {
      "scores": {...},
      "detailed_analysis": {...},
      "recommendations": [...]
    },
    "success": true
  },
  ...
]
```

### 2. `analysis_statistics.json`
Aggregated statistics:
```json
{
  "total_processed": 15000,
  "successful": 14950,
  "failed": 50,
  "success_rate": 99.7,
  "system_scores": {
    "overall": {"mean": 68.5, "std": 12.3, ...},
    "grammar": {"mean": 72.1, ...},
    ...
  },
  "correlation": {
    "pearson": {"correlation": 0.452, "p_value": 0.001},
    "spearman": {"correlation": 0.438, "p_value": 0.001}
  },
  "kg_metrics": {...}
}
```

### 3. `analysis_summary.csv`
Easy-to-analyze CSV table:
```csv
essay_id,human_score,system_overall,grammar,readability,coherence,argument_strength,knowledge_graph,word_count
423A1CA112E2,3.0,68.5,72.3,65.1,70.2,65.8,68.0,378
...
```

### 4. `sample_report_*.json` and `sample_report_*.txt`
Sample teacher reports (first 5 essays) in both JSON and plain text format.

### 5. `batch_*_results.json`
Intermediate batch results (if not using `--no-intermediate`).

## 📈 Analyzing Results

### Load and View Statistics

```python
import json

# Load statistics
with open('data/analysis_results/analysis_statistics.json', 'r') as f:
    stats = json.load(f)

print(f"Success rate: {stats['success_rate']:.1f}%")
print(f"Correlation: {stats['correlation']['pearson']['correlation']:.3f}")
print(f"Mean system score: {stats['system_scores']['overall']['mean']:.1f}")
```

### Load Summary CSV

```python
import pandas as pd

df = pd.read_csv('data/analysis_results/analysis_summary.csv')

# View statistics
print(df.describe())

# Correlation
print(df[['human_score', 'system_overall']].corr())

# Filter by score ranges
high_scores = df[df['system_overall'] > 80]
low_scores = df[df['system_overall'] < 60]
```

### Compare Human vs System Scores

```python
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('data/analysis_results/analysis_summary.csv')

# Scatter plot
plt.scatter(df['human_score'], df['system_overall'])
plt.xlabel('Human Score')
plt.ylabel('System Score')
plt.title('Human vs System Score Comparison')
plt.show()

# Correlation
correlation = df['human_score'].corr(df['system_overall'])
print(f"Correlation: {correlation:.3f}")
```

## 🔄 Running in Background

For long-running analysis, run in background:

### Windows PowerShell
```powershell
Start-Process python -ArgumentList "scripts/analysis_pipeline.py data/processed_persuade_full.json" -WindowStyle Hidden
```

### Linux/Mac
```bash
nohup python scripts/analysis_pipeline.py data/processed_persuade_full.json > pipeline.log 2>&1 &
```

## ⚡ Performance Tips

1. **Start Small**: Test with `--limit 100` first
2. **Adjust Batch Size**: Smaller batches = less memory, larger = faster
3. **Use Comprehensive**: Only if you need KG metrics (slower)
4. **Monitor Progress**: Check `analysis_pipeline.log` for progress
5. **Save Intermediate**: Keep intermediate results in case of interruption

## 🛠️ Troubleshooting

### Issue: Out of Memory
**Solution**: 
- Reduce batch size: `--batch-size 25`
- Process in smaller chunks: `--limit 5000`

### Issue: Slow Processing
**Solution**:
- Use faster analysis: `--analysis-type grammar`
- Increase batch size: `--batch-size 100`
- Process subset first: `--limit 1000`

### Issue: Interrupted Processing
**Solution**:
- Check `batch_*_results.json` files
- Resume from last batch
- Or process remaining essays separately

## 📊 Expected Results

For ~15,000-20,000 essays:
- **Processing time**: 2-4 hours
- **Success rate**: 95-99%
- **Correlation**: 0.3-0.6 (depends on system tuning)
- **Output size**: 500MB - 2GB (depending on detail level)

## 🎯 Next Steps After Pipeline

1. **Review Statistics**: Check `analysis_statistics.json`
2. **Analyze Correlation**: Compare with human scores
3. **Review Sample Reports**: Check teacher report quality
4. **Validate Metrics**: Ensure KG metrics are meaningful
5. **Iterate**: Tune parameters based on results

## 📝 Example Workflow

```bash
# 1. Test with small subset
python scripts/analysis_pipeline.py data/processed_persuade_full.json --limit 100

# 2. Review results
# Check data/analysis_results/analysis_statistics.json

# 3. Process full dataset
python scripts/analysis_pipeline.py data/processed_persuade_full.json

# 4. Analyze results
python -c "import pandas as pd; df = pd.read_csv('data/analysis_results/analysis_summary.csv'); print(df.describe())"
```

