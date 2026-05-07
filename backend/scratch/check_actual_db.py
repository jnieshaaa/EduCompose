import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not set!")
    exit(1)

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

columns = inspector.get_columns('users')
print("Columns in 'users' table:")
for column in columns:
    print(f"- {column['name']}: {column['type']}")
