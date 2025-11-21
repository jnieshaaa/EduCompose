"""
Helper script to update PostgreSQL password in .env file
"""
import re
from pathlib import Path

def update_password():
    env_path = Path(".env")
    
    if not env_path.exists():
        print("❌ .env file not found!")
        return False
    
    # Read current content
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Check if password needs to be set
    if "YOUR_POSTGRES_PASSWORD" not in content:
        print("✅ Password already configured!")
        return True
    
    print("=" * 60)
    print("PostgreSQL Password Setup")
    print("=" * 60)
    print()
    print("Enter your PostgreSQL password.")
    print("(This is the password you set when installing PostgreSQL)")
    print("(The password will be saved in .env file)")
    print()
    
    password = input("PostgreSQL password: ").strip()
    
    if not password:
        print("❌ Password cannot be empty. Cancelled.")
        return False
    
    # Update the password in the file
    new_content = content.replace("YOUR_POSTGRES_PASSWORD", password)
    
    # Write back to file
    with open(env_path, 'w') as f:
        f.write(new_content)
    
    print()
    print("✅ Password updated in .env file!")
    print()
    print("Next step: Initialize the database")
    print("   Run: py database/init_database.py")
    return True

if __name__ == "__main__":
    update_password()

