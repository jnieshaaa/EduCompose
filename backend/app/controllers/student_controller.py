"""
Student Controller
Handles student management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..models import User, Class, Student
from ..schemas import StudentCreate, StudentResponse
from ..database import get_db
from ..services import auth_service

students_router = APIRouter()

@students_router.post("/", response_model=StudentResponse)
async def create_student(
    student_data: StudentCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new student"""
    # Verify class belongs to current user
    class_obj = db.query(Class).filter(
        Class.id == student_data.class_id,
        Class.teacher_id == current_user.id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    db_student = Student(
        student_id=student_data.student_id,
        full_name=student_data.full_name,
        email=student_data.email,
        class_id=student_data.class_id
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@students_router.get("/class/{class_id}", response_model=List[StudentResponse])
async def get_students_by_class(
    class_id: int,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all students in a specific class"""
    # Verify class belongs to current user
    class_obj = db.query(Class).filter(
        Class.id == class_id,
        Class.teacher_id == current_user.id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    students = db.query(Student).filter(Student.class_id == class_id).all()
    return students

