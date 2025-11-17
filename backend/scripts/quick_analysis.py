"""
Quick Analysis - Test pipeline with small subset
"""
import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.analysis_pipeline import AnalysisPipeline


async def main():
    """Quick test with 10 essays"""
    print("=" * 60)
    print("Quick Analysis Test (10 essays)")
    print("=" * 60)
    
    pipeline = AnalysisPipeline(
        input_file='data/processed_persuade_full.json',
        output_dir='data/quick_analysis_test'
    )
    
    # Test with 10 essays
    summary = await pipeline.run_pipeline(
        limit=10,
        batch_size=5,
        analysis_type="comprehensive"
    )
    
    print("\n✅ Quick test complete!")
    print(f"Check results in: data/quick_analysis_test/")


if __name__ == "__main__":
    asyncio.run(main())

