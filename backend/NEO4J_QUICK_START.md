# Neo4j Aura Quick Start Guide

**Quick setup for your paused Neo4j Aura instance**

## Your Current Situation

You have a **Free instance** that is **PAUSED**. Here's how to get started:

## Step 1: Resume Your Instance

1. In your Neo4j Aura dashboard, find your "Free instance" card
2. Look for the **play button (▶️)** or click **"Resume"**
3. Wait 1-2 minutes for the instance to start (status will change from "PAUSED" to "RUNNING")

## Step 2: Get Connection Details

1. Once the instance is running, click the **"Connect"** button on your instance card
2. A dialog will appear showing:
   - **Connection URI**: `neo4j+s://xxxxx.databases.neo4j.io`
   - **Username**: `neo4j`
   - **Password**: Click "Show Password" or "Reset Password" if needed

3. **Copy these values** - you'll need them for your `.env` file

## Step 3: Configure Your .env File

Add to your `backend/.env` file:

```env
# Neo4j Aura Configuration
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here
NEO4J_DATABASE=neo4j
```

**Replace:**
- `xxxxx` with your actual instance ID from the connection URI
- `your_password_here` with the password from Step 2

## Step 4: Test Connection

Create a test file `test_neo4j.py`:

```python
from app.nlp_modules.neo4j_exporter import Neo4jExporter

# This automatically uses .env configuration
exporter = Neo4jExporter()

if exporter.is_available():
    print("✅ Connected to Neo4j Aura!")
    
    # Test query
    result = exporter.query("RETURN 'Hello from Aura!' as message")
    print(f"Result: {result}")
else:
    print("❌ Failed to connect")
    print("Check your .env file and ensure instance is running")
```

Run it:
```bash
cd backend
python test_neo4j.py
```

## Step 5: Export Your First Knowledge Graph

```python
from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder
from app.nlp_modules.neo4j_exporter import Neo4jExporter

# Build knowledge graph
builder = EnhancedKnowledgeGraphBuilder()
kg_result = builder.build(
    text="Climate change is one of the most pressing issues facing humanity today.",
    essay_id="test_essay_001"
)

# Export to Neo4j Aura
exporter = Neo4jExporter()  # Uses .env automatically

export_stats = exporter.export_graph(
    graph=kg_result["graph"],
    essay_id="test_essay_001",
    clear_existing=True
)

print(f"✅ Exported {export_stats['nodes_created']} nodes")
print(f"✅ Exported {export_stats['edges_created']} edges")
```

## Troubleshooting

### "Instance is paused"
- Click the play button (▶️) to resume
- Wait 1-2 minutes for it to start

### "Can't find password"
- Click "Connect" → "Reset Password"
- Save the new password immediately!

### "Connection failed"
- Check your `.env` file has correct values
- Ensure instance is running (not paused)
- Verify URI format: `neo4j+s://xxxxx.databases.neo4j.io` (note the `+s`)

### "Forgot connection URI"
- Click "Connect" button on your instance card
- Copy the connection URI shown

## Next Steps

1. ✅ Resume your instance
2. ✅ Get connection details
3. ✅ Configure `.env` file
4. ✅ Test connection
5. ✅ Export knowledge graphs

You're ready to go! 🚀

For detailed documentation, see `NEO4J_AURA_SETUP.md`

