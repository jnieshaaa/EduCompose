import uuid
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

def generate_uuid():
    return str(uuid.uuid4())

class Class(Base):
    __tablename__ = "classes"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text)
    teacher_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    teacher = relationship("User", back_populates="classes")
    students = relationship("Student", back_populates="class_obj")
    essays = relationship("Essay", back_populates="class_obj")

