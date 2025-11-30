"""
Test Supabase Database Connection
This script helps diagnose Supabase connection issues
"""
import os
import sys
from urllib.parse import quote_plus
from dotenv import load_dotenv
import psycopg2
from psycopg2 import OperationalError

load_dotenv()

def test_connection():
    """Test Supabase database connection with detailed diagnostics"""
    print("=" * 70)
    print("Supabase Database Connection Test")
    print("=" * 70)
    
    # Get DATABASE_URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ ERROR: DATABASE_URL not found in .env file")
        return False
    
    print(f"\n📋 Connection String (password hidden):")
    # Hide password in display
    if "@" in database_url:
        parts = database_url.split("@")
        if ":" in parts[0]:
            user_pass = parts[0].split("://")[1] if "://" in parts[0] else parts[0]
            if ":" in user_pass:
                user, _ = user_pass.split(":", 1)
                protocol = database_url.split("://")[0] + "://"
                safe_url = f"{protocol}{user}:***@{parts[1]}"
                print(f"   {safe_url}")
            else:
                print(f"   {database_url}")
        else:
            print(f"   {database_url}")
    else:
        print(f"   {database_url}")
    
    # Parse connection string
    try:
        if database_url.startswith("postgresql://"):
            url_part = database_url.replace("postgresql://", "")
        elif database_url.startswith("postgres://"):
            url_part = database_url.replace("postgres://", "")
        else:
            print("❌ ERROR: Connection string must start with 'postgresql://' or 'postgres://'")
            return False
        
        if "@" not in url_part:
            print("❌ ERROR: Invalid connection string format (missing @)")
            return False
        
        auth, host_db = url_part.split("@", 1)
        if ":" in auth:
            user, password = auth.split(":", 1)
        else:
            user = auth
            password = ""
        
        if "/" in host_db:
            host_port, database = host_db.split("/", 1)
            if ":" in host_port:
                host, port = host_port.split(":", 1)
                port = int(port)
            else:
                host = host_port
                port = 5432
        else:
            host = host_db
            port = 5432
            database = "postgres"
        
        print(f"\n🔍 Parsed Connection Details:")
        print(f"   Host: {host}")
        print(f"   Port: {port}")
        print(f"   Database: {database}")
        print(f"   User: {user}")
        print(f"   Password: {'***' if password else '(empty)'}")
        
        # Test DNS resolution
        print(f"\n🌐 Testing DNS Resolution...")
        import socket
        try:
            ip_address = socket.gethostbyname(host)
            print(f"   ✅ Hostname resolved to: {ip_address}")
        except socket.gaierror as e:
            print(f"   ❌ DNS Resolution Failed: {e}")
            print(f"   💡 Possible causes:")
            print(f"      - Supabase project is paused")
            print(f"      - Project reference is incorrect")
            print(f"      - Network connectivity issue")
            return False
        
        # Test connection
        print(f"\n🔌 Testing Database Connection...")
        try:
            # Try with URL encoding for password (in case of special characters)
            if password:
                encoded_password = quote_plus(password)
                encoded_url = database_url.replace(f":{password}@", f":{encoded_password}@")
            else:
                encoded_url = database_url
            
            conn = psycopg2.connect(encoded_url)
            print(f"   ✅ Connection Successful!")
            
            # Test query
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            print(f"   ✅ Database Query Successful!")
            print(f"   📊 PostgreSQL Version: {version.split(',')[0]}")
            
            cursor.close()
            conn.close()
            
            print(f"\n✅ All tests passed! Your database connection is working.")
            return True
            
        except OperationalError as e:
            error_msg = str(e)
            print(f"   ❌ Connection Failed: {error_msg}")
            
            if "could not translate host name" in error_msg.lower() or "no such host is known" in error_msg.lower():
                print(f"\n💡 Solution:")
                print(f"   1. Check if your Supabase project is active (not paused)")
                print(f"   2. Verify the project reference in the hostname")
                print(f"   3. Try using connection pooling instead:")
                print(f"      - Go to Supabase Dashboard > Settings > Database")
                print(f"      - Use 'Connection Pooling' connection string instead of 'Direct connection'")
            elif "password authentication failed" in error_msg.lower():
                print(f"\n💡 Solution:")
                print(f"   1. Check if the password in DATABASE_URL is correct")
                print(f"   2. Reset your database password in Supabase Dashboard")
                print(f"   3. Make sure special characters in password are URL-encoded")
            elif "connection refused" in error_msg.lower():
                print(f"\n💡 Solution:")
                print(f"   1. Check if port {port} is accessible")
                print(f"   2. Verify firewall settings")
                print(f"   3. Try using connection pooling (port 6543) instead of direct (port 5432)")
            else:
                print(f"\n💡 Check the error message above for specific issues")
            
            return False
            
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)

