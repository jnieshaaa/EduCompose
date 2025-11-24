# Backend Walkthrough - Complete Guide

This document provides a comprehensive walkthrough of the EduCompose backend, explaining what each component does and how they work together.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Entry Point: `main.py`](#entry-point-mainpy)
4. [Database Layer](#database-layer)
5. [Models (Data Models)](#models-data-models)
6. [Schemas (API Contracts)](#schemas-api-contracts)
7. [Controllers (API Endpoints)](#controllers-api-endpoints)
8. [Services (Business Logic)](#services-business-logic)
9. [NLP Modules (Analysis Engine)](#nlp-modules-analysis-engine)
10. [Data Flow Example](#data-flow-example)
11. [API Endpoints Summary](#api-endpoints-summary)

---

## Architecture Overview

The backend follows a **layered architecture** pattern:

```
┌─────────────────────────────────────────┐
│         FastAPI Application             │
│         (main.py)                       │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────────┐
│ Controllers │  │  Middleware     │
│ (Endpoints) │  │  (Auth, CORS)   │
└──────┬──────┘  └─────────────────┘
       │
┌──────▼──────┐
│  Services   │
│ (Business   │
│  Logic)     │
└──────┬──────┘
       │
┌──────▼──────────────┐
│   NLP Modules       │
│  (Analysis Engine)  │
└──────┬──────────────┘
       │
┌──────▼──────┐
│  Database   │
│ (PostgreSQL)│
└─────────────┘
```

**Key Principles:**
- **Separation of Concerns**: Each layer has a specific responsibility
- **Dependency Injection**: FastAPI's `Depends()` provides dependencies
- **Service Layer**: Business logic separated from API endpoints
- **Modular NLP**: Each analysis dimension is a separate module

---

## Project Structure

```
backend/
├── app/                          # Main application package
│   ├── main.py                   # FastAPI app entry point
│   ├── database.py               # Database connection & session
│   │
│   ├── models/                   # SQLAlchemy ORM models (database tables)
│   │   ├── base.py               # Base model class
│   │   ├── user.py               # User model
│   │   ├── class_model.py        # Class model
│   │   ├── student.py            # Student model
│   │   ├── essay.py              # Essay model
│   │   └── analysis_report.py    # Analysis report model
│   │
│   ├── schemas/                  # Pydantic schemas (API request/response)
│   │   ├── auth_schemas.py       # Login/register schemas
│   │   ├── user_schemas.py        # User schemas
│   │   ├── essay_schemas.py      # Essay schemas
│   │   └── analysis_schemas.py   # Analysis schemas
│   │
│   ├── controllers/              # API endpoints (routers)
│   │   ├── auth_controller.py    # /api/auth endpoints
│   │   ├── user_controller.py   # /api/users endpoints
│   │   ├── essay_controller.py  # /api/essays endpoints
│   │   ├── analysis_controller.py # /api/analysis endpoints
│   │   └── kg_controller.py      # /api/kg endpoints
│   │
│   ├── services/                 # Business logic layer
│   │   ├── auth_service.py       # Authentication logic
│   │   └── essay_analysis_service.py # Essay analysis orchestration
│   │
│   └── nlp_modules/              # NLP analysis modules
│       ├── grammar_analyzer.py   # Grammar analysis
│       ├── readability_analyzer.py # Readability analysis
│       ├── coherence_analyzer.py  # Coherence analysis
│       ├── argument_miner.py     # Argument structure analysis
│       └── knowledge_graph_builder.py # Knowledge graph construction
│
├── database/                     # Database setup & migrations
│   ├── migrations/              # Alembic migrations
│   └── init_database.py         # Database initialization
│
└── start.py                      # Application startup script
```

---

## Entry Point: `main.py`

**Location**: `backend/app/main.py`

**Purpose**: Creates and configures the FastAPI application

### Code Explanation:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine
from .controllers import (
    auth_router,
    users_router,
    classes_router,
    students_router,
    essays_router,
    analysis_router
)
from .controllers import kg_controller

# Create database tables from models
models.Base.metadata.create_all(bind=engine)
```

**What this does:**
- Imports all routers (controllers) that handle different API endpoints
- Creates database tables automatically from SQLAlchemy models
- Sets up CORS middleware to allow frontend requests

```python
app = FastAPI(
    title="EduCompose API",
    description="Knowledge Graph–Enhanced NLP for Teacher-Assisted Essay Evaluation",
    version="1.0.0",
    docs_url="/api/docs",  # Swagger UI at /api/docs
    redoc_url="/api/redoc"  # ReDoc at /api/redoc
)
```

**What this does:**
- Creates the FastAPI application instance
- Configures API documentation endpoints
- Sets metadata for API docs

```python
# CORS middleware - allows frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**What this does:**
- Enables Cross-Origin Resource Sharing (CORS)
- Allows frontend running on different port/domain to access API
- `allow_origins=["*"]` is permissive (use specific URL in production)

```python
# Register all API routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(classes_router, prefix="/api/classes", tags=["Classes"])
app.include_router(students_router, prefix="/api/students", tags=["Students"])
app.include_router(essays_router, prefix="/api/essays", tags=["Essays"])
app.include_router(analysis_router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(kg_controller.kg_router, prefix="/api/kg", tags=["Knowledge Graph"])
```

**What this does:**
- Registers all API endpoints under `/api/` prefix
- Each router handles a specific domain (auth, users, essays, etc.)
- Tags organize endpoints in API documentation

---

## Database Layer

### `database.py`

**Location**: `backend/app/database.py`

**Purpose**: Manages database connection and sessions

### Code Explanation:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required...")
```

**What this does:**
- Loads database connection string from `.env` file
- Requires PostgreSQL (SQLite removed)
- Raises error if not configured

```python
# Create SQLAlchemy engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using (auto-reconnect)
    pool_size=10,         # Keep 10 connections ready
    max_overflow=20,      # Allow up to 20 additional connections
    echo=False            # Set to True to log all SQL queries
)
```

**What this does:**
- Creates database engine with connection pooling
- `pool_pre_ping=True`: Checks if connection is alive before use (handles dropped connections)
- `pool_size=10`: Maintains 10 ready connections for performance
- `max_overflow=20`: Allows temporary burst of connections

```python
# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db  # Provide session to endpoint
    finally:
        db.close()  # Always close session when done
```

**What this does:**
- Creates session factory bound to engine
- `get_db()` is a **dependency** used by FastAPI endpoints
- `yield` provides session, `finally` ensures cleanup
- Used like: `db: Session = Depends(get_db)`

---

## Models (Data Models)

**Location**: `backend/app/models/`

**Purpose**: Define database tables using SQLAlchemy ORM

### Example: `essay.py`

```python
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class Essay(Base):
    __tablename__ = "essays"  # Table name in database
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic essay fields
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # Full essay text
    
    # Foreign keys (relationships to other tables)
    student_id = Column(Integer, ForeignKey("students.id"))
    teacher_id = Column(Integer, ForeignKey("users.id"))
    class_id = Column(Integer, ForeignKey("classes.id"))
    
    # Timestamps
    submitted_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="submitted")  # submitted, analyzed, reviewed
    
    # Analysis scores (0-100)
    grammar_score = Column(Float)
    readability_score = Column(Float)
    coherence_score = Column(Float)
    argument_strength_score = Column(Float)
    overall_score = Column(Float)
    
    # Detailed analysis stored as JSON
    grammar_errors = Column(JSON)  # List of error objects
    style_issues = Column(JSON)     # List of style issues
    argument_analysis = Column(JSON)  # Complex analysis data
    recommendations = Column(JSON)   # AI recommendations
    
    # Relationships (SQLAlchemy relationships)
    student = relationship("Student", back_populates="essays")
    teacher = relationship("User", back_populates="essays")
    class_obj = relationship("Class", back_populates="essays")
```

**What this does:**
- Defines the `essays` table structure
- `Column()` defines each database column
- `ForeignKey()` creates relationships to other tables
- `relationship()` enables easy access to related objects (e.g., `essay.student.name`)
- `JSON` columns store complex nested data

**Usage in code:**
```python
# Create essay
essay = Essay(
    title="My Essay",
    content="Essay content here...",
    student_id=1,
    teacher_id=2
)
db.add(essay)
db.commit()

# Access relationships
print(essay.student.name)  # Automatically loads related student
print(essay.teacher.email)  # Automatically loads related teacher
```

---

## Schemas (API Contracts)

**Location**: `backend/app/schemas/`

**Purpose**: Define request/response structures using Pydantic

### Example: `analysis_schemas.py`

```python
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class AnalysisRequest(BaseModel):
    """Request schema for analyzing an essay"""
    essay_id: int
    analysis_type: str = "comprehensive"  # grammar, readability, coherence, argument, comprehensive
```

**What this does:**
- Defines what data the API expects in requests
- Pydantic automatically validates data types
- `= "comprehensive"` sets default value

```python
class AnalysisResponse(BaseModel):
    """Response schema for analysis results"""
    essay_id: int
    analysis_type: str
    scores: Dict[str, float]  # {"grammar": 85.5, "readability": 78.2, ...}
    detailed_analysis: Dict[str, Any]  # Full analysis details
    recommendations: List[Dict[str, Any]]]  # List of recommendations
    diagnostic_summary: Optional[Dict[str, Any]] = None
    word_count: Optional[int] = None
    generated_at: datetime
```

**What this does:**
- Defines what the API returns
- FastAPI automatically serializes to JSON
- `Optional[...]` means field can be None
- `Dict[str, Any]` allows flexible nested structures

**Usage in endpoints:**
```python
@analysis_router.post("/analyze", response_model=AnalysisResponse)
async def analyze_essay(
    analysis_request: AnalysisRequest,  # FastAPI validates request
    ...
):
    # ... perform analysis ...
    return AnalysisResponse(...)  # FastAPI validates response
```

---

## Controllers (API Endpoints)

**Location**: `backend/app/controllers/`

**Purpose**: Handle HTTP requests and responses

### Example: `analysis_controller.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..models import User, Essay
from ..schemas import AnalysisRequest, AnalysisResponse
from ..database import get_db
from ..services import auth_service, essay_analysis_service

analysis_router = APIRouter()  # Create router for this module
```

**What this does:**
- `APIRouter()` groups related endpoints
- `Depends()` injects dependencies (database, auth)

```python
@analysis_router.post("/analyze", response_model=AnalysisResponse)
async def analyze_essay(
    analysis_request: AnalysisRequest,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
```

**What this does:**
- `@analysis_router.post()` creates POST endpoint at `/api/analysis/analyze`
- `Depends(auth_service.get_current_user)` requires authentication
- `Depends(get_db)` provides database session
- FastAPI automatically validates `AnalysisRequest` and serializes `AnalysisResponse`

```python
    # Get essay from database
    essay = db.query(Essay).filter(
        Essay.id == analysis_request.essay_id,
        Essay.teacher_id == current_user.id  # Security: only teacher's essays
    ).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
```

**What this does:**
- Queries database using SQLAlchemy
- Filters by essay ID and teacher ID (security)
- Raises HTTP 404 if not found

```python
    # Perform analysis using service layer
    analysis_result = await essay_analysis_service.analyze_essay(
        essay, 
        analysis_request.analysis_type
    )
    
    # Update essay with results
    essay.grammar_score = analysis_result["scores"].get("grammar", 0)
    essay.overall_score = analysis_result["scores"].get("overall", 0)
    essay.status = "analyzed"
    
    db.commit()  # Save to database
    
    return AnalysisResponse(...)  # Return to client
```

**What this does:**
- Calls service layer for business logic
- Updates database with analysis results
- Commits changes
- Returns response to client

---

## Services (Business Logic)

**Location**: `backend/app/services/`

**Purpose**: Contains business logic, separated from API endpoints

### Example: `essay_analysis_service.py`

```python
from ..nlp_modules import (
    GrammarAnalyzer,
    ReadabilityAnalyzer,
    CoherenceAnalyzer,
    ArgumentMiner,
    KnowledgeGraphBuilder
)

class EssayAnalysisService:
    """Orchestrates all NLP modules for comprehensive essay analysis"""
    
    def __init__(self):
        # Initialize all NLP analyzers
        self.grammar_analyzer = GrammarAnalyzer()
        self.readability_analyzer = ReadabilityAnalyzer()
        self.coherence_analyzer = CoherenceAnalyzer()
        self.argument_miner = ArgumentMiner()
        self.knowledge_graph_builder = KnowledgeGraphBuilder()
```

**What this does:**
- Service class encapsulates business logic
- Initializes all NLP modules once (singleton pattern)
- Reusable across different endpoints

```python
    async def analyze_essay(self, essay: Essay, analysis_type: str = "comprehensive") -> Dict[str, Any]:
        """Main analysis method"""
        content = essay.content
        return await self._perform_analysis(content, analysis_type)
    
    async def _perform_analysis(self, content: str, analysis_type: str) -> Dict[str, Any]:
        # Validate essay length
        word_count = len(content.split())
        if word_count < 150:
            return {"error": "Essay too short", ...}
        
        # Run different analyzers based on type
        grammar_analysis = {}
        readability_analysis = {}
        coherence_analysis = {}
        argument_analysis = {}
        knowledge_graph = {}
        
        if analysis_type in ["grammar", "comprehensive"]:
            grammar_analysis = self.grammar_analyzer.analyze(content)
        
        if analysis_type in ["readability", "comprehensive"]:
            readability_analysis = self.readability_analyzer.analyze(content)
        
        # ... more analyzers ...
        
        # Calculate overall score (weighted average)
        weights = {
            "grammar": 0.20,
            "readability": 0.20,
            "coherence": 0.25,
            "argument_strength": 0.25,
            "knowledge_graph": 0.10
        }
        overall_score = sum(scores[dim] * weights[dim] for dim in scores.keys())
        
        # Generate recommendations
        recommendations = self._generate_diagnostic_recommendations(...)
        
        return {
            "scores": {...},
            "detailed_analysis": {...},
            "recommendations": recommendations,
            ...
        }
```

**What this does:**
- Orchestrates multiple NLP modules
- Combines results into unified response
- Calculates weighted overall score
- Generates teacher-focused recommendations
- Returns structured analysis data

---

## NLP Modules (Analysis Engine)

**Location**: `backend/app/nlp_modules/`

**Purpose**: Individual analysis modules for different dimensions

### Example: `grammar_analyzer.py`

```python
class GrammarAnalyzer:
    """Analyzes grammatical correctness and syntactic patterns"""
    
    def __init__(self):
        self.nlp = None  # spaCy model (lazy loaded)
        self.language_tool = None  # LanguageTool (lazy loaded)
    
    def _ensure_nlp_loaded(self):
        """Lazy load spaCy to avoid startup errors"""
        if self.nlp is None:
            self.nlp = load_spacy_model("en_core_web_sm")
```

**What this does:**
- Lazy loading: Only loads heavy models when needed
- Avoids Python 3.12 compatibility issues at startup

```python
    def analyze(self, text: str) -> Dict[str, Any]:
        """Main analysis method"""
        results = {
            "score": 100.0,
            "errors": [],
            "error_count": 0,
            ...
        }
        
        # Use LanguageTool for grammar checking
        self._ensure_language_tool_loaded()
        if self.language_tool:
            grammar_errors = self._check_with_languagetool(text)
            results["errors"].extend(grammar_errors)
        
        # Use spaCy for syntactic analysis
        self._ensure_nlp_loaded()
        if self.nlp:
            syntax_analysis = self._analyze_syntax(text)
            results["syntax_patterns"] = syntax_analysis
        
        # Calculate score based on error density
        error_density = results["error_count"] / total_words
        results["score"] = max(0.0, 100.0 - (error_density * 1000))
        
        return results
```

**What this does:**
- Uses LanguageTool for grammar checking
- Uses spaCy for syntactic analysis
- Calculates score based on error density
- Returns structured results

**Other NLP Modules:**
- `readability_analyzer.py`: Flesch-Kincaid, SMOG index, lexical diversity
- `coherence_analyzer.py`: Entity grid, semantic similarity, transitions
- `argument_miner.py`: Toulmin model (claims, evidence, warrants)
- `knowledge_graph_builder.py`: Concept extraction, relationship detection

---

## Data Flow Example

### Example: Analyzing an Essay

**Step 1: Client sends request**
```
POST /api/analysis/analyze
{
  "essay_id": 123,
  "analysis_type": "comprehensive"
}
```

**Step 2: Controller receives request**
```python
# analysis_controller.py
@analysis_router.post("/analyze")
async def analyze_essay(
    analysis_request: AnalysisRequest,  # Validated by Pydantic
    current_user: User = Depends(auth_service.get_current_user),  # Auth check
    db: Session = Depends(get_db)  # Database session
):
```

**Step 3: Controller queries database**
```python
    essay = db.query(Essay).filter(
        Essay.id == analysis_request.essay_id,
        Essay.teacher_id == current_user.id
    ).first()
```

**Step 4: Controller calls service**
```python
    analysis_result = await essay_analysis_service.analyze_essay(
        essay, 
        analysis_request.analysis_type
    )
```

**Step 5: Service orchestrates NLP modules**
```python
# essay_analysis_service.py
grammar_analysis = self.grammar_analyzer.analyze(content)
readability_analysis = self.readability_analyzer.analyze(content)
coherence_analysis = self.coherence_analyzer.analyze(content)
argument_analysis = self.argument_miner.analyze(content)
knowledge_graph = self.knowledge_graph_builder.build(content)
```

**Step 6: Service combines results**
```python
    scores = {
        "grammar": grammar_analysis.get("score", 0.0),
        "readability": readability_analysis.get("score", 0.0),
        ...
    }
    overall_score = sum(scores[dim] * weights[dim] for dim in scores.keys())
```

**Step 7: Controller updates database**
```python
    essay.grammar_score = analysis_result["scores"].get("grammar", 0)
    essay.overall_score = analysis_result["scores"].get("overall", 0)
    essay.status = "analyzed"
    db.commit()
```

**Step 8: Controller returns response**
```python
    return AnalysisResponse(
        essay_id=essay.id,
        scores=analysis_result["scores"],
        detailed_analysis=analysis_result["detailed_analysis"],
        ...
    )
```

**Step 9: FastAPI serializes to JSON**
```json
{
  "essay_id": 123,
  "scores": {
    "grammar": 85.5,
    "readability": 78.2,
    "coherence": 82.1,
    "argument_strength": 79.8,
    "overall": 81.4
  },
  "detailed_analysis": {...},
  "recommendations": [...]
}
```

---

## API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Users (`/api/users`)
- `GET /api/users/me` - Get current user
- `GET /api/users/{user_id}` - Get user by ID

### Classes (`/api/classes`)
- `GET /api/classes` - List classes
- `POST /api/classes` - Create class
- `GET /api/classes/{class_id}` - Get class details

### Students (`/api/students`)
- `GET /api/students` - List students
- `POST /api/students` - Create student
- `GET /api/students/{student_id}` - Get student details

### Essays (`/api/essays`)
- `GET /api/essays` - List essays
- `POST /api/essays` - Create essay
- `GET /api/essays/{essay_id}` - Get essay details
- `PUT /api/essays/{essay_id}` - Update essay

### Analysis (`/api/analysis`)
- `POST /api/analysis/analyze` - Analyze essay (requires auth)
- `POST /api/analysis/analyze-text` - Analyze raw text (no auth)
- `POST /api/analysis/batch-analyze` - Analyze multiple essays
- `GET /api/analysis/dashboard-stats` - Get dashboard statistics

### Knowledge Graph (`/api/kg`)
- `POST /api/kg/build` - Build knowledge graph for essay
- `GET /api/kg/{essay_id}` - Get knowledge graph
- `POST /api/kg/export` - Export to Neo4j

---

## Key Concepts

### Dependency Injection
FastAPI uses `Depends()` to inject dependencies:
```python
async def endpoint(
    db: Session = Depends(get_db),  # Injects database session
    user: User = Depends(auth_service.get_current_user)  # Injects authenticated user
):
```

### Async/Await
Most endpoints are `async` for better performance:
```python
async def analyze_essay(...):  # Can handle concurrent requests
    result = await essay_analysis_service.analyze_essay(...)
```

### Pydantic Validation
Schemas automatically validate request data:
```python
class AnalysisRequest(BaseModel):
    essay_id: int  # Must be integer
    analysis_type: str = "comprehensive"  # Optional with default
```

### SQLAlchemy ORM
Database queries use ORM instead of raw SQL:
```python
essay = db.query(Essay).filter(Essay.id == 123).first()  # Type-safe, readable
```

---

## Environment Variables

Required in `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/educompose_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
API_HOST=0.0.0.0
API_PORT=8000
```

---

## Running the Backend

```bash
# Start the server
python start.py

# Or directly with uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**API Documentation:**
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

---

## Summary

1. **main.py**: Creates FastAPI app, registers routers
2. **database.py**: Manages PostgreSQL connections
3. **models/**: Define database tables (SQLAlchemy)
4. **schemas/**: Define API contracts (Pydantic)
5. **controllers/**: Handle HTTP requests/responses
6. **services/**: Business logic layer
7. **nlp_modules/**: Individual analysis modules

**Flow**: Request → Controller → Service → NLP Modules → Database → Response

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Easy testing (each layer can be tested independently)
- ✅ Scalability (can add new modules easily)
- ✅ Maintainability (changes isolated to specific layers)

