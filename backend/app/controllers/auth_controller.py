"""
Authentication Controller
Handles authentication-related endpoints with Supabase integration
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import Optional

from ..schemas import (
    LoginRequest, 
    UserCreate, 
    LoginResponse,
    EmailVerificationRequest,
    EmailVerificationResponse,
    VerifyEmailToken,
    PasswordUpdate,
    DeleteAccountRequest,
)
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
    User registration endpoint with Supabase Auth integration
    
    Creates a new user account in both Supabase Auth and local PostgreSQL database.
    Sends email verification link automatically via Supabase.
    
    **IMPORTANT**: 
    - User must verify their email before they can fully use the system
    - Email verification link is sent automatically upon registration
    """
    user = await auth_service.create_user(user_data, db)
    return {
        "message": "User registered successfully. Please check your email for verification link.",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "email_verified": user.email_verified
        }
    }

@auth_router.post("/send-verification-email", response_model=EmailVerificationResponse)
async def send_verification_email(
    request: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Resend email verification link
    
    Sends a new email verification link to the specified email address.
    Useful if the user didn't receive the initial verification email.
    """
    return await auth_service.send_verification_email(request.email)

@auth_router.post("/verify-email")
async def verify_email(
    token_data: VerifyEmailToken,
    db: Session = Depends(get_db)
):
    """
    Verify email address using verification token
    
    Verifies the user's email address using the token sent via email.
    Updates the user's email_verified status in the database.
    """
    return await auth_service.verify_email_token(token_data.token, db)

@auth_router.post("/request-delete-code")
async def request_delete_code(
    current_user = Depends(auth_service.get_current_user)
):
    return await auth_service.request_delete_code(current_user)

@auth_router.post("/delete-account")
async def delete_account(
    payload: DeleteAccountRequest,
    current_user = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    return await auth_service.delete_account(current_user, payload.verification_code, db)

@auth_router.post("/update-password")
async def update_password(
    password_data: PasswordUpdate,
    current_user = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user password
    
    Updates the password in both PostgreSQL database and Supabase Auth.
    The old password will no longer work for login after this update.
    """
    return await auth_service.update_password(
        current_user,
        password_data.current_password,
        password_data.new_password,
        db
    )

