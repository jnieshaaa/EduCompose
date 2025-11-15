"""
PostgreSQL Database Initialization Script
Creates the database schema and sets up the database for EduCompose
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

load_dotenv()

def get_db_config():
    """Extract database configuration from DATABASE_URL"""
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        print("Please set DATABASE_URL in your .env file")
        print("Format: postgresql://username:password@host:port/database")
        sys.exit(1)
    
    # Parse PostgreSQL URL
    # Format: postgresql://user:password@host:port/dbname
    if database_url.startswith("postgresql://"):
        url = database_url.replace("postgresql://", "")
        if "@" in url:
            auth, rest = url.split("@", 1)
            if ":" in auth:
                user, password = auth.split(":", 1)
            else:
                user = auth
                password = ""
            
            if "/" in rest:
                host_port, dbname = rest.split("/", 1)
                if ":" in host_port:
                    host, port = host_port.split(":", 1)
                else:
                    host = host_port
                    port = "5432"
            else:
                host = rest
                port = "5432"
                dbname = "postgres"
        else:
            print("ERROR: Invalid DATABASE_URL format")
            sys.exit(1)
    else:
        print("ERROR: DATABASE_URL must start with postgresql://")
        sys.exit(1)
    
    return {
        "user": user,
        "password": password,
        "host": host,
        "port": port,
        "dbname": dbname
    }

def create_database_if_not_exists(config):
    """Create the database if it doesn't exist"""
    # Connect to postgres database to create the target database
    admin_config = config.copy()
    admin_config["dbname"] = "postgres"
    
    try:
        conn = psycopg2.connect(**admin_config)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (config["dbname"],)
        )
        exists = cursor.fetchone()
        
        if not exists:
            print(f"Creating database '{config['dbname']}'...")
            cursor.execute(f'CREATE DATABASE "{config["dbname"]}"')
            print(f"Database '{config['dbname']}' created successfully!")
        else:
            print(f"Database '{config['dbname']}' already exists.")
        
        cursor.close()
        conn.close()
    except psycopg2.Error as e:
        print(f"ERROR: Could not create database: {e}")
        sys.exit(1)

def init_schema(config):
    """Initialize the database schema"""
    schema_file = os.path.join(os.path.dirname(__file__), "init_schema.sql")
    
    if not os.path.exists(schema_file):
        print(f"ERROR: Schema file not found: {schema_file}")
        sys.exit(1)
    
    try:
        conn = psycopg2.connect(**config)
        cursor = conn.cursor()
        
        print("Reading schema file...")
        with open(schema_file, "r", encoding="utf-8") as f:
            schema_sql = f.read()
        
        print("Executing schema...")
        cursor.execute(schema_sql)
        conn.commit()
        
        print("Schema initialized successfully!")
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        
        if tables:
            print("\nCreated tables:")
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("WARNING: No tables found after initialization")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"ERROR: Could not initialize schema: {e}")
        sys.exit(1)

def main():
    """Main initialization function"""
    print("=" * 60)
    print("EduCompose PostgreSQL Database Initialization")
    print("=" * 60)
    print()
    
    config = get_db_config()
    
    print(f"Database: {config['dbname']}")
    print(f"Host: {config['host']}:{config['port']}")
    print(f"User: {config['user']}")
    print()
    
    # Create database if it doesn't exist
    create_database_if_not_exists(config)
    
    # Initialize schema
    init_schema(config)
    
    print()
    print("=" * 60)
    print("Database initialization complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()

