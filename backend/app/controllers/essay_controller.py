"""
Essay Controller
Handles essay management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..models import User, Class, Essay
from ..schemas import EssayCreate, EssayResponse
from ..services import auth_service

essays_router = APIRouter()

@essays_router.post("/", response_model=EssayResponse)
async def create_essay(
    essay_data: EssayCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new essay"""
    # Verify class belongs to current user
    class_obj = db.query(Class).filter(
        Class.id == essay_data.class_id,
        Class.teacher_id == current_user.id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    db_essay = Essay(
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

@essays_router.get("/", response_model=List[EssayResponse])
async def get_essays(
    class_id: Optional[int] = None,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all essays (optionally filtered by class)"""
    query = db.query(Essay).filter(Essay.teacher_id == current_user.id)
    if class_id:
        query = query.filter(Essay.class_id == class_id)
    
    essays = query.all()
    return essays

@essays_router.get("/{essay_id}", response_model=EssayResponse)
async def get_essay(
    essay_id: int,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific essay by ID"""
    essay = db.query(Essay).filter(
        Essay.id == essay_id,
        Essay.teacher_id == current_user.id
    ).first()
    if not essay:
        raise HTTPException(status_code=404, detail="Essay not found")
    return essay

