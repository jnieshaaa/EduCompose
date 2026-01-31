"""
Signup Verification Code Model
Stores 6-digit codes for email verification during sign-up
"""
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from .base import Base


class SignupVerificationCode(Base):
    __tablename__ = "signup_verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
