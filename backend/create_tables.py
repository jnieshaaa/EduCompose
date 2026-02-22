
import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app.database import engine
from app.models.base import Base
from app.models.signup_code import SignupVerificationCode

def create_tables():
    print("Creating tables in database...")
    print(f"Connecting to: {engine.url}")
    try:
        # Create all tables defined in the loaded metadata
        # Since we only imported SignupVerificationCode (and Base), only those known to Base will be checked/created.
        # Use checkfirst=True (default) to not fail if exists.
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully!")
    except Exception as e:
        print(f"Error creating tables: {e}")
        with open("error.log", "w") as f:
            f.write(str(e))
        # Print full traceback if needed
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_tables()
