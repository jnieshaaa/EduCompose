"""
User Controller
Handles user management endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..models import User
from ..schemas import UserResponse, UserUpdate
from ..database import get_db
from ..services import auth_service

users_router = APIRouter()

@users_router.get("/me", response_model=UserResponse)
async def get_current_user(current_user: User = Depends(auth_service.get_current_user)):
    """Get current authenticated user"""
    return current_user

@users_router.get("/", response_model=List[UserResponse])
async def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all users (with pagination)"""
    from ..models import User as UserModel
    users = db.query(UserModel).offset(skip).limit(limit).all()
    return users

@users_router.put("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    updated_user = await auth_service.update_account(current_user, update_data, db)
    return updated_user

