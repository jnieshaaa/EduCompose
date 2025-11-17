"""
Test EduCompose Analysis with Persuade 2.0 Dataset
Uses the 100 essays from processed_persuade.json for testing
"""
import sys
import json
import asyncio
import logging
import argparse
from pathlib import Path
from typing import Dict, List, Any
import pandas as pd
import numpy as np

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.essay_analysis_service import essay_analysis_service
from app.services.report_generator import TeacherReportGenerator

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def test_single_essay(essay_data: Dict[str, Any]) -> Dict[str, Any]:
    """Test analysis on a single essay"""
    try:
        results = await essay_analysis_service.analyze_text(
            text=essay_data['text'],
            title=essay_data.get('id', 'Untitled'),
            analysis_type="comprehensive"
        )
        
        return {
            "essay_id": essay_data['id'],
            "human_score": essay_data.get('metadata', {}).get('human_score'),
            "system_scores": results.get('scores', {}),
            "word_count": essay_data.get('metadata', {}).get('word_count', 0),
            "success": True
        }
    except Exception as e:
        logger.error(f"Error analyzing essay {essay_data.get('id')}: {e}")
        return {
            "essay_id": essay_data.get('id'),
            "success": False,
            "error": str(e)
        }


async def test_batch(essays: List[Dict[str, Any]], limit: int = None) -> List[Dict[str, Any]]:
    """Test analysis on multiple essays"""
    if limit:
        essays = essays[:limit]
    
    results = []
    total = len(essays)
    
    logger.info(f"Testing {total} essays...")
    
    for idx, essay in enumerate(essays, 1):
        logger.info(f"Processing essay {idx}/{total}: {essay.get('id', 'unknown')}")
        result = await test_single_essay(essay)
        results.append(result)
        
        if idx % 10 == 0:
            logger.info(f"  Progress: {idx}/{total} ({idx/total*100:.1f}%)")
    
    return results


def analyze_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze test results and compare with human scores"""
    successful = [r for r in results if r.get('success', False)]
    failed = [r for r in results if not r.get('success', False)]
    
    analysis = {
        "total_tested": len(results),
        "successful": len(successful),
        "failed": len(failed),
        "success_rate": len(successful) / len(results) * 100 if results else 0
    }
    
    if successful:
        # Extract scores
        system_overall = [r['system_scores'].get('overall', 0) for r in successful if 'system_scores' in r]
        human_scores = [r['human_score'] for r in successful if r.get('human_score') is not None]
        
        # Scores that have both human and system scores
        paired_scores = [
            (r['human_score'], r['system_scores'].get('overall', 0))
            for r in successful
            if r.get('human_score') is not None and 'system_scores' in r
        ]
        
        if paired_scores:
            human_vals = [h for h, s in paired_scores]
            system_vals = [s for h, s in paired_scores]
            
            # Calculate correlation (simple Pearson)
            import numpy as np
            if len(paired_scores) > 1:
                correlation = np.corrcoef(human_vals, system_vals)[0, 1]
                analysis["correlation"] = correlation
            
            analysis["score_comparison"] = {
                "human_mean": np.mean(human_vals),
                "system_mean": np.mean(system_vals),
                "human_range": (min(human_vals), max(human_vals)),
                "system_range": (min(system_vals), max(system_vals)),
                "paired_count": len(paired_scores)
            }
        
        # Dimension scores
        if system_overall:
            analysis["system_scores"] = {
                "overall_mean": np.mean(system_overall),
                "overall_range": (min(system_overall), max(system_overall))
            }
    
    if failed:
        analysis["errors"] = [r.get('error', 'Unknown error') for r in failed[:5]]
    
    return analysis


def main():
    parser = argparse.ArgumentParser(description='Test EduCompose with Persuade dataset')
    parser.add_argument('--input', type=str, default='data/processed_persuade.json',
                       help='Path to processed JSON file')
    parser.add_argument('--limit', type=int, default=None,
                       help='Limit number of essays to test (default: all)')
    parser.add_argument('--output', type=str, default='data/test_results.json',
                       help='Output path for test results')
    parser.add_argument('--detailed', action='store_true',
                       help='Save detailed analysis results for each essay')
    
    args = parser.parse_args()
    
    # Load essays
    logger.info(f"Loading essays from {args.input}...")
    with open(args.input, 'r', encoding='utf-8') as f:
        essays = json.load(f)
    
    logger.info(f"Loaded {len(essays)} essays")
    
    if args.limit:
        essays = essays[:args.limit]
        logger.info(f"Testing first {len(essays)} essays")
    
    # Run tests
    logger.info("\n" + "=" * 60)
    logger.info("Running Analysis Tests")
    logger.info("=" * 60)
    
    results = asyncio.run(test_batch(essays, limit=args.limit))
    
    # Analyze results
    logger.info("\n" + "=" * 60)
    logger.info("Analyzing Results")
    logger.info("=" * 60)
    
    analysis = analyze_results(results)
    
    logger.info(f"\nTest Results:")
    logger.info(f"  Total tested: {analysis['total_tested']}")
    logger.info(f"  Successful: {analysis['successful']}")
    logger.info(f"  Failed: {analysis['failed']}")
    logger.info(f"  Success rate: {analysis['success_rate']:.1f}%")
    
    if 'score_comparison' in analysis:
        comp = analysis['score_comparison']
        logger.info(f"\nScore Comparison ({comp['paired_count']} essays with both scores):")
        logger.info(f"  Human score - Mean: {comp['human_mean']:.2f}, Range: {comp['human_range']}")
        logger.info(f"  System score - Mean: {comp['system_mean']:.2f}, Range: {comp['system_range']}")
    
    if 'correlation' in analysis:
        logger.info(f"\nCorrelation (Human vs System): {analysis['correlation']:.3f}")
    
    # Save results
    output_data = {
        "summary": analysis,
        "results": results
    }
    
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"\n✓ Results saved to {args.output}")
    
    # Generate sample report
    if results and results[0].get('success'):
        logger.info("\nGenerating sample teacher report...")
        # Get first successful essay
        first_essay = next((e for e in essays if e['id'] == results[0]['essay_id']), None)
        if first_essay:
            sample_results = asyncio.run(essay_analysis_service.analyze_text(
                text=first_essay['text'],
                analysis_type="comprehensive"
            ))
            generator = TeacherReportGenerator()
            report = generator.generate_report(sample_results)
            
            # Save sample report
            report_path = 'data/sample_teacher_report.json'
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✓ Sample report saved to {report_path}")
            
            # Print plain text version
            text_report = generator.generate_plain_text_report(report)
            print("\n" + "=" * 60)
            print("SAMPLE TEACHER REPORT")
            print("=" * 60)
            print(text_report)


if __name__ == "__main__":
    import argparse
    main()

