"""
Model Accuracy Evaluation Script
Tests the accuracy of grammar, readability, and argument analysis models
by comparing system predictions with human scores from the PERSUADE dataset.

Usage:
    python evaluate_model_accuracy.py [--limit N] [--output results.json]
    
    Examples:
    - Test 100 essays (default): python evaluate_model_accuracy.py
    - Test 50 essays: python evaluate_model_accuracy.py --limit 50
    - Test ALL essays (WARNING: takes hours): python evaluate_model_accuracy.py --limit 0
"""
import json
import sys
import asyncio
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime

import numpy as np
from scipy.stats import pearsonr, spearmanr

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.services.essay_analysis_service import essay_analysis_service

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ModelAccuracyEvaluator:
    """Evaluates model accuracy against human scores"""
    
    def __init__(self):
        self.results = []
        self.errors = []
    
    def load_test_data(self, data_path: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Load test essays from JSON file"""
        logger.info(f"Loading test data from {data_path}")
        
        with open(data_path, 'r', encoding='utf-8') as f:
            essays = json.load(f)
        
        # Filter essays that have human scores
        essays_with_scores = [
            essay for essay in essays 
            if essay.get('metadata', {}).get('human_score') is not None
        ]
        
        if limit:
            essays_with_scores = essays_with_scores[:limit]
        
        logger.info(f"Loaded {len(essays_with_scores)} essays with human scores")
        return essays_with_scores
    
    async def analyze_essay(self, essay: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Analyze a single essay and return results"""
        essay_id = essay.get('id', 'unknown')
        text = essay.get('text', '')
        human_score = essay.get('metadata', {}).get('human_score')
        
        if not text or human_score is None:
            return None
        
        try:
            logger.info(f"Analyzing essay {essay_id}...")
            analysis = await essay_analysis_service.analyze_text(
                text=text,
                title=essay.get('prompt', 'Untitled'),
                analysis_type="comprehensive"
            )
            
            # Extract scores
            scores = analysis.get('scores', {})
            
            return {
                'essay_id': essay_id,
                'human_score': human_score,
                'system_scores': {
                    'grammar': scores.get('grammar', 0.0),
                    'readability': scores.get('readability', 0.0),
                    'argument_strength': scores.get('argument_strength', 0.0),
                    'overall': scores.get('overall', 0.0)
                },
                'word_count': analysis.get('word_count', 0),
                'success': True
            }
        except Exception as e:
            logger.error(f"Error analyzing essay {essay_id}: {e}")
            self.errors.append({
                'essay_id': essay_id,
                'error': str(e)
            })
            return None
    
    async def evaluate_batch(self, essays: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Evaluate a batch of essays"""
        import time
        results = []
        start_time = time.time()
        
        for i, essay in enumerate(essays, 1):
            essay_start = time.time()
            result = await self.analyze_essay(essay)
            if result:
                results.append(result)
            
            # Progress update with time estimates
            if i % 5 == 0 or i == 1 or i == len(essays):
                elapsed = time.time() - start_time
                avg_time_per_essay = elapsed / i
                remaining_essays = len(essays) - i
                estimated_remaining = avg_time_per_essay * remaining_essays
                
                progress_pct = (i / len(essays)) * 100
                logger.info(
                    f"Progress: {i}/{len(essays)} essays ({progress_pct:.1f}%) | "
                    f"Elapsed: {elapsed/60:.1f}min | "
                    f"ETA: {estimated_remaining/60:.1f}min | "
                    f"Avg: {avg_time_per_essay:.1f}s/essay"
                )
        
        total_time = time.time() - start_time
        logger.info(f"Completed {len(results)} analyses in {total_time/60:.1f} minutes ({total_time/len(results):.1f}s per essay)")
        
        return results
    
    def normalize_human_score(self, human_score: float, scale_range: tuple = (1.0, 6.0)) -> float:
        """Normalize human score (1-6 scale) to 0-100 scale"""
        min_score, max_score = scale_range
        # Normalize to 0-1 first, then scale to 0-100
        normalized = ((human_score - min_score) / (max_score - min_score)) * 100
        return normalized
    
    def calculate_correlation(self, human_scores: List[float], system_scores: List[float]) -> Dict[str, float]:
        """Calculate correlation metrics"""
        if len(human_scores) < 2:
            return {'pearson': 0.0, 'spearman': 0.0}
        
        try:
            pearson_corr, pearson_p = pearsonr(human_scores, system_scores)
            spearman_corr, spearman_p = spearmanr(human_scores, system_scores)
            
            return {
                'pearson': float(pearson_corr),
                'pearson_p_value': float(pearson_p),
                'spearman': float(spearman_corr),
                'spearman_p_value': float(spearman_p)
            }
        except Exception as e:
            logger.warning(f"Error calculating correlation: {e}")
            return {'pearson': 0.0, 'spearman': 0.0}
    
    def calculate_regression_metrics(self, human_scores: List[float], system_scores: List[float]) -> Dict[str, float]:
        """Calculate regression accuracy metrics"""
        if not human_scores or not system_scores:
            return {}
        
        human_arr = np.array(human_scores)
        system_arr = np.array(system_scores)
        
        # Mean Absolute Error (MAE)
        mae = float(np.mean(np.abs(human_arr - system_arr)))
        
        # Root Mean Squared Error (RMSE)
        rmse = float(np.sqrt(np.mean((human_arr - system_arr) ** 2)))
        
        # Mean Squared Error (MSE)
        mse = float(np.mean((human_arr - system_arr) ** 2))
        
        # R-squared (coefficient of determination)
        ss_res = np.sum((human_arr - system_arr) ** 2)
        ss_tot = np.sum((human_arr - np.mean(human_arr)) ** 2)
        r_squared = float(1 - (ss_res / ss_tot)) if ss_tot != 0 else 0.0
        
        # Mean Error (bias)
        mean_error = float(np.mean(system_arr - human_arr))
        
        return {
            'mae': mae,
            'rmse': rmse,
            'mse': mse,
            'r_squared': r_squared,
            'mean_error': mean_error
        }
    
    def calculate_statistics(self, results: List[Dict[str, Any]], dimension: str = 'overall') -> Dict[str, Any]:
        """Calculate comprehensive statistics for a dimension"""
        # Extract scores
        human_scores = []
        system_scores = []
        
        for result in results:
            human_score = result.get('human_score')
            system_score = result.get('system_scores', {}).get(dimension, 0.0)
            
            if human_score is not None and system_score is not None:
                # Normalize human score to 0-100 scale
                normalized_human = self.normalize_human_score(human_score)
                human_scores.append(normalized_human)
                system_scores.append(system_score)
        
        if not human_scores:
            return {}
        
        # Basic statistics
        human_arr = np.array(human_scores)
        system_arr = np.array(system_scores)
        
        stats = {
            'sample_size': len(human_scores),
            'human_scores': {
                'mean': float(np.mean(human_arr)),
                'std': float(np.std(human_arr)),
                'min': float(np.min(human_arr)),
                'max': float(np.max(human_arr)),
                'median': float(np.median(human_arr))
            },
            'system_scores': {
                'mean': float(np.mean(system_arr)),
                'std': float(np.std(system_arr)),
                'min': float(np.min(system_arr)),
                'max': float(np.max(system_arr)),
                'median': float(np.median(system_arr))
            }
        }
        
        # Correlation metrics
        correlation = self.calculate_correlation(human_scores, system_scores)
        stats['correlation'] = correlation
        
        # Regression metrics
        regression = self.calculate_regression_metrics(human_scores, system_scores)
        stats['regression_metrics'] = regression
        
        # Agreement categories (exact match, within 10 points, within 20 points)
        differences = np.abs(system_arr - human_arr)
        stats['agreement'] = {
            'exact_match': float(np.sum(differences < 1.0) / len(differences) * 100),
            'within_10': float(np.sum(differences <= 10.0) / len(differences) * 100),
            'within_20': float(np.sum(differences <= 20.0) / len(differences) * 100),
            'within_30': float(np.sum(differences <= 30.0) / len(differences) * 100)
        }
        
        return stats
    
    def generate_report(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate comprehensive evaluation report"""
        logger.info("Generating evaluation report...")
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_tested': len(results),
                'successful': len([r for r in results if r.get('success', False)]),
                'failed': len(self.errors)
            },
            'dimensions': {}
        }
        
        # Evaluate each dimension
        dimensions = ['grammar', 'readability', 'argument_strength', 'overall']
        
        for dimension in dimensions:
            logger.info(f"Calculating statistics for {dimension}...")
            stats = self.calculate_statistics(results, dimension)
            if stats:
                report['dimensions'][dimension] = stats
        
        # Include raw results (optional - can be large)
        report['results'] = results
        report['errors'] = self.errors
        
        return report
    
    def save_report(self, report: Dict[str, Any], output_path: str):
        """Save evaluation report to JSON file"""
        logger.info(f"Saving report to {output_path}")
        
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Report saved successfully")
    
    def print_summary(self, report: Dict[str, Any]):
        """Print a readable summary of the evaluation"""
        print("\n" + "="*80)
        print("MODEL ACCURACY EVALUATION SUMMARY")
        print("="*80)
        
        summary = report['summary']
        print(f"\nTotal Essays Tested: {summary['total_tested']}")
        print(f"Successful Analyses: {summary['successful']}")
        print(f"Failed Analyses: {summary['failed']}")
        
        print("\n" + "-"*80)
        print("DIMENSION-WISE STATISTICS")
        print("-"*80)
        
        for dimension, stats in report['dimensions'].items():
            print(f"\n{dimension.upper().replace('_', ' ')}:")
            print(f"  Sample Size: {stats['sample_size']}")
            
            if 'correlation' in stats:
                corr = stats['correlation']
                print(f"  Pearson Correlation: {corr['pearson']:.4f} (p={corr.get('pearson_p_value', 0):.4f})")
                print(f"  Spearman Correlation: {corr['spearman']:.4f} (p={corr.get('spearman_p_value', 0):.4f})")
            
            if 'regression_metrics' in stats:
                reg = stats['regression_metrics']
                print(f"  MAE (Mean Absolute Error): {reg['mae']:.2f}")
                print(f"  RMSE (Root Mean Squared Error): {reg['rmse']:.2f}")
                print(f"  R² (Coefficient of Determination): {reg['r_squared']:.4f}")
                print(f"  Mean Error (Bias): {reg['mean_error']:.2f}")
            
            if 'agreement' in stats:
                agree = stats['agreement']
                print(f"  Agreement Rates:")
                print(f"    Exact Match (±1 point): {agree['exact_match']:.1f}%")
                print(f"    Within 10 points: {agree['within_10']:.1f}%")
                print(f"    Within 20 points: {agree['within_20']:.1f}%")
                print(f"    Within 30 points: {agree['within_30']:.1f}%")
            
            if 'human_scores' in stats and 'system_scores' in stats:
                h = stats['human_scores']
                s = stats['system_scores']
                print(f"  Score Ranges:")
                print(f"    Human: {h['min']:.1f} - {h['max']:.1f} (mean: {h['mean']:.1f})")
                print(f"    System: {s['min']:.1f} - {s['max']:.1f} (mean: {s['mean']:.1f})")
        
        print("\n" + "="*80 + "\n")


async def main():
    parser = argparse.ArgumentParser(
        description='Evaluate model accuracy against human scores'
    )
    parser.add_argument(
        '--data',
        type=str,
        default='data/processed_persuade_full.json',
        help='Path to test data JSON file'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=100,
        help='Limit number of essays to test (default: 100, use --limit 0 for all essays)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='data/model_accuracy_results.json',
        help='Output path for evaluation results'
    )
    
    args = parser.parse_args()
    
    # Resolve paths relative to script directory
    script_dir = Path(__file__).parent
    data_path = script_dir / args.data
    output_path = script_dir / args.output
    
    if not data_path.exists():
        logger.error(f"Test data file not found: {data_path}")
        sys.exit(1)
    
    # Create evaluator
    evaluator = ModelAccuracyEvaluator()
    
    # Load test data
    limit = None if args.limit == 0 else args.limit
    if limit is None:
        logger.warning("⚠️  WARNING: Processing ALL essays without limit. This may take hours!")
        logger.warning("   Consider using --limit 100 for faster testing.")
        response = input("Continue? (yes/no): ").strip().lower()
        if response not in ['yes', 'y']:
            logger.info("Cancelled by user")
            sys.exit(0)
    
    essays = evaluator.load_test_data(str(data_path), limit=limit)
    
    if not essays:
        logger.error("No essays with human scores found in test data")
        sys.exit(1)
    
    logger.info(f"Will process {len(essays)} essays")
    
    # Evaluate essays
    logger.info(f"Starting evaluation of {len(essays)} essays...")
    results = await evaluator.evaluate_batch(essays)
    
    if not results:
        logger.error("No successful analyses. Check errors and try again.")
        sys.exit(1)
    
    # Generate report
    report = evaluator.generate_report(results)
    
    # Save report
    evaluator.save_report(report, str(output_path))
    
    # Print summary
    evaluator.print_summary(report)
    
    logger.info("Evaluation complete!")


if __name__ == '__main__':
    asyncio.run(main())

