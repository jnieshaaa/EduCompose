"""
User Model
Teacher/Admin user model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="teacher")  # teacher, admin
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    supabase_user_id = Column(String, unique=True, index=True, nullable=True)  # Link to Supabase Auth user
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    classes = relationship("Class", back_populates="teacher")
    essays = relationship("Essay", back_populates="teacher")

