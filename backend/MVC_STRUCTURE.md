# MVC Structure Documentation

## Overview

The backend has been refactored to follow a proper MVC (Model-View-Controller) architecture pattern for better organization and maintainability.

## Directory Structure

```
backend/app/
├── models/              # M - Database models (SQLAlchemy ORM)
│   ├── __init__.py
│   ├── base.py
│   ├── user.py
│   ├── class_model.py
│   ├── student.py
│   ├── essay.py
│   └── analysis_report.py
├── schemas/             # Request/Response models (Pydantic)
│   ├── __init__.py
│   ├── auth_schemas.py
│   ├── user_schemas.py
│   ├── class_schemas.py
│   ├── student_schemas.py
│   ├── essay_schemas.py
│   └── analysis_schemas.py
├── controllers/         # C - Request handlers (FastAPI routes)
│   ├── __init__.py
│   ├── auth_controller.py
│   ├── user_controller.py
│   ├── class_controller.py
│   ├── student_controller.py
│   ├── essay_controller.py
│   └── analysis_controller.py
├── services/            # Business logic layer
│   ├── __init__.py
│   ├── auth_service.py
│   └── essay_analysis_service.py
├── nlp_modules/         # NLP analysis modules
│   ├── __init__.py
│   ├── grammar_analyzer.py
│   ├── readability_analyzer.py
│   ├── coherence_analyzer.py
│   ├── argument_miner.py
│   └── knowledge_graph_builder.py
├── main.py              # Application entry point
├── database.py          # Database configuration
└── utils.py             # Utility functions
```

## Architecture Layers

### 1. Models (Data Layer)

**Location**: `app/models/`

- **Purpose**: Database entities using SQLAlchemy ORM
- **Responsibilities**:
  - Define database schema
  - Define relationships between entities
  - Provide data access abstraction

**Example**: `models/user.py` contains the `User` model with all database fields and relationships.

### 2. Schemas (Validation Layer)

**Location**: `app/schemas/`

- **Purpose**: Pydantic models for request/response validation
- **Responsibilities**:
  - Validate incoming request data
  - Serialize response data
  - Define API contracts

**Example**: `schemas/user_schemas.py` contains `UserCreate`, `UserResponse` for API input/output.

### 3. Controllers (Request Handling Layer)

**Location**: `app/controllers/`

- **Purpose**: Handle HTTP requests and responses
- **Responsibilities**:
  - Receive HTTP requests
  - Validate input using schemas
  - Call appropriate services
  - Return HTTP responses
  - Handle authentication/authorization

**Example**: `controllers/auth_controller.py` handles login/register endpoints.

### 4. Services (Business Logic Layer)

**Location**: `app/services/`

- **Purpose**: Contains business logic and orchestration
- **Responsibilities**:
  - Implement business rules
  - Coordinate between different components
  - Handle complex operations
  - Provide reusable business logic

**Example**: `services/essay_analysis_service.py` orchestrates NLP analysis across multiple modules.

## Data Flow

```
HTTP Request
    ↓
Controller (validates request, handles HTTP)
    ↓
Service (business logic)
    ↓
Model (database operations)
    ↓
Response (via Controller)
```

## Benefits of MVC Structure

1. **Separation of Concerns**: Each layer has a clear responsibility
2. **Maintainability**: Easy to locate and modify code
3. **Testability**: Each layer can be tested independently
4. **Scalability**: Easy to add new features without affecting existing code
5. **Code Reusability**: Services can be reused across different controllers

## Migration Notes

### Old Files (Deprecated)

The following files are deprecated but kept for backwards compatibility:

- `app/models.py` - Use `app/models/` package instead
- `app/schemas.py` - Use `app/schemas/` package instead
- `app/services.py` - Use `app/services/` package instead
- `app/routes.py` - Use `app/controllers/` package instead

### Import Changes

**Old**:

```python
from app import models
from app import schemas
from app.services import auth_service
```

**New**:

```python
from app.models import User, Class, Essay
from app.schemas import UserCreate, UserResponse
from app.services import auth_service
```

The new structure maintains backwards compatibility through package `__init__.py` files that export all necessary components.

## Adding New Features

### Adding a New Model

1. Create file in `app/models/` (e.g., `app/models/new_model.py`)
2. Export in `app/models/__init__.py`

### Adding a New Controller

1. Create file in `app/controllers/` (e.g., `app/controllers/new_controller.py`)
2. Create router and endpoints
3. Export router in `app/controllers/__init__.py`
4. Register in `app/main.py`

### Adding a New Service

1. Create file in `app/services/` (e.g., `app/services/new_service.py`)
2. Implement business logic
3. Export in `app/services/__init__.py`

### Adding a New Schema

1. Create file in `app/schemas/` (e.g., `app/schemas/new_schemas.py`)
2. Define Pydantic models
3. Export in `app/schemas/__init__.py`

## Best Practices

1. **Controllers should be thin**: Only handle HTTP concerns, delegate to services
2. **Services contain business logic**: Don't put business logic in controllers
3. **Models are data-only**: No business logic in models
4. **Schemas validate data**: Use schemas for all API input/output
5. **Keep dependencies clear**: Controllers → Services → Models
