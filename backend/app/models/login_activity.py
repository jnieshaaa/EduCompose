"""
Login Activity Model
Tracks user login history for security and auditing
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class LoginActivity(Base):
    __tablename__ = "login_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)  # Store email for auditing even if user is deleted
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    login_success = Column(Boolean, default=True)
    failure_reason = Column(String, nullable=True)  # e.g., "Invalid password", "User not found"
    login_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationship
    user = relationship("User", backref="login_activities")

