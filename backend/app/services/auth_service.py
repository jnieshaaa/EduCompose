import os
import re
import random
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import httpx

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import text, func
from jose import JWTError, jwt
from passlib.context import CryptContext

# Local imports
from ..database import get_db
from ..models import User, LoginActivity, SignupVerificationCode
from ..schemas import UserUpdate

# --- CONFIGURATION ---
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
LOCAL_AUTH_AUTO_CREATE = os.getenv("LOCAL_AUTH_AUTO_CREATE", "true").lower() == "true"
DEFAULT_USER_ROLE = os.getenv("DEFAULT_USER_ROLE", "teacher")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

security = HTTPBearer()

USERNAME_PATTERN = re.compile(r"^[A-Za-z.,]{3,20}$")




class AuthService:
    """Authentication service with local DB"""

    def _validate_username_format(self, username: str) -> str:
        cleaned = (username or "").strip()
        if not USERNAME_PATTERN.fullmatch(cleaned):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be 3-20 characters and include only letters, commas, or periods."
            )
        return cleaned

    def _normalize_email(self, email: str) -> str:
        """Normalize email: lowercase and strip. Prevents duplicate accounts from case differences."""
        return (email or "").strip().lower()

    def _email_exists(self, db: Session, email: str, exclude_user_id: Optional[int] = None) -> bool:
        """Case-insensitive check if email is already registered."""
        normalized = self._normalize_email(email)
        if not normalized:
            return False
        query = db.query(User).filter(func.lower(User.email) == normalized)
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)
        return query.first() is not None

    def _username_exists(self, db: Session, username: str, exclude_user_id: Optional[int] = None) -> bool:
        query = db.query(User).filter(User.username == username)
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)
        return query.first() is not None

    def _generate_username_from_email(self, email: str, db: Session) -> str:
        local_part = (email or "").split("@")[0]
        cleaned = re.sub(r"[^A-Za-z.,]", "", local_part)
        cleaned = cleaned.strip(" .,")
        if len(cleaned) < 3:
            cleaned = "User"
        cleaned = cleaned[:20]
        candidate = cleaned
        suffix = 0
        while self._username_exists(db, candidate):
            suffix += 1
            candidate = (cleaned + ("x" * suffix))[:20]
            if len(candidate) < 3:
                candidate = (candidate + "xxx")[:3]
        return candidate

    def _truncate_password_for_bcrypt(self, password: str) -> str:
        """bcrypt has a 72-byte limit; truncate to avoid ValueError."""
        pwd = password or ""
        encoded = pwd.encode("utf-8")
        if len(encoded) > 72:
            return encoded[:72].decode("utf-8", errors="replace")
        return pwd

    def _hash_password(self, password: str) -> str:
        pwd = self._truncate_password_for_bcrypt(password or "password")
        return pwd_context.hash(pwd)

    def _verify_password(self, password: str, hashed: str) -> bool:
        try:
            pwd = self._truncate_password_for_bcrypt(password or "")
            return pwd_context.verify(pwd, hashed)
        except Exception:
            return False

    def _create_local_user(self, email: str, username: str, full_name: str, password: str, db: Session, role: str = None, title: str = None, nickname: str = None) -> User:
        username = self._validate_username_format(username)
        if self._username_exists(db, username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already in use."
            )

        db_user = User(
            email=email,
            username=username,
            full_name=full_name,
            role=role or DEFAULT_USER_ROLE,
            title=title,
            nickname=nickname,
            password_hash=self._hash_password(password),
            email_verified=True,
            is_active=True
        )
        try:
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or username already registered."
            )
        except Exception as db_err:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error while creating local user: {str(db_err)}"
            )
        return db_user

    def _validate_password_rules(self, password: str):
        if len(password) < 8 or len(password) > 12:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be 8-12 characters long.",
            )

        uppercase = sum(1 for c in password if c.isupper())
        digits = sum(1 for c in password if c.isdigit())
        specials = sum(1 for c in password if c in "!@#$%^&*(),.?\":{}|<>")

        if uppercase < 2 or digits < 2 or specials < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must include at least 2 uppercase letters, 2 numbers, and 2 special characters.",
            )

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)



    async def create_user(self, user_data, db: Session):
        """Create a new user in local DB"""
        email = self._normalize_email(user_data.email)
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email is required.")
        if self._email_exists(db, email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")

        if user_data.username:
            username = self._validate_username_format(user_data.username)
            if self._username_exists(db, username):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already in use."
                )
        else:
            username = self._generate_username_from_email(email, db)

        # Combine first, middle, last name if provided
        name_parts = [
            user_data.first_name,
            user_data.middle_name,
            user_data.last_name
        ]
        full_name = user_data.full_name or " ".join([p for p in name_parts if p]).strip()
        
        if not full_name:
            full_name = username.replace(".", " ").title()

        role = getattr(user_data, 'role', None) or DEFAULT_USER_ROLE
        
        user = self._create_local_user(
            email=email,
            username=username,
            full_name=full_name,
            password=user_data.password,
            db=db,
            role=role,
            title=getattr(user_data, 'title', None),
            nickname=getattr(user_data, 'nickname', None)
        )
        
        return user



    async def request_delete_code(self, current_user: User):
        """Send a one-time OTP to user's email"""
        return {"message": "Verification code not required in local auth mode."}

    async def update_account(
        self,
        current_user: User,
        update_data: UserUpdate,
        db: Session
    ):
        email_changed = False
        username_changed = False
        old_email = current_user.email
        old_username = current_user.username

        if update_data.username is not None:
            new_username = self._validate_username_format(update_data.username)
            if new_username != current_user.username:
                if self._username_exists(db, new_username, exclude_user_id=current_user.id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Username already in use."
                    )
                current_user.username = new_username
                username_changed = True

        if update_data.email is not None:
            new_email = self._normalize_email(update_data.email)
            if new_email and new_email != self._normalize_email(current_user.email):
                if self._email_exists(db, new_email, exclude_user_id=current_user.id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already in use."
                    )
                current_user.email = new_email
                email_changed = True

        if update_data.title is not None:
            current_user.title = update_data.title
            username_changed = True # Trigger commit

        if update_data.nickname is not None:
            current_user.nickname = update_data.nickname
            username_changed = True # Trigger commit
            
        if update_data.full_name is not None:
            current_user.full_name = update_data.full_name
            username_changed = True # Trigger commit

        if not (email_changed or username_changed):
            return current_user

        try:
            db.commit()
            db.refresh(current_user)
        except SQLAlchemyError:
            db.rollback()
            current_user.email = old_email
            current_user.username = old_username
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update account in database."
            )

        return current_user

    async def update_password(
        self,
        current_user: User,
        current_password: str,
        new_password: str,
        db: Session,
    ):
        """Update password after validating the current one."""
        if not current_password or not new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current and new passwords are required.",
            )

        if current_password == new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from current password.",
            )

        self._validate_password_rules(new_password)

        if current_user.password_hash and not self._verify_password(current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect.",
            )
        current_user.password_hash = self._hash_password(new_password)
        try:
            db.commit()
            db.refresh(current_user)
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password in database."
            )
        return {"message": "Password updated successfully."}

    async def delete_account(self, current_user: User, verification_code: str, db: Session):
        """Delete account"""
        # Delete local DB user
        try:
            db.delete(current_user)
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete account from database.")

        return {"message": "Account deleted successfully."}

    async def request_password_reset(self, email: str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset via email is disabled in local auth mode. Please update password from your profile."
        )

    async def send_verification_email(self, email: str):
        """Send email verification (stub for local auth mode)"""
        # In local auth mode, email verification is not required
        # Users are automatically marked as verified on registration
        return {"message": "Email verification is not required in local auth mode."}

    async def verify_email_token(self, token: str, db: Session):
        """Verify email token (stub for local auth mode)"""
        # In local auth mode, email verification is not required
        return {"message": "Email verification is not required in local auth mode."}

    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
        token = credentials.credentials
        
        if not token:
            raise HTTPException(status_code=401, detail="No token provided")
        
        # First, try to decode as backend JWT token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise HTTPException(status_code=401, detail="Invalid token")
            user = db.query(User).filter(func.lower(User.email) == self._normalize_email(email)).first()
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            return user
        except JWTError:
            # Not a backend token, try Supabase token
            pass
        except Exception as e:
            # If it's not a JWTError but another exception, still try Supabase
            pass
        
        # Try to verify as Supabase token
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_role_key:
            raise HTTPException(status_code=401, detail="Could not validate credentials: Supabase configuration missing")
        
        try:
            # Decode Supabase JWT token (without verification to get user ID)
            # Supabase tokens contain the user ID (UUID) in the 'sub' claim
            try:
                # jwt.decode requires a key even when verify_signature is False
                # We use a dummy key since we're not verifying
                # Disable all verification checks to just extract the payload
                unverified_payload = jwt.decode(
                    token, 
                    key="dummy", 
                    options={
                        "verify_signature": False,
                        "verify_aud": False,
                        "verify_exp": False,
                        "verify_iat": False,
                        "verify_nbf": False,
                        "verify_iss": False,
                        "verify_sub": False
                    }
                )
                auth_user_id = unverified_payload.get("sub")
                email_from_token = unverified_payload.get("email")
                if not auth_user_id:
                    raise HTTPException(status_code=401, detail="Invalid Supabase token: missing user ID")
            except Exception as decode_err:
                raise HTTPException(status_code=401, detail=f"Could not decode token: {str(decode_err)}")
            
            # Query the custom users table in Supabase to get user info
            async with httpx.AsyncClient() as client:
                # Query the public.users table (our custom table)
                # PostgREST format: /table?column=eq.value&select=columns
                response = await client.get(
                    f"{supabase_url}/rest/v1/users?auth_user_id=eq.{auth_user_id}&select=id,email,full_name,role,is_active",
                    headers={
                        "apikey": supabase_service_role_key,
                        "Authorization": f"Bearer {supabase_service_role_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=5.0,
                )
                
                if response.status_code == 200:
                    users_data = response.json()
                    if users_data and len(users_data) > 0:
                        user_data = users_data[0]
                        email = user_data.get("email") or email_from_token
                        full_name = user_data.get("full_name") or email.split("@")[0] if email else "User"
                        role = user_data.get("role") or DEFAULT_USER_ROLE
                        is_active = user_data.get("is_active", True)
                    else:
                        # User not in custom table, use token data
                        email = email_from_token
                        if not email:
                            raise HTTPException(status_code=401, detail="Invalid Supabase token: missing email")
                        full_name = email.split("@")[0]
                        role = DEFAULT_USER_ROLE
                        is_active = True
                else:
                    # If query failed, try to use token data as fallback
                    email = email_from_token
                    if not email:
                        # Try to get email from Supabase auth API
                        try:
                            auth_response = await client.get(
                                f"{supabase_url}/auth/v1/user",
                                headers={
                                    "apikey": supabase_service_role_key,
                                    "Authorization": f"Bearer {token}",
                                },
                                timeout=5.0,
                            )
                            if auth_response.status_code == 200:
                                auth_user = auth_response.json()
                                email = auth_user.get("email")
                        except:
                            pass
                    
                    if not email:
                        raise HTTPException(
                            status_code=401, 
                            detail=f"Could not validate Supabase token. Users table query returned {response.status_code}"
                        )
                    full_name = email.split("@")[0]
                    role = DEFAULT_USER_ROLE
                    is_active = True
                
                # Find or create user in backend database (case-insensitive)
                email_normalized = self._normalize_email(email)
                user = db.query(User).filter(func.lower(User.email) == email_normalized).first()
                if not user:
                    # Create user if it doesn't exist
                    username = self._generate_username_from_email(email_normalized, db)
                    user = User(
                        email=email_normalized,
                        username=username,
                        full_name=full_name,
                        role=role,
                        password_hash=None,  # No password for Supabase-authenticated users
                        email_verified=True,
                        is_active=is_active
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                else:
                    # Update user info from Supabase if needed
                    if user.full_name != full_name:
                        user.full_name = full_name
                    if user.role != role:
                        user.role = role
                    if user.is_active != is_active:
                        user.is_active = is_active
                    db.commit()
                    db.refresh(user)
                
                return user
        except HTTPException:
            raise
        except httpx.RequestError as e:
            raise HTTPException(status_code=401, detail=f"Could not validate credentials: Network error - {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Could not validate credentials: {str(e)}")

    # --- HELPERS ---
    def _handle_db_error(self, e):
        msg = str(e)
        if "could not translate host name" in msg.lower():
            detail = "DB connection failed: Cannot resolve hostname."
        elif "connection" in msg.lower() and "refused" in msg.lower():
            detail = "DB connection failed: Server unreachable."
        else:
            detail = f"DB connection failed: {msg}"
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)

    def _log_login_activity(self, db, email, ip, ua, success, reason, user_id=None):
        try:
            activity = LoginActivity(
                user_id=user_id,
                email=email,
                ip_address=ip,
                user_agent=ua,
                login_success=success,
                failure_reason=reason if not success else None,
                login_timestamp=datetime.utcnow()
            )
            db.add(activity)
            db.commit()
        except:
            db.rollback()
            pass

auth_service = AuthService()
