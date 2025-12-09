import os
from typing import Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# --- 1. Optional Supabase Auth client (disabled by default) ---
SUPABASE_AUTH_ENABLED = os.getenv("SUPABASE_AUTH_ENABLED", "false").lower() == "true"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Optional[Client] = None
supabase_admin: Optional[Client] = None

if SUPABASE_AUTH_ENABLED:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ CRITICAL: Supabase URL or Keys missing in .env")
    else:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        if SUPABASE_SERVICE_KEY:
            supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
else:
    print("ℹ️ Supabase auth disabled; using local database auth only.")

# --- 2. SETUP DATABASE CONNECTION (Cloud Postgres) ---
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ CRITICAL: DATABASE_URL is missing. Cannot connect to tables.")
else:
    # Supabase provides 'postgres://' but SQLAlchemy needs 'postgresql://'
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Connect to the Cloud
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