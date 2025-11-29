# Quick Setup: Connect Python to Neo4j Desktop

## ✅ Your Desktop is Ready!

Your Neo4j Desktop instance `educompose-kg` is **RUNNING**! Now let's connect Python to it.

## 📋 Connection Details from Desktop

From your Desktop interface, you should see:
- **Connection URI:** `neo4j://127.0.0.1:7687` or `bolt://localhost:7687`
- **Username:** `neo4j` (default)
- **Password:** The password you set when creating the database
- **Database:** `neo4j` (default)

## 🚀 Quick Setup (2 Options)

### Option 1: Use Helper Script (Easiest)

1. **Get your password:**
   - In Desktop, click on your instance `educompose-kg`
   - Click "Connect" button
   - Or look for password in instance details
   - Copy the password

2. **Run helper script:**
   ```bash
   python scripts/switch_to_desktop.py
   ```
   - It will ask for your password
   - Enter the password from Desktop
   - It will update `.env` automatically

3. **Test connection:**
   ```bash
   python scripts/test_neo4j_connection.py
   ```

### Option 2: Manual Update

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
   - `your_desktop_password_here` with your actual password
   - URI can be `bolt://localhost:7687` or `neo4j://127.0.0.1:7687` (both work)

4. **Save the file**

5. **Test connection:**
   ```bash
   python scripts/test_neo4j_connection.py
   ```

## 🔍 Finding Your Password

**If you forgot your password:**

1. **In Desktop:**
   - Click on instance `educompose-kg`
   - Look for "Settings" or "Details"
   - Password should be shown there

2. **Or reset it:**
   - Stop the instance
   - Look for "Reset Password" or "Change Password" option
   - Set a new password
   - Start instance again

3. **Or create new database:**
   - Stop current instance
   - Create a new one with a password you remember
   - Start the new instance

## ✅ Test Connection

After updating `.env`, test it:

```bash
cd backend
python scripts/test_neo4j_connection.py
```

**Expected output:**
```
✅ Neo4j is available
✅ Connection successful!
✅ Database has X nodes
```

## 🎯 After Connection Works

Once the connection test passes, you can:

1. **Build knowledge graphs:**
   ```bash
   python scripts/build_and_export_kg.py
   ```

2. **Export directly to Neo4j:**
   ```python
   from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder
   
   builder = EnhancedKnowledgeGraphBuilder()
   kg_result = builder.build(text="...", essay_id="essay_001")
   export_stats = builder.export_to_neo4j(kg_result)
   ```

3. **Query in Desktop Browser:**
   - Click "Open" or "Connect" in Desktop
   - Opens Neo4j Browser
   - Run queries: `MATCH (n) RETURN n`

## 📝 Summary

**Your Setup:**
- ✅ Neo4j Desktop installed
- ✅ Instance `educompose-kg` running
- ✅ Connection URI: `bolt://localhost:7687`
- ⏳ Need to update `.env` with password
- ⏳ Need to test Python connection

**Next:**
1. Get password from Desktop
2. Update `.env` (use helper script or manual)
3. Test connection
4. Start building knowledge graphs!

**You're almost there!** 🚀

