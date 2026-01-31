"""
Authentication Controller
Handles authentication-related endpoints
"""
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import os
import httpx

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
    
    **IMPORTANT**: Login will only succeed if credentials exist in the database.
    All user credentials must be recorded in the database before login can succeed.
    
    Validates:
    - User email exists in database
    - Password matches the hash stored in database
    - User account is active in database
    
    Records login activity including:
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

def _supabase_configured() -> bool:
    import os
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


@auth_router.post("/register")
async def register(payload: TeacherRegisterRequest, db: Session = Depends(get_db)):
    """
    Teacher self-registration endpoint.

    - When Supabase is configured: creates user in Supabase Auth, stores code in DB.
    - Otherwise: creates in local DB, returns verification code.
    """
    if payload.confirm_password is not None and payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match.",
        )

    if _supabase_configured():
        full_name = payload.email.split("@")[0]
        user_info, verification_code = await auth_service.register_supabase_first(
            email=payload.email,
            password=payload.password,
            full_name=full_name,
            role="teacher",
            db=db,
        )
        return {
            "message": "User registered. Verification code sent.",
            "user": user_info,
            "verification_code": verification_code,
        }

    user_data = UserCreate(
        email=payload.email,
        password=payload.password,
        role="teacher",
    )
    user = await auth_service.create_user(user_data, db)
    verification_code = auth_service.generate_signup_code_for_user(user.email)
    return {
        "message": "User registered. Verification code sent.",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "email_verified": user.email_verified,
        },
        "verification_code": verification_code,
    }


@auth_router.post("/verify-signup")
async def verify_signup(payload: VerifySignupRequest, db: Session = Depends(get_db)):
    """
    Verify signup with 6-digit code.
    When Supabase is configured: user is already in Supabase, just validates code.
    Otherwise: syncs user to Supabase after verification (requires password).
    """
    if _supabase_configured():
        return await auth_service.verify_signup_supabase_first(
            payload.email, payload.code, db
        )
    if not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for verification.",
        )
    return await auth_service.verify_signup_and_sync_supabase(
        payload.email, payload.code, payload.password, db
    )


@auth_router.post("/resend-signup-code")
async def resend_signup_code(
    payload: ResendSignupCodeRequest, db: Session = Depends(get_db)
):
    """
    Resend 6-digit verification code for signup (e.g. after "Resend Code").
    Returns the new code so the frontend can send it via email.
    """
    if _supabase_configured():
        code = await auth_service.resend_signup_code_supabase_first(payload.email, db)
    else:
        code = auth_service.resend_signup_code(payload.email, db)
    return {"verification_code": code}

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
    
    Updates the password in the database.
    The old password will no longer work for login after this update.
    """
    return await auth_service.update_password(
        current_user,
        password_data.current_password,
        password_data.new_password,
        db
    )

@auth_router.post("/check-email", response_model=CheckEmailResponse)
async def check_email(request: CheckEmailRequest):
    """
    Check if an email exists in Supabase Auth
    
    This endpoint uses the Supabase Admin API to check if an email exists.
    Required for forgot password flow to verify email before sending reset code.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase configuration is missing. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )
    
    try:
        # Use Supabase Admin API to list users with pagination
        # Note: Admin API paginates results, so we need to handle pagination
        async with httpx.AsyncClient() as client:
            email_lower = request.email.lower().strip()
            page = 1
            per_page = 100  # Maximum per page
            found = False
            
            # Loop through pages until we find the user or run out of pages
            while True:
                response = await client.get(
                    f"{supabase_url}/auth/v1/admin/users",
                    headers={
                        "apikey": supabase_service_role_key,
                        "Authorization": f"Bearer {supabase_service_role_key}",
                    },
                    params={
                        "page": page,
                        "per_page": per_page,
                    },
                    timeout=10.0,
                )
                
                if response.status_code != 200:
                    error_text = response.text
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Failed to check email: {error_text}"
                    )
                
                users_data = response.json()
                users = users_data.get("users", [])
                
                # If no users returned, we've reached the end
                if not users:
                    break
                
                # Check if email exists in this page
                found = any(
                    user.get("email", "").lower() == email_lower
                    for user in users
                )
                
                if found:
                    break
                
                # Check if there are more pages
                # Admin API doesn't provide total count, so we stop if we got fewer than per_page
                if len(users) < per_page:
                    break
                
                page += 1
            
            if found:
                return CheckEmailResponse(
                    exists=True,
                    message="Email found in system"
                )
            else:
                return CheckEmailResponse(
                    exists=False,
                    message="No account found with this email address"
                )
                
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request timeout. Please try again."
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to Supabase: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error checking email: {str(e)}"
        )

@auth_router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(request: ResetPasswordRequest):
    """
    Reset user password in Supabase Auth
    
    This endpoint uses the Supabase Admin API to update a user's password.
    Required for forgot password flow after email verification.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase configuration is missing. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )
    
    try:
        # First, find the user by email (with pagination support)
        async with httpx.AsyncClient() as client:
            email_lower = request.email.lower().strip()
            page = 1
            per_page = 100  # Maximum per page
            user = None
            
            # Loop through pages until we find the user or run out of pages
            while True:
                users_response = await client.get(
                    f"{supabase_url}/auth/v1/admin/users",
                    headers={
                        "apikey": supabase_service_role_key,
                        "Authorization": f"Bearer {supabase_service_role_key}",
                    },
                    params={
                        "page": page,
                        "per_page": per_page,
                    },
                    timeout=10.0,
                )
                
                if users_response.status_code != 200:
                    error_text = users_response.text
                    raise HTTPException(
                        status_code=users_response.status_code,
                        detail=f"Failed to find user: {error_text}"
                    )
                
                users_data = users_response.json()
                users = users_data.get("users", [])
                
                # If no users returned, we've reached the end
                if not users:
                    break
                
                # Find user by email in this page
                user = next(
                    (u for u in users if u.get("email", "").lower() == email_lower),
                    None
                )
                
                if user:
                    break
                
                # Check if there are more pages
                if len(users) < per_page:
                    break
                
                page += 1
            
            if not user:
                raise HTTPException(
                    status_code=404,
                    detail="User not found with this email address"
                )
            
            user_id = user.get("id")
            
            # Update password using Admin API
            update_response = await client.put(
                f"{supabase_url}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": supabase_service_role_key,
                    "Authorization": f"Bearer {supabase_service_role_key}",
                    "Content-Type": "application/json",
                },
                json={"password": request.new_password},
                timeout=10.0,
            )
            
            if update_response.status_code not in [200, 201]:
                error_text = update_response.text
                raise HTTPException(
                    status_code=update_response.status_code,
                    detail=f"Failed to reset password: {error_text}"
                )
            
            return ResetPasswordResponse(
                success=True,
                message="Password reset successfully"
            )
            
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request timeout. Please try again."
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to Supabase: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error resetting password: {str(e)}"
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
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase configuration is missing."
        )
    
    try:
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
        
        # Create user in Supabase Auth using Admin API
        async with httpx.AsyncClient() as client:
            create_response = await client.post(
                f"{supabase_url}/auth/v1/admin/users",
                headers={
                    "apikey": supabase_service_role_key,
                    "Authorization": f"Bearer {supabase_service_role_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "email": user_data.email,
                    "password": user_data.password,
                    "email_confirm": True,  # Auto-confirm email for admin-created accounts
                    "user_metadata": {
                        "full_name": full_name,
                        "first_name": user_data.first_name,
                        "middle_name": user_data.middle_name,
                        "last_name": user_data.last_name,
                        "role": user_data.role,
                    },
                },
                timeout=10.0,
            )
            
            if create_response.status_code not in [200, 201]:
                error_text = create_response.text
                raise HTTPException(
                    status_code=create_response.status_code,
                    detail=f"Failed to create user: {error_text}"
                )
            
            supabase_user = create_response.json()
            
            # Create local user record in database
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
                ),
                db
            )
            
            return {
                "message": f"User account created successfully for {user_data.role}.",
                "user": {
                    "id": local_user.id,
                    "email": local_user.email,
                    "username": local_user.username,
                    "full_name": local_user.full_name,
                    "role": local_user.role,
                    "email_verified": local_user.email_verified,
                    "supabase_user_id": supabase_user.get("id"),
                }
            }
            
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request timeout. Please try again."
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to Supabase: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating user: {str(e)}"
        )

