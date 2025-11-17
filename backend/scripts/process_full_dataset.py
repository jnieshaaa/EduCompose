"""
Script to process the FULL Persuade 2.0 dataset (all 25,996 essays)
This may take 10-30 minutes depending on your system
"""
import sys
import logging
from pathlib import Path
import time

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.nlp_modules.persuade_data_loader import PersuadeDataLoader

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def main():
    dataset_path = 'data/persuade_2.0_human_scores_demo_id_github.csv'
    output_path = 'data/processed_persuade_full.json'
    
    logger.info("=" * 60)
    logger.info("Processing FULL Persuade 2.0 Dataset")
    logger.info("=" * 60)
    
    # Initialize loader
    loader = PersuadeDataLoader(dataset_path)
    
    try:
        # Load dataset
        logger.info("Step 1/3: Loading dataset...")
        start_time = time.time()
        df = loader.load()
        load_time = time.time() - start_time
        logger.info(f"✓ Loaded {len(df)} essays in {load_time:.1f} seconds")
        
        # Show statistics
        stats = loader.get_statistics()
        logger.info("\nDataset Statistics:")
        logger.info(f"  Total essays: {stats['total_essays']:,}")
        if 'word_count_stats' in stats:
            wc = stats['word_count_stats']
            logger.info(f"  Word count - Mean: {wc['mean']:.1f}, Range: {wc['min']}-{wc['max']}")
        if 'score_stats' in stats:
            sc = stats['score_stats']
            logger.info(f"  Score - Mean: {sc['mean']:.2f}, Range: {sc['min']:.2f}-{sc['max']:.2f}")
        
        # Preprocess
        logger.info("\nStep 2/3: Preprocessing dataset (filtering by word count 150-1000)...")
        start_time = time.time()
        df_processed = loader.preprocess(
            min_word_count=150,
            max_word_count=1000
        )
        preprocess_time = time.time() - start_time
        logger.info(f"✓ Preprocessed {len(df_processed):,} essays in {preprocess_time:.1f} seconds")
        logger.info(f"  Filtered out {len(df) - len(df_processed):,} essays outside word count range")
        
        # Export to JSON (NO LIMIT - process all)
        logger.info(f"\nStep 3/3: Exporting to {output_path}...")
        logger.info("  This may take several minutes for 25,000+ essays...")
        start_time = time.time()
        
        output_path_obj = Path(output_path)
        output_path_obj.parent.mkdir(parents=True, exist_ok=True)
        
        # Export WITHOUT limit
        loader.export_to_json(
            output_path=str(output_path_obj),
            limit=None  # Process ALL essays
        )
        
        export_time = time.time() - start_time
        total_time = time.time() - time.time() + load_time + preprocess_time + export_time
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ Processing Complete!")
        logger.info("=" * 60)
        logger.info(f"  Processed essays: {len(df_processed):,}")
        logger.info(f"  Output file: {output_path}")
        logger.info(f"  File size: {Path(output_path).stat().st_size / (1024*1024):.1f} MB")
        logger.info(f"  Total time: {load_time + preprocess_time + export_time:.1f} seconds")
        logger.info("\nYou can now use this file for analysis!")
        
    except FileNotFoundError as e:
        logger.error(f"❌ Error: {e}")
        logger.error("Please ensure the CSV file exists at: data/persuade_2.0_human_scores_demo_id_github.csv")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Error processing dataset: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

