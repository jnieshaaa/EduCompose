from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL - PostgreSQL required
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required. Please set it to a PostgreSQL connection string.")

if not (DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgresql+psycopg2://")):
    raise ValueError(f"Only PostgreSQL is supported. DATABASE_URL must start with 'postgresql://' or 'postgresql+psycopg2://'. Got: {DATABASE_URL[:20]}...")

# PostgreSQL configuration
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=10,  # Connection pool size
    max_overflow=20,  # Maximum overflow connections
    echo=os.getenv("SQL_ECHO", "False").lower() == "true"  # Log SQL queries
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
