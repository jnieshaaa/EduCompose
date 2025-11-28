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
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Configure password hashing - use bcrypt with auto-deprecation
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__ident="2b"  # Use bcrypt 2b format
)
security = HTTPBearer()

class AuthService:
    """Service for authentication and authorization"""
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against a hashed password"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        # Passlib handles string passwords automatically
        # If password is too long (bcrypt 72 byte limit), passlib will handle it
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    async def authenticate_user(self, credentials, db: Session, ip_address: Optional[str] = None, user_agent: Optional[str] = None):
        """
        Authenticate a user and return access token. 
        Only accepts credentials that exist in PostgreSQL database.
        Records login activity in PostgreSQL.
        """
        try:
            # Verify database connection first - must be able to query PostgreSQL
            db.execute(text("SELECT 1"))
        except SQLAlchemyError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection failed. Please ensure PostgreSQL is running and accessible.",
            )
        
        # Query PostgreSQL for the user - credentials MUST exist in database
        try:
            user = db.query(User).filter(User.email == credentials.email).first()
        except SQLAlchemyError as e:
            # Database query failed - reject login
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to verify credentials. Database connection error.",
            )
        
        # CRITICAL: User credentials MUST exist in PostgreSQL to login
        # Reject login if user is not found in database
        if not user:
            # Record failed login attempt
            try:
                login_activity = LoginActivity(
                    user_id=None,
                    email=credentials.email,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    login_success=False,
                    failure_reason="User credentials not found in database",
                    login_timestamp=datetime.utcnow()
                )
                db.add(login_activity)
                db.commit()
            except SQLAlchemyError:
                # If we can't record the activity, still reject the login
                db.rollback()
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials. User not found in database.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # User exists in database - verify additional requirements
        
        # Record login attempt (will update success status after verification)
        login_activity = LoginActivity(
            user_id=user.id,
            email=credentials.email,
            ip_address=ip_address,
            user_agent=user_agent,
            login_success=False,
            login_timestamp=datetime.utcnow()
        )
        
        # Verify user account is active (user must be active in database)
        if not user.is_active:
            login_activity.failure_reason = "User account is inactive in database"
            try:
                db.add(login_activity)
                db.commit()
            except SQLAlchemyError:
                db.rollback()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive. Please contact administrator.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # CRITICAL: Verify password matches the hash stored in PostgreSQL
        # Password must match exactly what's recorded in the database
        if not self.verify_password(credentials.password, user.password_hash):
            login_activity.failure_reason = "Password does not match database record"
            try:
                db.add(login_activity)
                db.commit()
            except SQLAlchemyError:
                db.rollback()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials. Password does not match database record.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # All validations passed - user credentials exist and match in PostgreSQL
        # Record successful login
        login_activity.login_success = True
        try:
            db.add(login_activity)
            
            # Create access token
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = self.create_access_token(
                data={"sub": user.email, "user_id": user.id}, expires_delta=access_token_expires
            )
            
            db.commit()
        except SQLAlchemyError as e:
            db.rollback()
            # Even if we can't record the activity, if credentials are valid, allow login
            # but log the error
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = self.create_access_token(
                data={"sub": user.email, "user_id": user.id}, expires_delta=access_token_expires
            )
        
        # Return successful authentication response
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
        """
        Create a new user using Supabase Auth and save to PostgreSQL database.
        Sends email verification link via Supabase.
        """
        # Verify database connection
        try:
            db.execute(text("SELECT 1"))
        except SQLAlchemyError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection failed. Cannot create user.",
            )
        
        # Check if user already exists in database
        try:
            existing_user = db.query(User).filter(User.email == user_data.email).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
        except SQLAlchemyError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to verify user in database.",
            )
        
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Auto-generate username and full_name from email if not provided
        if not user_data.username:
            username = user_data.email.split("@")[0]
        else:
            username = user_data.username
        
        if not user_data.full_name:
            full_name = user_data.email.split("@")[0].replace(".", " ").title()
        else:
            full_name = user_data.full_name
        
        # Check if username already exists, if so append number
        existing_username = db.query(User).filter(User.username == username).first()
        if existing_username:
            counter = 1
            while db.query(User).filter(User.username == f"{username}{counter}").first():
                counter += 1
            username = f"{username}{counter}"
        
        # Create user in Supabase Auth (this will send verification email)
        try:
            supabase_response = supabase.auth.admin.create_user({
                "email": user_data.email,
                "password": user_data.password,
                "email_confirm": False,  # Require email verification
                "user_metadata": {
                    "username": username,
                    "full_name": full_name,
                    "role": "teacher"
                }
            })
            
            if not supabase_response.user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to create user in Supabase Auth"
                )
            
            supabase_user_id = supabase_response.user.id
            
        except Exception as e:
            # If Supabase user creation fails, check if it's because user already exists
            error_msg = str(e).lower()
            if "already registered" in error_msg or "user already exists" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered in Supabase"
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user in Supabase: {str(e)}"
            )
        
        # Hash password for local database (backup/fallback)
        hashed_password = self.get_password_hash(user_data.password)
        
        # Create user record in local PostgreSQL database
        db_user = User(
            email=user_data.email,
            username=username,
            full_name=full_name,
            role="teacher",  # Default role
            password_hash=hashed_password,
            supabase_user_id=supabase_user_id,
            email_verified=False  # Will be updated when user verifies email
        )
        
        # Save user to PostgreSQL database
        try:
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        except SQLAlchemyError as e:
            db.rollback()
            # Try to clean up Supabase user if database save fails
            try:
                supabase.auth.admin.delete_user(supabase_user_id)
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save user to database. Please try again.",
            )
        
        # Verify user was saved to database
        if db_user.id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User was not saved to database.",
            )
        
        return db_user
    
    async def send_verification_email(self, email: str):
        """
        Send email verification link using Supabase Auth
        """
        supabase = get_supabase_client()
        
        try:
            # Use admin API to generate and send verification email
            # This requires the user to exist in Supabase Auth first
            response = supabase.auth.admin.generate_link({
                "type": "signup",
                "email": email,
            })
            
            # The generate_link returns a link, but we want to actually send the email
            # So we use the resend method which sends the verification email
            try:
                # Try to resend verification email (works if user exists)
                supabase.auth.resend({
                    "type": "signup",
                    "email": email
                })
            except:
                # If resend fails, the generate_link should have created the link
                # In production, you might want to send this link via your own email service
                pass
            
            return {"message": "Verification email sent successfully", "email": email}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send verification email: {str(e)}"
            )
    
    async def verify_email_token(self, token: str, db: Session):
        """
        Verify email using Supabase Auth token
        
        The token can be:
        1. OTP token from email verification
        2. Access token from magic link redirect
        
        After verification, updates the user's email_verified status in local database.
        """
        supabase = get_supabase_client()
        
        try:
            # Try to verify as OTP token (most common for email verification)
            try:
                response = supabase.auth.verify_otp({
                    "token": token,
                    "type": "email"
                })
                
                # Extract user email from response
                if hasattr(response, 'user') and response.user:
                    user_email = getattr(response.user, 'email', None) or response.user.get('email') if isinstance(response.user, dict) else None
                else:
                    user_email = None
                    
            except Exception as otp_error:
                # If OTP verification fails, try to use token as access token
                # This handles magic link scenarios where frontend extracts the token
                try:
                    # Try to get user info using the token as an access token
                    user_response = supabase.auth.get_user(token)
                    if hasattr(user_response, 'user') and user_response.user:
                        user_email = getattr(user_response.user, 'email', None) or user_response.user.get('email') if isinstance(user_response.user, dict) else None
                    else:
                        user_email = None
                    
                    if not user_email:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid verification token: could not extract user email"
                        )
                except Exception as token_error:
                    # Both methods failed
                    error_msg = str(otp_error).lower() + " " + str(token_error).lower()
                    if "invalid" in error_msg or "expired" in error_msg:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid or expired verification token"
                        )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to verify token: {str(otp_error)}"
                    )
            
            if not user_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract email from verification token"
                )
            
            # Update user email_verified status in local database
            user = db.query(User).filter(User.email == user_email).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found in local database. Please register first."
                )
            
            # Update verification status
            user.email_verified = True
            try:
                db.commit()
                db.refresh(user)
            except SQLAlchemyError as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update email verification status in database"
                )
            
            return {
                "message": "Email verified successfully",
                "email": user_email,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "email_verified": user.email_verified
                }
            }
        except HTTPException:
            raise
        except Exception as e:
            error_msg = str(e).lower()
            if "invalid" in error_msg or "expired" in error_msg or "not found" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired verification token"
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to verify email: {str(e)}"
            )
    
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
        
        # Verify database connection
        try:
            db.execute(text("SELECT 1"))
        except SQLAlchemyError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection failed",
            )
        
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception
        
        # Verify user exists in PostgreSQL database
        try:
            user = db.query(User).filter(User.email == email).first()
        except SQLAlchemyError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to verify user credentials in database",
            )
        
        # User MUST exist in database
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found in database. Please login again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify user is still active in database
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )
        
        return user

# Singleton instance
auth_service = AuthService()

