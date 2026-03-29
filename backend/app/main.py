from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import uvicorn

from .controllers import (
    auth_router,
    users_router,
    classes_router,
    students_router,
    essays_router,
    analysis_router
)
from .controllers import kg_controller, ocr_controller

app = FastAPI(
    title="EduCompose API",
    description="Knowledge Graph–Enhanced NLP for Teacher-Assisted Essay Evaluation",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

import os

# CORS middleware
# Get permitted origins from environment variable or use defaults
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://edu-compose.vercel.app",
    "https://edu-compose-production.vercel.app",
    "https://educompose.vercel.app",
    "https://educompose-production.vercel.app",
]

# Add production frontend URL if it exists
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

print(f"INFO:    Setting up CORS with origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routers (controllers)
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(classes_router, prefix="/api/classes", tags=["Classes"])
app.include_router(students_router, prefix="/api/students", tags=["Students"])
app.include_router(essays_router, prefix="/api/essays", tags=["Essays"])
app.include_router(analysis_router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(kg_controller.kg_router, prefix="/api/kg", tags=["Knowledge Graph"])
app.include_router(ocr_controller.ocr_router, prefix="/api/ocr", tags=["OCR"])

@app.on_event("startup")
async def startup_event():
    """Create database tables if needed, then optionally warm up NLP models"""
    # Create tables if they don't exist (e.g. when using SQLite)
    from .database import engine
    from . import models
    models.Base.metadata.create_all(bind=engine)

    # Warmup loads SentenceTransformer + DistilBERT + spaCy at once (~1GB+ RAM).
    # Railway / small containers OOM ("Killed") if this runs at boot.
    skip_flag = os.getenv("SKIP_MODEL_WARMUP", "").strip().lower()
    on_railway = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID"))
    if skip_flag in ("1", "true", "yes"):
        skip_warmup = True
    elif skip_flag in ("0", "false", "no"):
        skip_warmup = False
    else:
        skip_warmup = on_railway

    if skip_warmup:
        print(
            "\nSKIP_MODEL_WARMUP: NLP model warmup disabled "
            "(first /api/analysis request may be slower). "
            "Set SKIP_MODEL_WARMUP=0 to enable warmup.\n"
        )
    else:
        print("\nWarming up NLP models (this may take 30-60 seconds)...")
        print("   Please wait - this ensures fast analysis responses...")
        try:
            from .services.model_warmup import warmup_all_models
            warmup_result = warmup_all_models()
            if warmup_result.get("status") == "complete":
                print(f"Model warmup complete in {warmup_result.get('duration', 0):.2f}s")
                print(f"  {warmup_result.get('success_count', 0)} models ready")
                if warmup_result.get("errors"):
                    print(f"  {len(warmup_result['errors'])} warnings (non-critical)")
            else:
                print("Model warmup skipped (already warmed)")
        except Exception as e:
            print(f"Warning: Model warmup failed: {e}")
            print("  The app will continue, but first analysis may be slow.")
        print()

@app.get("/")
async def root():
    return {
        "message": "EduCompose API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }

@app.get("/api/health")
async def health_check():
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info("Health check endpoint called")
    return {"status": "healthy", "message": "EduCompose API is running", "environment": os.getenv("RAILWAY_ENVIRONMENT", "development")}

@app.get("/api/warmup")
async def warmup_endpoint():
    """
    Manually trigger NLP model warmup.
    Useful for keeping models loaded on serverless platforms.
    """
    from .services.model_warmup import warmup_all_models, get_warmup_status
    
    status = get_warmup_status()
    if status["warmed"]:
        return {
            "status": "already_warmed",
            "message": "Models already warmed up",
            "duration": status.get("duration"),
            "warmed": True
        }
    
    result = warmup_all_models()
    return {
        "status": "warmed",
        "message": "Models warmed up successfully",
        **result
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
