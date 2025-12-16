import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# --- SETUP DATABASE CONNECTION ---
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ CRITICAL: DATABASE_URL is missing. Cannot connect to tables.")

# Connect to the database
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True, 
    pool_size=10, 
    max_overflow=20,
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