# External Knowledge Graph Enrichment

## Overview

The knowledge graph enrichment system adds semantic and lexical relationships from external knowledge bases (ConceptNet and WordNet) to improve the understanding of concepts in student essays.

## What is Enrichment?

**Enrichment** means adding new relationships and nodes to the knowledge graph based on external knowledge sources:

- **ConceptNet**: Commonsense knowledge about how concepts relate (e.g., "solar energy" IsA "renewable energy")
- **WordNet**: Lexical relationships like synonyms, hypernyms, hyponyms (e.g., "car" is a hyponym of "vehicle")

## Benefits

1. **Better Concept Understanding**: Connect essay concepts to broader knowledge
2. **Improved Coherence Analysis**: More relationships = better coherence measurement
3. **Enhanced Visualization**: Richer graphs show more connections
4. **Pattern Recognition**: External knowledge helps validate concept relationships

## How It Works

### 1. ConceptNet Enrichment

**What it does:**
- Fetches semantic relationships from ConceptNet API (http://api.conceptnet.io)
- Adds relationships like IsA, UsedFor, RelatedTo, PartOf, Causes, etc.

**Example:**
```
Essay concept: "renewable energy"
ConceptNet adds:
  - IsA → "energy source"
  - RelatedTo → "solar power"
  - UsedFor → "electricity generation"
```

**Relationships fetched:**
- `IsA` - Type relationships
- `UsedFor` - Purpose relationships
- `RelatedTo` - General relatedness
- `PartOf` - Part-whole relationships
- `Causes` - Causal relationships
- `HasProperty` - Property relationships
- `CapableOf` - Capability relationships
- `LocatedNear` - Spatial relationships
- `AtLocation` - Location relationships
- `Synonym` - Synonym relationships

### 2. WordNet Enrichment

**What it does:**
- Uses NLTK WordNet to find lexical relationships
- Adds synonyms, hypernyms, hyponyms, meronyms, holonyms

**Example:**
```
Essay concept: "automobile"
WordNet adds:
  - SYNONYM → "car", "vehicle"
  - HYPERNYM → "motor vehicle"
  - HYPONYM → "sedan", "truck"
  - MERONYM → "engine", "wheel"
```

**Relationships added:**
- `SYNONYM` - Words with similar meaning
- `HYPERNYM` - More general concepts (e.g., "dog" → "animal")
- `HYPONYM` - More specific concepts (e.g., "animal" → "dog")
- `MERONYM` - Part-of relationships (e.g., "wheel" is part of "car")
- `HOLONYM` - Whole-of relationships (e.g., "car" contains "wheel")

## Usage

### Automatic Enrichment (Default)

Enrichment is **enabled by default** when building knowledge graphs:

```python
from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder

builder = EnhancedKnowledgeGraphBuilder()
kg_result = builder.build(
    text="Your essay text...",
    essay_id="essay_123",
    enable_enrichment=True  # Default: True
)

# Check enrichment statistics
enrichment_stats = kg_result.get("enrichment", {})
print(f"ConceptNet: {enrichment_stats.get('conceptnet', {})}")
print(f"WordNet: {enrichment_stats.get('wordnet', {})}")
```

### Disable Enrichment

To disable enrichment (faster, but less comprehensive):

```python
kg_result = builder.build(
    text="Your essay text...",
    essay_id="essay_123",
    enable_enrichment=False  # Disable enrichment
)
```

### Configure Enrichers

You can configure enrichers when creating the builder:

```python
from app.nlp_modules.conceptnet_enricher import ConceptNetEnricher
from app.nlp_modules.wordnet_enricher import WordNetEnricher

# Create custom enrichers
conceptnet = ConceptNetEnricher(
    max_edges_per_concept=10,  # More edges per concept
    min_weight=0.3,             # Lower weight threshold
    rate_limit_delay=0.2        # Slower API calls
)

wordnet = WordNetEnricher(
    max_synonyms=5,             # More synonyms
    max_hypernyms=3,             # More hypernyms
    include_meronyms=True        # Include part-whole relationships
)

# Use in builder (requires modifying builder initialization)
```

### Standalone Usage

You can also use enrichers directly:

```python
from app.nlp_modules.conceptnet_enricher import ConceptNetEnricher
from app.nlp_modules.wordnet_enricher import WordNetEnricher

# ConceptNet
cn_enricher = ConceptNetEnricher()
if cn_enricher.is_available():
    edges = cn_enricher.enrich_concept("renewable energy")
    print(f"Found {len(edges)} ConceptNet relationships")

# WordNet
wn_enricher = WordNetEnricher()
if wn_enricher.is_available():
    edges = wn_enricher.enrich_concept("automobile")
    print(f"Found {len(edges)} WordNet relationships")
```

## Enrichment Statistics

The `build()` method returns enrichment statistics:

```python
kg_result = builder.build(text="...", essay_id="...")

enrichment = kg_result.get("enrichment", {})
# {
#     "conceptnet": {
#         "status": "success",
#         "edges_added": 15,
#         "nodes_added": 8,
#         "concepts_enriched": 5
#     },
#     "wordnet": {
#         "status": "success",
#         "edges_added": 12,
#         "nodes_added": 6,
#         "concepts_enriched": 5
#     }
# }
```

## Requirements

### ConceptNet
- **Library**: `httpx` (already in requirements.txt)
- **API**: Free, no API key required
- **Internet**: Requires internet connection
- **Rate Limiting**: Built-in rate limiting (0.1s delay between calls)

### WordNet
- **Library**: `nltk` (already in requirements.txt)
- **Data**: Automatically downloads WordNet on first use
- **Internet**: Required for initial download only
- **Offline**: Works offline after download

## Troubleshooting

### ConceptNet Not Available

**Symptoms:**
- `enrichment_stats["conceptnet"]["status"] == "unavailable"`
- No ConceptNet edges added

**Solutions:**
1. Check internet connection
2. Verify ConceptNet API is accessible: http://api.conceptnet.io
3. Check firewall/proxy settings
4. Review logs for specific errors

### WordNet Not Available

**Symptoms:**
- `enrichment_stats["wordnet"]["status"] == "unavailable"`
- No WordNet edges added

**Solutions:**
1. Install NLTK: `pip install nltk`
2. Download WordNet: `python -c "import nltk; nltk.download('wordnet')"`
3. Check NLTK data path: `import nltk; print(nltk.data.path)`

### Slow Performance

**If enrichment is too slow:**
1. Reduce `max_edges_per_concept` in ConceptNet enricher
2. Reduce `max_synonyms`, `max_hypernyms` in WordNet enricher
3. Disable enrichment for testing: `enable_enrichment=False`
4. Use caching for repeated concepts (future enhancement)

## Best Practices

1. **Enable for Production**: Enrichment improves analysis quality
2. **Disable for Testing**: Faster iteration during development
3. **Monitor Statistics**: Check enrichment stats to ensure it's working
4. **Handle Failures Gracefully**: System works without enrichment if unavailable
5. **Rate Limiting**: ConceptNet enricher includes rate limiting to respect API

## Example Output

**Before Enrichment:**
```
Graph:
  Nodes: 10 (concepts from essay)
  Edges: 8 (relationships from essay)
```

**After Enrichment:**
```
Graph:
  Nodes: 24 (10 original + 14 from external knowledge)
  Edges: 35 (8 original + 27 from external knowledge)

Enrichment:
  ConceptNet: 15 edges, 8 nodes
  WordNet: 12 edges, 6 nodes
```

## Integration with Neo4j

Enriched graphs are automatically exported to Neo4j (if configured):

```python
kg_result = builder.build(text="...", essay_id="...")
export_stats = builder.export_to_neo4j(kg_result)
# Enriched graph is stored in Neo4j with all relationships
```

## Future Enhancements

Potential improvements:
- Caching of enrichment results
- Additional knowledge bases (DBpedia, Wikidata)
- Domain-specific ontologies
- Custom relationship scoring
- Batch enrichment for multiple essays

## See Also

- `IMPLEMENTATION_GUIDE.md` - Overall implementation guide
- `IMPLEMENTATION_SUMMARY.md` - Implementation status
- `conceptnet_enricher.py` - ConceptNet implementation
- `wordnet_enricher.py` - WordNet implementation
- `enhanced_kg_builder.py` - Main KG builder with enrichment

