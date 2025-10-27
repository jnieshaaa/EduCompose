from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json

from . import models, schemas
from .database import get_db
from .services import essay_analysis_service, auth_service

# Router instances
auth_router = APIRouter()
users_router = APIRouter()
classes_router = APIRouter()
students_router = APIRouter()
essays_router = APIRouter()
analysis_router = APIRouter()

# Authentication routes
@auth_router.post("/login")
async def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    return await auth_service.authenticate_user(credentials, db)

@auth_router.post("/register")
async def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    return await auth_service.create_user(user_data, db)

# User routes
@users_router.get("/me", response_model=schemas.UserResponse)
async def get_current_user(current_user: models.User = Depends(auth_service.get_current_user)):
    return current_user

@users_router.get("/", response_model=List[schemas.UserResponse])
async def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

# Class routes
@classes_router.post("/", response_model=schemas.ClassResponse)
async def create_class(
    class_data: schemas.ClassCreate,
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    db_class = models.Class(
        name=class_data.name,
        description=class_data.description,
        teacher_id=current_user.id
    )
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

@classes_router.get("/", response_model=List[schemas.ClassResponse])
async def get_classes(
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    classes = db.query(models.Class).filter(models.Class.teacher_id == current_user.id).all()
    return classes

@classes_router.get("/{class_id}", response_model=schemas.ClassResponse)
async def get_class(
    class_id: int,
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    class_obj = db.query(models.Class).filter(
        models.Class.id == class_id,
        models.Class.teacher_id == current_user.id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    return class_obj

# Student routes
@students_router.post("/", response_model=schemas.StudentResponse)
async def create_student(
    student_data: schemas.StudentCreate,
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    # Verify class belongs to current user
    class_obj = db.query(models.Class).filter(
        models.Class.id == student_data.class_id,
        models.Class.teacher_id == current_user.id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    db_student = models.Student(
        student_id=student_data.student_id,
        full_name=student_data.full_name,
        email=student_data.email,
        class_id=student_data.class_id
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@students_router.get("/class/{class_id}", response_model=List[schemas.StudentResponse])
async def get_students_by_class(
    class_id: int,
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    # Verify class belongs to current user
    class_obj = db.query(models.Class).filter(
        models.Class.id == class_id,
        models.Class.teacher_id == current_user.id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    students = db.query(models.Student).filter(models.Student.class_id == class_id).all()
    return students

# Essay routes
@essays_router.post("/", response_model=schemas.EssayResponse)
async def create_essay(
    essay_data: schemas.EssayCreate,
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    # Verify class belongs to current user
    class_obj = db.query(models.Class).filter(
        models.Class.id == essay_data.class_id,
        models.Class.teacher_id == current_user.id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    db_essay = models.Essay(
        title=essay_data.title,
        content=essay_data.content,
        student_id=essay_data.student_id,
        teacher_id=current_user.id,
        class_id=essay_data.class_id
    )
    db.add(db_essay)
    db.commit()
    db.refresh(db_essay)
    return db_essay

@essays_router.get("/", response_model=List[schemas.EssayResponse])
async def get_essays(
    class_id: int = None,
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Essay).filter(models.Essay.teacher_id == current_user.id)
    if class_id:
        query = query.filter(models.Essay.class_id == class_id)
    
    essays = query.all()
    return essays

@essays_router.get("/{essay_id}", response_model=schemas.EssayResponse)
async def get_essay(
    essay_id: int,
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    essay = db.query(models.Essay).filter(
        models.Essay.id == essay_id,
        models.Essay.teacher_id == current_user.id
    ).first()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    return essay

# Analysis routes
@analysis_router.post("/analyze", response_model=schemas.AnalysisResponse)
async def analyze_essay(
    analysis_request: schemas.AnalysisRequest,
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    # Get essay
    essay = db.query(models.Essay).filter(
        models.Essay.id == analysis_request.essay_id,
        models.Essay.teacher_id == current_user.id
    ).first()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    
    # Perform analysis
    analysis_result = await essay_analysis_service.analyze_essay(essay, analysis_request.analysis_type)
    
    # Update essay with analysis results
    essay.grammar_score = analysis_result["scores"].get("grammar", 0)
    essay.readability_score = analysis_result["scores"].get("readability", 0)
    essay.coherence_score = analysis_result["scores"].get("coherence", 0)
    essay.argument_strength_score = analysis_result["scores"].get("argument_strength", 0)
    essay.overall_score = analysis_result["scores"].get("overall", 0)
    essay.grammar_errors = analysis_result["detailed_analysis"].get("grammar_errors", [])
    essay.style_issues = analysis_result["detailed_analysis"].get("style_issues", [])
    essay.argument_analysis = analysis_result["detailed_analysis"].get("argument_analysis", {})
    essay.recommendations = analysis_result["recommendations"]
    essay.status = "analyzed"
    
    db.commit()
    
    return schemas.AnalysisResponse(
        essay_id=essay.id,
        analysis_type=analysis_request.analysis_type,
        scores=analysis_result["scores"],
        detailed_analysis=analysis_result["detailed_analysis"],
        recommendations=analysis_result["recommendations"],
        generated_at=datetime.utcnow()
    )

@analysis_router.get("/dashboard-stats")
async def get_dashboard_stats(
    current_user: models.User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    # Get basic statistics
    total_essays = db.query(models.Essay).filter(models.Essay.teacher_id == current_user.id).count()
    total_classes = db.query(models.Class).filter(models.Class.teacher_id == current_user.id).count()
    total_students = db.query(models.Student).join(models.Class).filter(models.Class.teacher_id == current_user.id).count()
    
    # Get recent essays
    recent_essays = db.query(models.Essay).filter(
        models.Essay.teacher_id == current_user.id
    ).order_by(models.Essay.submitted_at.desc()).limit(5).all()
    
    # Get class statistics
    classes = db.query(models.Class).filter(models.Class.teacher_id == current_user.id).all()
    class_stats = []
    for class_obj in classes:
        essay_count = db.query(models.Essay).filter(models.Essay.class_id == class_obj.id).count()
        student_count = db.query(models.Student).filter(models.Student.class_id == class_obj.id).count()
        class_stats.append({
            "id": class_obj.id,
            "name": class_obj.name,
            "essay_count": essay_count,
            "student_count": student_count
        })
    
    return {
        "total_essays": total_essays,
        "total_classes": total_classes,
        "total_students": total_students,
        "recent_essays": recent_essays,
        "class_stats": class_stats
    }