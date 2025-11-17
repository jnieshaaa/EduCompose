"""
Analysis Pipeline for Full Persuade 2.0 Dataset
Processes all essays and generates comprehensive analysis results
"""
import sys
import json
import asyncio
import logging
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import pandas as pd
import numpy as np

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.essay_analysis_service import essay_analysis_service
from app.services.report_generator import TeacherReportGenerator

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('analysis_pipeline.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class AnalysisPipeline:
    """Pipeline for analyzing essays from processed dataset"""
    
    def __init__(self, input_file: str, output_dir: str = "data/analysis_results"):
        """
        Initialize analysis pipeline
        
        Args:
            input_file: Path to processed_persuade_full.json
            output_dir: Directory to save analysis results
        """
        self.input_file = Path(input_file)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.essays = []
        self.results = []
        self.statistics = {}
    
    def load_essays(self) -> List[Dict[str, Any]]:
        """Load essays from processed JSON file"""
        logger.info(f"Loading essays from {self.input_file}...")
        
        with open(self.input_file, 'r', encoding='utf-8') as f:
            self.essays = json.load(f)
        
        logger.info(f"✓ Loaded {len(self.essays):,} essays")
        return self.essays
    
    async def analyze_essay(self, essay: Dict[str, Any], 
                           analysis_type: str = "comprehensive") -> Optional[Dict[str, Any]]:
        """
        Analyze a single essay
        
        Args:
            essay: Essay data dictionary
            analysis_type: Type of analysis to perform
            
        Returns:
            Analysis results or None if error
        """
        try:
            results = await essay_analysis_service.analyze_text(
                text=essay['text'],
                title=essay.get('id', 'Untitled'),
                analysis_type=analysis_type
            )
            
            return {
                "essay_id": essay['id'],
                "human_score": essay.get('metadata', {}).get('human_score'),
                "word_count": essay.get('metadata', {}).get('word_count', 0),
                "analysis": results,
                "timestamp": datetime.now().isoformat(),
                "success": True
            }
        except Exception as e:
            logger.error(f"Error analyzing essay {essay.get('id')}: {e}")
            return {
                "essay_id": essay.get('id'),
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def run_pipeline(self, 
                          limit: Optional[int] = None,
                          batch_size: int = 50,
                          analysis_type: str = "comprehensive",
                          save_intermediate: bool = True) -> Dict[str, Any]:
        """
        Run the full analysis pipeline
        
        Args:
            limit: Limit number of essays to process (None for all)
            batch_size: Process essays in batches
            analysis_type: Type of analysis
            save_intermediate: Save results after each batch
            
        Returns:
            Pipeline results summary
        """
        if not self.essays:
            self.load_essays()
        
        essays_to_process = self.essays[:limit] if limit else self.essays
        total = len(essays_to_process)
        
        logger.info("=" * 60)
        logger.info("Starting Analysis Pipeline")
        logger.info("=" * 60)
        logger.info(f"Total essays to process: {total:,}")
        logger.info(f"Batch size: {batch_size}")
        logger.info(f"Analysis type: {analysis_type}")
        logger.info("")
        
        # Process in batches
        all_results = []
        successful = 0
        failed = 0
        
        for batch_start in range(0, total, batch_size):
            batch_end = min(batch_start + batch_size, total)
            batch = essays_to_process[batch_start:batch_end]
            batch_num = (batch_start // batch_size) + 1
            total_batches = (total + batch_size - 1) // batch_size
            
            logger.info(f"Processing batch {batch_num}/{total_batches} "
                       f"(essays {batch_start+1}-{batch_end} of {total})...")
            
            # Analyze batch
            batch_results = []
            for essay in batch:
                result = await self.analyze_essay(essay, analysis_type)
                if result:
                    batch_results.append(result)
                    if result.get('success'):
                        successful += 1
                    else:
                        failed += 1
            
            all_results.extend(batch_results)
            
            # Save intermediate results
            if save_intermediate:
                self._save_batch_results(batch_results, batch_num)
            
            # Progress update
            progress = (batch_end / total) * 100
            logger.info(f"  Progress: {batch_end}/{total} ({progress:.1f}%) - "
                       f"Success: {successful}, Failed: {failed}")
        
        self.results = all_results
        
        # Generate statistics
        logger.info("\nGenerating statistics...")
        statistics = self._generate_statistics(all_results)
        self.statistics = statistics
        
        # Save final results
        self._save_results(all_results, statistics)
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ Pipeline Complete!")
        logger.info("=" * 60)
        logger.info(f"  Processed: {total:,} essays")
        logger.info(f"  Successful: {successful:,}")
        logger.info(f"  Failed: {failed:,}")
        logger.info(f"  Success rate: {(successful/total*100):.1f}%")
        
        return {
            "total": total,
            "successful": successful,
            "failed": failed,
            "statistics": statistics
        }
    
    def _save_batch_results(self, batch_results: List[Dict], batch_num: int):
        """Save intermediate batch results"""
        batch_file = self.output_dir / f"batch_{batch_num}_results.json"
        with open(batch_file, 'w', encoding='utf-8') as f:
            json.dump(batch_results, f, indent=2, ensure_ascii=False)
    
    def _save_results(self, results: List[Dict], statistics: Dict):
        """Save final results and statistics"""
        # Save all results
        results_file = self.output_dir / "all_analysis_results.json"
        logger.info(f"Saving results to {results_file}...")
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        # Save statistics
        stats_file = self.output_dir / "analysis_statistics.json"
        logger.info(f"Saving statistics to {stats_file}...")
        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(statistics, f, indent=2, ensure_ascii=False)
        
        # Save summary CSV
        self._save_summary_csv(results)
        
        # Save sample reports
        self._save_sample_reports(results)
    
    def _save_summary_csv(self, results: List[Dict]):
        """Save summary as CSV for easy analysis"""
        summary_data = []
        
        for result in results:
            if not result.get('success'):
                continue
            
            essay_id = result.get('essay_id')
            human_score = result.get('human_score')
            analysis = result.get('analysis', {})
            scores = analysis.get('scores', {})
            
            summary_data.append({
                'essay_id': essay_id,
                'human_score': human_score,
                'system_overall': scores.get('overall', 0),
                'grammar': scores.get('grammar', 0),
                'readability': scores.get('readability', 0),
                'coherence': scores.get('coherence', 0),
                'argument_strength': scores.get('argument_strength', 0),
                'knowledge_graph': scores.get('knowledge_graph', 0),
                'word_count': result.get('word_count', 0)
            })
        
        if summary_data:
            df = pd.DataFrame(summary_data)
            csv_file = self.output_dir / "analysis_summary.csv"
            df.to_csv(csv_file, index=False)
            logger.info(f"✓ Summary CSV saved to {csv_file}")
    
    def _save_sample_reports(self, results: List[Dict], num_samples: int = 5):
        """Save sample teacher reports"""
        generator = TeacherReportGenerator()
        successful_results = [r for r in results if r.get('success')]
        
        samples = successful_results[:num_samples]
        
        for i, result in enumerate(samples, 1):
            analysis = result.get('analysis', {})
            report = generator.generate_report(analysis)
            
            # Save JSON report
            report_file = self.output_dir / f"sample_report_{i}_{result.get('essay_id')}.json"
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            # Save plain text report
            text_report = generator.generate_plain_text_report(report)
            text_file = self.output_dir / f"sample_report_{i}_{result.get('essay_id')}.txt"
            with open(text_file, 'w', encoding='utf-8') as f:
                f.write(text_report)
        
        logger.info(f"✓ Saved {len(samples)} sample reports")
    
    def _generate_statistics(self, results: List[Dict]) -> Dict[str, Any]:
        """Generate comprehensive statistics from results"""
        successful = [r for r in results if r.get('success', False)]
        failed = [r for r in results if not r.get('success', False)]
        
        stats = {
            "total_processed": len(results),
            "successful": len(successful),
            "failed": len(failed),
            "success_rate": len(successful) / len(results) * 100 if results else 0,
            "timestamp": datetime.now().isoformat()
        }
        
        if successful:
            # Extract scores
            system_scores = {
                'overall': [],
                'grammar': [],
                'readability': [],
                'coherence': [],
                'argument_strength': [],
                'knowledge_graph': []
            }
            
            human_scores = []
            paired_scores = []
            
            for result in successful:
                analysis = result.get('analysis', {})
                scores = analysis.get('scores', {})
                
                for key in system_scores.keys():
                    if key in scores:
                        system_scores[key].append(scores[key])
                
                human_score = result.get('human_score')
                if human_score is not None:
                    human_scores.append(human_score)
                    if 'overall' in scores:
                        paired_scores.append((human_score, scores['overall']))
            
            # Calculate statistics for each dimension
            stats['system_scores'] = {}
            for key, values in system_scores.items():
                if values:
                    stats['system_scores'][key] = {
                        'mean': float(np.mean(values)),
                        'median': float(np.median(values)),
                        'std': float(np.std(values)),
                        'min': float(np.min(values)),
                        'max': float(np.max(values)),
                        'count': len(values)
                    }
            
            # Human score statistics
            if human_scores:
                stats['human_scores'] = {
                    'mean': float(np.mean(human_scores)),
                    'median': float(np.median(human_scores)),
                    'std': float(np.std(human_scores)),
                    'min': float(np.min(human_scores)),
                    'max': float(np.max(human_scores)),
                    'count': len(human_scores)
                }
            
            # Correlation analysis
            if len(paired_scores) > 1:
                human_vals = [h for h, s in paired_scores]
                system_vals = [s for h, s in paired_scores]
                
                try:
                    from scipy.stats import pearsonr, spearmanr
                    pearson_corr, pearson_p = pearsonr(human_vals, system_vals)
                    spearman_corr, spearman_p = spearmanr(human_vals, system_vals)
                    
                    stats['correlation'] = {
                        'pearson': {
                            'correlation': float(pearson_corr),
                            'p_value': float(pearson_p)
                        },
                        'spearman': {
                            'correlation': float(spearman_corr),
                            'p_value': float(spearman_p)
                        },
                        'paired_count': len(paired_scores)
                    }
                except ImportError:
                    # Fallback if scipy not available
                    correlation = np.corrcoef(human_vals, system_vals)[0, 1]
                    stats['correlation'] = {
                        'pearson': {
                            'correlation': float(correlation),
                            'p_value': None
                        },
                        'paired_count': len(paired_scores)
                    }
            
            # KG metrics statistics
            kg_metrics_list = []
            for result in successful:
                analysis = result.get('analysis', {})
                kg = analysis.get('detailed_analysis', {}).get('knowledge_graph', {})
                metrics = kg.get('metrics', {})
                if metrics:
                    kg_metrics_list.append(metrics)
            
            if kg_metrics_list:
                stats['kg_metrics'] = self._aggregate_kg_metrics(kg_metrics_list)
        
        if failed:
            stats['errors'] = {
                'count': len(failed),
                'sample_errors': [r.get('error', 'Unknown') for r in failed[:10]]
            }
        
        return stats
    
    def _aggregate_kg_metrics(self, kg_metrics_list: List[Dict]) -> Dict[str, Any]:
        """Aggregate KG metrics across all essays"""
        aggregated = {}
        
        # Concept coherence
        coherence_scores = [
            m.get('concept_coherence', {}).get('score', 0)
            for m in kg_metrics_list
            if 'concept_coherence' in m
        ]
        if coherence_scores:
            aggregated['concept_coherence'] = {
                'mean': float(np.mean(coherence_scores)),
                'std': float(np.std(coherence_scores)),
                'count': len(coherence_scores)
            }
        
        # Argument strength
        arg_strength_scores = [
            m.get('argument_strength', {}).get('overall_score', 0)
            for m in kg_metrics_list
            if 'argument_strength' in m
        ]
        if arg_strength_scores:
            aggregated['argument_strength'] = {
                'mean': float(np.mean(arg_strength_scores)),
                'std': float(np.std(arg_strength_scores)),
                'count': len(arg_strength_scores)
            }
        
        # Structure completeness
        completeness_scores = [
            m.get('structure_completeness', {}).get('completeness_score', 0)
            for m in kg_metrics_list
            if 'structure_completeness' in m
        ]
        if completeness_scores:
            aggregated['structure_completeness'] = {
                'mean': float(np.mean(completeness_scores)),
                'std': float(np.std(completeness_scores)),
                'count': len(completeness_scores)
            }
        
        return aggregated


def main():
    parser = argparse.ArgumentParser(
        description='Analysis Pipeline for Persuade 2.0 Dataset',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process all essays
  python scripts/analysis_pipeline.py data/processed_persuade_full.json
  
  # Process first 1000 essays
  python scripts/analysis_pipeline.py data/processed_persuade_full.json --limit 1000
  
  # Process with smaller batches
  python scripts/analysis_pipeline.py data/processed_persuade_full.json --batch-size 25
        """
    )
    
    parser.add_argument('input_file', type=str,
                       help='Path to processed_persuade_full.json')
    parser.add_argument('--output-dir', type=str, default='data/analysis_results',
                       help='Output directory for results (default: data/analysis_results)')
    parser.add_argument('--limit', type=int, default=None,
                       help='Limit number of essays to process (default: all)')
    parser.add_argument('--batch-size', type=int, default=50,
                       help='Process essays in batches (default: 50)')
    parser.add_argument('--analysis-type', type=str, default='comprehensive',
                       choices=['grammar', 'readability', 'coherence', 'argument', 'comprehensive'],
                       help='Type of analysis (default: comprehensive)')
    parser.add_argument('--no-intermediate', action='store_true',
                       help='Do not save intermediate batch results')
    
    args = parser.parse_args()
    
    # Initialize pipeline
    pipeline = AnalysisPipeline(args.input_file, args.output_dir)
    
    # Run pipeline
    try:
        summary = asyncio.run(pipeline.run_pipeline(
            limit=args.limit,
            batch_size=args.batch_size,
            analysis_type=args.analysis_type,
            save_intermediate=not args.no_intermediate
        ))
        
        # Print summary
        print("\n" + "=" * 60)
        print("Pipeline Summary")
        print("=" * 60)
        print(f"Total processed: {summary['total']:,}")
        print(f"Successful: {summary['successful']:,}")
        print(f"Failed: {summary['failed']:,}")
        print(f"Success rate: {(summary['successful']/summary['total']*100):.1f}%")
        
        if 'correlation' in summary['statistics']:
            corr = summary['statistics']['correlation']
            if 'pearson' in corr:
                print(f"\nCorrelation with human scores:")
                print(f"  Pearson: {corr['pearson']['correlation']:.3f}")
                if 'spearman' in corr:
                    print(f"  Spearman: {corr['spearman']['correlation']:.3f}")
        
        print(f"\nResults saved to: {args.output_dir}")
        print("  - all_analysis_results.json (all results)")
        print("  - analysis_statistics.json (statistics)")
        print("  - analysis_summary.csv (summary table)")
        print("  - sample_report_*.json/txt (sample reports)")
        
    except KeyboardInterrupt:
        logger.warning("\nPipeline interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

