import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('VITE_SUPABASE_URL')
key = os.environ.get('VITE_SUPABASE_SERVICE_ROLE_KEY')
supabase: Client = create_client(url, key)

# Get the most recently created student from public.users to get their ID
res = supabase.table('users').select('*').eq('role', 'student').order('created_at', desc=True).limit(1).execute()
if res.data:
    student_id = res.data[0]['id']
    email = res.data[0]['email']
    print(f"LATEST STUDENT (from public.users): ID={student_id}, Email={email}")
    
    # Try to fetch their auth user using the admin API
    try:
        auth_user = supabase.auth.admin.get_user_by_id(student_id)
        print("AUTH RECORD:")
        print(auth_user)
    except Exception as e:
        print("Error fetching auth user:", e)
else:
    print("No students found in public.users.")
