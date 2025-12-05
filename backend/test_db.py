import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# Ensure DATABASE_URL is set in your .env file
DATABASE_URL = os.getenv("DATABASE_URL")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("✅ Database connection successful!")
except Exception as e:
    print(f"❌ Connection failed: {e}")