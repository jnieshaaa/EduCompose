# EduCompose Implementation Guide

## Step-by-Step Implementation of Knowledge Graph-Based Essay Analysis

This guide walks through implementing the complete NLP-based essay evaluation system with knowledge graphs as specified in your research proposal.

---

## Step 0: Align with Proposal Goals ✅

**Goal**: Support teachers by highlighting grammar, style, and especially argumentation & coherence via KGs.

**Status**: System architecture aligned. Existing modules provide foundation.

---

## Step 1: Data Collection & Preparation

### 1.1 Data Format Schema

Create a standardized format for essay data with teacher annotations:

**File**: `backend/app/schemas/essay_data_schema.py`

```python
{
    "id": "essay_001",
    "text": "Full essay content...",
    "teacher_annotations": [
        {
            "span": {"start": 0, "end": 50},
            "label": "claim",
            "comment": "Main thesis statement"
        }
    ],
    "essay_type": "argumentative",  # or "expository"
    "grade_level": "high_school",
    "prompt": "Essay prompt text"
}
```

### 1.2 Preprocessing Pipeline

**Components needed**:

- Sentence splitting (spaCy)
- Tokenization (spaCy)
- POS tagging (spaCy)
- Lemmatization (spaCy)
- Coreference resolution (NeuralCoref or HuggingFace models)

**Implementation**: `backend/app/nlp_modules/preprocessing.py`

---

## Step 2: Basic NLP Pipelines (Grammar + Style)

### 2.1 Grammar Error Detection

**Status**: ✅ Implemented in `grammar_analyzer.py`

- Uses LanguageTool for grammar checking
- spaCy for syntactic analysis
- Rule-based checks

**Enhancements needed**:

- Fine-tuned transformer models for grammatical error detection
- Better error categorization

### 2.2 Readability & Style Metrics

**Status**: ✅ Implemented in `readability_analyzer.py`

- Flesch-Kincaid Grade Level
- Flesch Reading Ease
- SMOG Index
- Coleman-Liau Index
- Lexical diversity
- Sentence length analysis

---

## Step 3: Extract Concepts & Propositions

### 3.1 Named Entity & Concept Extraction

**Current**: Basic noun phrase extraction in `knowledge_graph_builder.py`

**Enhancements needed**:

- Enhanced NER with domain-specific entities
- Multi-word concept extraction
- Phrase chunking for complex concepts

### 3.2 Proposition Extraction (OpenIE)

**Implementation**: `backend/app/nlp_modules/openie_extractor.py`

**Tools**:

- Stanford OpenIE (via Python wrapper)
- AllenNLP OpenIE
- spaCy + custom relation extraction

**Output format**:

```python
{
    "subject": "Solar panels",
    "predicate": "reduce",
    "object": "carbon emissions",
    "confidence": 0.85,
    "sentence_index": 5
}
```

### 3.3 Claim/Evidence Detection

**Status**: ✅ Partially implemented in `argument_miner.py`

**Enhancements needed**:

- Sentence-level classifier for: claim, premise, evidence, counterclaim, background
- Use transformer-based models (BERT/RoBERTa fine-tuned on argumentation datasets)

### 3.4 Coreference Resolution

**Implementation**: `backend/app/nlp_modules/coreference_resolver.py`

**Tools**:

- NeuralCoref (spaCy extension)
- HuggingFace coreference models (e.g., `coref-roberta-large`)

---

## Step 4: Design KG Schema

### 4.1 Node Types

**Implementation**: `backend/app/nlp_modules/kg_schema.py`

```python
NODE_TYPES = {
    "Concept": {
        "label": str,
        "lemma": str,
        "canonical_form": str,
        "frequency": int,
        "importance": float
    },
    "Claim": {
        "text": str,
        "claim_id": str,
        "stance": str,  # "support", "oppose", "neutral"
        "sentence_index": int,
        "confidence": float
    },
    "Evidence": {
        "text": str,
        "source_sentence": int,
        "confidence": float,
        "type": str  # "statistic", "example", "quote", "research"
    },
    "Essay": {
        "essay_id": str,
        "metadata": dict
    },
    "TeacherNote": {
        "annotation_id": str,
        "teacher_id": str,
        "comment": str
    }
}
```

### 4.2 Edge Types (Relations)

```python
EDGE_TYPES = {
    "SUPPORTS": "Evidence → Claim",
    "CONTRADICTS": "Claim → Claim",
    "RELATED_TO": "Concept ↔ Concept",
    "MENTIONS": "Essay → Concept",
    "CLAIM_OF": "Claim → Essay",
    "HAS_NOTE": "Essay/Claim → TeacherNote",
    "EXPANDS": "Concept → Concept",
    "ELABORATES": "Evidence → Claim"
}
```

---

## Step 5: Build & Populate the KG

### 5.1 Storage Options

**Option A: Neo4j (Recommended for production)**

- Property graph database
- Cypher query language
- Good visualization tools
- Python driver: `neo4j`

**Option B: Enhanced NetworkX (Current)**

- In-memory graph
- Good for development/testing
- Can export to Neo4j format

**Option C: RDF Triple Store**

- Stardog, Blazegraph, GraphDB
- Semantic web standards (RDF/Turtle)

### 5.2 Population Pipeline

**Implementation**: `backend/app/nlp_modules/kg_populator.py`

**Steps**:

1. Canonicalize entities (lemmatize, map to WordNet/ConceptNet)
2. Insert nodes (concepts, claims, evidence)
3. Insert edges (relationships)
4. Validate graph structure

---

## Step 6: Enrich KG with External Knowledge

### 6.1 ConceptNet Integration

**Implementation**: `backend/app/nlp_modules/conceptnet_enricher.py`

**API**: ConceptNet API (http://api.conceptnet.io)

**Relations to fetch**:

- IsA, UsedFor, RelatedTo, PartOf, Causes

### 6.2 WordNet Integration

**Implementation**: `backend/app/nlp_modules/wordnet_enricher.py`

**Uses**: NLTK WordNet

**Relations**:

- Hypernyms, hyponyms, synonyms, meronyms

---

## Step 7: Compute KG-Based Metrics

### 7.1 Concept Graph Coherence

**Metrics**:

- Connectedness: number of connected components
- Average shortest path length (main claim → evidence)
- Isolated node detection

**Implementation**: `backend/app/nlp_modules/kg_metrics.py`

### 7.2 Argument Strength Score

**Formula**:

```
Score = sum(confidence_of_supporting_evidence) × (1 - contradiction_score)
```

### 7.3 Argument Structure Completeness

- Check for claims with SUPPORTS edges
- Flag claims without evidence

### 7.4 Concept Drift / Off-topic Detection

- Compare essay concepts to prompt seed concepts
- Calculate semantic distance

### 7.5 Centrality & Relevance

- Node centrality (degree, betweenness, PageRank)
- Identify central concepts (thesis focus)
- Flag low centrality (diffuse thesis)

**Algorithms**: BFS, shortest paths, PageRank, eigenvector centrality

---

## Step 8: Generate Teacher Reports

### 8.1 Report Structure

**Implementation**: `backend/app/services/report_generator.py`

**Sections**:

1. **Grammar**: Top 5 errors with sentence links
2. **Style**: Readability score, sentence length outliers
3. **Argumentation (KG-based)**:
   - Claim summary
   - Support count and strength per claim
   - Coherence score (0-100) with explanation
   - Visual graph snapshot

### 8.2 Visualization

- Interactive graph (D3.js or vis.js)
- Click nodes to see source sentences
- Color-coded by node type

---

## Step 9: Validate & Evaluate

### 9.1 Gold Standard Comparison

**Metrics**:

- Precision, Recall, F1 for claim/evidence extraction
- Cohen's kappa for inter-annotator agreement

### 9.2 Correlation with Teacher Judgments

- Likert scale ratings
- Spearman/Pearson correlation

### 9.3 Teacher Efficiency Study

- Time saved per essay
- Qualitative feedback collection

### 9.4 Ablation Studies

**Variants**:

1. NLP-only (no KG)
2. NLP + ConceptNet enrichment
3. Full KG + embeddings

---

## Step 10: Iterate & Refine

- Use teacher feedback to refine extraction heuristics
- Expand KG coverage for domain-specific essays
- Add domain ontologies (e.g., science topics)

---

## Implementation Priority

1. **High Priority** (Core functionality):

   - Step 3: Enhanced concept/proposition extraction
   - Step 4: KG schema design
   - Step 5: KG population
   - Step 7: KG metrics computation
   - Step 8: Teacher reports

2. **Medium Priority** (Enhancements):

   - Step 6: External knowledge enrichment
   - Step 9: Validation framework

3. **Low Priority** (Future work):
   - Step 10: Iterative refinement

---

## Dependencies to Add

```bash
# OpenIE
pip install allennlp allennlp-models

# Coreference resolution
pip install neuralcoref  # or use HuggingFace models

# ConceptNet
pip install conceptnet-lite

# WordNet (via NLTK)
# Already included, but may need to download:
python -c "import nltk; nltk.download('wordnet')"

# Neo4j (optional)
pip install neo4j

# Graph embeddings (optional)
pip install node2vec stellargraph
```

---

## Next Steps

1. Review this guide
2. Start with Step 3 (concept extraction enhancements)
3. Implement Step 4 (KG schema)
4. Build Step 5 (KG population)
5. Compute Step 7 (metrics)
6. Generate Step 8 (reports)
