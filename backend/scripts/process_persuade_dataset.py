"""
Script to process Persuade 2.0 dataset
Usage: python scripts/process_persuade_dataset.py <path_to_csv> [output_path]
"""
import sys
import argparse
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.nlp_modules.persuade_data_loader import PersuadeDataLoader
from app.nlp_modules.preprocessing import PreprocessingPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description='Process Persuade 2.0 dataset')
    parser.add_argument('dataset_path', type=str, help='Path to persuade_2.0_human_scores_demo_id_github.csv')
    parser.add_argument('--output', type=str, default='data/processed_persuade.json',
                       help='Output path for processed JSON file')
    parser.add_argument('--limit', type=int, default=None,
                       help='Limit number of essays to process (for testing)')
    parser.add_argument('--min-words', type=int, default=150,
                       help='Minimum word count per essay')
    parser.add_argument('--max-words', type=int, default=1000,
                       help='Maximum word count per essay')
    parser.add_argument('--stats-only', action='store_true',
                       help='Only show statistics, do not process')
    
    args = parser.parse_args()
    
    # Initialize loader
    loader = PersuadeDataLoader(args.dataset_path)
    
    try:
        # Load dataset
        logger.info("Loading dataset...")
        df = loader.load()
        
        # Show statistics
        stats = loader.get_statistics()
        logger.info("\nDataset Statistics:")
        logger.info(f"  Total essays: {stats['total_essays']}")
        logger.info(f"  Columns: {', '.join(stats['columns'][:10])}...")
        
        if 'word_count_stats' in stats:
            wc = stats['word_count_stats']
            logger.info(f"  Word count - Mean: {wc['mean']:.1f}, Median: {wc['median']:.1f}")
            logger.info(f"  Word count - Min: {wc['min']}, Max: {wc['max']}")
        
        if 'score_stats' in stats:
            sc = stats['score_stats']
            logger.info(f"  Score - Mean: {sc['mean']:.2f}, Range: {sc['min']:.2f}-{sc['max']:.2f}")
            logger.info(f"  Essays with scores: {sc['count']}")
        
        if args.stats_only:
            return
        
        # Preprocess
        logger.info("\nPreprocessing dataset...")
        df_processed = loader.preprocess(
            min_word_count=args.min_words,
            max_word_count=args.max_words
        )
        
        # Export to JSON
        logger.info(f"\nExporting to {args.output}...")
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        loader.export_to_json(
            output_path=str(output_path),
            limit=args.limit
        )
        
        logger.info(f"\n✅ Processing complete!")
        logger.info(f"  Processed essays: {len(df_processed)}")
        logger.info(f"  Output file: {args.output}")
        
        # Show sample
        logger.info("\nSample essay (first one):")
        sample = loader.convert_to_standard_format(df_processed.iloc[0])
        logger.info(f"  ID: {sample['id']}")
        logger.info(f"  Text preview: {sample['text'][:100]}...")
        logger.info(f"  Word count: {sample['metadata']['word_count']}")
        if 'human_score' in sample['metadata']:
            logger.info(f"  Human score: {sample['metadata']['human_score']}")
        
    except FileNotFoundError as e:
        logger.error(f"❌ Error: {e}")
        logger.error("Please provide the correct path to the dataset CSV file.")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Error processing dataset: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

