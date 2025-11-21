"""
PostgreSQL Setup Script for EduCompose
This script helps you complete the PostgreSQL setup.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

def check_env_file():
    """Check if .env file has PostgreSQL configured"""
    env_path = Path(".env")
    if not env_path.exists():
        print("❌ .env file not found!")
        return False
    
    load_dotenv()
    database_url = os.getenv("DATABASE_URL", "")
    
    if not database_url:
        print("❌ DATABASE_URL not found in .env file")
        return False
    
    if "YOUR_POSTGRES_PASSWORD" in database_url:
        print("⚠️  WARNING: You need to replace YOUR_POSTGRES_PASSWORD in .env file")
        print("   Open .env and replace YOUR_POSTGRES_PASSWORD with your actual PostgreSQL password")
        return False
    
    if database_url.startswith("postgresql://"):
        print(f"✅ PostgreSQL URL configured: {database_url.split('@')[1] if '@' in database_url else 'configured'}")
        return True
    else:
        print(f"⚠️  Currently using: {database_url.split('://')[0] if '://' in database_url else 'unknown'}")
        print("   Update .env to use PostgreSQL")
        return False

def main():
    print("=" * 60)
    print("PostgreSQL Setup Check")
    print("=" * 60)
    print()
    
    if check_env_file():
        print()
        print("=" * 60)
        print("Next Steps:")
        print("=" * 60)
        print()
        print("1. Initialize the database:")
        print("   py database/init_database.py")
        print()
        print("2. Test the connection:")
        print("   py -c \"from app.database import engine; engine.connect(); print('✅ Connected!')\"")
        print()
        print("3. Start your server:")
        print("   py start.py")
        print()
    else:
        print()
        print("=" * 60)
        print("Setup Instructions:")
        print("=" * 60)
        print()
        print("1. Open .env file in the backend directory")
        print("2. Find this line:")
        print("   DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/educompose_db")
        print("3. Replace YOUR_POSTGRES_PASSWORD with your actual PostgreSQL password")
        print("   (This is the password you set when installing PostgreSQL)")
        print("4. Save the file")
        print("5. Run this script again: py setup_postgres.py")
        print()

if __name__ == "__main__":
    main()

