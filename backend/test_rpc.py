import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('VITE_SUPABASE_URL')
key = os.environ.get('VITE_SUPABASE_SERVICE_ROLE_KEY')
supabase: Client = create_client(url, key)

print("Attempting to create a test user directly via RPC...")

test_email = "test.null.check.999@test.com"
test_password = "Password123"

try:
    res = supabase.rpc("create_new_portal_user_v1", {
        "p_email": test_email,
        "p_password": test_password,
        "p_first_name": "Test",
        "p_last_name": "User",
        "p_role": "student"
    }).execute()
    
    print("RPC Success! UID:", res.data)
    
    uid = res.data
    
    print("Fetching auth.users via admin API...")
    try:
        user = supabase.auth.admin.get_user_by_id(uid)
        print("Success! User loaded fine:", user.user.email)
    except Exception as e:
        print("ERROR loading user via admin API:", e)
        
except Exception as e:
    print("RPC Failed:", e)

# Clean up
try:
    if 'uid' in locals():
        supabase.auth.admin.delete_user(uid)
        print("Test user cleaned up.")
except:
    pass
