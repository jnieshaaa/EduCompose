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
    analysis_router,
    kg_router,
    ocr_router,
    rubrics_router
)

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
    "https://edu-compose-git-main-jnieshaaa.vercel.app",
]

# Add any additional origins from ENV
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    for url in frontend_url.split(","):
        clean_url = url.strip().rstrip("/")
        if clean_url and clean_url not in allowed_origins:
            allowed_origins.append(clean_url)
            # Add variant with slash
            allowed_origins.append(f"{clean_url}/")

# Standard development variants
allowed_origins.extend([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
])

# Allow all in production/railway if needed for debugging CORS issues
if os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID"):
    # If standard origins fail, some developers prefer allow_origins=["*"] for debugging
    # But we'll try to be specific first, or use a regex
    pass

# Use more robust CORS handling
cors_origins = allowed_origins.copy()
# Explicitly add critical production origins
cors_origins.extend([
    "https://edu-compose.vercel.app",
    "https://edu-compose-production.vercel.app",
    "https://educompose.vercel.app",
    "https://educompose-production.vercel.app",
    "https://educompose-production.up.railway.app"
])

# Get environment flags
is_railway = os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID")
strict_cors = os.getenv("STRICT_CORS", "0").lower() in ("1", "true", "yes")

# In production (non-strict), allow all to prevent endpoint blocking
if is_railway and not strict_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
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
app.include_router(kg_router, prefix="/api/kg", tags=["Knowledge Graph"])
app.include_router(ocr_router, prefix="/api/ocr", tags=["OCR"])
app.include_router(rubrics_router, prefix="/api/rubrics", tags=["Rubrics"])

@app.on_event("startup")
async def startup_event():
    """
    Startup tasks: Database init and background model warmup
    """
    # Create tables if they don't exist
    from .database import engine
    from . import models
    # models.Base.metadata.create_all(bind=engine) # Disabled to prevent schema conflicts with Supabase
    
    # NLP warmup can take time (NLTK downloads), so we run it in background
    # to avoid Railway initial request timeouts.
    skip_flag = os.getenv("SKIP_MODEL_WARMUP", "").strip().lower()
    skip_warmup = skip_flag in ("1", "true", "yes")
    
    if not skip_warmup:
        import threading
        from .services.model_warmup import warmup_all_models
        
        def run_warmup():
            import asyncio
            try:
                # Use a specific event loop for this background thread
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(warmup_all_models())
            except Exception as e:
                print(f"Background warmup error: {e}")
                
        thread = threading.Thread(target=run_warmup)
        thread.daemon = True
        thread.start()
        print("Background model warmup started.")
    else:
        print("Model warmup skipped.")

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
    
    result = await warmup_all_models()
    return {
        "status": "warmed",
        "message": "Models warmed up successfully",
        **result
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"DEBUG: Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
