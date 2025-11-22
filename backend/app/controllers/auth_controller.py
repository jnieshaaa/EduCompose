"""
Authentication Controller
Handles authentication-related endpoints
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import Optional

from ..schemas import LoginRequest, UserCreate, LoginResponse
from ..database import get_db
from ..services import auth_service

auth_router = APIRouter()

@auth_router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    User login endpoint
    
    **IMPORTANT**: Login will only succeed if credentials exist in PostgreSQL database.
    All user credentials must be recorded in the database before login can succeed.
    
    Validates:
    - User email exists in PostgreSQL
    - Password matches the hash stored in PostgreSQL
    - User account is active in database
    
    Records login activity in PostgreSQL including:
    - Login timestamp
    - IP address
    - User agent
    - Success/failure status
    - Failure reason (if applicable)
    """
    # Extract IP address from request
    ip_address = request.client.host if request.client else None
    # Check for forwarded IP (if behind proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    
    # Extract user agent
    user_agent = request.headers.get("User-Agent", "")
    
    return await auth_service.authenticate_user(
        credentials, 
        db, 
        ip_address=ip_address,
        user_agent=user_agent
    )

@auth_router.post("/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    User registration endpoint
    
    **IMPORTANT**: Users must be registered in PostgreSQL database before they can login.
    This endpoint saves user credentials to PostgreSQL, and only after successful registration
    can the user login using the same credentials.
    """
    return await auth_service.create_user(user_data, db)

