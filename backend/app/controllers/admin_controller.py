"""
Admin Controller
Handles admin-only endpoints for system management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import httpx

from ..models import User
from ..schemas import UserResponse, UserUpdate
from ..database import get_db
from ..services import auth_service
from pydantic import BaseModel, EmailStr

admin_router = APIRouter()

# Admin-only dependency
def require_admin(current_user: User = Depends(auth_service.get_current_user)):
    """Ensure the current user is an admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Schemas
class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class AdminPasswordReset(BaseModel):
    email: str
    new_password: str

class SystemStatsResponse(BaseModel):
    total_users: int
    total_teachers: int
    total_students: int
    total_admins: int
    total_programs: int
    total_sections: int
    total_activities: int
    total_essays: int
    total_rubrics: int
    platform_rubrics: int

@admin_router.get("/users", response_model=List[dict])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_admin)
):
    """
    Get all users from Supabase Auth (admin only)
    Supports filtering by role and search
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase configuration is missing"
        )
    
    try:
        all_users = []
        page = 1
        per_page = 100
        
        async with httpx.AsyncClient() as client:
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
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Failed to fetch users: {response.text}"
                    )
                
                users_data = response.json()
                users = users_data.get("users", [])
                
                if not users:
                    break
                
                all_users.extend(users)
                
                if len(users) < per_page:
                    break
                
                page += 1
        
        # Filter by role if specified
        if role:
            all_users = [
                u for u in all_users
                if u.get("user_metadata", {}).get("role", "").lower() == role.lower()
            ]
        
        # Search filter
        if search:
            search_lower = search.lower()
            all_users = [
                u for u in all_users
                if search_lower in u.get("email", "").lower()
                or search_lower in u.get("user_metadata", {}).get("full_name", "").lower()
            ]
        
        # Apply pagination
        total = len(all_users)
        paginated_users = all_users[skip:skip + limit]
        
        # Format response
        formatted_users = []
        for user in paginated_users:
            metadata = user.get("user_metadata", {})
            formatted_users.append({
                "id": user.get("id"),
                "email": user.get("email"),
                "full_name": metadata.get("full_name") or user.get("email", "").split("@")[0],
                "first_name": metadata.get("first_name"),
                "middle_name": metadata.get("middle_name"),
                "last_name": metadata.get("last_name"),
                "role": metadata.get("role", "teacher"),
                "is_active": not user.get("banned", False),
                "email_verified": bool(user.get("email_confirmed_at")),
                "created_at": user.get("created_at"),
                "last_sign_in": user.get("last_sign_in_at"),
            })
        
        return formatted_users
        
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to Supabase: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@admin_router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    update_data: AdminUserUpdate,
    current_user: User = Depends(require_admin)
):
    """Update a user in Supabase Auth (admin only)"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(status_code=500, detail="Supabase configuration is missing")
    
    try:
        # Build update payload
        update_payload = {}
        if update_data.email:
            update_payload["email"] = update_data.email
        
        # Update user_metadata
        metadata_updates = {}
        if update_data.full_name:
            metadata_updates["full_name"] = update_data.full_name
        if update_data.first_name:
            metadata_updates["first_name"] = update_data.first_name
        if update_data.middle_name:
            metadata_updates["middle_name"] = update_data.middle_name
        if update_data.last_name:
            metadata_updates["last_name"] = update_data.last_name
        if update_data.role:
            metadata_updates["role"] = update_data.role
        
        if metadata_updates:
            update_payload["user_metadata"] = metadata_updates
        
        if update_data.is_active is not None:
            update_payload["ban"] = not update_data.is_active
        
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{supabase_url}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": supabase_service_role_key,
                    "Authorization": f"Bearer {supabase_service_role_key}",
                    "Content-Type": "application/json",
                },
                json=update_payload,
                timeout=10.0,
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to update user: {response.text}"
                )
            
            return {"message": "User updated successfully", "user": response.json()}
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to Supabase: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

@admin_router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin)
):
    """Delete a user from Supabase Auth (admin only)"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(status_code=500, detail="Supabase configuration is missing")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{supabase_url}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": supabase_service_role_key,
                    "Authorization": f"Bearer {supabase_service_role_key}",
                },
                timeout=10.0,
            )
            
            if response.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to delete user: {response.text}"
                )
            
            return {"message": "User deleted successfully"}
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to Supabase: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

@admin_router.post("/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: str,
    password_data: AdminPasswordReset,
    current_user: User = Depends(require_admin)
):
    """Reset a user's password (admin only)"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(status_code=500, detail="Supabase configuration is missing")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{supabase_url}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": supabase_service_role_key,
                    "Authorization": f"Bearer {supabase_service_role_key}",
                    "Content-Type": "application/json",
                },
                json={"password": password_data.new_password},
                timeout=10.0,
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to reset password: {response.text}"
                )
            
            return {"message": "Password reset successfully"}
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to Supabase: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting password: {str(e)}")

@admin_router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    current_user: User = Depends(require_admin)
):
    """Get system-wide statistics (admin only)"""
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_role_key:
            raise HTTPException(status_code=500, detail="Supabase configuration is missing")
        
        # Get user stats from Supabase Auth
        all_users = []
        page = 1
        per_page = 100
        
        async with httpx.AsyncClient() as client:
            while True:
                response = await client.get(
                    f"{supabase_url}/auth/v1/admin/users",
                    headers={
                        "apikey": supabase_service_role_key,
                        "Authorization": f"Bearer {supabase_service_role_key}",
                    },
                    params={"page": page, "per_page": per_page},
                    timeout=10.0,
                )
                
                if response.status_code != 200:
                    break
                
                users_data = response.json()
                users = users_data.get("users", [])
                if not users:
                    break
                
                all_users.extend(users)
                if len(users) < per_page:
                    break
                page += 1
        
        # Count users by role
        total_users = len(all_users)
        total_teachers = sum(1 for u in all_users if u.get("user_metadata", {}).get("role") == "teacher")
        total_students = sum(1 for u in all_users if u.get("user_metadata", {}).get("role") == "student")
        total_admins = sum(1 for u in all_users if u.get("user_metadata", {}).get("role") == "admin")
        
        # Get stats from Supabase database using REST API
        # Note: Using httpx since we need service role key
        base_url = f"{supabase_url}/rest/v1"
        headers = {
            "apikey": supabase_service_role_key,
            "Authorization": f"Bearer {supabase_service_role_key}",
            "Prefer": "count=exact"
        }
        
        async with httpx.AsyncClient() as client:
            # Programs
            programs_resp = await client.get(f"{base_url}/programs?select=id&limit=1", headers=headers)
            total_programs = int(programs_resp.headers.get("content-range", "0").split("/")[-1]) if "content-range" in programs_resp.headers else 0
            
            # Sections
            sections_resp = await client.get(f"{base_url}/sections?select=id&limit=1", headers=headers)
            total_sections = int(sections_resp.headers.get("content-range", "0").split("/")[-1]) if "content-range" in sections_resp.headers else 0
            
            # Activities
            activities_resp = await client.get(f"{base_url}/essay_activities?select=id&limit=1", headers=headers)
            total_activities = int(activities_resp.headers.get("content-range", "0").split("/")[-1]) if "content-range" in activities_resp.headers else 0
            
            # Rubrics
            rubrics_resp = await client.get(f"{base_url}/rubrics?select=id&limit=1", headers=headers)
            total_rubrics = int(rubrics_resp.headers.get("content-range", "0").split("/")[-1]) if "content-range" in rubrics_resp.headers else 0
            
            # Platform rubrics
            platform_rubrics_resp = await client.get(f"{base_url}/rubrics?select=id&created_by=is.null&limit=1", headers=headers)
            platform_rubrics = int(platform_rubrics_resp.headers.get("content-range", "0").split("/")[-1]) if "content-range" in platform_rubrics_resp.headers else 0
        
        # Essays - try to get count, default to 0 if table doesn't exist
        total_essays = 0
        try:
            async with httpx.AsyncClient() as client:
                essays_resp = await client.get(f"{base_url}/essays?select=id&limit=1", headers=headers)
                total_essays = int(essays_resp.headers.get("content-range", "0").split("/")[-1]) if "content-range" in essays_resp.headers else 0
        except:
            pass
        
        return SystemStatsResponse(
            total_users=total_users,
            total_teachers=total_teachers,
            total_students=total_students,
            total_admins=total_admins,
            total_programs=total_programs,
            total_sections=total_sections,
            total_activities=total_activities,
            total_essays=total_essays,
            total_rubrics=total_rubrics,
            platform_rubrics=platform_rubrics,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

@admin_router.get("/content/programs")
async def get_all_programs(
    current_user: User = Depends(require_admin)
):
    """Get all programs across the platform (admin only)"""
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_role_key:
            raise HTTPException(status_code=500, detail="Supabase configuration is missing")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_url}/rest/v1/programs?select=*&order=created_at.desc",
                headers={
                    "apikey": supabase_service_role_key,
                    "Authorization": f"Bearer {supabase_service_role_key}",
                },
                timeout=10.0,
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching programs: {str(e)}")

@admin_router.get("/content/activities")
async def get_all_activities(
    current_user: User = Depends(require_admin)
):
    """Get all activities across the platform (admin only)"""
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_role_key:
            raise HTTPException(status_code=500, detail="Supabase configuration is missing")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_url}/rest/v1/essay_activities?select=*&order=created_at.desc",
                headers={
                    "apikey": supabase_service_role_key,
                    "Authorization": f"Bearer {supabase_service_role_key}",
                },
                timeout=10.0,
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching activities: {str(e)}")

@admin_router.get("/content/rubrics")
async def get_all_rubrics(
    current_user: User = Depends(require_admin)
):
    """Get all rubrics across the platform (admin only)"""
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_role_key:
            raise HTTPException(status_code=500, detail="Supabase configuration is missing")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_url}/rest/v1/rubrics?select=*&order=created_at.desc",
                headers={
                    "apikey": supabase_service_role_key,
                    "Authorization": f"Bearer {supabase_service_role_key}",
                },
                timeout=10.0,
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching rubrics: {str(e)}")

