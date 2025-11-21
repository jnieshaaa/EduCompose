"""
Test Neo4j Aura Connection
Simple script to verify your Neo4j Aura connection is working correctly.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load .env FIRST before importing anything else
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=True)
except ImportError:
    pass

import logging
from app.nlp_modules.neo4j_exporter import Neo4jExporter

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_connection():
    """Test Neo4j Aura connection"""
    print("=" * 60)
    print("Testing Neo4j Aura Connection")
    print("=" * 60)
    print()
    
    # Check if .env file exists
    env_file = Path(__file__).parent.parent / ".env"
    if not env_file.exists():
        print("⚠️  WARNING: .env file not found!")
        print("   Make sure you have a .env file with:")
        print("   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io")
        print("   NEO4J_USER=neo4j")
        print("   NEO4J_PASSWORD=your_password")
        print("   NEO4J_DATABASE=neo4j")
        print()
        print("   Or pass connection details directly (see script).")
        print()
    else:
        print("✅ Found .env file - will use configuration from it")
        print()
    
    # Initialize exporter (reads from .env automatically)
    print("Step 1: Initializing Neo4j exporter...")
    print("   📖 Reading configuration from .env file...")
    try:
        exporter = Neo4jExporter()
        print("   ✅ Exporter initialized")
        print(f"   📍 URI: {exporter.uri[:30]}..." if len(exporter.uri) > 30 else f"   📍 URI: {exporter.uri}")
        print(f"   👤 User: {exporter.user}")
        print("   🔑 Password: ******** (from .env)")
        print(f"   💾 Database: {exporter.database}")
    except Exception as e:
        print(f"   ❌ Failed to initialize exporter: {e}")
        return False
    
    # Check if Neo4j is available
    print("\nStep 2: Checking Neo4j availability...")
    if not exporter.is_available():
        print("   ❌ Neo4j not available")
        print("\n   Troubleshooting:")
        print("   1. Check your Neo4j Aura instance is RUNNING (not paused)")
        print("      - Go to https://console.neo4j.io/")
        print("      - Ensure your instance shows 'RUNNING' status")
        print("      - If paused, click the play button (▶️) to resume")
        print()
        print("   2. Verify your .env configuration:")
        print(f"      - URI: {exporter.uri}")
        print(f"      - User: {exporter.user}")
        print(f"      - Password: {'SET' if exporter.password else 'NOT SET'}")
        print()
        print("   3. Check internet connection (Aura is cloud-based)")
        print()
        print("   4. Verify Neo4j library: pip install neo4j")
        return False
    else:
        print("   ✅ Neo4j is available")
    
    # Test connection
    print("\nStep 3: Testing connection to Neo4j Aura...")
    try:
        # Simple test query
        result = exporter.query("RETURN 1 as test, 'Connection successful!' as message")
        
        if result:
            print("   ✅ Connection successful!")
            print(f"   Result: {result[0]}")
        else:
            print("   ⚠️  Connected but query returned no results")
            print("   (This might be normal for a new database)")
        
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        print("\n   Troubleshooting:")
        print("   1. Check your .env file has correct NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD")
        print("   2. Ensure your Neo4j Aura instance is RUNNING (not paused)")
        print("   3. Verify your password is correct")
        print("   4. Check your internet connection")
        print(f"   Error details: {str(e)}")
        return False
    
    # Test getting database info
    print("\nStep 4: Getting database information...")
    try:
        # Get node count
        node_result = exporter.query("MATCH (n) RETURN count(n) as node_count")
        node_count = node_result[0]["node_count"] if node_result else 0
        
        # Get relationship count
        rel_result = exporter.query("MATCH ()-[r]->() RETURN count(r) as rel_count")
        rel_count = rel_result[0]["rel_count"] if rel_result else 0
        
        print(f"   ✅ Database info retrieved")
        print(f"   Current nodes: {node_count}")
        print(f"   Current relationships: {rel_count}")
        
    except Exception as e:
        print(f"   ⚠️  Could not get database info: {e}")
        print("   (This might be normal for a new database)")
    
    # Success summary
    print("\n" + "=" * 60)
    print("✅ Connection Test Complete!")
    print("=" * 60)
    print("\nYour Neo4j Aura connection is working correctly.")
    print("You can now use it to export knowledge graphs!")
    print()
    print("Next steps:")
    print("1. Export knowledge graphs using:")
    print("   from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder")
    print("   builder = EnhancedKnowledgeGraphBuilder()")
    print("   kg_result = builder.build(text='...', essay_id='essay_123')")
    print("   builder.export_to_neo4j(kg_result)")
    print()
    
    return True


def test_with_credentials(uri=None, user=None, password=None, database=None):
    """
    Test connection with explicit credentials (optional)
    
    Args:
        uri: Neo4j URI (e.g., neo4j+s://xxxxx.databases.neo4j.io)
        user: Username (default: neo4j)
        password: Password
        database: Database name (default: neo4j)
    """
    if not all([uri, password]):
        print("Usage: test_with_credentials(uri='neo4j+s://...', password='...')")
        return False
    
    print("Testing with explicit credentials...")
    exporter = Neo4jExporter(uri=uri, user=user, password=password, database=database)
    return test_connection_with_exporter(exporter)


def test_connection_with_exporter(exporter):
    """Test connection with a provided exporter"""
    if not exporter.is_available():
        print("❌ Neo4j not available")
        return False
    
    try:
        result = exporter.query("RETURN 1 as test")
        print("✅ Connection successful!")
        print(f"Result: {result}")
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Test Neo4j Aura connection')
    parser.add_argument('--uri', type=str, help='Neo4j URI (optional, uses .env if not provided)')
    parser.add_argument('--user', type=str, default='neo4j', help='Neo4j username')
    parser.add_argument('--password', type=str, help='Neo4j password')
    parser.add_argument('--database', type=str, default='neo4j', help='Database name')
    
    args = parser.parse_args()
    
    if args.uri and args.password:
        # Test with explicit credentials
        success = test_with_credentials(
            uri=args.uri,
            user=args.user,
            password=args.password,
            database=args.database
        )
    else:
        # Test using .env configuration
        success = test_connection()
    
    sys.exit(0 if success else 1)

