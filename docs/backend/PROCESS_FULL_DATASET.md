# Process Full Persuade 2.0 Dataset

## Why Only 100 Essays?

You likely processed the dataset with a `--limit 100` flag, or there was a default limit. The full Persuade 2.0 dataset contains **25,996 essays**.

## Process All Essays

### Option 1: Local Processing (Recommended)

Run the full dataset processing script:

```bash
cd backend
python scripts/process_full_dataset.py
```

**Expected time**: 10-30 minutes depending on your system
**Output**: `data/processed_persuade_full.json` (~50-100 MB)

### Option 2: Using the Original Script (No Limit)

```bash
cd backend
python scripts/process_persuade_dataset.py data/persuade_2.0_human_scores_demo_id_github.csv --output data/processed_persuade_full.json
```

**Note**: Don't use `--limit` flag to get all essays!

### Option 3: Google Colab (If Local is Too Slow)

If your local machine is slow or you want cloud resources:

1. **Upload files to Colab**:
   - `persuade_2.0_human_scores_demo_id_github.csv`
   - Copy the `persuade_data_loader.py` code

2. **Run in Colab**:
```python
# Install dependencies
!pip install pandas spacy
!python -m spacy download en_core_web_sm

# Upload CSV to Colab
from google.colab import files
uploaded = files.upload()

# Process (copy code from persuade_data_loader.py)
# ... processing code ...

# Download result
files.download('processed_persuade_full.json')
```

## Memory Considerations

- **25,996 essays** ≈ 50-100 MB JSON file
- **RAM needed**: ~2-4 GB for processing
- **Disk space**: ~100-200 MB for output

If you have memory constraints, you can:
1. Process in batches (e.g., 5000 at a time)
2. Use Google Colab (free 12GB RAM)
3. Process only a subset (e.g., 10,000 essays)

## Batch Processing (If Needed)

If you want to process in smaller batches:

```python
from app.nlp_modules.persuade_data_loader import PersuadeDataLoader

loader = PersuadeDataLoader('data/persuade_2.0_human_scores_demo_id_github.csv')
df = loader.load()
df_processed = loader.preprocess()

# Process in batches of 5000
batch_size = 5000
for i in range(0, len(df_processed), batch_size):
    batch = df_processed.iloc[i:i+batch_size]
    loader.df = batch  # Temporarily set
    loader.export_to_json(f'data/processed_persuade_batch_{i//batch_size + 1}.json')
```

## Recommendation

**For your research**, I recommend:

1. **Start with a sample** (1000-5000 essays) for development/testing
2. **Process full dataset** when ready for final analysis
3. **Use local processing** if you have 4GB+ RAM
4. **Use Colab** if local is too slow or limited

The full dataset will give you:
- Better statistical significance
- More diverse examples
- Stronger validation results
- Complete coverage of the dataset

