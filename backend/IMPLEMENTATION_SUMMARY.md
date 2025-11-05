# EduCompose Backend Implementation Summary

## Overview

This backend implementation aligns with Chapter 1 requirements for EduCompose, providing a comprehensive teacher-centered diagnostic essay evaluation system.

## Architecture

### Core Components

1. **FastAPI Application** (`app/main.py`)
   - RESTful API with JWT authentication
   - CORS enabled for frontend integration
   - Modular router structure

2. **Database Models** (`app/models/`)
   - User (teachers with authentication)
   - Class, Student, Essay entities
   - Analysis results stored in JSON fields
   - Organized in MVC structure with separate files per model

3. **NLP Analysis Modules** (`app/nlp_modules/`)
   - **GrammarAnalyzer**: Grammar and syntax analysis using spaCy and LanguageTool
   - **ReadabilityAnalyzer**: Multiple readability metrics (Flesch, SMOG, Coleman-Liau)
   - **CoherenceAnalyzer**: Entity-grid model and semantic similarity analysis
   - **ArgumentMiner**: Toulmin's model implementation (claims, evidence, warrants, rebuttals)
   - **KnowledgeGraphBuilder**: Semantic network construction using NetworkX

4. **Services** (`app/services/`)
   - **AuthService**: User authentication and authorization
   - **EssayAnalysisService**: Integrates all NLP modules
   - Multi-dimensional analysis (grammar, readability, coherence, argumentation, knowledge graph)
   - Teacher-centered diagnostic report generation
   - Batch processing capabilities

5. **Controllers** (`app/controllers/`)
   - Authentication (login, register)
   - User management
   - Class and student management
   - Essay management
   - Analysis endpoints (single and batch)
   - Organized as MVC controllers handling HTTP requests

## Key Features

### 1. Multi-Dimensional Analysis

**Grammar Analysis** (20% weight)
- Error detection using LanguageTool
- Syntax pattern analysis
- Sentence structure evaluation

**Readability Analysis** (20% weight)
- Flesch Reading Ease
- Flesch-Kincaid Grade Level
- SMOG Index
- Coleman-Liau Index
- Lexical diversity and vocabulary sophistication

**Coherence Analysis** (25% weight)
- Entity-grid model for discourse coherence
- Semantic similarity between sentences
- Transition analysis
- Paragraph unity assessment
- Structure analysis (introduction, body, conclusion)

**Argumentation Analysis** (25% weight)
- Toulmin's model components:
  - Claims (thesis statements)
  - Grounds (evidence)
  - Warrants (reasoning)
  - Rebuttals (counterarguments)
- Argument structure evaluation

**Knowledge Graph Analysis** (10% weight)
- Concept extraction
- Relationship mapping
- Conceptual gap identification
- Connectivity and depth scoring

### 2. Teacher-Centered Design

- **Diagnostic Reports**: Evidence-based insights, not automated grades
- **Prioritized Recommendations**: High/medium/low priority with action items
- **Batch Processing**: Analyze multiple essays efficiently
- **Teacher Oversight**: All recommendations subject to teacher verification

### 3. Diagnostic Report Structure

Each analysis includes:
- **Scores**: Dimension scores and overall weighted score
- **Detailed Analysis**: Complete breakdown by dimension
- **Recommendations**: Prioritized, actionable suggestions
- **Diagnostic Summary**: Quick reference with strengths/weaknesses

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Essays
- `GET /api/essays` - Get essays (with optional class filter)
- `POST /api/essays` - Create new essay
- `GET /api/essays/{id}` - Get specific essay

### Analysis
- `POST /api/analysis/analyze` - Analyze single essay
  - Request: `{ essay_id: int, analysis_type: "comprehensive" | "grammar" | "readability" | "coherence" | "argument" }`
  - Response: Complete diagnostic report

- `POST /api/analysis/batch-analyze` - Batch analyze multiple essays
  - Request: `{ essay_ids: [int], analysis_type: str }`
  - Response: List of analysis results

- `GET /api/analysis/dashboard-stats` - Dashboard statistics

## Essay Length Requirements

- **Minimum**: 200 words (for meaningful analysis)
- **Optimal**: 500-1000 words
- **Maximum**: 1000 words (processing may be slower)

## Dependencies

All required packages are listed in `requirements.txt`:
- FastAPI, Uvicorn (API framework)
- SQLAlchemy (ORM)
- spaCy (NLP)
- NLTK (Text processing)
- LanguageTool (Grammar checking)
- TextStat (Readability metrics)
- Sentence Transformers (Semantic similarity)
- NetworkX (Knowledge graphs)
- PyVis (Visualization)

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Download spaCy model:
```bash
python -m spacy download en_core_web_sm
```

3. Download NLTK data (automatic on first run)

4. Set environment variables (see `env.example`)

5. Initialize database:
```bash
python init_data.py
```

6. Run server:
```bash
python start.py
```

## Alignment with Chapter 1

### Scope Compliance
✅ English-language essays only
✅ Expository and argumentative genres
✅ 200-1000 word range
✅ Teacher-oriented (not student-facing)
✅ Diagnostic support (not automated grading)

### Analysis Dimensions
✅ Grammar and syntactic analysis
✅ Readability assessment
✅ Coherence and conceptual analysis
✅ Argumentation pattern recognition

### Technological Foundation
✅ spaCy for linguistic analysis
✅ NLTK for text preprocessing
✅ TextBlob/TextStat for readability
✅ LanguageTool API for grammar checking
✅ NetworkX for knowledge graphs
✅ Semantic network extraction from essay text

## Next Steps

1. **Frontend Integration**: Connect to frontend for teacher dashboard
2. **Teacher Validation**: Conduct usability testing with partner institutions
3. **Performance Optimization**: Optimize for large batch processing
4. **Knowledge Graph Visualization**: Implement visual representation of semantic networks
5. **Export Features**: Add PDF/CSV export for diagnostic reports

## Theoretical Framework

See `THEORETICAL_FRAMEWORK.md` for detailed theoretical foundations:
- Toulmin's Model of Argumentation
- Constructivist Theories of Writing Development
- Cognitive Load Theory
- Formative Assessment Theory

