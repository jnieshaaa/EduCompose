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
from urllib.parse import quote

from ..schemas import (
    UserCreate,
    EmailVerificationRequest,
    EmailVerificationResponse,
    VerifyEmailToken,
    PasswordUpdate,
    DeleteAccountRequest,
    TeacherProvisionStudentRequest,
    TeacherProvisionStudentResponse,
    AdminDeleteUserRequest,
)
from ..database import get_db
from ..services import auth_service
from ..models import User

auth_router = APIRouter()


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    core = "".join(secrets.choice(alphabet) for _ in range(length))
    return f"{core}Aa1!"


def _safe_json(response: httpx.Response) -> dict:
    try:
        data = response.json()
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


async def _resolve_auth_user_id_by_email(
    client: httpx.AsyncClient,
    supabase_url: str,
    headers: dict,
    normalized_email: str,
) -> Optional[str]:
    # GoTrue email filter behavior can vary. Use paginated scan for reliability.
    for page in range(1, 11):
        resp = await client.get(
            f"{supabase_url}/auth/v1/admin/users?page={page}&per_page=200",
            headers=headers,
        )
        if resp.status_code not in [200, 206]:
            continue
        data = _safe_json(resp)
        users = data.get("users") if isinstance(data.get("users"), list) else []
        match = next(
            (
                u for u in users
                if isinstance(u, dict) and (u.get("email") or "").strip().lower() == normalized_email
            ),
            None,
        )
        if isinstance(match, dict) and match.get("id"):
            return str(match["id"])
        if len(users) < 200:
            break
    return None

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
    Admin-only endpoint to create user accounts.
    Creates user in Supabase Auth and syncs to local database.
    """
    # Allow admins to create any user, but allow teachers to ONLY create students
    if current_user.role == "teacher" and user_data.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers can only create student accounts."
        )
    elif current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and teachers can create user accounts."
        )
    
    if user_data.role not in ["admin", "teacher", "student"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role."
        )
    
    name_parts = [user_data.first_name, user_data.middle_name, user_data.last_name]
    full_name = user_data.full_name or " ".join([p for p in name_parts if p]).strip()
    if not full_name:
        full_name = user_data.email.split("@")[0]

    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(status_code=500, detail="Missing Supabase configuration.")

    headers = {
        "apikey": supabase_service_role_key,
        "Authorization": f"Bearer {supabase_service_role_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{supabase_url}/auth/v1/admin/users",
                headers=headers,
                json={
                    "email": user_data.email.strip().lower(),
                    "password": user_data.password.strip(),
                    "email_confirm": True,
                    "user_metadata": {
                        "role": user_data.role,
                        "first_name": user_data.first_name,
                        "middle_name": user_data.middle_name,
                        "last_name": user_data.last_name,
                        "title": user_data.title,
                        "nickname": user_data.nickname,
                        "full_name": full_name,
                    }
                },
                timeout=10.0
            )

            if resp.status_code not in [200, 201]:
                resp_json = _safe_json(resp)
                msg = (resp_json.get("message") or resp_json.get("msg") or "").lower()
                err_code = (resp_json.get("error_code") or "").lower()
                already_registered = ("already" in msg and "registered" in msg) or (err_code == "email_exists")
                if already_registered:
                    print(f"DEBUG: User {user_data.email} already exists in Supabase Auth. Resolving ID...")
                    auth_id = await _resolve_auth_user_id_by_email(
                        client=client,
                        supabase_url=supabase_url,
                        headers=headers,
                        normalized_email=user_data.email.strip().lower()
                    )
                else:
                    raise HTTPException(
                        status_code=resp.status_code,
                        detail=f"Failed to create auth user: {(resp_json.get('message') or resp_json.get('msg') or resp.text or 'Unknown Supabase error')}"
                    )
            else:
                auth_user_data = resp.json()
                auth_id = auth_user_data.get("id")

            # Final check for auth_id
            auth_id = auth_id or user_data.supabase_user_id

            username = user_data.username or user_data.email.split("@")[0]
            local_user = await auth_service.create_user(
                UserCreate(
                    email=user_data.email.strip().lower(),
                    password=user_data.password.strip(),
                    role=user_data.role,
                    username=username,
                    full_name=full_name,
                    first_name=user_data.first_name,
                    middle_name=user_data.middle_name,
                    last_name=user_data.last_name,
                    title=user_data.title,
                    nickname=user_data.nickname,
                    supabase_user_id=auth_id
                ),
                db
            )

            if auth_id:
                # Upsert into public.users
                await client.post(
                    f"{supabase_url}/rest/v1/users",
                    headers={**headers, "Prefer": "resolution=merge-duplicates"},
                    json={
                        "auth_user_id": auth_id,
                        "email": user_data.email.strip().lower(),
                        "first_name": user_data.first_name,
                        "middle_name": user_data.middle_name,
                        "last_name": user_data.last_name,
                        "role": user_data.role,
                        "is_active": True
                    }
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
                    "supabase_user_id": auth_id,
                }
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create local user record: {str(e)}"
        )


@auth_router.post("/admin/delete-user")
async def admin_delete_user(
    payload: AdminDeleteUserRequest,
    current_user = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint to delete user accounts from Supabase Auth.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete user accounts."
        )

    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(status_code=500, detail="Missing Supabase configuration.")

    headers = {
        "apikey": supabase_service_role_key,
        "Authorization": f"Bearer {supabase_service_role_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient() as client:
            # Modular Stability: Use RPC for comprehensive hard delete
            # This avoids "Database error loading user" 500 errors from Supabase Auth
            # and handles all associated EDU profiles in one atomic operation.
            resp = await client.post(
                f"{supabase_url}/rest/v1/rpc/hard_delete_user_v2",
                headers=headers,
                json={"p_user_id": payload.user_id},
                timeout=15.0
            )

            if resp.status_code not in [200, 201, 204]:
                resp_json = _safe_json(resp)
                # Fallback: if RPC fails, try standard delete as last resort
                await client.delete(
                    f"{supabase_url}/auth/v1/admin/users/{payload.user_id}",
                    headers=headers,
                    timeout=10.0
                )

            # 3. Also delete from local database (SQLite)
            local_user = db.query(User).filter(User.id == payload.user_id).first()
            
            if local_user:
                db.delete(local_user)
                db.commit()

            return {"message": "User account deleted successfully from Auth, Supabase DB, and Local DB."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete user account: {str(e)}"
        )


@auth_router.post("/teacher/provision-student-account", response_model=TeacherProvisionStudentResponse)
async def teacher_provision_student_account(
    payload: TeacherProvisionStudentRequest,
    current_user = Depends(auth_service.get_current_user),
):
    """
    Sync endpoint kept for backwards compatibility.
    Auth user creation/password reset is now handled via Supabase RPC in the frontend.
    """
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can provision student accounts.",
        )

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(status_code=500, detail="Missing Supabase configuration.")

    normalized_email = payload.email.strip().lower()
    student_code = payload.student_code.strip().upper()
    temp_password = (payload.password or "").strip() or _generate_temp_password(8)

    headers = {
        "apikey": supabase_service_role_key,
        "Authorization": f"Bearer {supabase_service_role_key}",
        "Content-Type": "application/json",
    }

    auth_user_id: Optional[str] = None
    created = False
    metadata = {
        "role": "student",
        "student_code": student_code,
        "first_name": payload.first_name,
        "middle_name": payload.middle_name or "",
        "last_name": payload.last_name,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 0) Pre-check cross-role email conflicts in public.users to avoid opaque auth DB failures.
            email_lookup = await client.get(
                f"{supabase_url}/rest/v1/users?select=auth_user_id,email,role&email=eq.{quote(normalized_email)}",
                headers=headers,
            )
            existing_student_user_without_auth = False
            if email_lookup.status_code in [200, 206]:
                email_rows = email_lookup.json() if isinstance(email_lookup.json(), list) else []
                if email_rows:
                    existing_role = str((email_rows[0] or {}).get("role") or "").lower()
                    existing_auth_user_id = (email_rows[0] or {}).get("auth_user_id")
                    if existing_role and existing_role != "student":
                        raise HTTPException(
                            status_code=409,
                            detail=f"Email is already used by a {existing_role} account. Use a different student email.",
                        )
                    if existing_role == "student" and not existing_auth_user_id:
                        existing_student_user_without_auth = True

            # If there is a student users-row by email but no auth_user_id, the auth trigger insert
            # can fail on users.email unique constraint. Remove stale row first, then recreate via auth flow.
            if existing_student_user_without_auth:
                delete_resp = await client.delete(
                    f"{supabase_url}/rest/v1/users?email=eq.{quote(normalized_email)}&role=eq.student&auth_user_id=is.null",
                    headers=headers,
                )
                if delete_resp.status_code not in [200, 204]:
                    delete_json = _safe_json(delete_resp)
                    raise HTTPException(
                        status_code=delete_resp.status_code,
                        detail=f"Failed to prepare student user sync before auth provisioning: {delete_json.get('message') or delete_resp.text or 'Unknown error'}",
                    )

            # 1) Try creating auth user first.
            create_resp = await client.post(
                f"{supabase_url}/auth/v1/admin/users",
                headers=headers,
                json={
                    "email": normalized_email,
                    "password": temp_password,
                    "email_confirm": True,
                    "user_metadata": metadata,
                },
            )
            create_json = _safe_json(create_resp)
            if create_resp.status_code in [200, 201]:
                created = True
                auth_user_id = create_json.get("id")
            else:
                # 2) Always try resolving existing auth user by email.
                # Supabase may return "unexpected_failure" even when an auth row already exists.
                auth_user_id = await _resolve_auth_user_id_by_email(
                    client=client,
                    supabase_url=supabase_url,
                    headers=headers,
                    normalized_email=normalized_email,
                )
                if not auth_user_id:
                    msg = create_json.get("msg") or create_json.get("message") or create_resp.text or "Unknown Supabase error"
                    raise HTTPException(
                        status_code=create_resp.status_code if create_resp.status_code >= 400 else 500,
                        detail=f"Failed to create auth user: {msg}",
                    )

            if not auth_user_id:
                raise HTTPException(status_code=400, detail="Provisioning failed: missing auth user id.")

            # 3) Ensure password and metadata are updated for both newly created and existing users.
            update_resp = await client.put(
                f"{supabase_url}/auth/v1/admin/users/{auth_user_id}",
                headers=headers,
                json={
                    "email": normalized_email,
                    "password": temp_password,
                    "user_metadata": metadata,
                    "email_confirm": True,
                },
            )
            if update_resp.status_code not in [200, 201]:
                update_json = _safe_json(update_resp)
                raise HTTPException(
                    status_code=update_resp.status_code,
                    detail=f"Failed to update auth user: {update_json.get('message') or update_resp.text or 'Unknown Supabase error'}",
                )

            # 4) Sync public.users by auth_user_id.
            await client.post(
                f"{supabase_url}/rest/v1/users?on_conflict=auth_user_id",
                headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
                json={
                    "auth_user_id": auth_user_id,
                    "email": normalized_email,
                    "first_name": payload.first_name,
                    "middle_name": payload.middle_name or "",
                    "last_name": payload.last_name,
                    "role": "student",
                    "is_active": True,
                },
            )

            # 5) Sync student linkage by student code.
            await client.patch(
                f"{supabase_url}/rest/v1/students?student_code=eq.{quote(student_code)}",
                headers={"apikey": supabase_service_role_key, "Authorization": f"Bearer {supabase_service_role_key}", "Content-Type": "application/json"},
                json={"auth_user_id": auth_user_id, "email": normalized_email},
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to provision student account: {str(e)}")

    return TeacherProvisionStudentResponse(
        success=True,
        message="Student account provisioned successfully.",
        created=created,
        temp_password=temp_password,
        email=normalized_email,
        student_code=student_code,
    )

