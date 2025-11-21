"""
Build Knowledge Graph and Export for Neo4j Dashboard Import
Since Python connection doesn't work yet, we'll build KG and export to JSON
Then import via Neo4j dashboard
"""
import sys
from pathlib import Path
import json
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder

def build_kg_for_neo4j(text: str, essay_id: str, output_dir: str = "neo4j_exports"):
    """
    Build knowledge graph and export in Neo4j-compatible format
    
    Args:
        text: Essay text to process
        essay_id: Unique essay identifier
        output_dir: Directory to save exports
    """
    print("=" * 70)
    print(f"Building Knowledge Graph for Essay: {essay_id}")
    print("=" * 70)
    print()
    
    # Build knowledge graph
    print("Step 1: Building knowledge graph...")
    builder = EnhancedKnowledgeGraphBuilder()
    kg_result = builder.build(text=text, essay_id=essay_id)
    
    print(f"   ✅ Built graph:")
    print(f"      Nodes: {kg_result['graph_structure']['nodes']}")
    print(f"      Edges: {kg_result['graph_structure']['edges']}")
    print()
    
    # Create output directory
    output_path = Path(__file__).parent.parent / output_dir
    output_path.mkdir(exist_ok=True)
    
    # Export 1: JSON format (for Neo4j import)
    print("Step 2: Exporting to Neo4j-compatible JSON...")
    json_file = output_path / f"{essay_id}_kg.json"
    
    neo4j_data = {
        "nodes": [],
        "relationships": []
    }
    
    # Convert nodes
    graph = kg_result['graph']
    for node_id, node_data in graph.nodes(data=True):
        node_obj = {
            "id": str(node_id),
            "labels": [node_data.get('type', 'KGNode')],
            "properties": {k: v for k, v in node_data.items() if k != 'type'}
        }
        neo4j_data["nodes"].append(node_obj)
    
    # Convert relationships
    for source, target, edge_data in graph.edges(data=True):
        rel_obj = {
            "startNode": str(source),
            "endNode": str(target),
            "type": edge_data.get('type', 'RELATED_TO'),
            "properties": {k: v for k, v in edge_data.items() if k != 'type'}
        }
        neo4j_data["relationships"].append(rel_obj)
    
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(neo4j_data, f, indent=2, ensure_ascii=False)
    
    print(f"   ✅ Exported to: {json_file}")
    print(f"      Nodes: {len(neo4j_data['nodes'])}")
    print(f"      Relationships: {len(neo4j_data['relationships'])}")
    print()
    
    # Export 2: Cypher statements (for direct execution in Query)
    print("Step 3: Generating Cypher statements...")
    cypher_file = output_path / f"{essay_id}_kg.cypher"
    
    cypher_statements = []
    cypher_statements.append(f"// Knowledge Graph for Essay: {essay_id}")
    cypher_statements.append(f"// Generated: {datetime.now().isoformat()}")
    cypher_statements.append("")
    
    # Create nodes
    for node in neo4j_data["nodes"]:
        labels = ":".join(node["labels"])
        # Format properties with actual values (flatten nested objects)
        props_list = []
        props_list.append(f"id: \"{node['id']}\"")
        for k, v in node["properties"].items():
            # Skip nested dictionaries/maps (Neo4j doesn't allow MAP types as properties)
            if isinstance(v, dict):
                # Flatten nested dicts into JSON string or skip
                if len(v) == 0:
                    continue  # Skip empty dicts
                # Convert nested dict to JSON string
                props_list.append(f"{k}: \"{json.dumps(v).replace('"', '\\"')}\"")
            elif isinstance(v, list):
                # Convert lists to JSON string if they contain complex types
                if len(v) > 0 and isinstance(v[0], (dict, list)):
                    props_list.append(f"{k}: \"{json.dumps(v).replace('"', '\\"')}\"")
                else:
                    # Simple list can be represented as array
                    props_list.append(f"{k}: {json.dumps(v)}")
            elif isinstance(v, str):
                # Escape quotes in strings
                v_escaped = v.replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
                props_list.append(f"{k}: \"{v_escaped}\"")
            elif isinstance(v, bool):
                props_list.append(f"{k}: {str(v).lower()}")
            elif v is None:
                props_list.append(f"{k}: null")
            else:
                props_list.append(f"{k}: {json.dumps(v)}")
        
        props_str = ", ".join(props_list)
        cypher_statements.append(f"CREATE (n:{labels} {{{props_str}}});")
    
    cypher_statements.append("")
    
    # Create relationships
    for rel in neo4j_data["relationships"]:
        rel_type = rel["type"]
        
        # Format relationship properties (flatten nested objects)
        props_list = []
        for k, v in rel["properties"].items():
            # Skip nested dictionaries/maps
            if isinstance(v, dict):
                if len(v) == 0:
                    continue  # Skip empty dicts
                # Convert nested dict to JSON string
                props_list.append(f"{k}: \"{json.dumps(v).replace('"', '\\"')}\"")
            elif isinstance(v, list):
                if len(v) > 0 and isinstance(v[0], (dict, list)):
                    props_list.append(f"{k}: \"{json.dumps(v).replace('"', '\\"')}\"")
                else:
                    props_list.append(f"{k}: {json.dumps(v)}")
            elif isinstance(v, str):
                v_escaped = v.replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
                props_list.append(f"{k}: \"{v_escaped}\"")
            elif isinstance(v, bool):
                props_list.append(f"{k}: {str(v).lower()}")
            elif v is None:
                props_list.append(f"{k}: null")
            else:
                props_list.append(f"{k}: {json.dumps(v)}")
        
        props_str = ", ".join(props_list)
        
        if props_str:
            cypher_statements.append(
                f"MATCH (a {{id: \"{rel['startNode']}\"}}), (b {{id: \"{rel['endNode']}\"}}) "
                f"CREATE (a)-[r:{rel_type} {{{props_str}}}]->(b);"
            )
        else:
            cypher_statements.append(
                f"MATCH (a {{id: \"{rel['startNode']}\"}}), (b {{id: \"{rel['endNode']}\"}}) "
                f"CREATE (a)-[r:{rel_type}]->(b);"
            )
    
    with open(cypher_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(cypher_statements))
    
    print(f"   ✅ Cypher file created: {cypher_file}")
    print(f"      Statements: {len(cypher_statements)}")
    print()
    
    # Export 3: Summary report
    print("Step 4: Creating summary report...")
    report_file = output_path / f"{essay_id}_summary.md"
    
    report = f"""# Knowledge Graph Summary: {essay_id}

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Graph Statistics

- **Total Nodes:** {kg_result['graph_structure']['nodes']}
- **Total Edges:** {kg_result['graph_structure']['edges']}
- **Concepts Found:** {len(kg_result.get('concepts', []))}
- **Triples Extracted:** {len(kg_result.get('triples', []))}

## Node Types

"""
    
    from collections import Counter
    node_types = Counter([n.get('type', 'Unknown') for n in kg_result.get('nodes', [])])
    for node_type, count in node_types.items():
        report += f"- **{node_type}:** {count}\n"
    
    report += f"""
## Files Generated

1. **JSON Export:** `{essay_id}_kg.json`
   - Use with Neo4j Import tool
   - Contains nodes and relationships in Neo4j format

2. **Cypher Script:** `{essay_id}_kg.cypher`
   - Copy and paste into Neo4j Query interface
   - Execute directly in dashboard

3. **Summary:** `{essay_id}_summary.md` (this file)

## Next Steps

1. Open Neo4j Aura Dashboard
2. Go to "Query" section
3. Copy content from `{essay_id}_kg.cypher`
4. Paste and execute in Query interface
5. Check results in "Explore" section

## Sample Queries

After importing, try these queries in Query interface:

### Count nodes
```cypher
MATCH (n)
RETURN count(n) as node_count
```

### View all nodes
```cypher
MATCH (n)
RETURN n
LIMIT 25
```

### View relationships
```cypher
MATCH (n)-[r]->(m)
RETURN n, r, m
LIMIT 25
```

### Find claims
```cypher
MATCH (n:Claim)
RETURN n
LIMIT 10
```

### Find claim-evidence relationships
```cypher
MATCH (c:Claim)-[r:SUPPORTS]-(e:Evidence)
RETURN c, r, e
LIMIT 10
```
"""
    
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"   ✅ Summary report: {report_file}")
    print()
    
    print("=" * 70)
    print("✅ Export Complete!")
    print("=" * 70)
    print()
    print("Files created:")
    print(f"  1. {json_file}")
    print(f"  2. {cypher_file}")
    print(f"  3. {report_file}")
    print()
    print("Next steps:")
    print("  1. Open Neo4j Aura Dashboard")
    print("  2. Go to 'Query' section")
    print("  3. Open the .cypher file and copy its contents")
    print("  4. Paste into Query interface and click 'Run'")
    print("  5. Go to 'Explore' to visualize the graph!")
    print()
    
    return {
        "json_file": str(json_file),
        "cypher_file": str(cypher_file),
        "report_file": str(report_file),
        "nodes": len(neo4j_data["nodes"]),
        "relationships": len(neo4j_data["relationships"])
    }


if __name__ == "__main__":
    # Example usage
    sample_essay = """
    Renewable energy is essential for combating climate change. 
    Solar panels convert sunlight into electricity without emitting greenhouse gases. 
    Wind turbines harness wind power to generate clean energy. 
    These technologies reduce our dependence on fossil fuels and help protect our environment.
    
    Research shows that renewable energy sources are becoming more cost-effective. 
    According to studies, solar energy costs have decreased by 80% over the past decade.
    This makes renewable energy an attractive alternative to traditional energy sources.
    """
    
    result = build_kg_for_neo4j(
        text=sample_essay,
        essay_id="test_essay_001"
    )
    
    print(f"\n✅ Ready to import! Check files in: neo4j_exports/")

