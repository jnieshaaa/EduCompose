# EduCompose Backend

Knowledge Graph–Enhanced NLP for Teacher-Assisted Essay Evaluation

## Features

- **FastAPI** - Modern, fast web framework for building APIs
- **SQLAlchemy** - SQL toolkit and ORM
- **Pydantic** - Data validation using Python type annotations
- **JWT Authentication** - Secure token-based authentication
- **NLP Analysis** - Essay analysis using NLTK and textstat
- **Knowledge Graph Integration** - Argument structure analysis

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables

Copy the example environment file and configure:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
DATABASE_URL=sqlite:///./edukompose.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
API_HOST=0.0.0.0
API_PORT=8000
```

### 3. Initialize Database with Dummy Data

```bash
python init_data.py
```

This will create the database tables and populate them with sample data from `data/dummy_data.json`.

### 4. Run the Server

```bash
python start.py
```

Or using uvicorn directly:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Access the API

- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Users

- `GET /api/users/me` - Get current user
- `GET /api/users` - Get all users

### Classes

- `GET /api/classes` - Get user's classes
- `POST /api/classes` - Create new class
- `GET /api/classes/{id}` - Get specific class

### Students

- `GET /api/students/class/{class_id}` - Get students by class
- `POST /api/students` - Create new student

### Essays

- `GET /api/essays` - Get essays (with optional class filter)
- `POST /api/essays` - Create new essay
- `GET /api/essays/{id}` - Get specific essay

### Analysis

- `POST /api/analysis/analyze` - Analyze essay
- `GET /api/analysis/dashboard-stats` - Get dashboard statistics

## Database

The application uses SQLite by default for development. For production, consider using PostgreSQL:

```env
DATABASE_URL=postgresql://username:password@localhost/edukompose
```

## Development

### Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── database.py          # Database configuration
│   ├── models/              # Database models (MVC - Model)
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── class_model.py
│   │   ├── student.py
│   │   ├── essay.py
│   │   └── analysis_report.py
│   ├── schemas/             # Request/Response schemas
│   │   ├── __init__.py
│   │   ├── auth_schemas.py
│   │   ├── user_schemas.py
│   │   ├── class_schemas.py
│   │   ├── student_schemas.py
│   │   ├── essay_schemas.py
│   │   └── analysis_schemas.py
│   ├── controllers/         # Request handlers (MVC - Controller)
│   │   ├── __init__.py
│   │   ├── auth_controller.py
│   │   ├── user_controller.py
│   │   ├── class_controller.py
│   │   ├── student_controller.py
│   │   ├── essay_controller.py
│   │   └── analysis_controller.py
│   ├── services/            # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   └── essay_analysis_service.py
│   └── nlp_modules/         # NLP analysis modules
│       ├── __init__.py
│       ├── grammar_analyzer.py
│       ├── readability_analyzer.py
│       ├── coherence_analyzer.py
│       ├── argument_miner.py
│       └── knowledge_graph_builder.py
├── requirements.txt         # Python dependencies
├── start.py                # Startup script
├── env.example             # Environment variables example
└── README.md               # This file
```

### Adding New Features

1. **Models**: Add new SQLAlchemy models in `models/` directory
2. **Schemas**: Add Pydantic schemas in `schemas/` directory
3. **Controllers**: Add API endpoints in `controllers/` directory
4. **Services**: Add business logic in `services/` directory

For detailed information about the MVC structure, see `MVC_STRUCTURE.md`.

## Testing

Run the test suite:

```bash
pytest
```

## Deployment

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "start.py"]
```

### Using Gunicorn

```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
