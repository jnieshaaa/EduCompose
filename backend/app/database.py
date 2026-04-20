import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# --- SETUP DATABASE CONNECTION ---
DATABASE_URL = os.getenv("DATABASE_URL")

# Connect to the database
if not DATABASE_URL:
    logger = logging.getLogger(__name__)
    logger.warning("DATABASE_URL not set! Falling back to local SQLite: educompose.db. This is NOT recommended for production.")

engine = create_engine(
    DATABASE_URL or "sqlite:///./educompose.db",
    pool_pre_ping=True, 
    pool_size=10 if DATABASE_URL else None, # Pool size not supported for SQLite
    max_overflow=20 if DATABASE_URL else None,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get a DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()