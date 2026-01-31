"""
Controllers Package
Request handlers (Controllers in MVC pattern)
"""
from .auth_controller import auth_router
from .user_controller import users_router
from .class_controller import classes_router
from .student_controller import students_router
from .essay_controller import essays_router
from .analysis_controller import analysis_router
from .admin_controller import admin_router

__all__ = [
    "auth_router",
    "users_router",
    "classes_router",
    "students_router",
    "essays_router",
    "analysis_router",
    "admin_router"
]

