"""
Comprehensive Neo4j connection diagnostics
Identifies specific connection problems
"""
import sys
from pathlib import Path
import os
import time

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

print("=" * 70)
print("Neo4j Connection Diagnostics")
print("=" * 70)
print()

# Step 1: Check environment variables
print("Step 1: Checking environment variables...")
uri = os.getenv('NEO4J_URI')
user = os.getenv('NEO4J_USERNAME') or os.getenv('NEO4J_USER', 'neo4j')
password = os.getenv('NEO4J_PASSWORD')
database = os.getenv('NEO4J_DATABASE', 'neo4j')

issues = []

if not uri:
    print("   ❌ NEO4J_URI is not set!")
    issues.append("Missing NEO4J_URI")
elif "localhost" in uri or "127.0.0.1" in uri:
    print(f"   ⚠️  URI points to localhost: {uri}")
    print("      For Aura, should be: neo4j+s://xxxxx.databases.neo4j.io")
    issues.append("URI might be wrong (localhost detected)")
else:
    print(f"   ✅ URI: {uri}")
    if uri.startswith("neo4j+s://"):
        print("      ✅ Using secure connection (neo4j+s://) - correct for Aura")
    elif uri.startswith("neo4j://"):
        print("      ⚠️  Using unencrypted connection - might not work with Aura")
        issues.append("Should use neo4j+s:// for Aura")
    
    if ".databases.neo4j.io" in uri:
        print("      ✅ URI format looks correct for Aura")
    else:
        print("      ⚠️  URI doesn't match Aura format")
        issues.append("URI format might be incorrect")

if not user:
    print("   ⚠️  Username not set (using default: neo4j)")
else:
    print(f"   ✅ Username: {user}")

if not password:
    print("   ❌ NEO4J_PASSWORD is not set!")
    issues.append("Missing password")
else:
    print(f"   ✅ Password: SET (length: {len(password)})")
    if len(password) < 10:
        print("      ⚠️  Password seems too short")
        issues.append("Password might be too short")
    if password.startswith(" ") or password.endswith(" "):
        print("      ⚠️  Password has leading/trailing spaces!")
        issues.append("Password has extra spaces")

print(f"   ✅ Database: {database}")
print()

# Step 2: Check if neo4j module is installed
print("Step 2: Checking Neo4j library...")
try:
    import neo4j
    print(f"   ✅ Neo4j library installed: version {neo4j.__version__}")
except ImportError:
    print("   ❌ Neo4j library not installed!")
    print("      Run: pip install neo4j~=5.28.0")
    issues.append("Neo4j library not installed")
    sys.exit(1)
print()

# Step 3: Test network connectivity
print("Step 3: Testing network connectivity...")
import socket
try:
    if ".databases.neo4j.io" in uri:
        host = uri.replace("neo4j+s://", "").replace("neo4j://", "").split("/")[0].split(":")[0]
        print(f"   Testing connection to: {host}")
        
        # Try DNS resolution
        try:
            ip = socket.gethostbyname(host)
            print(f"   ✅ DNS resolution OK: {host} → {ip}")
        except socket.gaierror as e:
            print(f"   ❌ DNS resolution failed: {e}")
            issues.append(f"DNS resolution failed: {host}")
        
        # Try TCP connection on port 7687 (or 443 for HTTPS)
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((host, 443))
            sock.close()
            if result == 0:
                print(f"   ✅ TCP connection to {host}:443 OK")
            else:
                print(f"   ❌ TCP connection to {host}:443 failed (error code: {result})")
                issues.append("TCP connection failed")
        except Exception as e:
            print(f"   ⚠️  TCP connection test error: {e}")
            issues.append("Network connectivity issue")
except Exception as e:
    print(f"   ⚠️  Network test error: {e}")
print()

# Step 4: Test Neo4j driver creation
print("Step 4: Testing Neo4j driver creation...")
try:
    from neo4j import GraphDatabase
    
    print(f"   Creating driver for: {uri}")
    driver = GraphDatabase.driver(uri, auth=(user, password))
    print("   ✅ Driver created successfully")
    
    # Step 5: Test connectivity with timeout
    print()
    print("Step 5: Testing Neo4j connectivity...")
    print("   (This may take 10-30 seconds)")
    
    try:
        # Try verify_connectivity with explicit timeout
        driver.verify_connectivity()
        print("   ✅ CONNECTION SUCCESSFUL!")
        print()
        print("=" * 70)
        print("✅ All checks passed! Your Neo4j connection is working!")
        print("=" * 70)
        
        # Test a simple query
        with driver.session(database=database) as session:
            result = session.run("RETURN 1 as test")
            record = result.single()
            print(f"   ✅ Query test successful: {record['test']}")
        
        driver.close()
        sys.exit(0)
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        print(f"   ❌ Connection failed!")
        print(f"      Error type: {error_type}")
        print(f"      Error message: {error_msg}")
        print()
        
        # Specific error diagnosis
        print("Step 6: Diagnosing specific error...")
        
        if "authentication" in error_msg.lower() or "password" in error_msg.lower() or "unauthorized" in error_msg.lower():
            print("   🔍 Problem: AUTHENTICATION FAILED")
            print("      This means:")
            print("      1. Password is INCORRECT")
            print("      2. Username is wrong")
            print("      3. Credentials don't match the instance")
            print()
            print("      Solutions:")
            print("      - Double-check password in credentials file")
            print("      - Make sure no extra spaces in password")
            print("      - Copy password from Notepad (removes hidden chars)")
            print("      - Verify username is 'neo4j'")
            issues.append("Authentication failed - wrong password/username")
            
        elif "routing information" in error_msg.lower() or "unable to retrieve" in error_msg.lower():
            print("   🔍 Problem: UNABLE TO RETRIEVE ROUTING INFORMATION")
            print("      This means:")
            print("      1. Instance is NOT RUNNING (most likely)")
            print("      2. Instance is PAUSED")
            print("      3. Instance is still STARTING")
            print("      4. Instance was deleted")
            print()
            print("      Solutions:")
            print("      - Go to https://console.neo4j.io/")
            print("      - Check instance status:")
            print("        * If 'STARTING' → Wait 1-3 minutes")
            print("        * If 'PAUSED' → Click play button (▶️)")
            print("        * If 'STOPPED' → Click play to start")
            print("        * If not visible → Instance might be deleted")
            print("      - Wait until status shows 'RUNNING' (green dot)")
            issues.append("Unable to retrieve routing - instance not running/paused")
            
        elif "connection refused" in error_msg.lower() or "connection reset" in error_msg.lower():
            print("   🔍 Problem: CONNECTION REFUSED/RESET")
            print("      This means:")
            print("      1. Instance is not accessible")
            print("      2. Firewall blocking connection")
            print("      3. Instance is down")
            print()
            print("      Solutions:")
            print("      - Check instance status in dashboard")
            print("      - Check firewall settings")
            print("      - Try from different network")
            issues.append("Connection refused - network/firewall issue")
            
        elif "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
            print("   🔍 Problem: CONNECTION TIMEOUT")
            print("      This means:")
            print("      1. Network is slow")
            print("      2. Instance is overloaded")
            print("      3. Firewall blocking connection")
            print()
            print("      Solutions:")
            print("      - Check internet connection")
            print("      - Wait and try again")
            print("      - Check firewall settings")
            issues.append("Connection timeout - network issue")
            
        elif "ssl" in error_msg.lower() or "tls" in error_msg.lower() or "certificate" in error_msg.lower():
            print("   🔍 Problem: SSL/TLS/CERTIFICATE ERROR")
            print("      This means:")
            print("      1. SSL certificate issue")
            print("      2. Wrong URI format (should use neo4j+s://)")
            print()
            print("      Solutions:")
            print("      - Verify URI uses 'neo4j+s://' (not 'neo4j://')")
            print("      - Check SSL certificates are up to date")
            issues.append("SSL/TLS error - certificate or URI format issue")
            
        elif "name resolution" in error_msg.lower() or "host" in error_msg.lower() or "could not resolve" in error_msg.lower():
            print("   🔍 Problem: HOST NAME RESOLUTION FAILED")
            print("      This means:")
            print("      1. DNS cannot resolve the hostname")
            print("      2. URI is incorrect")
            print("      3. Internet connection issue")
            print()
            print("      Solutions:")
            print("      - Verify URI is correct")
            print("      - Check internet connection")
            print("      - Try: ping xxxxx.databases.neo4j.io")
            issues.append("DNS resolution failed - wrong URI or network")
            
        else:
            print("   🔍 Problem: UNKNOWN ERROR")
            print(f"      Error: {error_type}: {error_msg}")
            print()
            print("      Common causes:")
            print("      - Instance not running")
            print("      - Wrong credentials")
            print("      - Network issue")
            print("      - Instance deleted or paused")
            issues.append(f"Unknown error: {error_type}")
        
        driver.close()
        
except Exception as e:
    print(f"   ❌ Driver creation failed: {type(e).__name__}: {e}")
    issues.append(f"Driver creation failed: {type(e).__name__}")

print()
print("=" * 70)
print("Diagnostic Summary")
print("=" * 70)

if not issues:
    print("✅ No issues detected in environment setup")
    print("   Connection problem might be temporary (instance starting)")
else:
    print(f"⚠️  Found {len(issues)} potential issue(s):")
    for i, issue in enumerate(issues, 1):
        print(f"   {i}. {issue}")

print()
print("Next Steps:")
print("1. Check instance status in dashboard: https://console.neo4j.io/")
print("2. Ensure instance shows 'RUNNING' (green dot)")
print("3. If 'PAUSED' or 'STOPPED', click play button (▶️)")
print("4. Wait 1-2 minutes if status is 'STARTING'")
print("5. Then run this diagnostic again")
print()

