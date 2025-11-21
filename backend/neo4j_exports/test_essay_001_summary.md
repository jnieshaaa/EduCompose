# Knowledge Graph Summary: test_essay_001

Generated: 2025-11-21 10:47:36

## Graph Statistics

- **Total Nodes:** 1
- **Total Edges:** 0
- **Concepts Found:** 0
- **Triples Extracted:** 0

## Node Types

- **Essay:** 1

## Files Generated

1. **JSON Export:** `test_essay_001_kg.json`
   - Use with Neo4j Import tool
   - Contains nodes and relationships in Neo4j format

2. **Cypher Script:** `test_essay_001_kg.cypher`
   - Copy and paste into Neo4j Query interface
   - Execute directly in dashboard

3. **Summary:** `test_essay_001_summary.md` (this file)

## Next Steps

1. Open Neo4j Aura Dashboard
2. Go to "Query" section
3. Copy content from `test_essay_001_kg.cypher`
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
