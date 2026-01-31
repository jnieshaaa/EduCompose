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

# In-memory store for signup verification codes: email -> { "code": str, "expires_at": int }
_signup_codes: Dict[str, Dict[str, Any]] = {}
SIGNUP_CODE_TTL_SECONDS = 10 * 60  # 10 minutes


def _generate_signup_code() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(6))


def _store_signup_code(email: str, code: str) -> None:
    normalized = (email or "").strip().lower()
    if not normalized:
        return
    _signup_codes[normalized] = {
        "code": code,
        "expires_at": datetime.utcnow().timestamp() + SIGNUP_CODE_TTL_SECONDS,
    }


def _get_signup_code(email: str) -> Optional[str]:
    normalized = (email or "").strip().lower()
    if not normalized:
        return None
    entry = _signup_codes.get(normalized)
    if not entry:
        return None
    if datetime.utcnow().timestamp() > entry["expires_at"]:
        del _signup_codes[normalized]
        return None
    return entry["code"]


def _clear_signup_code(email: str) -> None:
    normalized = (email or "").strip().lower()
    _signup_codes.pop(normalized, None)


def _supabase_configured() -> bool:
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


async def _email_exists_in_supabase(email: str) -> bool:
    """Check if email exists in Supabase Auth (case-insensitive)."""
    supabase_url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not key:
        return False
    normalized = (email or "").strip().lower()
    if not normalized:
        return False
    async with httpx.AsyncClient() as client:
        page = 1
        while True:
            resp = await client.get(
                f"{supabase_url}/auth/v1/admin/users",
                headers={"apikey": key, "Authorization": f"Bearer {key}"},
                params={"page": page, "per_page": 100},
                timeout=10.0,
            )
            if resp.status_code != 200:
                return False
            users = resp.json().get("users", [])
            if not users:
                return False
            if any((u.get("email") or "").lower() == normalized for u in users):
                return True
            if len(users) < 100:
                return False
            page += 1


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

    def _create_local_user(self, email: str, username: str, full_name: str, password: str, db: Session, role: str = None) -> User:
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

    async def authenticate_user(self, credentials, db: Session, ip_address: Optional[str] = None, user_agent: Optional[str] = None):
        """Authenticate user and return JWT"""
        try:
            db.execute(text("SELECT 1"))
        except SQLAlchemyError as e:
            self._handle_db_error(e)

        login_email = self._normalize_email(credentials.email) if credentials.email else None
        login_username = (credentials.username or "").strip() or None
        if not login_email and not login_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email is required.")

        user = None
        if login_email:
            user = db.query(User).filter(func.lower(User.email) == login_email).first()
        elif login_username:
            user = db.query(User).filter(User.username == login_username).first()
            if user:
                login_email = user.email

        if not user:
            self._log_login_activity(db, login_email or login_username, ip_address, user_agent, False, "User not found in DB")
            if LOCAL_AUTH_AUTO_CREATE and login_email:
                # Only auto-create if email doesn't exist (case-insensitive)
                if self._email_exists(db, login_email):
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
                username = login_username or self._generate_username_from_email(login_email, db)
                full_name = username.replace(".", " ").title()
                user = self._create_local_user(
                    email=login_email,
                    username=username,
                    full_name=full_name,
                    password=credentials.password or "password",
                    db=db
                )
            else:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

        if user.password_hash:
            if not self._verify_password(credentials.password, user.password_hash):
                self._log_login_activity(db, user.email, ip_address, user_agent, False, "Incorrect password", user.id)
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
        if not user.is_active:
            self._log_login_activity(db, user.email, ip_address, user_agent, False, "Account inactive", user.id)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive.")

        if not user.is_active:
            self._log_login_activity(db, user.email, ip_address, user_agent, False, "Account inactive", user.id)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive.")

        self._log_login_activity(db, user.email, ip_address, user_agent, True, "Success", user.id)

        access_token = self.create_access_token(
            data={"sub": user.email, "user_id": user.id}, 
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
                "email_verified": user.email_verified
            }
        }

    async def register_supabase_first(
        self, email: str, password: str, full_name: str, role: str, db: Session
    ) -> tuple[dict, str]:
        """
        Supabase-first sign-up: create in Supabase Auth, store code in DB.
        Returns (user_info, verification_code).
        """
        normalized = self._normalize_email(email)
        if not normalized:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email is required.")
        if await _email_exists_in_supabase(normalized):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")
        supabase_url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured.",
            )
        display_name = full_name or normalized.split("@")[0]
        async with httpx.AsyncClient() as client:
            create_resp = await client.post(
                f"{supabase_url}/auth/v1/admin/users",
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "email": normalized,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": display_name,
                        "role": role,
                    },
                },
                timeout=10.0,
            )
        if create_resp.status_code not in [200, 201]:
            err = create_resp.text
            if "already been registered" in err.lower() or "already exists" in err.lower():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")
            raise HTTPException(status_code=create_resp.status_code, detail=f"Failed to create account: {err}")
        supabase_user = create_resp.json()
        auth_user_id = supabase_user.get("id")
        code = _generate_signup_code()
        expires = datetime.utcnow() + timedelta(seconds=SIGNUP_CODE_TTL_SECONDS)
        record = SignupVerificationCode(
            email=normalized,
            code=code,
            expires_at=expires,
        )
        db.add(record)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to store verification code.")
        user_info = {
            "id": auth_user_id,
            "email": normalized,
            "username": normalized.split("@")[0],
            "full_name": display_name,
            "email_verified": True,
        }
        return user_info, code

    async def resend_signup_code_supabase_first(self, email: str, db: Session) -> str:
        """Resend code for Supabase-first flow; check user exists in Supabase."""
        normalized = self._normalize_email(email)
        if not normalized:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email is required.")
        if not await _email_exists_in_supabase(normalized):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No account found for this email.")
        code = _generate_signup_code()
        expires = datetime.utcnow() + timedelta(seconds=SIGNUP_CODE_TTL_SECONDS)
        db.query(SignupVerificationCode).filter(
            func.lower(SignupVerificationCode.email) == normalized
        ).delete()
        record = SignupVerificationCode(email=normalized, code=code, expires_at=expires)
        db.add(record)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to store code.")
        return code

    async def verify_signup_supabase_first(self, email: str, code: str, db: Session) -> dict:
        """Verify code for Supabase-first flow; user already in Supabase."""
        normalized = self._normalize_email(email)
        if not normalized:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email is required.")
        row = (
            db.query(SignupVerificationCode)
            .filter(func.lower(SignupVerificationCode.email) == normalized)
            .order_by(SignupVerificationCode.created_at.desc())
            .first()
        )
        if not row or row.expires_at < datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code.")
        if row.code != code.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code.")
        db.query(SignupVerificationCode).filter(SignupVerificationCode.id == row.id).delete()
        db.commit()
        return {"success": True, "message": "Account verified. You can now sign in."}

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
            role=role
        )
        
        return user

    def generate_signup_code_for_user(self, email: str) -> str:
        """Generate and store a 6-digit signup verification code; return it so frontend can send email."""
        code = _generate_signup_code()
        _store_signup_code(email, code)
        return code

    def resend_signup_code(self, email: str, db: Session) -> str:
        """Generate and store a new signup code for an existing (registered) user; return code."""
        normalized = self._normalize_email(email)
        if not normalized:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email is required.")
        if not db.query(User).filter(func.lower(User.email) == normalized).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No account found for this email.")
        code = _generate_signup_code()
        _store_signup_code(normalized, code)
        return code

    async def verify_signup_and_sync_supabase(
        self, email: str, code: str, password: str, db: Session
    ) -> dict:
        """Verify the 6-digit code and create the user in Supabase (user already exists in backend)."""
        normalized = self._normalize_email(email)
        if not normalized:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email is required.")
        stored_code = _get_signup_code(normalized)
        if not stored_code or stored_code != code.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code.",
            )
        user = db.query(User).filter(func.lower(User.email) == normalized).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found.")
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not supabase_service_role_key:
            _clear_signup_code(normalized)
            return {"success": True, "message": "Account verified. Sign in with your email and password."}
        async with httpx.AsyncClient() as client:
            create_response = await client.post(
                f"{supabase_url}/auth/v1/admin/users",
                headers={
                    "apikey": supabase_service_role_key,
                    "Authorization": f"Bearer {supabase_service_role_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "email": normalized,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": user.full_name,
                        "role": user.role,
                    },
                },
                timeout=10.0,
            )
        if create_response.status_code not in [200, 201]:
            error_text = create_response.text
            raise HTTPException(
                status_code=create_response.status_code,
                detail=f"Failed to sync account to Supabase: {error_text}",
            )
        _clear_signup_code(normalized)
        return {"success": True, "message": "Account verified and synced to Supabase."}

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
