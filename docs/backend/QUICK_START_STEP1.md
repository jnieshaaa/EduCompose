# Quick Start: Process Persuade 2.0 Dataset

## 🚀 Quick Steps

### 1. Download the Dataset

Download `persuade_2.0_human_scores_demo_id_github.csv` from:

- **GitHub**: https://github.com/scrosseye/persuade_corpus_2.0
- Place it in: `backend/data/persuade_2.0_human_scores_demo_id_github.csv`

### 2. Process the Dataset

```bash
cd backend

# Basic processing (all essays)
python scripts/process_persuade_dataset.py data/persuade_2.0_human_scores_demo_id_github.csv

# Test with first 100 essays
python scripts/process_persuade_dataset.py data/persuade_2.0_human_scores_demo_id_github.csv --limit 100

# View statistics only
python scripts/process_persuade_dataset.py data/persuade_2.0_human_scores_demo_id_github.csv --stats-only
```

### 3. Output

The script will create:

- `backend/data/processed_persuade.json` - Processed essays in standardized format

### 4. Use in Your Code

```python
import json

# Load processed data
with open('data/processed_persuade.json', 'r') as f:
    essays = json.load(f)

# Use in analysis
from app.services.essay_analysis_service import essay_analysis_service

for essay in essays[:10]:  # First 10 essays
    results = await essay_analysis_service.analyze_text(
        text=essay['text'],
        analysis_type="comprehensive"
    )
    print(f"Essay {essay['id']}: Score = {results['scores']['overall']}")
```

---

## 📋 What Gets Processed

✅ **Automatic Detection**:

- Finds text column automatically
- Detects essay IDs
- Extracts scores if available

✅ **Preprocessing**:

- Cleans text (removes extra whitespace)
- Filters by word count (150-1000 words default)
- Removes missing data

✅ **Standardized Format**:

- Consistent JSON structure
- All metadata preserved
- Ready for analysis pipeline

---

## 🔧 Options

```bash
# Custom output path
--output data/my_processed_data.json

# Custom word count range
--min-words 200 --max-words 800

# Limit number of essays
--limit 1000

# View statistics only
--stats-only
```

---

## ✅ Step 1 Complete!

After processing, you have:

- ✅ Loaded and preprocessed dataset
- ✅ Standardized format
- ✅ Ready for analysis

**Next**: Use the processed data in your analysis pipeline (Steps 2-8 are already implemented!)
