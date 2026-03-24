"""
Authentication Controller
Handles authentication-related endpoints
"""
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import os
import httpx
import secrets
import string

from ..schemas import (
    LoginRequest,
    UserCreate,
    LoginResponse,
    EmailVerificationRequest,
    EmailVerificationResponse,
    VerifyEmailToken,
    PasswordUpdate,
    DeleteAccountRequest,
    CheckEmailRequest,
    CheckEmailResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TeacherRegisterRequest,
    VerifySignupRequest,
    ResendSignupCodeRequest,
    TeacherProvisionStudentRequest,
    TeacherProvisionStudentResponse,
)
from ..database import get_db
from ..services import auth_service

auth_router = APIRouter()


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    core = "".join(secrets.choice(alphabet) for _ in range(length))
    return f"{core}Aa1!"

@auth_router.post("/send-verification-email", response_model=EmailVerificationResponse)
async def send_verification_email(
    request: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Resend email verification link
    """
    return await auth_service.send_verification_email(request.email)

@auth_router.post("/verify-email")
async def verify_email(
    token_data: VerifyEmailToken,
    db: Session = Depends(get_db)
):
    """
    Verify email address using verification token
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
    """
    return await auth_service.update_password(
        current_user,
        password_data.current_password,
        password_data.new_password,
        db
    )

@auth_router.post("/admin/create-user")
async def admin_create_user(
    user_data: UserCreate,
    current_user = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint to create user accounts (teacher or student)
    
    Only users with role="admin" can create accounts.
    Creates user in Supabase Auth and syncs to local database.
    """
    # Check if current user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create user accounts."
        )
    
    # Validate role
    if user_data.role not in ["admin", "teacher", "student"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'admin', 'teacher', or 'student'."
        )
    
    # Combine names into full_name
    name_parts = [
        user_data.first_name,
        user_data.middle_name,
        user_data.last_name
    ]
    full_name = user_data.full_name or " ".join([p for p in name_parts if p]).strip()
    
    if not full_name:
        # Fallback to email username
        full_name = user_data.email.split("@")[0]

    # Create local user record in database
    try:
        username = user_data.username or user_data.email.split("@")[0]
        local_user = await auth_service.create_user(
            UserCreate(
                email=user_data.email,
                password=user_data.password,
                role=user_data.role,
                username=username,
                full_name=full_name,
                first_name=user_data.first_name,
                middle_name=user_data.middle_name,
                last_name=user_data.last_name,
                title=user_data.title,
                nickname=user_data.nickname,
                supabase_user_id=user_data.supabase_user_id
            ),
            db
        )
        
        return {
            "message": f"User account created and synced successfully for {user_data.role}.",
            "user": {
                "id": local_user.id,
                "email": local_user.email,
                "username": local_user.username,
                "full_name": local_user.full_name,
                "role": local_user.role,
                "email_verified": local_user.email_verified,
                "supabase_user_id": user_data.supabase_user_id,
            }
        }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create local user record: {str(e)}"
        )


@auth_router.post("/teacher/provision-student-account", response_model=TeacherProvisionStudentResponse)
async def teacher_provision_student_account(
    payload: TeacherProvisionStudentRequest,
    current_user = Depends(auth_service.get_current_user),
):
    """
    Create a Supabase Auth account for a student when teacher/admin enrolls them.

    - Allowed roles: teacher, admin
    - Creates auth user with role=student and student_code metadata
    - Returns generated temporary password if account is newly created
    """
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can provision student accounts.",
        )

    normalized_email = payload.email.strip().lower()
    student_code = payload.student_code.strip().upper()

    return TeacherProvisionStudentResponse(
        success=True,
        message="Student account provisioned and synced successfully.",
        created=True,
        temp_password=payload.password,
        email=normalized_email,
        student_code=student_code,
    )

