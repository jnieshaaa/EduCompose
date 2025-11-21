"""
Quick test of Neo4j connection with detailed error output
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

import os
print("Environment variables:")
print(f"  URI: {os.getenv('NEO4J_URI', 'NOT SET')}")
print(f"  USER: {os.getenv('NEO4J_USERNAME', os.getenv('NEO4J_USER', 'NOT SET'))}")
print(f"  PASSWORD: {'SET' if os.getenv('NEO4J_PASSWORD') else 'NOT SET'}")
print(f"  DATABASE: {os.getenv('NEO4J_DATABASE', 'NOT SET')}")
print()

try:
    from neo4j import GraphDatabase
    
    uri = os.getenv('NEO4J_URI')
    user = os.getenv('NEO4J_USERNAME') or os.getenv('NEO4J_USER', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD')
    database = os.getenv('NEO4J_DATABASE', 'neo4j')
    
    print(f"Connecting to: {uri}")
    print(f"User: {user}")
    print(f"Password length: {len(password) if password else 0}")
    print()
    
    driver = GraphDatabase.driver(uri, auth=(user, password))
    print("Driver created. Verifying connectivity...")
    
    driver.verify_connectivity()
    print("✅ CONNECTION SUCCESSFUL!")
    
    # Test a query
    with driver.session(database=database) as session:
        result = session.run("RETURN 1 as test")
        print(f"✅ Query successful: {result.single()}")
    
    driver.close()
    
except Exception as e:
    print(f"❌ ERROR: {type(e).__name__}")
    print(f"   {str(e)}")
    print()
    print("Possible causes:")
    print("  1. Instance still starting (wait 60+ seconds)")
    print("  2. Wrong password")
    print("  3. Instance paused")
    print("  4. Network issue")
    import traceback
    traceback.print_exc()

