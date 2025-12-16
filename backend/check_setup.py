#!/usr/bin/env python3
"""
Quick setup checker for EduCompose backend
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

print("=" * 60)
print("EduCompose Backend Setup Checker")
print("=" * 60)

# Check .env file
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    print("✓ .env file exists")
    load_dotenv()
else:
    print("✗ .env file NOT FOUND")
    print("  → Run: copy env.example .env")
    print("  → Then edit .env with your configuration")
    sys.exit(1)

# Check DATABASE_URL
database_url = os.getenv("DATABASE_URL")
if database_url:
    print(f"✓ DATABASE_URL is set")
    if database_url.startswith("sqlite://"):
        print(f"  → Using SQLite")
    elif database_url.startswith("postgresql://") or database_url.startswith("postgresql+psycopg2://"):
        print(f"  → Using PostgreSQL")
    else:
        print(f"  → Using: {database_url[:30]}...")
else:
    print("✗ DATABASE_URL is NOT SET")
    print("  → Add DATABASE_URL to .env file")
    sys.exit(1)

# Check SECRET_KEY
secret_key = os.getenv("SECRET_KEY")
if secret_key and secret_key != "your-secret-key-here":
    print("✓ SECRET_KEY is set")
else:
    print("✗ SECRET_KEY is NOT SET or using default value")
    print("  → Generate one: python -c \"import secrets; print(secrets.token_urlsafe(32))\"")
    print("  → Add to .env: SECRET_KEY=<generated-key>")

# Check Python packages
print("\nChecking Python packages...")
required_packages = [
    ("fastapi", "fastapi"),
    ("uvicorn", "uvicorn"),
    ("sqlalchemy", "sqlalchemy"),
    ("python-dotenv", "dotenv"),
    ("pydantic", "pydantic")
]

missing_packages = []
for package_name, import_name in required_packages:
    try:
        __import__(import_name)
        print(f"  ✓ {package_name}")
    except ImportError:
        print(f"  ✗ {package_name} - NOT INSTALLED")
        missing_packages.append(package_name)

if missing_packages:
    print(f"\n✗ Missing packages: {', '.join(missing_packages)}")
    print("  → Run: pip install -r requirements.txt")
    sys.exit(1)

# Try to import the app
print("\nChecking application...")
try:
    from app.main import app
    print("✓ Application imports successfully")
except Exception as e:
    print(f"✗ Failed to import application: {e}")
    sys.exit(1)

# Try database connection
print("\nChecking database connection...")
try:
    from app.database import engine
    with engine.connect() as conn:
        print("✓ Database connection successful")
except Exception as e:
    print(f"✗ Database connection failed: {e}")
    print("  → Check DATABASE_URL in .env file")
    sys.exit(1)

print("\n" + "=" * 60)
print("✓ All checks passed! You can start the server with:")
print("  python start.py")
print("=" * 60)

