import psycopg2, os
from dotenv import load_dotenv
load_dotenv('.env')
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'api_create_activity_v1';")
func = cur.fetchone()[0]
new_func = func.replace('CASE WHEN array_length(p_block_ids, 1) > 0 THEN p_block_ids[1] ELSE NULL END,', 'p_block_ids,')
cur.execute(new_func)
conn.commit()
print('Replaced successfully')
