"""
Test PostgreSQL Connection
This script helps you test your PostgreSQL connection and find the right password.
"""
import psycopg2
import sys

def test_connection(user="postgres", password="", host="localhost", port=5432, database="postgres"):
    """Test PostgreSQL connection with given credentials"""
    try:
        conn = psycopg2.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database=database
        )
        print(f"✅ SUCCESS! Connected to PostgreSQL!")
        print(f"   User: {user}")
        print(f"   Host: {host}:{port}")
        print(f"   Database: {database}")
        conn.close()
        return True
    except psycopg2.OperationalError as e:
        error_msg = str(e)
        if "password authentication failed" in error_msg:
            print(f"❌ Password incorrect for user '{user}'")
        elif "could not connect" in error_msg:
            print(f"❌ Could not connect to PostgreSQL at {host}:{port}")
            print(f"   Make sure PostgreSQL service is running")
        else:
            print(f"❌ Connection error: {error_msg}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("PostgreSQL Connection Test")
    print("=" * 60)
    print()
    
    # Try common default passwords
    common_passwords = ["postgres", "", "admin", "password", "root"]
    
    print("Testing common passwords...")
    print()
    
    success = False
    for pwd in common_passwords:
        print(f"Trying password: {'(empty)' if pwd == '' else '***'}")
        if test_connection(password=pwd):
            print()
            print("=" * 60)
            print(f"✅ Found working password!")
            print(f"   Use this in your .env file:")
            print(f"   DATABASE_URL=postgresql://postgres:{pwd}@localhost:5432/educompose_db")
            print("=" * 60)
            success = True
            break
        print()
    
    if not success:
        print("=" * 60)
        print("❌ None of the common passwords worked.")
        print()
        print("Please provide your PostgreSQL password:")
        print("(This is the password you set during PostgreSQL installation)")
        print()
        password = input("Enter PostgreSQL password (or press Enter to skip): ").strip()
        
        if password:
            print()
            if test_connection(password=password):
                print()
                print("=" * 60)
                print(f"✅ Connection successful!")
                print(f"   Use this in your .env file:")
                print(f"   DATABASE_URL=postgresql://postgres:{password}@localhost:5432/educompose_db")
                print("=" * 60)
            else:
                print()
                print("❌ Connection failed. Please check:")
                print("   1. PostgreSQL service is running")
                print("   2. Password is correct")
                print("   3. PostgreSQL is listening on port 5432")
        else:
            print()
            print("Skipped. You can manually update .env file with:")
            print("DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/educompose_db")

