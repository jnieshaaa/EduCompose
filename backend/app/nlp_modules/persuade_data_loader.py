"""
Persuade 2.0 Dataset Loader and Preprocessor
Handles loading and preprocessing of the Persuade 2.0 human scores dataset
"""
import pandas as pd
import json
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
import re

logger = logging.getLogger(__name__)


class PersuadeDataLoader:
    """
    Loads and preprocesses Persuade 2.0 dataset
    Dataset: persuade_2.0_human_scores_demo_id_github.csv
    """
    
    def __init__(self, dataset_path: str):
        """
        Initialize data loader
        
        Args:
            dataset_path: Path to the CSV file
        """
        self.dataset_path = Path(dataset_path)
        self.df = None
    
    def load(self) -> pd.DataFrame:
        """
        Load the CSV dataset
        
        Returns:
            DataFrame with loaded data
        """
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Dataset not found at: {self.dataset_path}")
        
        logger.info(f"Loading dataset from {self.dataset_path}")
        self.df = pd.read_csv(self.dataset_path)
        
        logger.info(f"Loaded {len(self.df)} essays")
        logger.info(f"Columns: {list(self.df.columns)}")
        
        return self.df
    
    def preprocess(self, 
                  min_word_count: int = 150,
                  max_word_count: int = 1000,
                  remove_missing_text: bool = True) -> pd.DataFrame:
        """
        Preprocess the dataset
        
        Args:
            min_word_count: Minimum words per essay
            max_word_count: Maximum words per essay
            remove_missing_text: Remove rows with missing text
            
        Returns:
            Preprocessed DataFrame
        """
        if self.df is None:
            raise ValueError("Dataset not loaded. Call load() first.")
        
        df = self.df.copy()
        
        # Identify text column (could be 'full_text', 'text', 'essay_text', etc.)
        text_column = self._find_text_column(df)
        if text_column is None:
            raise ValueError("Could not find text column in dataset")
        
        logger.info(f"Using text column: {text_column}")
        
        # Remove rows with missing text
        if remove_missing_text:
            initial_count = len(df)
            df = df.dropna(subset=[text_column])
            removed = initial_count - len(df)
            if removed > 0:
                logger.info(f"Removed {removed} rows with missing text")
        
        # Filter by word count
        df['word_count'] = df[text_column].apply(lambda x: len(str(x).split()) if pd.notna(x) else 0)
        
        initial_count = len(df)
        df = df[(df['word_count'] >= min_word_count) & (df['word_count'] <= max_word_count)]
        filtered = initial_count - len(df)
        if filtered > 0:
            logger.info(f"Filtered out {filtered} essays outside word count range ({min_word_count}-{max_word_count})")
        
        # Clean text
        df['cleaned_text'] = df[text_column].apply(self._clean_text)
        
        # Extract metadata
        df['essay_type'] = 'argumentative'  # Persuade dataset is argumentative
        df['grade_level'] = self._extract_grade_level(df)
        
        logger.info(f"Preprocessed dataset: {len(df)} essays remaining")
        
        return df
    
    def _find_text_column(self, df: pd.DataFrame) -> Optional[str]:
        """Find the text column in the dataset"""
        possible_names = ['full_text', 'text', 'essay_text', 'content', 'essay', 'fulltext']
        
        for col in df.columns:
            if col.lower() in [name.lower() for name in possible_names]:
                return col
        
        # If not found, check for columns with string data
        for col in df.columns:
            if df[col].dtype == 'object':
                # Check if it looks like text (long strings)
                sample = df[col].dropna().iloc[0] if len(df[col].dropna()) > 0 else ""
                if isinstance(sample, str) and len(sample) > 100:
                    return col
        
        return None
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if pd.isna(text):
            return ""
        
        text = str(text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters that might cause issues (keep basic punctuation)
        # text = re.sub(r'[^\w\s.,!?;:\-()]', '', text)
        
        return text.strip()
    
    def _extract_grade_level(self, df: pd.DataFrame) -> pd.Series:
        """Extract grade level if available, otherwise default"""
        # Check for grade level column
        grade_columns = [col for col in df.columns if 'grade' in col.lower()]
        
        if grade_columns:
            return df[grade_columns[0]]
        
        # Default to high_school if not available
        return pd.Series(['high_school'] * len(df))
    
    def convert_to_standard_format(self, 
                                   row: pd.Series,
                                   text_column: str = 'cleaned_text') -> Dict[str, Any]:
        """
        Convert a single row to standardized format
        
        Args:
            row: DataFrame row
            text_column: Name of text column to use
            
        Returns:
            Dictionary in standardized format
        """
        # Get essay ID
        id_columns = ['essay_id_comp', 'essay_id', 'id', 'essay_id_comp']
        essay_id = None
        for col in id_columns:
            if col in row.index and pd.notna(row[col]):
                essay_id = str(row[col])
                break
        
        if essay_id is None:
            essay_id = f"essay_{row.name}"  # Use index as fallback
        
        # Get text
        text = row.get(text_column, row.get('full_text', ''))
        if pd.isna(text):
            text = ""
        
        # Get score if available
        score_columns = ['holistic_essay_score', 'score', 'human_score', 'overall_score']
        score = None
        for col in score_columns:
            if col in row.index and pd.notna(row[col]):
                score = float(row[col])
                break
        
        # Build standardized format
        standard_format = {
            "id": essay_id,
            "text": str(text),
            "teacher_annotations": [],  # Will be populated if annotations exist
            "essay_type": row.get('essay_type', 'argumentative'),
            "grade_level": str(row.get('grade_level', 'high_school')),
            "prompt": row.get('prompt', '') if 'prompt' in row.index else '',
            "metadata": {
                "word_count": int(row.get('word_count', len(str(text).split()))),
                "source": "persuade_2.0",
                "original_id": essay_id
            }
        }
        
        # Add score if available
        if score is not None:
            standard_format["metadata"]["human_score"] = score
        
        # Add discourse type if available
        if 'discourse_type_num' in row.index and pd.notna(row['discourse_type_num']):
            standard_format["metadata"]["discourse_type"] = int(row['discourse_type_num'])
        
        return standard_format
    
    def export_to_json(self, 
                      output_path: str,
                      text_column: str = 'cleaned_text',
                      limit: Optional[int] = None) -> None:
        """
        Export preprocessed data to JSON format
        
        Args:
            output_path: Path to output JSON file
            text_column: Name of text column to use
            limit: Limit number of essays to export (None for all)
        """
        if self.df is None:
            raise ValueError("Dataset not loaded. Call load() and preprocess() first.")
        
        output_path = Path(output_path)
        
        # Convert to standard format
        essays = []
        df_to_export = self.df.head(limit) if limit else self.df
        
        for idx, row in df_to_export.iterrows():
            try:
                essay_data = self.convert_to_standard_format(row, text_column)
                essays.append(essay_data)
            except Exception as e:
                logger.warning(f"Error processing row {idx}: {e}")
                continue
        
        # Write to JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(essays, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Exported {len(essays)} essays to {output_path}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get dataset statistics"""
        if self.df is None:
            raise ValueError("Dataset not loaded. Call load() first.")
        
        text_column = self._find_text_column(self.df)
        
        stats = {
            "total_essays": len(self.df),
            "columns": list(self.df.columns),
            "word_count_stats": {}
        }
        
        if text_column:
            word_counts = self.df[text_column].apply(
                lambda x: len(str(x).split()) if pd.notna(x) else 0
            )
            stats["word_count_stats"] = {
                "mean": float(word_counts.mean()),
                "median": float(word_counts.median()),
                "min": int(word_counts.min()),
                "max": int(word_counts.max()),
                "std": float(word_counts.std())
            }
        
        # Score statistics if available
        score_columns = ['holistic_essay_score', 'score', 'human_score']
        for col in score_columns:
            if col in self.df.columns:
                scores = self.df[col].dropna()
                if len(scores) > 0:
                    stats["score_stats"] = {
                        "column": col,
                        "mean": float(scores.mean()),
                        "median": float(scores.median()),
                        "min": float(scores.min()),
                        "max": float(scores.max()),
                        "std": float(scores.std()),
                        "count": int(len(scores))
                    }
                break
        
        return stats

