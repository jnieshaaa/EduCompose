# Unused Files Report - Backend

This report identifies files in the backend that are not used by the main application.

## Summary

- **Empty Files/Directories**: 3
- **Unused Python Modules**: 2
- **Standalone Scripts** (not part of main app): 10+
- **Utility Files** (only used by scripts): 1

---

## 1. Empty Files/Directories

### `backend/app/utils.py`
- **Status**: Empty file
- **Action**: Can be deleted
- **Reason**: No content, not imported anywhere

### `backend/app/models/aes_model/`
- **Status**: Empty directory
- **Action**: Can be deleted
- **Reason**: No files in directory

### `backend/app/config/`
- **Status**: Empty directory
- **Action**: Can be deleted
- **Reason**: No files in directory

---

## 2. Unused Python Modules

### `backend/app/nlp_modules/kg_accuracy_validator.py`
- **Status**: Not imported or used anywhere
- **Action**: Can be deleted if not needed
- **Reason**: No imports found in codebase
- **Note**: May be intended for future use or testing

---

## 3. Utility Files (Only Used by Standalone Scripts)

### `backend/app/data_loader.py`
- **Status**: Only used by `init_data.py` script
- **Action**: Keep if `init_data.py` is needed, otherwise can be removed
- **Used by**: 
  - `backend/init_data.py` (standalone initialization script)

---

## 4. Standalone Scripts (Not Part of Main Application)

These scripts are utility scripts that can be run independently but are not imported by the main application:

### Scripts Directory (`backend/scripts/`)
- `analysis_pipeline.py` - Standalone analysis pipeline
- `build_and_export_kg.py` - Standalone KG export utility
- `diagnose_neo4j.py` - Neo4j diagnostic tool
- `process_full_dataset.py` - Dataset processing script
- `process_persuade_dataset.py` - Persuade dataset processing
- `quick_analysis.py` - Quick analysis utility
- `quick_test.py` - Testing utility
- `quick_test_neo4j.py` - Neo4j testing utility
- `switch_to_desktop.py` - Configuration utility
- `test_export_essay.py` - Export testing utility
- `test_neo4j_connection.py` - Connection testing utility
- `test_with_persuade_data.py` - Testing with Persuade data

**Action**: Keep these if they're useful utilities, but they're not part of the main application runtime.

---

## 5. Root-Level Utility Scripts

### `backend/setup_postgres.py`
- **Status**: Standalone setup script
- **Action**: Keep if needed for setup, not part of main app

### `backend/setup_postgresql.ps1`
- **Status**: PowerShell setup script
- **Action**: Keep if needed for setup, not part of main app

### `backend/test_postgres_connection.py`
- **Status**: Standalone test script
- **Action**: Keep if needed for testing, not part of main app

### `backend/update_postgres_password.py`
- **Status**: Standalone utility script
- **Action**: Keep if needed, not part of main app

---

## 6. NLP Modules Usage Analysis

### Used by Main Application (`essay_analysis_service.py`):
- ✅ `grammar_analyzer.py` - **USED**
- ✅ `readability_analyzer.py` - **USED**
- ✅ `coherence_analyzer.py` - **USED**
- ✅ `argument_miner.py` - **USED**
- ✅ `knowledge_graph_builder.py` - **USED**

### Used by KG Controller (`kg_controller.py`):
- ✅ `neo4j_exporter.py` - **USED**
- ✅ `enhanced_kg_builder.py` - **USED**

### Used by Scripts Only:
- ⚠️ `persuade_data_loader.py` - Only used by processing scripts
- ⚠️ `preprocessing.py` - Only used by processing scripts

### Exported but Not Used in Main App:
- ⚠️ `openie_extractor.py` - Exported in `__init__.py` but not used in main app
- ⚠️ `kg_metrics.py` - Exported in `__init__.py` but not used in main app
- ⚠️ `claim_classifier.py` - Exported in `__init__.py` but not used in main app
- ⚠️ `feedback_collector.py` - Exported in `__init__.py` but not used in main app
- ⚠️ `domain_config.py` - Exported in `__init__.py` but not used in main app
- ⚠️ `ontology_loader.py` - Exported in `__init__.py` but not used in main app
- ⚠️ `heuristic_refiner.py` - Exported in `__init__.py` but not used in main app
- ⚠️ `conceptnet_enricher.py` - Exported in `__init__.py` but not used in main app
- ⚠️ `wordnet_enricher.py` - Exported in `__init__.py` but not used in main app

### Not Used Anywhere:
- ❌ `kg_accuracy_validator.py` - **NOT USED**

---

## Recommendations

### Safe to Delete:
1. `backend/app/utils.py` (empty)
2. `backend/app/models/aes_model/` (empty directory)
3. `backend/app/config/` (empty directory)
4. `backend/app/nlp_modules/kg_accuracy_validator.py` (not imported anywhere)

### Consider Removing (if not needed):
1. `backend/app/data_loader.py` - Only used by `init_data.py` script
2. Various exported but unused NLP modules (if not planned for future use)

### Keep (Useful Utilities):
- All scripts in `backend/scripts/` - Keep as standalone utilities
- Setup and test scripts in root - Keep for maintenance

---

## Notes

- Files exported in `__init__.py` but not used may be intended for future use
- Scripts are intentionally standalone and not part of the main application
- Some modules may be used by scripts but not by the main FastAPI application
- Review before deleting to ensure nothing is planned for future use

