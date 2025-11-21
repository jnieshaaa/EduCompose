# Quick Setup: Neo4j Desktop Connection

## ✅ Your Desktop is Running!

Great! I can see your Neo4j Desktop instance:
- **Instance:** `educompose-kg`
- **Status:** RUNNING ✅
- **URI:** `neo4j://127.0.0.1:7687`
- **Version:** 2025.10.1

## 🔐 Step 1: Get Your Password

You need the password you set when creating the instance:

1. **If you remember it:** Great! Skip to Step 2.

2. **If you forgot it:**
   - In Neo4j Desktop, click on your instance (`educompose-kg`)
   - Look for **"Settings"** or **"Manage"** button
   - You can view or reset the password there
   - Or click the **"..."** (three dots) menu on the instance

## 📝 Step 2: Update .env File

### Option A: Automatic (Easiest)

Run the helper script:
```bash
python scripts/switch_to_desktop.py
```

It will:
- Ask for your password
- Automatically update `.env` file
- Comment out Aura settings
- Add Desktop settings

### Option B: Manual

Open `backend/.env` and update:

```env
# Neo4j Desktop Configuration (Local)
NEO4J_URI=neo4j://127.0.0.1:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_desktop_password_here
NEO4J_DATABASE=neo4j
```

**Replace:**
- `your_desktop_password_here` with the password you set when creating the instance

**Note:** The URI is `neo4j://127.0.0.1:7687` (not `neo4j+s://`)

## ✅ Step 3: Test Connection

Once `.env` is updated:

```bash
python scripts/test_neo4j_connection.py
```

**Expected output:**
```
✅ Neo4j is available
✅ Connection successful!
```

If it works, you're all set! 🎉

## 🎯 Step 4: Export Knowledge Graph

Now you can export directly from Python:

```bash
python scripts/build_and_export_kg.py
```

Then in Python:
```python
from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder

builder = EnhancedKnowledgeGraphBuilder()
kg_result = builder.build(text="...", essay_id="essay_001")

# Export directly to Neo4j Desktop (should work now!)
export_stats = builder.export_to_neo4j(kg_result)
```

## 🌐 Step 5: Open Browser (Optional)

1. **In Neo4j Desktop:**
   - Click **"Open"** button on your instance
   - Or click **"Connect"** → **"Open Browser"**

2. **Log in:**
   - Username: `neo4j`
   - Password: Your desktop password
   - Database: `neo4j`

3. **Run a query:**
   ```cypher
   MATCH (n) RETURN n LIMIT 25
   ```

## 📋 Connection Details Summary

| Setting | Value |
|---------|-------|
| URI | `neo4j://127.0.0.1:7687` |
| Username | `neo4j` |
| Password | (the one you set) |
| Database | `neo4j` |
| Protocol | `neo4j://` (local, not secure) |

**Note:** `neo4j://` is fine for local Desktop (not `neo4j+s://` which is for Aura cloud)

## ✅ Quick Checklist

- [ ] Desktop instance is RUNNING ✅ (Done!)
- [ ] Have password ready
- [ ] Update `.env` file (use helper script or manual)
- [ ] Test connection: `python scripts/test_neo4j_connection.py`
- [ ] Export knowledge graphs from Python
- [ ] Open Browser to visualize

**You're almost there! Just update the `.env` file and test!** 🚀

