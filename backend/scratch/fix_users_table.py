import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not set!")
    exit(1)

def fix_users_table():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("Adding missing columns to public.users table...")
        
        # Add columns one by one to avoid stopping on error if some exist
        columns_to_add = [
            ("username", "TEXT"),
            ("full_name", "TEXT"),
            ("title", "TEXT"),
            ("nickname", "TEXT"),
            ("password_hash", "TEXT"),
            ("email_verified", "BOOLEAN DEFAULT FALSE")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                cur.execute(f"ALTER TABLE public.users ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
                print(f"  - Added {col_name}")
            except Exception as e:
                print(f"  - Error adding {col_name}: {e}")
                conn.rollback()
                continue
        
        # Also ensure constraints/indexes if needed, but let's keep it simple for now
        # to just fix the "UndefinedColumn" error.
        
        # Populate full_name from first_name/last_name for existing users
        cur.execute("""
            UPDATE public.users 
            SET full_name = trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
            WHERE full_name IS NULL OR full_name = '';
        """)
        
        # Populate username from email for existing users
        cur.execute("""
            UPDATE public.users 
            SET username = split_part(email, '@', 1)
            WHERE username IS NULL OR username = '';
        """)
        
        conn.commit()
        print("Database fix completed successfully.")
        
        # Check current columns again
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'")
        cols = [r[0] for r in cur.fetchall()]
        print(f"Current columns: {', '.join(cols)}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Failed to fix database: {e}")

if __name__ == "__main__":
    fix_users_table()
