"""
Authentication Controller
Handles authentication-related endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..schemas import LoginRequest, UserCreate
from ..database import get_db
from ..services import auth_service

auth_router = APIRouter()

@auth_router.post("/login")
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """User login endpoint"""
    return await auth_service.authenticate_user(credentials, db)

@auth_router.post("/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """User registration endpoint"""
    return await auth_service.create_user(user_data, db)

