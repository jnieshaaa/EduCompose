"""
Quick test script to export one essay to Neo4j Aura
Tests the full pipeline: build KG → export to Neo4j
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder

def test_export():
    """Test exporting an essay to Neo4j"""
    
    print("=" * 60)
    print("Testing Knowledge Graph Export to Neo4j")
    print("=" * 60)
    print()
    
    # Sample essay text
    essay_text = """
    Renewable energy is essential for combating climate change. 
    Solar panels convert sunlight into electricity without emitting greenhouse gases. 
    Wind turbines harness wind power to generate clean energy. 
    These technologies reduce our dependence on fossil fuels and help protect our environment.
    
    Research shows that renewable energy sources are becoming more cost-effective. 
    According to studies, solar energy costs have decreased by 80% over the past decade.
    This makes renewable energy an attractive alternative to traditional energy sources.
    """
    
    print("Step 1: Building knowledge graph...")
    builder = EnhancedKnowledgeGraphBuilder()
    kg_result = builder.build(
        text=essay_text,
        essay_id="test_essay_001"
    )
    
    print(f"   ✅ Built graph:")
    print(f"      Nodes: {kg_result['graph_structure']['nodes']}")
    print(f"      Edges: {kg_result['graph_structure']['edges']}")
    print()
    
    # Show what we extracted
    print("Step 2: Extracted components:")
    print(f"   Concepts: {len(kg_result['concepts'])}")
    print(f"   Triples: {len(kg_result['triples'])}")
    print()
    
    if kg_result['nodes']:
        print("   Node types:")
        from collections import Counter
        node_types = Counter([n.get('type', 'unknown') for n in kg_result['nodes']])
        for node_type, count in node_types.items():
            print(f"      {node_type}: {count}")
    print()
    
    print("Step 3: Exporting to Neo4j Aura...")
    try:
        export_stats = builder.export_to_neo4j(kg_result)
        
        if export_stats.get('status') == 'success':
            print(f"   ✅ Successfully exported to Neo4j!")
            print(f"      Nodes created: {export_stats['nodes_created']}")
            print(f"      Edges created: {export_stats['edges_created']}")
            print()
            print("Step 4: Verify in Neo4j Dashboard:")
            print("   1. Go to https://console.neo4j.io/")
            print("   2. Click 'Query' in left sidebar")
            print("   3. Run: MATCH (n) RETURN count(n) as nodes")
            print("   4. Run: MATCH (n:KGNode) RETURN n LIMIT 10")
        else:
            print(f"   ❌ Export failed:")
            print(f"      Status: {export_stats.get('status')}")
            print(f"      Error: {export_stats.get('error', 'Unknown error')}")
            print()
            if export_stats.get('status') == 'unavailable':
                print("   Solution: Run connection test first:")
                print("      python scripts/test_neo4j_connection.py")
    except Exception as e:
        print(f"   ❌ Export failed with error: {e}")
        print()
        print("   Troubleshooting:")
        print("   1. Test connection first: python scripts/test_neo4j_connection.py")
        print("   2. Check .env file has correct NEO4J credentials")
        print("   3. Ensure instance is running in Aura dashboard")
    
    print()
    print("=" * 60)

if __name__ == "__main__":
    test_export()

