# Google Colab Instructions for Processing Persuade 2.0 Dataset

## Quick Start

1. **Open Google Colab**: Go to https://colab.research.google.com/

2. **Upload the notebook**:
   - File → Upload Notebook
   - Select `colab_process_persuade.ipynb`

3. **Or create new notebook and copy code**:
   - Create new notebook
   - Copy code from sections below

## Step-by-Step Process

### Step 1: Install Dependencies

```python
!pip install pandas spacy
!python -m spacy download en_core_web_sm
```

### Step 2: Upload CSV File

```python
from google.colab import files
import os

print("Please upload your persuade_2.0_human_scores_demo_id_github.csv file:")
uploaded = files.upload()

csv_filename = list(uploaded.keys())[0]
print(f"\n✓ Uploaded: {csv_filename} ({os.path.getsize(csv_filename) / (1024*1024):.1f} MB)")
```

### Step 3: Run Processing Code

Copy the processing code from `colab_process_persuade.ipynb` or use the simplified version below.

### Step 4: Download Result

```python
from google.colab import files

files.download('processed_persuade_full.json')
print("✓ Download complete!")
```

## Simplified Colab Code (All-in-One)

If you prefer a single cell, use this:

```python
# Install dependencies
!pip install pandas spacy
!python -m spacy download en_core_web_sm

# Upload CSV
from google.colab import files
import pandas as pd
import json
import re
import time
import os

print("Upload your CSV file:")
uploaded = files.upload()
csv_filename = list(uploaded.keys())[0]

# Load and process
print(f"\nLoading {csv_filename}...")
df = pd.read_csv(csv_filename)
print(f"✓ Loaded {len(df):,} essays")

# Find text column
text_col = 'full_text' if 'full_text' in df.columns else df.columns[df.dtypes == 'object'][0]
print(f"Using text column: {text_col}")

# Filter by word count
df['word_count'] = df[text_col].apply(lambda x: len(str(x).split()) if pd.notna(x) else 0)
df = df[(df['word_count'] >= 150) & (df['word_count'] <= 1000)]
print(f"✓ {len(df):,} essays after filtering (150-1000 words)")

# Convert to standard format
print("\nConverting to JSON format...")
essays = []
for idx, row in df.iterrows():
    essay = {
        "id": str(row.get('essay_id_comp', f"essay_{idx}")),
        "text": str(row[text_col]).strip(),
        "teacher_annotations": [],
        "essay_type": "argumentative",
        "grade_level": str(row.get('grade_level', 'high_school')),
        "prompt": str(row.get('prompt_name', '')),
        "metadata": {
            "word_count": int(row['word_count']),
            "source": "persuade_2.0",
            "original_id": str(row.get('essay_id_comp', f"essay_{idx}"))
        }
    }
    if 'holistic_essay_score' in row and pd.notna(row['holistic_essay_score']):
        essay["metadata"]["human_score"] = float(row['holistic_essay_score'])
    essays.append(essay)
    
    if (idx + 1) % 1000 == 0:
        print(f"  Processed {idx + 1:,}/{len(df):,} essays")

# Save JSON
output_file = 'processed_persuade_full.json'
print(f"\nSaving to {output_file}...")
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(essays, f, indent=2, ensure_ascii=False)

file_size = os.path.getsize(output_file) / (1024*1024)
print(f"✓ Saved {len(essays):,} essays ({file_size:.1f} MB)")

# Download
print("\nDownloading file...")
files.download(output_file)
print("✅ Complete!")
```

## Expected Results

- **Input**: 25,996 essays (CSV)
- **Output**: ~15,000-20,000 essays (after filtering 150-1000 words)
- **File size**: 50-100 MB JSON
- **Processing time**: 10-30 minutes

## After Download

1. Save the downloaded file to: `backend/data/processed_persuade_full.json`
2. Use it in your analysis pipeline
3. All essays are in standardized format ready for KG analysis

## Troubleshooting

### Issue: Out of memory
**Solution**: Process in batches (modify code to process 5000 at a time)

### Issue: Upload fails
**Solution**: 
- Check file size (should be < 100MB)
- Or use Google Drive: `from google.colab import drive; drive.mount('/content/drive')`

### Issue: Slow processing
**Solution**: 
- Use GPU runtime: Runtime → Change runtime type → GPU
- Or process in smaller batches

## Next Steps After Processing

Once you have `processed_persuade_full.json`:

1. **Load in your analysis**:
```python
import json
with open('data/processed_persuade_full.json', 'r') as f:
    essays = json.load(f)
```

2. **Use in analysis pipeline**:
```python
from app.services.essay_analysis_service import essay_analysis_service

for essay in essays[:10]:  # Test with first 10
    results = await essay_analysis_service.analyze_text(
        text=essay['text'],
        analysis_type="comprehensive"
    )
```

3. **Validate against human scores**:
```python
# Compare system scores with human scores
for essay in essays:
    human_score = essay['metadata'].get('human_score')
    # Run analysis and compare
```

