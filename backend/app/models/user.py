import uuid
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=True)
    
    # New Supabase-aligned columns
    first_name = Column(String, nullable=True)
    middle_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    suffix = Column(String, nullable=True)
    birthday = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # Profile info
    title = Column(String, nullable=True)
    nickname = Column(String, nullable=True)
    
    # Auth and status
    password_hash = Column(String, nullable=True)
    role = Column(String, default="teacher")  # admin, teacher, student
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    archived_at = Column(DateTime, nullable=True)
    
    # Relationships
    classes = relationship("Class", back_populates="teacher")
    essays = relationship("Essay", back_populates="teacher")

