"""
Quick Test Script - Test with 1-5 essays from processed_persuade.json
Simple script for quick testing
"""
import sys
import json
import asyncio
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.essay_analysis_service import essay_analysis_service
from app.services.report_generator import TeacherReportGenerator


async def quick_test(num_essays: int = 3):
    """Quick test with a few essays"""
    
    # Load essays
    print(f"Loading essays from processed_persuade.json...")
    with open('data/processed_persuade.json', 'r', encoding='utf-8') as f:
        essays = json.load(f)
    
    print(f"✓ Loaded {len(essays)} essays")
    print(f"Testing first {num_essays} essays...\n")
    
    for i, essay in enumerate(essays[:num_essays], 1):
        print("=" * 60)
        print(f"Essay {i}/{num_essays}: {essay['id']}")
        print("=" * 60)
        print(f"Human Score: {essay['metadata'].get('human_score', 'N/A')}")
        print(f"Word Count: {essay['metadata'].get('word_count', 0)}")
        print(f"\nText Preview: {essay['text'][:200]}...\n")
        
        # Analyze
        print("Running analysis...")
        try:
            results = await essay_analysis_service.analyze_text(
                text=essay['text'],
                title=essay['id'],
                analysis_type="comprehensive"
            )
            
            # Show scores
            scores = results.get('scores', {})
            print(f"\nSystem Scores:")
            print(f"  Overall: {scores.get('overall', 0):.1f}/100")
            print(f"  Grammar: {scores.get('grammar', 0):.1f}/100")
            print(f"  Readability: {scores.get('readability', 0):.1f}/100")
            print(f"  Coherence: {scores.get('coherence', 0):.1f}/100")
            print(f"  Argument Strength: {scores.get('argument_strength', 0):.1f}/100")
            print(f"  Knowledge Graph: {scores.get('knowledge_graph', 0):.1f}/100")
            
            # Show KG metrics if available
            kg_metrics = results.get('detailed_analysis', {}).get('knowledge_graph', {}).get('metrics', {})
            if kg_metrics:
                print(f"\nKG Metrics:")
                if 'concept_coherence' in kg_metrics:
                    print(f"  Concept Coherence: {kg_metrics['concept_coherence'].get('score', 0):.1f}")
                if 'argument_strength' in kg_metrics:
                    print(f"  Argument Strength: {kg_metrics['argument_strength'].get('overall_score', 0):.1f}")
            
            # Generate report
            generator = TeacherReportGenerator()
            report = generator.generate_report(results)
            
            print(f"\nTop Recommendations:")
            for rec in report.get('recommendations', [])[:3]:
                print(f"  [{rec.get('priority', 'medium').upper()}] {rec.get('message', '')}")
            
            print("\n" + "-" * 60)
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            print("\n" + "-" * 60)
    
    print("\n✅ Quick test complete!")


if __name__ == "__main__":
    import sys
    num = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    asyncio.run(quick_test(num))

