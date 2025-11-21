# Neo4j Desktop Setup Guide

## Step 1: Download and Install Neo4j Desktop

1. **Go to Neo4j website:**
   - Visit: https://neo4j.com/download/
   - Or direct link: https://neo4j.com/download-center/#desktop

2. **Download Neo4j Desktop:**
   - Click "Download Neo4j Desktop"
   - Choose Windows version
   - File size: ~150 MB

3. **Install:**
   - Run the downloaded installer
   - Follow installation wizard
   - Accept license agreement
   - Choose installation location (default is fine)
   - Wait for installation to complete

4. **Launch Neo4j Desktop:**
   - Open Neo4j Desktop from Start menu or desktop shortcut
   - First launch might take a minute to initialize

## Step 2: Create Account (If Needed)

1. **Sign up or log in:**
   - Neo4j Desktop requires a free Neo4j account
   - If you don't have one, click "Sign Up"
   - Use email or Google/GitHub to sign up
   - Free account is sufficient

2. **Log in:**
   - Enter your credentials
   - Desktop will sync your account

## Step 3: Create a Local Database

1. **In Neo4j Desktop interface:**
   - Click **"Add"** button (top left or center)
   - Select **"Local DBMS"** (not Remote)

2. **Configure database:**
   - **Name:** `EduCompose` (or any name you prefer)
   - **Password:** Choose a password (remember this!)
     - Example: `password123` (use something secure)
   - **Version:** Select latest version (5.x recommended)
   - Click **"Create"**

3. **Wait for creation:**
   - Takes 1-2 minutes to download and create
   - You'll see progress indicator

4. **Start the database:**
   - Find your database in the list
   - Click **"Start"** button (play icon ▶️)
   - Wait for status to show "Active" (green dot)
   - This takes 10-30 seconds

## Step 4: Get Connection Details

Once database is **Active**:

1. **Click on your database** (in the list)

2. **Find connection details:**
   - Look for **"Connect"** section or tab
   - You'll see:
     - **URI:** `bolt://localhost:7687` (default)
     - **Username:** `neo4j` (default)
     - **Password:** The one you created
     - **Database:** `neo4j` (default)

3. **Copy these details:**
   - You'll need them for your `.env` file

## Step 5: Update .env File

1. **Open `.env` file:**
   - Location: `backend/.env`

2. **Update Neo4j settings:**
   ```env
   # Neo4j Desktop Configuration (Local)
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your_desktop_password_here
   NEO4J_DATABASE=neo4j
   ```

3. **Replace:**
   - `your_desktop_password_here` with the password you created
   - Keep `bolt://localhost:7687` (not `neo4j+s://`)

4. **Comment out or remove Aura settings** (optional):
   ```env
   # Neo4j Aura Configuration (Cloud) - Commented out
   # NEO4J_URI=neo4j+s://39300661.databases.neo4j.io
   # NEO4J_USERNAME=neo4j
   # NEO4J_PASSWORD=PDvZrjADG1MOyhstvzu3v2Hnk3S2nm38sL5mjTFmCXk
   # NEO4J_DATABASE=neo4j
   ```

5. **Save the file**

## Step 6: Test Connection

1. **Ensure database is running:**
   - Check Neo4j Desktop
   - Status should be "Active" (green dot)
   - If stopped, click "Start"

2. **Test from Python:**
   ```bash
   cd backend
   python scripts/test_neo4j_connection.py
   ```

3. **Expected result:**
   ```
   ✅ Neo4j is available
   ✅ Connection successful!
   ```

4. **If successful:**
   - ✅ Python connection works!
   - You can now use Python scripts with Neo4j Desktop

## Step 7: Open Browser (Optional)

1. **In Neo4j Desktop:**
   - Click **"Open"** button on your database
   - Or click **"Open Browser"** button
   - Neo4j Browser opens (similar to Aura dashboard)

2. **Log in:**
   - Username: `neo4j`
   - Password: Your desktop password
   - Connect to: `neo4j`

3. **Test query:**
   ```cypher
   MATCH (n) RETURN n LIMIT 25
   ```
   Should show empty results initially (new database)

## Step 8: Import Your Knowledge Graph

Now that Python connection works:

1. **Build and export:**
   ```bash
   python scripts/build_and_export_kg.py
   ```

2. **Import via Python (if connection works):**
   ```python
   from scripts.build_and_export_kg import build_kg_for_neo4j
   from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder
   
   # Build KG
   builder = EnhancedKnowledgeGraphBuilder()
   kg_result = builder.build(text="...", essay_id="essay_001")
   
   # Export to Neo4j (should work now!)
   export_stats = builder.export_to_neo4j(kg_result)
   ```

3. **Or import via Browser:**
   - Open Neo4j Browser
   - Copy Cypher file content
   - Paste and execute in browser

## Troubleshooting

### Database Won't Start

1. **Check system requirements:**
   - Java installed? (Desktop includes it)
   - Port 7687 available? (check if another Neo4j is running)

2. **Try restarting:**
   - Stop the database
   - Wait 10 seconds
   - Start again

3. **Check logs:**
   - In Desktop, click "Logs" tab
   - Look for error messages

### Connection Fails

1. **Verify database is running:**
   - Status must be "Active" (green)

2. **Check password:**
   - Use the exact password you created
   - No extra spaces

3. **Check .env file:**
   - URI should be `bolt://localhost:7687` (not `neo4j+s://`)
   - Username is `neo4j`
   - Password matches Desktop

4. **Test from Desktop Browser first:**
   - If Browser works, password is correct
   - If Browser fails, check password in Desktop

### Port Already in Use

1. **Check if another Neo4j is running:**
   - Close other Neo4j instances
   - Or change port in Desktop settings

## Quick Reference

**Desktop Connection:**
- URI: `bolt://localhost:7687`
- Username: `neo4j`
- Password: (the one you created)
- Protocol: `bolt://` (not `neo4j+s://`)

**Aura Connection (for reference):**
- URI: `neo4j+s://xxxxx.databases.neo4j.io`
- Protocol: `neo4j+s://` (secure)

## Next Steps After Setup

1. ✅ Test connection: `python scripts/test_neo4j_connection.py`
2. ✅ Build knowledge graphs in Python
3. ✅ Export directly to Neo4j Desktop
4. ✅ Query and visualize in Desktop Browser

**You're ready to go with Desktop!** 🚀

