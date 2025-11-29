# EduCompose Backend - Complete Documentation

**Knowledge Graph–Enhanced NLP for Teacher-Assisted Essay Evaluation**

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Environment Setup](#environment-setup)
4. [Architecture](#architecture)
5. [API Endpoints](#api-endpoints)
6. [Database Setup](#database-setup)
7. [NLP Analysis](#nlp-analysis)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Python 3.8+ (tested with Python 3.12)
- pip (Python package manager)
- PostgreSQL (optional, SQLite works for development)

### Setup Steps

1. **Create virtual environment:**
   ```bash
   python -m venv .venv
   
   # Activate it
   # Windows PowerShell:
   .\.venv\Scripts\Activate.ps1
   # Windows Command Prompt:
   .venv\Scripts\activate.bat
   # macOS/Linux:
   source .venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   python -m pip install --upgrade pip setuptools wheel
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   ```

3. **Configure environment:**
   ```bash
   copy env.example .env  # Windows
   # or
   cp env.example .env    # Linux/macOS
   ```

4. **Edit `.env` file:**
   ```env
   DATABASE_URL=sqlite:///./educompose.db
   SECRET_KEY=<generate-a-secret-key>
   API_HOST=0.0.0.0
   API_PORT=8000
   ```

   Generate SECRET_KEY:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

5. **Start server:**
   ```bash
   python start.py
   ```

6. **Access API:**
   - API: http://localhost:8000
   - Interactive Docs: http://localhost:8000/api/docs
   - ReDoc: http://localhost:8000/api/redoc

---

## Installation

### Python 3.12 Notes

For Python 3.12, you may need to upgrade pip and setuptools first:

```bash
python -m pip install --upgrade pip setuptools wheel
```

The `requirements.txt` file includes all necessary dependencies without version pins, allowing pip to automatically select Python 3.12 compatible versions.

### Optional Dependencies

- **spacy-transformers**: Requires C++ build tools on Windows. Optional - backend works without it.
- **sentence-transformers**: Will automatically select compatible versions with pre-built wheels.

### Installation Scripts

- **Windows**: `install_py312.bat`
- **Linux/macOS**: `install_py312.sh`

Run these scripts for automated installation setup.

---

## Environment Setup

### .env File Location

Place your `.env` file in the `backend/` directory, next to `env.example`.

### Environment Variables

```env
# Database Configuration
# For SQLite (development):
DATABASE_URL=sqlite:///./educompose.db
# For PostgreSQL (production):
# DATABASE_URL=postgresql://username:password@localhost:5432/educompose_db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Database Connection Pool Settings (PostgreSQL only)
# SQL_ECHO=false  # Set to true to log all SQL queries (useful for debugging)
```

### Generating SECRET_KEY

```python
import secrets
print(secrets.token_urlsafe(32))
```

**Important**: Never commit your `.env` file to version control. It's already in `.gitignore`.

---

## Architecture

### MVC Structure

The backend follows a Model-View-Controller (MVC) architecture pattern:

```
backend/app/
├── models/              # M - Database models (SQLAlchemy ORM)
│   ├── user.py
│   ├── class_model.py
│   ├── student.py
│   ├── essay.py
│   └── analysis_report.py
├── schemas/             # Request/Response models (Pydantic)
│   ├── auth_schemas.py
│   ├── user_schemas.py
│   ├── class_schemas.py
│   ├── student_schemas.py
│   ├── essay_schemas.py
│   └── analysis_schemas.py
├── controllers/         # C - Request handlers (FastAPI routes)
│   ├── auth_controller.py
│   ├── user_controller.py
│   ├── class_controller.py
│   ├── student_controller.py
│   ├── essay_controller.py
│   └── analysis_controller.py
├── services/            # Business logic layer
│   ├── auth_service.py
│   └── essay_analysis_service.py
├── nlp_modules/         # NLP analysis modules
│   ├── grammar_analyzer.py
│   ├── readability_analyzer.py
│   ├── coherence_analyzer.py
│   ├── argument_miner.py
│   └── knowledge_graph_builder.py
├── main.py              # Application entry point
└── database.py          # Database configuration
```

### Architecture Layers

1. **Models** (`app/models/`): Database entities using SQLAlchemy ORM
2. **Schemas** (`app/schemas/`): Pydantic models for request/response validation
3. **Controllers** (`app/controllers/`): Handle HTTP requests and responses
4. **Services** (`app/services/`): Business logic and orchestration
5. **NLP Modules** (`app/nlp_modules/`): Essay analysis modules

---

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Users

- `GET /api/users/me` - Get current user (protected)
- `GET /api/users/` - Get all users (protected)

### Classes

- `POST /api/classes/` - Create class (protected)
- `GET /api/classes/` - Get all classes (protected)
- `GET /api/classes/{class_id}` - Get class by ID (protected)

### Students

- `POST /api/students/` - Create student (protected)
- `GET /api/students/` - Get all students (protected)
- `GET /api/students/class/{class_id}` - Get students by class (protected)

### Essays

- `POST /api/essays/` - Create essay (protected)
- `GET /api/essays/` - Get all essays (protected)
- `GET /api/essays/{essay_id}` - Get essay by ID (protected)

### Analysis

- `POST /api/analysis/analyze` - Analyze single essay (protected)
- `POST /api/analysis/batch-analyze` - Batch analyze essays (protected)
- `POST /api/analysis/analyze-text` - Analyze raw text (public, no auth required)
- `GET /api/analysis/dashboard-stats` - Get dashboard statistics (protected)

### Health Check

- `GET /api/health` - API health check
- `GET /` - Root endpoint with API info

### API Documentation

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

---

## Database Setup

### SQLite (Development - Default)

SQLite is used by default for development. No setup required - just ensure your `.env` has:

```env
DATABASE_URL=sqlite:///./educompose.db
```

The database file will be created automatically when you first run the application.

### PostgreSQL (Production)

For PostgreSQL setup, see: `database/README.md`

Quick setup:
1. Install PostgreSQL
2. Update `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/educompose_db
   ```
3. Initialize database:
   ```bash
   python database/init_database.py
   ```

For detailed PostgreSQL documentation, see:
- `database/README.md` - Complete database documentation
- `database/QUICK_START.md` - Quick setup guide
- `database/DATABASE_SETUP_OPTIONS.md` - Setup options
- `database/DATABASE_FLOW.md` - Database flow and relationships
- `database/SCHEMA_SUMMARY.md` - Schema reference

---

## NLP Analysis

### Multi-Dimensional Analysis

The system performs comprehensive essay analysis across multiple dimensions:

#### 1. Grammar Analysis (20% weight)
- Error detection using LanguageTool
- Syntax pattern analysis
- Sentence structure evaluation

#### 2. Readability Analysis (20% weight)
- Flesch Reading Ease
- Flesch-Kincaid Grade Level
- SMOG Index
- Coleman-Liau Index
- Lexical diversity

#### 3. Coherence Analysis (25% weight)
- Entity-grid model for discourse coherence
- Semantic similarity between sentences
- Transition analysis
- Paragraph unity assessment

#### 4. Argumentation Analysis (25% weight)
- Toulmin's model implementation:
  - Claims (thesis statements)
  - Grounds (evidence)
  - Warrants (reasoning)
  - Rebuttals (counterarguments)

#### 5. Knowledge Graph Analysis (10% weight)
- Concept extraction
- Relationship mapping
- Conceptual gap identification
- Connectivity scoring

### NLP Modules

- **GrammarAnalyzer**: Grammar and syntax analysis
- **ReadabilityAnalyzer**: Readability metrics
- **CoherenceAnalyzer**: Text coherence analysis
- **ArgumentMiner**: Argument structure mining
- **KnowledgeGraphBuilder**: Knowledge graph construction

---

## Testing

### Quick Test Guide

1. **Start the server:**
   ```bash
   python start.py
   ```

2. **Initialize test data:**
   ```bash
   python init_data.py
   ```

   This creates:
   - Test teacher user (email: `teacher@educompose.com`)
   - Sample classes
   - Sample students
   - Sample essays

3. **Test endpoints:**
   - Visit http://localhost:8000/api/docs for interactive API testing
   - Or use curl/Postman to test endpoints

### Test Data

Test data is loaded from `data/dummy_data.json`. You can customize this file to create your own test data.

### API Testing

Use the Swagger UI at http://localhost:8000/api/docs to:
- Test all endpoints interactively
- View request/response schemas
- Test authentication flows

---

## Troubleshooting

### Issue: Import Errors

**Solution**: Ensure all dependencies are installed:
```bash
pip install -r requirements.txt
```

**Check**: Python version is 3.8+ (recommended: 3.10+, tested with 3.12)

### Issue: Build Errors on Python 3.12

**Solution**: The `requirements.txt` includes Python 3.12 compatible versions. Ensure pip, setuptools, and wheel are up to date:
```bash
python -m pip install --upgrade pip setuptools wheel
```

### Issue: ModuleNotFoundError: No module named 'distutils'

**Solution**: Upgrade setuptools:
```bash
python -m pip install --upgrade setuptools
```

### Issue: Database Connection Errors

**For SQLite:**
- Check file permissions in `backend/` directory
- Ensure `.env` has correct `DATABASE_URL`

**For PostgreSQL:**
- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` format in `.env`
- Verify username, password, and database name

### Issue: Environment Variables Not Loading

**Solution**:
1. Verify `.env` is in the `backend/` directory
2. Check you're running from the correct directory
3. Verify no typos in variable names
4. Make sure there are no spaces around `=` in `.env`

### Issue: spaCy Model Not Found

**Solution**: Download the spaCy English model:
```bash
python -m spacy download en_core_web_sm
```

### Issue: CORS Errors in Frontend

**Solution**: Verify CORS is configured in `app/main.py`. The backend allows:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:5173`

### Issue: Authentication Token Expired

**Solution**: Check `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env`. Default is 30 minutes.

---

## Backend Readiness Checklist

✅ CORS configured for frontend  
✅ JWT authentication implemented  
✅ All API endpoints working  
✅ Database models created  
✅ NLP analysis modules integrated  
✅ Response formats aligned with frontend  
✅ Environment configuration set up  
✅ API documentation available  
✅ Health check endpoint working  

---

## Additional Resources

- **Database Documentation**: See `database/README.md` for detailed database setup
- **Frontend Integration**: Ensure frontend points to `http://localhost:8000/api`
- **API Documentation**: Interactive docs at `http://localhost:8000/api/docs`

---

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in terminal
3. Check API documentation at `/api/docs`
4. Verify environment variables in `.env`
5. Check database connection settings

---

**Last Updated**: 2024

