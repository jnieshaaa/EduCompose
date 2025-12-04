"""
Supabase Client Configuration
Handles Supabase client initialization and connection
"""
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Service role key for backend operations
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")  # Anon key for client-side operations

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL environment variable is required")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")

# Create Supabase client with service role key (for backend operations)
supabase_admin_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Create Supabase client with anon key (for user-facing auth operations).
# Fall back to service role client if anon key is not configured to prevent runtime crashes.
if SUPABASE_ANON_KEY:
    supabase_anon_client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
else:
    supabase_anon_client = supabase_admin_client
    print(
        "[Supabase] WARNING: SUPABASE_ANON_KEY is not set. "
        "Falling back to the service role key for user authentication operations."
    )

def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    return supabase_admin_client

def get_supabase_anon_key() -> str:
    """Get Supabase anon key for client-side operations"""
    return SUPABASE_ANON_KEY or ""

def get_supabase_anon_client() -> Client:
    """Get Supabase client with anon key for user authentication operations"""
    return supabase_anon_client

