"""
Authentication Service
Handles user authentication and authorization with Supabase integration
"""
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os

from ..models import User, LoginActivity
from ..database import get_db
from ..supabase_client import get_supabase_client
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text

# Security setup
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__ident="2b")
security = HTTPBearer()


class AuthService:
    """Service for authentication and authorization"""

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    async def authenticate_user(
        self, credentials, db: Session, ip_address: Optional[str] = None, user_agent: Optional[str] = None
    ):
        """Authenticate user using PostgreSQL credentials and return access token"""

        try:
            db.execute(text("SELECT 1"))
        except SQLAlchemyError as e:
            error_msg = str(e)
            if "could not translate host name" in error_msg.lower() or "no such host is known" in error_msg.lower():
                detail = "Database connection failed: Cannot resolve database hostname. Please check your DATABASE_URL in the .env file."
            elif "connection" in error_msg.lower() and "refused" in error_msg.lower():
                detail = "Database connection failed: Database server is not reachable. Please ensure your database is running."
            else:
                detail = f"Database connection failed: {error_msg}"
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)

        user = db.query(User).filter(User.email == credentials.email).first()
        if not user:
            # Record failed login
            try:
                db.add(LoginActivity(
                    user_id=None,
                    email=credentials.email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    login_success=False,
                    failure_reason="User credentials not found in database",
                    login_timestamp=datetime.utcnow()
                ))
                db.commit()
            except SQLAlchemyError:
                db.rollback()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid credentials. User not found in database.",
                                headers={"WWW-Authenticate": "Bearer"})

        login_activity = LoginActivity(
            user_id=user.id,
            email=user.email,
            ip_address=ip_address,
            user_agent=user_agent,
            login_success=False,
            login_timestamp=datetime.utcnow()
        )

        if not user.is_active:
            login_activity.failure_reason = "User account is inactive"
            try:
                db.add(login_activity)
                db.commit()
            except SQLAlchemyError:
                db.rollback()
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="User account is inactive. Please contact administrator.",
                                headers={"WWW-Authenticate": "Bearer"})

        if not self.verify_password(credentials.password, user.password_hash):
            login_activity.failure_reason = "Password does not match"
            try:
                db.add(login_activity)
                db.commit()
            except SQLAlchemyError:
                db.rollback()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid credentials. Password does not match.",
                                headers={"WWW-Authenticate": "Bearer"})

        login_activity.login_success = True
        try:
            db.add(login_activity)
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = self.create_access_token(
                data={"sub": user.email, "user_id": user.id}, expires_delta=access_token_expires
            )
            db.commit()
        except SQLAlchemyError:
            db.rollback()
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
        """Create a new user in Supabase Auth and local PostgreSQL"""
        try:
            db.execute(text("SELECT 1"))
        except SQLAlchemyError as e:
            error_msg = str(e)
            if "could not translate host name" in error_msg.lower() or "no such host is known" in error_msg.lower():
                detail = "Database connection failed: Cannot resolve database hostname. Please check your DATABASE_URL in the .env file."
            elif "connection" in error_msg.lower() and "refused" in error_msg.lower():
                detail = "Database connection failed: Database server is not reachable. Please ensure your database is running."
            else:
                detail = f"Database connection failed: {error_msg}"
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)

        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        supabase = get_supabase_client()

        username = user_data.username or user_data.email.split("@")[0]
        full_name = user_data.full_name or username.replace(".", " ").title()

        # Ensure unique username
        counter = 1
        base_username = username
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        try:
            supabase_response = supabase.auth.admin.create_user({
                "email": user_data.email,
                "password": user_data.password,
                "email_confirm": False,
                "user_metadata": {"username": username, "full_name": full_name, "role": "teacher"}
            })
            if not supabase_response.user:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                    detail="Failed to create user in Supabase Auth")
            supabase_user_id = supabase_response.user.id
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail=f"Failed to create user in Supabase: {str(e)}")

        hashed_password = self.get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            username=username,
            full_name=full_name,
            role="teacher",
            password_hash=hashed_password,
            supabase_user_id=supabase_user_id,
            email_verified=False
        )

        try:
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        except SQLAlchemyError:
            db.rollback()
            try:
                supabase.auth.admin.delete_user(supabase_user_id)
            except:
                pass
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail="Failed to save user to database. Please try again.")

        return db_user

    async def send_verification_email(self, email: str):
        supabase = get_supabase_client()
        try:
            supabase.auth.admin.generate_link({"type": "signup", "email": email})
            supabase.auth.resend({"type": "signup", "email": email})
            return {"message": "Verification email sent successfully", "email": email}
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail=f"Failed to send verification email: {str(e)}")

    async def verify_email_token(self, token: str, db: Session):
        supabase = get_supabase_client()
        try:
            try:
                response = supabase.auth.verify_otp({"token": token, "type": "email"})
                user_email = response.user.email
            except:
                user_response = supabase.auth.get_user(token)
                user_email = user_response.user.email
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Failed to verify token: {str(e)}")

        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="User not found in local database. Please register first.")
        user.email_verified = True
        try:
            db.commit()
            db.refresh(user)
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail="Failed to update email verification status in database")
        return {"message": "Email verified successfully", "email": user_email, "user": {
            "id": user.id, "email": user.email, "username": user.username, "email_verified": user.email_verified
        }}

    async def get_current_user(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ):
        """Get current authenticated user from JWT token. Verifies user exists in PostgreSQL."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            db.execute(text("SELECT 1"))
        except SQLAlchemyError as e:
            error_msg = str(e)
            if "could not translate host name" in error_msg.lower() or "no such host is known" in error_msg.lower():
                detail = "Database connection failed: Cannot resolve database hostname. Please check your DATABASE_URL in the .env file."
            elif "connection" in error_msg.lower() and "refused" in error_msg.lower():
                detail = "Database connection failed: Database server is not reachable. Please ensure your database is running."
            else:
                detail = f"Database connection failed: {error_msg}"
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)

        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="User not found in database. Please login again.",
                                headers={"WWW-Authenticate": "Bearer"})
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="User account is inactive")

        return user


# Singleton instance
auth_service = AuthService()
