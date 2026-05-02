import sqlite3
import os

def fix_database():
    db_path = 'educompose.db'
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Check current schema
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        id_type = next((col[2] for col in columns if col[1] == 'id'), None)
        
        if id_type == 'INTEGER':
            print("Detected INTEGER id column. Migrating to TEXT (UUID)...")
            
            # 2. Rename old table
            cursor.execute("ALTER TABLE users RENAME TO users_old")
            
            # Drop old indexes to avoid conflicts
            cursor.execute("DROP INDEX IF EXISTS ix_users_username")
            cursor.execute("DROP INDEX IF EXISTS ix_users_email")
            cursor.execute("DROP INDEX IF EXISTS ix_users_id")

            # 3. Create new table with correct schema
            cursor.execute("""
                CREATE TABLE users (
                    id TEXT NOT NULL, 
                    email VARCHAR NOT NULL, 
                    username VARCHAR NOT NULL, 
                    full_name VARCHAR NOT NULL, 
                    title VARCHAR, 
                    nickname VARCHAR, 
                    password_hash VARCHAR, 
                    role VARCHAR, 
                    is_active BOOLEAN, 
                    email_verified BOOLEAN, 
                    created_at DATETIME, 
                    PRIMARY KEY (id)
                )
            """)
            
            # 4. Recreate indexes
            cursor.execute("CREATE UNIQUE INDEX ix_users_username ON users (username)")
            cursor.execute("CREATE UNIQUE INDEX ix_users_email ON users (email)")
            cursor.execute("CREATE INDEX ix_users_id ON users (id)")
            
            # 5. Copy data (only if you want to keep old users, but they have integer IDs so they might not work with UUID logic)
            # For a clean break, we might skip this, but let's try to copy and convert IDs to string
            print("Migrating existing users...")
            cursor.execute("INSERT INTO users SELECT CAST(id AS TEXT), email, username, full_name, title, nickname, password_hash, role, is_active, email_verified, created_at FROM users_old")
            
            # 6. Drop old table
            cursor.execute("DROP TABLE users_old")
            
            conn.commit()
            print("Database migration successful!")
        else:
            print(f"User ID type is already {id_type}. No migration needed.")

    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_database()
