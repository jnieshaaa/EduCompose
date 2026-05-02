import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get('DATABASE_URL')
# Wait, backend/.env has DATABASE_URL=sqlite:///./educompose.db
# Let's get the connection string directly from user if needed.
