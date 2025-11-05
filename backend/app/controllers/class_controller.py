"""
Class Controller
Handles class management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..models import User, Class
from ..schemas import ClassCreate, ClassResponse
from ..services import auth_service

classes_router = APIRouter()

@classes_router.post("/", response_model=ClassResponse)
async def create_class(
    class_data: ClassCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new class"""
    db_class = Class(
        name=class_data.name,
        description=class_data.description,
        teacher_id=current_user.id
    )
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

@classes_router.get("/", response_model=List[ClassResponse])
async def get_classes(
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all classes for current user"""
    classes = db.query(Class).filter(Class.teacher_id == current_user.id).all()
    return classes

@classes_router.get("/{class_id}", response_model=ClassResponse)
async def get_class(
    class_id: int,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific class by ID"""
    class_obj = db.query(Class).filter(
        Class.id == class_id,
        Class.teacher_id == current_user.id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    return class_obj

