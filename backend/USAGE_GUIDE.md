# EduCompose Usage Guide
## How to Use the Enhanced Knowledge Graph System

This guide explains how to use the step-by-step implementation of the KG-based essay analysis system.

---

## Quick Start

### 1. Install Additional Dependencies

```bash
cd backend
pip install -r requirements.txt

# Optional: For advanced features
pip install allennlp allennlp-models  # For OpenIE
pip install conceptnet-lite  # For ConceptNet enrichment
python -c "import nltk; nltk.download('wordnet')"  # For WordNet
```

### 2. Basic Usage

The enhanced system is integrated into the existing `EssayAnalysisService`. Use it as before:

```python
from app.services.essay_analysis_service import essay_analysis_service

# Analyze an essay
results = await essay_analysis_service.analyze_text(
    text="Your essay text here...",
    analysis_type="comprehensive"
)

# Access KG metrics
kg_metrics = results["detailed_analysis"]["knowledge_graph"]["metrics"]
```

---

## Step-by-Step Usage

### Step 1: Data Preparation

If you have annotated essays, format them as:

```python
essay_data = {
    "id": "essay_001",
    "text": "Full essay content...",
    "teacher_annotations": [
        {
            "span": {"start": 0, "end": 50},
            "label": "claim",
            "comment": "Main thesis statement"
        }
    ],
    "essay_type": "argumentative",
    "grade_level": "high_school",
    "prompt": "Essay prompt text"
}
```

### Step 2: Basic NLP Analysis

Grammar and style analysis run automatically:

```python
results = await essay_analysis_service.analyze_text(
    text=essay_data["text"],
    analysis_type="comprehensive"
)

# Grammar errors
grammar_errors = results["detailed_analysis"]["grammar"]["errors"]

# Readability metrics
readability = results["detailed_analysis"]["readability"]
print(f"Flesch-Kincaid Grade: {readability['flesch_kincaid_grade']}")
```

### Step 3: Concept & Proposition Extraction

The system automatically extracts:
- Concepts (noun phrases, entities)
- Propositions (subject-predicate-object triples)
- Claims, evidence, warrants, rebuttals

```python
# Access extracted concepts
concepts = results["detailed_analysis"]["knowledge_graph"]["concepts"]

# Access OpenIE triples
# (Note: Currently using spaCy-based extraction)
# To use Stanford OpenIE, set up CoreNLP server
```

### Step 4: Knowledge Graph Construction

The KG is built automatically with proper node/edge types:

```python
kg_data = results["detailed_analysis"]["knowledge_graph"]

# Graph structure
structure = kg_data["graph_structure"]
print(f"Nodes: {structure['nodes']}, Edges: {structure['edges']}")

# Access nodes and relationships
nodes = kg_data.get("nodes", [])
edges = kg_data.get("edges", [])
```

### Step 5: KG Metrics Computation

Access computed metrics:

```python
metrics = results["detailed_analysis"]["knowledge_graph"].get("metrics", {})

# Concept coherence
coherence = metrics.get("concept_coherence", {})
print(f"Coherence Score: {coherence.get('score', 0)}")
print(f"Connected Components: {coherence.get('connected_components', 0)}")

# Argument strength
arg_strength = metrics.get("argument_strength", {})
print(f"Overall Argument Strength: {arg_strength.get('overall_score', 0)}")

# Structure completeness
completeness = metrics.get("structure_completeness", {})
print(f"Evidence Coverage: {completeness.get('evidence_coverage', 0)}")

# Concept drift (if prompt concepts provided)
drift = metrics.get("concept_drift", {})
print(f"Topic Alignment: {drift.get('topic_alignment', 0)}%")

# Centrality metrics
centrality = metrics.get("centrality_metrics", {})
print(f"Central Concepts: {centrality.get('central_concepts', [])}")
```

### Step 6: Teacher Reports

Generate comprehensive reports:

```python
from app.services.report_generator import TeacherReportGenerator

generator = TeacherReportGenerator()
report = generator.generate_report(results)

# Summary
summary = report["summary"]
print(f"Overall Score: {summary['overall_score']}")

# Grammar section
grammar = report["grammar_section"]
print(f"Top Errors: {grammar['top_errors']}")

# Argumentation section
arg = report["argumentation_section"]
print(f"Coherence Explanation: {arg['coherence_explanation']}")

# Plain text report
text_report = generator.generate_plain_text_report(report)
print(text_report)
```

---

## Advanced Usage

### Using Enhanced KG Builder Directly

```python
from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder
from app.nlp_modules.argument_miner import ArgumentMiner

# Initialize
kg_builder = EnhancedKnowledgeGraphBuilder()
argument_miner = ArgumentMiner()

# Extract arguments first
argument_analysis = argument_miner.analyze(essay_text)

# Build KG with arguments
kg_result = kg_builder.build(
    text=essay_text,
    essay_id="essay_001",
    prompt_concepts=["renewable energy", "climate change"],  # Optional
    argument_analysis=argument_analysis
)

# Access graph
graph = kg_result["graph"]
nodes = kg_result["nodes"]
edges = kg_result["edges"]
metrics = kg_result["metrics"]
```

### Computing Metrics Separately

```python
from app.nlp_modules.kg_metrics import KGMetricsCalculator
import networkx as nx

calculator = KGMetricsCalculator()

# Compute all metrics
all_metrics = calculator.compute_all_metrics(
    graph=graph,
    claims=claim_nodes,
    concepts=concept_nodes,
    prompt_concepts=["topic1", "topic2"]
)

# Or compute individually
coherence = calculator.compute_concept_coherence(graph, concepts)
arg_strength = calculator.compute_argument_strength(graph, claims)
```

### Using OpenIE Extractor

```python
from app.nlp_modules.openie_extractor import OpenIEExtractor

extractor = OpenIEExtractor()

# Extract triples from text
triples = extractor.extract_triples(essay_text)

# Or from sentences
sentences = ["Sentence 1.", "Sentence 2."]
triples = extractor.extract_from_sentences(sentences)

# Each triple has:
# - subject: str
# - predicate: str
# - object: str
# - confidence: float
# - sentence_index: int
```

---

## API Endpoints

The system is accessible via existing API endpoints:

### Analyze Essay

```bash
POST /api/essays/{essay_id}/analyze
```

Returns comprehensive analysis including KG metrics.

### Get Analysis Report

```bash
GET /api/essays/{essay_id}/analysis
```

Returns formatted teacher report.

---

## Configuration

### Enable Enhanced Features

Edit `backend/app/services/essay_analysis_service.py` to use enhanced KG builder:

```python
# Option 1: Use enhanced KG builder (recommended)
from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder
self.enhanced_kg_builder = EnhancedKnowledgeGraphBuilder()

# Option 2: Use original (simpler, faster)
self.knowledge_graph_builder = KnowledgeGraphBuilder()
```

### External Knowledge Enrichment

To enable ConceptNet/WordNet enrichment:

```python
# In enhanced_kg_builder.py, add:
from app.nlp_modules.conceptnet_enricher import ConceptNetEnricher
enricher = ConceptNetEnricher()
enriched_concepts = enricher.enrich(concepts)
```

---

## Output Format

### Analysis Results Structure

```python
{
    "scores": {
        "grammar": 85.0,
        "readability": 72.0,
        "coherence": 68.0,
        "argument_strength": 75.0,
        "knowledge_graph": 70.0,
        "overall": 74.2
    },
    "detailed_analysis": {
        "grammar": {...},
        "readability": {...},
        "coherence": {...},
        "argumentation": {
            "claims": [...],
            "grounds": [...],
            "graph": {...},
            "metrics": {...}
        },
        "knowledge_graph": {
            "concepts": [...],
            "relationships": [...],
            "graph_structure": {...},
            "metrics": {
                "concept_coherence": {...},
                "argument_strength": {...},
                "structure_completeness": {...},
                "concept_drift": {...},
                "centrality_metrics": {...}
            }
        }
    },
    "recommendations": [...],
    "diagnostic_summary": {...}
}
```

---

## Troubleshooting

### Issue: OpenIE extraction returns empty results

**Solution**: The system uses spaCy-based extraction by default. For better results:
1. Set up Stanford CoreNLP server
2. Or use AllenNLP OpenIE models

### Issue: KG metrics show low scores

**Possible causes**:
- Essay is too short (< 150 words)
- Few concepts extracted
- Weak argument structure

**Solution**: Ensure essay has sufficient content and clear argumentation.

### Issue: Concept drift detection not working

**Solution**: Provide `prompt_concepts` when building KG:

```python
kg_result = kg_builder.build(
    text=essay_text,
    prompt_concepts=["concept1", "concept2"]
)
```

---

## Next Steps

1. **Collect annotated data** from partner schools
2. **Validate metrics** against teacher judgments
3. **Refine extraction** based on feedback
4. **Add domain-specific** ontologies for specialized topics
5. **Implement visualization** for interactive graph exploration

---

## References

- See `IMPLEMENTATION_GUIDE.md` for detailed implementation steps
- See `DOCUMENTATION.md` for API documentation
- See `THEORETICAL_FRAMEWORK.md` for research background

