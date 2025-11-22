# Step 10: Iterate & Refine - Implementation Guide

## Overview

Step 10 provides a framework for continuous improvement of the essay analysis system through:
1. **Teacher Feedback Collection** - Collect corrections and annotations
2. **Domain Configuration** - Support domain-specific analysis
3. **Ontology Integration** - Add domain ontologies for specialized knowledge
4. **Heuristic Refinement** - Learn from feedback to improve extraction

## Framework Components

### 1. Feedback Collection System

**File**: `feedback_collector.py`

Collects teacher feedback on analysis results:

```python
from app.nlp_modules.feedback_collector import FeedbackCollector, FeedbackType

collector = FeedbackCollector()

# Mark false positive (system incorrectly detected something)
collector.mark_false_positive(
    essay_id="essay_123",
    teacher_id="teacher_1",
    detected_item={"sentence": "...", "confidence": 0.8},
    component_type="claim",
    notes="This is not a claim, it's background information"
)

# Mark false negative (system missed something)
collector.mark_false_negative(
    essay_id="essay_123",
    teacher_id="teacher_1",
    component_type="evidence",
    missed_item={"sentence": "...", "type": "statistic"},
    notes="This should have been detected as evidence"
)

# Rate accuracy
collector.rate_accuracy(
    essay_id="essay_123",
    teacher_id="teacher_1",
    component_type="claim",
    rating=4,  # 1-5 scale
    notes="Good detection overall, but missed one claim"
)

# Get statistics
stats = collector.get_statistics()
print(f"Total feedback: {stats['total_feedback']}")
print(f"False positives: {stats['false_positives']}")
print(f"False negatives: {stats['false_negatives']}")
```

### 2. Domain Configuration System

**File**: `domain_config.py`

Configure domain-specific analysis:

```python
from app.nlp_modules.domain_config import DomainConfig, EssayDomain

# Create domain configuration
science_config = DomainConfig(EssayDomain.SCIENCE)

# Get domain-specific keywords
keywords = science_config.get_concept_keywords()
print(keywords)  # ["hypothesis", "experiment", "theory", ...]

# Get domain patterns
patterns = science_config.get_extraction_patterns()

# Check if concept is domain-specific
is_science = science_config.is_domain_concept("hypothesis")
print(is_science)  # True

# Load ontology
science_config.load_ontology("ontologies/science_ontology.json")
```

**Supported Domains:**
- `GENERAL` - General purpose (default)
- `SCIENCE` - Science topics
- `HISTORY` - Historical topics
- `LITERATURE` - Literary analysis
- `SOCIAL_STUDIES` - Social studies
- `TECHNOLOGY` - Technology topics
- `ENVIRONMENT` - Environmental topics
- `ARGUMENTATIVE` - General argumentation

### 3. Ontology Loader

**File**: `ontology_loader.py`

Load and integrate domain ontologies:

```python
from app.nlp_modules.ontology_loader import OntologyLoader

# Load ontology
loader = OntologyLoader("ontologies/science_ontology.json")

# Find concept in ontology
concept = loader.find_concept("hypothesis")
print(concept)  # Concept dictionary

# Get related concepts
related = loader.get_related_concepts("hypothesis")
print(related)  # List of related concepts

# Enrich knowledge graph with ontology
enrichment_stats = loader.enrich_graph_with_ontology(graph, concept_nodes)
print(f"Added {enrichment_stats['edges_added']} edges from ontology")
```

**Ontology JSON Format:**
```json
{
  "name": "Science Education Ontology",
  "domain": "science",
  "concepts": [
    {
      "id": "hypothesis",
      "label": "Hypothesis",
      "type": "process",
      "definition": "A proposed explanation for a phenomenon",
      "aliases": ["proposal", "explanation"]
    }
  ],
  "relationships": [
    {
      "source": "experiment",
      "target": "hypothesis",
      "type": "TESTS"
    }
  ]
}
```

### 4. Heuristic Refinement System

**File**: `heuristic_refiner.py`

Learn from feedback to improve heuristics:

```python
from app.nlp_modules.heuristic_refiner import HeuristicRefiner
from app.nlp_modules.feedback_collector import FeedbackCollector

# Create refiner with feedback collector
collector = FeedbackCollector()
refiner = HeuristicRefiner(collector)

# Analyze feedback
analysis = refiner.analyze_feedback(component_type="claim")
print(analysis)
# {
#   "total_false_positives": 10,
#   "total_false_negatives": 5,
#   "false_positive_patterns": {...},
#   "recommendations": [...]
# }

# Generate refined heuristics
refined = refiner.generate_refined_heuristics(component_type="claim")
print(refined["changes"])
# [
#   {
#     "type": "threshold_increase",
#     "reason": "Reduce false positives",
#     "old_value": 0.7,
#     "new_value": 0.85
#   },
#   {
#     "type": "pattern_addition",
#     "reason": "Learn from false negatives",
#     "new_patterns": ["pattern1", "pattern2"]
#   }
# ]

# Apply refinement (requires module integration)
refiner.apply_refinement(refined)

# Export refinement report
report_path = refiner.export_refinement_report()
```

## Usage Workflow

### Phase 1: Collect Feedback

1. **Teacher Reviews Analysis**
   - Teacher reviews essay analysis results
   - Identifies false positives/negatives
   - Provides corrections and ratings

2. **Collect Feedback**
   ```python
   collector = FeedbackCollector()
   
   # Collect feedback from teacher UI
   collector.mark_false_positive(...)
   collector.mark_false_negative(...)
   collector.rate_accuracy(...)
   ```

3. **Export Feedback**
   ```python
   # Periodically export feedback
   collector.export_feedback("feedback_20250121.json")
   ```

### Phase 2: Analyze Patterns

1. **Run Analysis**
   ```python
   refiner = HeuristicRefiner(collector)
   analysis = refiner.analyze_feedback(component_type="claim")
   ```

2. **Review Recommendations**
   - System generates recommendations based on patterns
   - Review suggested changes

### Phase 3: Refine Heuristics

1. **Generate Refinements**
   ```python
   refined = refiner.generate_refined_heuristics("claim")
   ```

2. **Review Changes**
   - Threshold adjustments
   - New patterns to add
   - Patterns to refine

3. **Apply Refinements**
   - Update extraction modules (manual integration required)
   - Adjust confidence thresholds
   - Add new patterns

### Phase 4: Domain-Specific Configuration

1. **Create Domain Configuration**
   ```python
   domain_config = DomainConfig(EssayDomain.SCIENCE)
   ```

2. **Create Domain Ontology**
   - Define domain concepts
   - Specify relationships
   - Save as JSON

3. **Load Ontology**
   ```python
   loader = OntologyLoader("ontologies/science_ontology.json")
   ```

4. **Enrich Knowledge Graphs**
   ```python
   loader.enrich_graph_with_ontology(graph, concept_nodes)
   ```

## Integration with Analysis Service

### Example: Add Feedback Collection to API

```python
# backend/app/controllers/feedback_controller.py
from fastapi import APIRouter, Depends, HTTPException
from app.nlp_modules.feedback_collector import FeedbackCollector, FeedbackType

feedback_router = APIRouter()

@feedback_router.post("/essay/{essay_id}/feedback")
async def submit_feedback(
    essay_id: int,
    feedback_data: dict,
    current_user: User = Depends(get_current_user)
):
    collector = FeedbackCollector()
    
    feedback_type = FeedbackType(feedback_data["feedback_type"])
    
    record = collector.collect_feedback(
        essay_id=str(essay_id),
        teacher_id=str(current_user.id),
        feedback_type=feedback_type,
        analysis_component=feedback_data["component"],
        detected_item=feedback_data.get("detected_item", {}),
        teacher_correction=feedback_data.get("correction"),
        notes=feedback_data.get("notes")
    )
    
    return {"status": "success", "feedback_id": record["id"]}
```

### Example: Use Domain Configuration in KG Builder

```python
from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder
from app.nlp_modules.domain_config import DomainConfig, EssayDomain

# Create domain-specific builder
domain_config = DomainConfig(EssayDomain.SCIENCE)
builder = EnhancedKnowledgeGraphBuilder()

# Build KG with domain awareness
kg_result = builder.build(
    text=essay_content,
    essay_id="essay_123",
    enable_enrichment=True
)

# Check if concepts are domain-specific
for concept in kg_result["concepts"]:
    if domain_config.is_domain_concept(concept["text"]):
        print(f"{concept['text']} is domain-specific")
```

## Best Practices

### 1. Feedback Collection
- Collect feedback systematically
- Include context (sentence, position)
- Export feedback regularly
- Analyze patterns periodically

### 2. Domain Configuration
- Start with general domain
- Add domain-specific configs incrementally
- Test with domain-specific essays
- Validate domain concepts

### 3. Ontology Integration
- Create ontologies for specific domains
- Validate ontology structure
- Test enrichment on sample essays
- Monitor enrichment statistics

### 4. Heuristic Refinement
- Collect sufficient feedback (>50 cases) before refining
- Review recommendations carefully
- Test refinements on validation set
- Document changes

## Example: Science Essay Domain

### 1. Create Science Domain Configuration

```python
from app.nlp_modules.domain_config import DomainConfig, EssayDomain

science_config = DomainConfig(EssayDomain.SCIENCE)

# Customize if needed
science_config.config["concept_keywords"].extend([
    "hypothesis", "experiment", "variable", "control"
])
```

### 2. Create Science Ontology

```json
{
  "name": "Science Education Ontology",
  "domain": "science",
  "concepts": [
    {
      "id": "hypothesis",
      "label": "Hypothesis",
      "type": "process",
      "definition": "A proposed explanation for a phenomenon",
      "aliases": ["proposal", "explanation", "prediction"]
    },
    {
      "id": "experiment",
      "label": "Experiment",
      "type": "process",
      "definition": "A procedure to test a hypothesis",
      "aliases": ["test", "trial", "study"]
    },
    {
      "id": "evidence",
      "label": "Evidence",
      "type": "entity",
      "definition": "Data that supports or refutes a hypothesis",
      "aliases": ["data", "proof", "results"]
    }
  ],
  "relationships": [
    {
      "source": "experiment",
      "target": "hypothesis",
      "type": "TESTS"
    },
    {
      "source": "experiment",
      "target": "evidence",
      "type": "PRODUCES"
    },
    {
      "source": "evidence",
      "target": "hypothesis",
      "type": "SUPPORTS"
    }
  ]
}
```

### 3. Use Domain Configuration

```python
# Load ontology
loader = OntologyLoader("ontologies/science_ontology.json")

# Build KG with domain awareness
builder = EnhancedKnowledgeGraphBuilder()
kg_result = builder.build(text=science_essay, essay_id="essay_123")

# Enrich with ontology
loader.enrich_graph_with_ontology(kg_result["graph"], kg_result["nodes"])
```

## Statistics and Monitoring

### Feedback Statistics

```python
collector = FeedbackCollector()
stats = collector.get_statistics()

print(f"Total feedback: {stats['total_feedback']}")
print(f"By type: {stats['by_type']}")
print(f"By component: {stats['by_component']}")
print(f"False positives: {stats['false_positives']}")
print(f"False negatives: {stats['false_negatives']}")
print(f"Average accuracy rating: {stats['average_accuracy_rating']}")
```

### Refinement Reports

```python
refiner = HeuristicRefiner(collector)
report_path = refiner.export_refinement_report()
# Exports JSON report with refinement history and recommendations
```

## Next Steps

1. **Integrate Feedback UI** - Add feedback buttons to frontend
2. **Implement Module Integration** - Connect refiner to actual extraction modules
3. **Create Domain Ontologies** - Build ontologies for target domains
4. **Automate Refinement** - Schedule periodic refinement analysis
5. **Validate Improvements** - Test refinements on validation set

## See Also

- `feedback_collector.py` - Feedback collection implementation
- `domain_config.py` - Domain configuration implementation
- `ontology_loader.py` - Ontology loader implementation
- `heuristic_refiner.py` - Heuristic refinement implementation
- `IMPLEMENTATION_GUIDE.md` - Overall implementation guide
- `IMPLEMENTATION_SUMMARY.md` - Implementation status

