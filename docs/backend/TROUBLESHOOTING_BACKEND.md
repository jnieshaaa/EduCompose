# Backend Server Connection Troubleshooting

## Problem
You're seeing: "Cannot connect to server. Please make sure the backend server is running on http://localhost:8000"

## Solution: Start the Backend Server

The backend server needs to be running before you can use the login/signup features. Follow these steps:

### Step 1: Navigate to Backend Directory

```powershell
cd backend
```

### Step 2: Create .env File

The backend requires a `.env` file with database configuration. Create it from the example:

```powershell
copy env.example .env
```

### Step 3: Configure .env File

Open `backend\.env` in a text editor and update these values:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - A secure random key for JWT tokens

**Generate SECRET_KEY:**
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```
Copy the output and paste it as your `SECRET_KEY` in the `.env` file.

**Database Options:**

**Option A: Use PostgreSQL (Recommended for Production)**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/educompose_db
```

**Option B: Use SQLite (Easier for Quick Testing)**
If you want to use SQLite temporarily, you'll need to modify `backend/app/database.py` to support SQLite, or set up PostgreSQL.

### Step 4: Set Up Database

**For PostgreSQL:**
1. Make sure PostgreSQL is installed and running
2. Create database and user (see `backend/database/QUICK_START.md`)
3. Initialize schema:
   ```powershell
   python database/init_database.py
   ```

**For SQLite (if modified):**
```powershell
python init_data.py
```

### Step 5: Install Dependencies (if not done)

```powershell
# Activate virtual environment first (if using one)
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_lg
```

### Step 6: Start the Backend Server

```powershell
python start.py
```

You should see output like:
```
Starting EduCompose API server...
Host: 0.0.0.0
Port: 8000
Reload: True
API Documentation: http://0.0.0.0:8000/api/docs
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 7: Verify Server is Running

Open your browser and visit:
- http://localhost:8000/api/health - Should return `{"status": "healthy"}`
- http://localhost:8000/api/docs - Should show API documentation

### Step 8: Keep Server Running

**Important:** Keep the terminal window with the backend server open. The server must be running while you use the frontend.

## Quick Check Commands

**Check if port 8000 is in use:**
```powershell
netstat -ano | findstr :8000
```

**Check if PostgreSQL is running:**
```powershell
# Windows - Check service
Get-Service -Name postgresql*
```

## Common Issues

### Issue: "DATABASE_URL environment variable is required"
**Solution:** Make sure you created the `.env` file in the `backend/` directory and it contains `DATABASE_URL=...`

### Issue: "Only PostgreSQL is supported"
**Solution:** The current code requires PostgreSQL. You need to:
1. Install PostgreSQL
2. Create a database
3. Update `DATABASE_URL` in `.env` with your PostgreSQL connection string

### Issue: "Module not found" errors
**Solution:** Install dependencies:
```powershell
pip install -r requirements.txt
```

### Issue: Port 8000 already in use
**Solution:** Either:
1. Stop the other application using port 8000
2. Change the port in `.env`: `API_PORT=8001` (and update frontend `api.ts` accordingly)

## Need More Help?

- Backend README: `backend/README.md`
- Database Setup: `backend/database/QUICK_START.md`
- API Documentation: http://localhost:8000/api/docs (when server is running)

