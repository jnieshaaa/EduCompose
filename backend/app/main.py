from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
import uvicorn

from . import models, routes
from .database import get_db, engine

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EduCompose API",
    description="Knowledge Graph–Enhanced NLP for Teacher-Assisted Essay Evaluation",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routers
app.include_router(routes.auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(routes.users_router, prefix="/api/users", tags=["Users"])
app.include_router(routes.classes_router, prefix="/api/classes", tags=["Classes"])
app.include_router(routes.students_router, prefix="/api/students", tags=["Students"])
app.include_router(routes.essays_router, prefix="/api/essays", tags=["Essays"])
app.include_router(routes.analysis_router, prefix="/api/analysis", tags=["Analysis"])

@app.get("/")
async def root():
    return {
        "message": "EduCompose API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "EduCompose API is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
