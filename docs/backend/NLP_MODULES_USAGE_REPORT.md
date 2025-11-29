# NLP Modules Usage Report

This report identifies which NLP modules are used and which are not used in the application.

## Summary

- **Total NLP Module Files**: 20
- **Used in Main Application**: 12
- **Used Internally (by other NLP modules)**: 2
- **Not Used**: 6

---

## ✅ Used in Main Application

These modules are imported and used by the main application code:

### 1. **grammar_analyzer.py** ✅
- **Used by**: `essay_analysis_service.py`
- **Exported in**: `nlp_modules/__init__.py`
- **Status**: **ACTIVELY USED**

### 2. **readability_analyzer.py** ✅
- **Used by**: `essay_analysis_service.py`
- **Exported in**: `nlp_modules/__init__.py`
- **Status**: **ACTIVELY USED**

### 3. **coherence_analyzer.py** ✅
- **Used by**: `essay_analysis_service.py`
- **Exported in**: `nlp_modules/__init__.py`
- **Status**: **ACTIVELY USED**

### 4. **argument_miner.py** ✅
- **Used by**: `essay_analysis_service.py`
- **Exported in**: `nlp_modules/__init__.py`
- **Status**: **ACTIVELY USED**

### 5. **knowledge_graph_builder.py** ✅
- **Used by**: `essay_analysis_service.py`
- **Exported in**: `nlp_modules/__init__.py`
- **Status**: **ACTIVELY USED**

### 6. **enhanced_kg_builder.py** ✅
- **Used by**: `kg_controller.py`
- **Status**: **ACTIVELY USED**

### 7. **spacy_utils.py** ✅
- **Used by**: Multiple modules (grammar_analyzer, coherence_analyzer, enhanced_kg_builder, etc.)
- **Status**: **ACTIVELY USED** (utility module)

### 8. **kg_schema.py** ✅
- **Used by**: `enhanced_kg_builder.py`
- **Status**: **ACTIVELY USED**

### 9. **openie_extractor.py** ✅
- **Used by**: `enhanced_kg_builder.py`
- **Status**: **ACTIVELY USED**

### 10. **kg_metrics.py** ✅
- **Used by**: `enhanced_kg_builder.py`
- **Status**: **ACTIVELY USED**

### 11. **conceptnet_enricher.py** ✅
- **Used by**: `enhanced_kg_builder.py` (optional)
- **Status**: **ACTIVELY USED** (optional feature)

### 12. **wordnet_enricher.py** ✅
- **Used by**: `enhanced_kg_builder.py` (optional)
- **Status**: **ACTIVELY USED** (optional feature)

---

## ⚠️ Used Internally (by other NLP modules)

These modules are only used by other NLP modules, not directly by the main application:

### 1. **claim_classifier.py** ⚠️
- **Used by**: `argument_miner.py` (internal import)
- **Not exported in**: `nlp_modules/__init__.py`
- **Status**: **USED INTERNALLY** (not directly by main app)

### 2. **feedback_collector.py** ⚠️
- **Used by**: `heuristic_refiner.py` (internal import)
- **Not exported in**: `nlp_modules/__init__.py`
- **Status**: **USED INTERNALLY** (not directly by main app)

### 3. **heuristic_refiner.py** ⚠️
- **Uses**: `feedback_collector.py`
- **Not imported by**: Main application
- **Status**: **NOT USED** (but uses feedback_collector)

### 4. **domain_config.py** ⚠️
- **Not imported by**: Main application
- **Status**: **NOT USED**

### 5. **ontology_loader.py** ⚠️
- **Not imported by**: Main application
- **Status**: **NOT USED**

---

## 📜 Not Used (Script/Data Processing)

These modules are not used by the main application:

### 1. **persuade_data_loader.py** ❌
- **Not imported by**: Any file
- **Status**: **NOT USED**

### 2. **preprocessing.py** ❌
- **Not imported by**: Any file
- **Status**: **NOT USED**

---

## ❌ Not Used

These modules are not imported or used anywhere:

### 1. **kg_accuracy_validator.py** ❌
- **Not imported by**: Any file
- **Status**: **NOT USED**

---

## Detailed Analysis

### Core Analysis Modules (Used by Main App)
- ✅ `grammar_analyzer.py` - Grammar analysis
- ✅ `readability_analyzer.py` - Readability metrics
- ✅ `coherence_analyzer.py` - Coherence analysis
- ✅ `argument_miner.py` - Argument structure extraction
- ✅ `knowledge_graph_builder.py` - Basic knowledge graph building

### Enhanced KG Modules (Used by KG Controller)
- ✅ `enhanced_kg_builder.py` - Enhanced KG builder
- ✅ `kg_schema.py` - KG schema definitions
- ✅ `openie_extractor.py` - OpenIE triple extraction
- ✅ `kg_metrics.py` - KG metrics calculation
- ✅ `conceptnet_enricher.py` - ConceptNet enrichment (optional)
- ✅ `wordnet_enricher.py` - WordNet enrichment (optional)

### Utility Modules
- ✅ `spacy_utils.py` - spaCy model loading utilities

### Internal/Unused Modules
- ⚠️ `claim_classifier.py` - Used internally by argument_miner
- ⚠️ `feedback_collector.py` - Used internally by heuristic_refiner
- ⚠️ `heuristic_refiner.py` - Not used
- ⚠️ `domain_config.py` - Not used
- ⚠️ `ontology_loader.py` - Not used
- 📜 `persuade_data_loader.py` - Script only
- 📜 `preprocessing.py` - Script only
- ❌ `kg_accuracy_validator.py` - Not used

---

## Recommendations

### Safe to Delete
1. **kg_accuracy_validator.py** - Not used anywhere

### Consider Removing (if not needed)
1. **heuristic_refiner.py** - Not used, but uses feedback_collector
2. **domain_config.py** - Not used
3. **ontology_loader.py** - Not used

### Keep (Used Internally)
1. **claim_classifier.py** - Used by argument_miner internally
2. **feedback_collector.py** - Used by heuristic_refiner (even though heuristic_refiner itself isn't used)

---

## Usage Statistics

- **Core modules (main app)**: 5 files
- **Enhanced KG modules**: 6 files
- **Utility modules**: 1 file
- **Internal modules**: 2 files
- **Unused modules**: 6 files

**Total actively used in main application**: 12 files
**Total unused**: 6 files

