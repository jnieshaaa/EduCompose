# Neo4j Aura Setup Guide for Production

This guide will help you set up Neo4j Aura (cloud) for production deployment of EduCompose.

**Quick Start:** If you already have a paused instance, see `NEO4J_QUICK_START.md` for faster setup.

## Why Neo4j Aura?

✅ **Cloud-based** - Accessible from anywhere  
✅ **Managed service** - Automatic backups and updates  
✅ **Scalable** - Easy to upgrade as your data grows  
✅ **Free tier available** - Perfect for development and testing  
✅ **Production-ready** - No migration needed later

---

## Step 1: Create Neo4j Aura Account

1. Go to https://neo4j.com/cloud/aura/
2. Click "Try Free" or "Start Free"
3. Sign up with your email or GitHub account
4. Verify your email address

## Step 2: Create or Resume a Free Instance

### Option A: If you see "Create instance" button

1. After logging in, look for the **"Create instance"** button (top right in the Instances tab)
2. Click **"Create instance"**
3. Select **"Free instance"** or **"AuraDB Free"** (0.5 GB storage)
   - This is sufficient for development and small-scale production
   - You can upgrade later if needed
4. Choose an instance name (e.g., `educompose-kg`) - optional
5. Select a region closest to your deployment
6. Click **"Create instance"** or **"Create"**

### Option B: If you already have a paused instance

If you see an existing instance that shows **"PAUSED"**:

1. **Resume the paused instance**:

   - Click the **play button** (▶️) on the instance card
   - Or click the three dots (**⋯**) → **"Resume"**
   - Wait 1-2 minutes for the instance to start

2. **Use the existing instance**:
   - The connection details are already set up
   - Click **"Connect"** button to get connection details
   - Copy the connection URI and password

**Note:** Free instances automatically pause after 3 days of inactivity to save resources. Simply resume when needed!

## Step 3: Get Connection Details

After creation (takes 2-3 minutes), you'll see:

1. **Connection URI**:

   - Format: `neo4j+s://xxxxx.databases.neo4j.io`
   - Copy this - you'll need it in your `.env` file

2. **Username**: Usually `neo4j` (default)

3. **Password**:
   - Click "Show Password" or "Copy Password"
   - **Save this immediately** - you can only see it once!
   - If you lose it, you'll need to reset it

## Step 4: Configure Your Application

### Option A: Environment Variables (Recommended)

Add to your `backend/.env` file:

```env
# Neo4j Aura Configuration
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_aura_password_here
NEO4J_DATABASE=neo4j
```

Replace:

- `xxxxx` with your actual instance ID from Aura
- `your_aura_password_here` with your actual password

### Option B: Direct Configuration

```python
from app.nlp_modules.neo4j_exporter import Neo4jExporter

exporter = Neo4jExporter(
    uri="neo4j+s://xxxxx.databases.neo4j.io",
    user="neo4j",
    password="your_aura_password_here",
    database="neo4j"
)
```

## Step 5: Test Connection

```python
from app.nlp_modules.neo4j_exporter import Neo4jExporter

# This will automatically use NEO4J_URI, NEO4J_USER, etc. from .env
exporter = Neo4jExporter()

if exporter.is_available():
    print("✅ Connected to Neo4j Aura!")

    # Test query
    result = exporter.query("RETURN 1 as test")
    print(f"Query result: {result}")
else:
    print("❌ Failed to connect to Neo4j Aura")
    print("Check your .env file configuration")
```

## Step 6: Export Your First Knowledge Graph

```python
from app.nlp_modules.enhanced_kg_builder import EnhancedKnowledgeGraphBuilder
from app.nlp_modules.neo4j_exporter import Neo4jExporter

# Build knowledge graph
builder = EnhancedKnowledgeGraphBuilder()
kg_result = builder.build(
    text="Your essay text here...",
    essay_id="essay_123"
)

# Export to Neo4j Aura
exporter = Neo4jExporter()  # Uses .env configuration

export_stats = exporter.export_graph(
    graph=kg_result["graph"],
    essay_id="essay_123",
    clear_existing=True
)

print(f"✅ Exported {export_stats['nodes_created']} nodes")
print(f"✅ Exported {export_stats['edges_created']} edges")
```

## Step 7: Access Neo4j Browser

Neo4j Aura includes a built-in browser:

1. In your Aura dashboard, click **"Open"** on your database
2. Log in with your username and password
3. You can now:
   - Visualize your knowledge graphs
   - Run Cypher queries
   - Explore relationships
   - Monitor database usage

### Example Queries

**View all essays:**

```cypher
MATCH (e:Essay)
RETURN e.essay_id, e.node_count, e.edge_count
LIMIT 10
```

**Find all claims for an essay:**

```cypher
MATCH (e:Essay {essay_id: 'essay_123'})-[:CONTAINS]->(c:Claim)
RETURN c.text, c.confidence
```

**Get claim-evidence relationships:**

```cypher
MATCH (c:Claim {essay_id: 'essay_123'})<-[:SUPPORTS]-(e:Evidence)
RETURN c.text as claim, collect(e.text) as evidence
```

## Troubleshooting

### Issue: "Failed to connect to Neo4j"

**Solutions:**

1. Check your `.env` file has correct `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
2. Ensure your Aura instance is running (check Aura dashboard)
3. Verify you're using the correct connection URI format:
   - Aura: `neo4j+s://xxxxx.databases.neo4j.io` (note the `+s` for SSL)
   - Desktop: `bolt://localhost:7687`

### Issue: "Authentication failed"

**Solutions:**

1. Double-check your password in `.env`
2. Reset password in Aura dashboard if needed
3. Ensure username is correct (usually `neo4j`)

### Issue: "Connection timeout"

**Solutions:**

1. Check your internet connection
2. Verify firewall/network settings allow connections to Neo4j Aura
3. Check if Aura instance is paused (free tier pauses after inactivity)

## Free Tier Limitations

The free tier includes:

- ✅ 0.5 GB storage (sufficient for ~10,000-50,000 essays)
- ✅ 1 GB memory
- ✅ Automatic backups
- ✅ Pauses after 3 days of inactivity (easy to resume)

**When to upgrade:**

- Need more storage (>0.5 GB)
- Need higher performance
- Running production with high traffic

## Security Best Practices

1. **Never commit `.env` to git** (already in `.gitignore`)
2. **Use strong passwords** for your Aura instance
3. **Rotate passwords regularly** for production
4. **Use environment variables** instead of hardcoding credentials
5. **Limit access** - only team members who need it

## Production Deployment

For production deployment:

1. **Use environment variables** in your deployment platform:

   ```env
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=${NEO4J_PASSWORD}  # Use secret management
   NEO4J_DATABASE=neo4j
   ```

2. **Set up monitoring** in Aura dashboard

3. **Configure backups** (automatic in Aura, but verify settings)

4. **Set up alerts** for database usage and performance

## Next Steps

1. ✅ Set up your Aura instance
2. ✅ Configure `.env` file
3. ✅ Test connection
4. ✅ Export knowledge graphs
5. ✅ Explore with Neo4j Browser

Your EduCompose system is now ready for production deployment with Neo4j Aura! 🚀
