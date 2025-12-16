import os
import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from jose import JWTError, jwt
from passlib.context import CryptContext

# Local imports
from ..database import get_db
from ..models import User, LoginActivity
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

    def _hash_password(self, password: str) -> str:
        return pwd_context.hash(password or "password")

    def _verify_password(self, password: str, hashed: str) -> bool:
        try:
            return pwd_context.verify(password or "", hashed)
        except Exception:
            return False

    def _create_local_user(self, email: str, username: str, full_name: str, password: str, db: Session) -> User:
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
            role=DEFAULT_USER_ROLE,
            password_hash=self._hash_password(password),
            email_verified=True,
            is_active=True
        )
        try:
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
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

        login_email = credentials.email.strip() if credentials.email else None
        login_username = credentials.username.strip() if credentials.username else None
        if not login_email and not login_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email is required.")

        user = None
        if login_email:
            user = db.query(User).filter(User.email == login_email).first()
        elif login_username:
            user = db.query(User).filter(User.username == login_username).first()
            if user:
                login_email = user.email

        if not user:
            self._log_login_activity(db, login_email or login_username, ip_address, user_agent, False, "User not found in DB")
            if LOCAL_AUTH_AUTO_CREATE:
                username = login_username or self._generate_username_from_email(login_email or "", db)
                derived_email = login_email or f"{username}@local.test"
                full_name = username.replace(".", " ").title()
                user = self._create_local_user(
                    email=derived_email,
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

    async def create_user(self, user_data, db: Session):
        """Create a new user in local DB"""
        if db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")

        if user_data.username:
            username = self._validate_username_format(user_data.username)
            if self._username_exists(db, username):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already in use."
                )
        else:
            username = self._generate_username_from_email(user_data.email, db)

        full_name = user_data.full_name or username.replace(".", " ").title()

        return self._create_local_user(
            email=user_data.email,
            username=username,
            full_name=full_name,
            password=user_data.password,
            db=db
        )

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
            new_email = update_data.email.strip()
            if new_email != current_user.email:
                existing = db.query(User).filter(User.email == new_email).first()
                if existing and existing.id != current_user.id:
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
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise HTTPException(status_code=401, detail="Invalid token")
        except JWTError:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

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
