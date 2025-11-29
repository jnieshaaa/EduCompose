# How to Display Knowledge Graph in Your System

## ✅ Everything is Ready!

Your system can now display knowledge graphs with nodes and edges!

## 📋 What You Have

### ✅ Backend API (Ready)
- **GET `/api/kg/essay/{essay_id}/knowledge-graph`** - Returns nodes and edges
- **POST `/api/kg/essay/{essay_id}/build-and-export`** - Builds and exports graph

### ✅ Frontend Component (Ready)
- **`KnowledgeGraphViewer.tsx`** - Interactive graph visualization
- Uses `react-force-graph-2d` (already installed!)
- Color-coded nodes, zoom/pan controls, legend

### ✅ API Client (Ready)
- **`kgApi.getKnowledgeGraph(essayId)`** - Get graph data
- **`kgApi.buildAndExportGraph(essayId)`** - Build and export

## 🚀 How to Use

### Step 1: Import Component

In any React component (essay detail page, analysis modal, etc.):

```tsx
import KnowledgeGraphViewer from '../components/knowledge-graph/KnowledgeGraphViewer';
```

### Step 2: Add to Your Page

**Example: Add to Essay Detail Page**

```tsx
function EssayDetailPage({ essayId }: { essayId: number }) {
  return (
    <div className="space-y-6">
      {/* Essay content... */}
      
      {/* Knowledge Graph */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Knowledge Graph</h2>
        <KnowledgeGraphViewer essayId={essayId} height={600} />
      </section>
    </div>
  );
}
```

**Example: Add to Analysis Modal**

```tsx
// In EnhancedEssayAnalysisModal.tsx or similar
import KnowledgeGraphViewer from '../knowledge-graph/KnowledgeGraphViewer';

function EnhancedEssayAnalysisModal({ essayId }: { essayId: number }) {
  return (
    <Modal>
      <Tabs>
        <Tab name="Analysis">...</Tab>
        <Tab name="Knowledge Graph">
          <KnowledgeGraphViewer essayId={essayId} />
        </Tab>
      </Tabs>
    </Modal>
  );
}
```

### Step 3: Test It

1. **Start your backend:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **Start your frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Navigate to essay page** and see the graph!

## 📊 What Gets Displayed

### Nodes (Colored by Type)
- 🟣 **Essay** - Purple
- 🔴 **Claim** - Red (main arguments)
- 🟢 **Evidence** - Green (supporting facts)
- 🔵 **Concept** - Blue (key concepts)
- 🟠 **Premise** - Amber (supporting premises)
- 🔴 **Counterclaim** - Pink (opposing arguments)
- ⚪ **Background** - Gray (background info)

### Edges (Relationships)
- **SUPPORTS** - Claim to Evidence
- **RELATED_TO** - Concept relationships
- **CONTAINS** - Essay to nodes
- **Other types** - Based on your graph structure

### Features
- **Interactive:** Click, drag, zoom, pan
- **Tooltips:** Hover over nodes to see details
- **Legend:** Shows node type colors
- **Controls:** Zoom to fit, reset layout, refresh

## 🔄 Complete Workflow

1. **Teacher analyzes essay** → System builds knowledge graph
2. **Graph exported to Neo4j** → Stored in Neo4j Desktop
3. **Frontend requests graph** → API returns nodes and edges
4. **Graph displayed** → Interactive visualization

## 💡 Example: Complete Integration

```tsx
import { useState, useEffect } from 'react';
import KnowledgeGraphViewer from '../components/knowledge-graph/KnowledgeGraphViewer';
import { kgApi } from '../api';

function EssayDetailPage({ essayId }: { essayId: number }) {
  const [showGraph, setShowGraph] = useState(false);
  
  const handleBuildGraph = async () => {
    try {
      // Build and export graph
      const data = await kgApi.buildAndExportGraph(essayId);
      console.log(`Graph built: ${data.stats.node_count} nodes, ${data.stats.edge_count} edges`);
      setShowGraph(true);
    } catch (error) {
      console.error('Failed to build graph:', error);
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Essay Details</h1>
      
      {/* Essay content... */}
      
      {/* Knowledge Graph Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Knowledge Graph</h2>
          <button 
            onClick={handleBuildGraph}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Build Graph
          </button>
        </div>
        
        {showGraph && (
          <KnowledgeGraphViewer essayId={essayId} height={600} />
        )}
      </section>
    </div>
  );
}
```

## 📝 Quick Checklist

- [x] Backend API created and registered ✅
- [x] Frontend component created ✅
- [x] API client functions added ✅
- [ ] Add component to essay page
- [ ] Test with real essays
- [ ] Build graphs for essays

## 🎯 Next Steps

1. **Find your essay detail/view page:**
   - Check `frontend/src/pages/` for essay pages
   - Or `frontend/src/components/essay/` for essay components

2. **Add the component:**
   ```tsx
   import KnowledgeGraphViewer from '../components/knowledge-graph/KnowledgeGraphViewer';
   
   // In your component:
   <KnowledgeGraphViewer essayId={essay.id} />
   ```

3. **Test:**
   - Start both servers
   - Navigate to essay page
   - See your knowledge graph!

## 🔍 API Response Example

When you call the API, you get:

```json
{
  "essay_id": 1,
  "nodes": [
    {
      "id": "essay",
      "label": "Essay",
      "type": "Essay"
    },
    {
      "id": "claim_1",
      "label": "Renewable energy is essential",
      "type": "Claim"
    },
    {
      "id": "concept_1",
      "label": "Renewable Energy",
      "type": "Concept"
    }
  ],
  "edges": [
    {
      "source": "essay",
      "target": "claim_1",
      "type": "CONTAINS"
    },
    {
      "source": "claim_1",
      "target": "concept_1",
      "type": "SUPPORTS"
    }
  ],
  "stats": {
    "node_count": 3,
    "edge_count": 2
  }
}
```

The component displays this as an interactive graph!

## ✅ Summary

You now have:
- ✅ API endpoints to get nodes and edges
- ✅ React component to visualize graphs
- ✅ Interactive features (zoom, pan, drag)
- ✅ Color-coded nodes by type
- ✅ Ready to use in your pages!

**Just add the component to your essay pages and you're done!** 🚀

