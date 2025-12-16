#!/usr/bin/env python3
"""
Initialize database with dummy data from JSON file
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models
from app.data_loader import load_dummy_data
from app.services.auth_service import AuthService
from sqlalchemy import text

def init_database():
    """Initialize database with dummy data"""
    # Create all tables
    models.Base.metadata.create_all(bind=engine)
    
    # Load dummy data
    data = load_dummy_data()
    
    if not data:
        print("No dummy data found. Please check the data file.")
        return
    
    db = SessionLocal()
    
    try:
        # Clear existing data
        db.query(models.Essay).delete()
        db.query(models.Student).delete()
        db.query(models.Class).delete()
        db.query(models.User).delete()
        db.commit()
        
        # Add users
        auth_service = AuthService()
        for user_data in data.get('users', []):
            password = user_data.get('password', 'password')
            user = models.User(
                id=user_data['id'],
                email=user_data['email'],
                username=user_data['username'],
                full_name=user_data['full_name'],
                role=user_data['role'],
                is_active=user_data['is_active'],
                password_hash=auth_service._hash_password(password)
            )
            db.add(user)
        
        print(f"Created {len(data.get('users', []))} user records")

        # Reset the users table sequence to avoid duplicate key errors (PostgreSQL only)
        # For SQLite, this is not needed as autoincrement handles it automatically
        try:
            from app.database import engine
            if engine.url.drivername == 'postgresql':
                db.execute(
                    text(
                        "SELECT setval(pg_get_serial_sequence('users','id'), "
                        "(SELECT COALESCE(MAX(id), 0) + 1 FROM users))"
                    )
                )
                db.commit()
        except Exception as e:
            db.rollback()
            print(f"Warning: Failed to reset users sequence: {e}")
        
        # Add classes
        for class_data in data.get('classes', []):
            class_obj = models.Class(
                id=class_data['id'],
                name=class_data['name'],
                description=class_data['description'],
                teacher_id=class_data['teacher_id'],
                is_active=class_data['is_active']
            )
            db.add(class_obj)
        
        # Add students
        for student_data in data.get('students', []):
            student = models.Student(
                id=student_data['id'],
                student_id=student_data['student_id'],
                full_name=student_data['full_name'],
                email=student_data['email'],
                class_id=student_data['class_id'],
                is_active=student_data['is_active']
            )
            db.add(student)
        
        # Add essays
        for essay_data in data.get('essays', []):
            essay = models.Essay(
                id=essay_data['id'],
                title=essay_data['title'],
                content=essay_data['content'],
                student_id=essay_data['student_id'],
                teacher_id=essay_data['teacher_id'],
                class_id=essay_data['class_id'],
                status=essay_data['status'],
                grammar_score=essay_data.get('grammar_score'),
                readability_score=essay_data.get('readability_score'),
                coherence_score=essay_data.get('coherence_score'),
                argument_strength_score=essay_data.get('argument_strength_score'),
                overall_score=essay_data.get('overall_score'),
                grammar_errors=essay_data.get('grammar_errors'),
                style_issues=essay_data.get('style_issues'),
                argument_analysis=essay_data.get('argument_analysis'),
                recommendations=essay_data.get('recommendations')
            )
            db.add(essay)
        
        db.commit()
        print("Database initialized with dummy data successfully!")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
