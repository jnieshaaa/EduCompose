# Knowledge Graph Visualization in EduCompose

## 🎯 Overview

This guide shows how to display knowledge graph nodes and edges in your EduCompose system frontend.

## ✅ What's Been Created

### 1. Backend API Endpoints

**File:** `backend/app/controllers/kg_controller.py`

**Endpoints:**

1. **GET `/api/kg/essay/{essay_id}/knowledge-graph`**
   - Returns knowledge graph data (nodes and edges) for an essay
   - Works with Neo4j or in-memory graph
   - Returns format suitable for frontend visualization

2. **POST `/api/kg/essay/{essay_id}/build-and-export`**
   - Builds knowledge graph from essay text
   - Exports to Neo4j
   - Returns graph data formatted for frontend

### 2. Frontend Component

**File:** `frontend/src/components/knowledge-graph/KnowledgeGraphViewer.tsx`

**Features:**
- Interactive graph visualization using `react-force-graph-2d`
- Color-coded nodes by type (Claim, Evidence, Concept, etc.)
- Node size based on connections
- Zoom, pan, drag controls
- Legend showing node types
- Loading and error states

## 🚀 Setup Steps

### Step 1: Register API Router

Add the knowledge graph router to your FastAPI app:

**File:** `backend/app/main.py`

```python
from app.controllers import analysis_controller, kg_controller

# ... existing code ...

app.include_router(
    analysis_controller.analysis_router,
    prefix="/api/analysis",
    tags=["analysis"]
)

# Add this:
app.include_router(
    kg_controller.kg_router,
    prefix="/api/kg",
    tags=["knowledge-graph"]
)
```

### Step 2: Add Frontend Component

The component is already created at:
`frontend/src/components/knowledge-graph/KnowledgeGraphViewer.tsx`

Make sure you have the UI components:
- `Card`, `CardContent`, `CardHeader`, `CardTitle` from `frontend/src/components/ui/Card`

If they don't exist, create them or adjust imports.

### Step 3: Use in Your Pages

**Example: Add to Essay Detail Page**

```tsx
import KnowledgeGraphViewer from '../components/knowledge-graph/KnowledgeGraphViewer';

function EssayDetailPage({ essayId }: { essayId: number }) {
  return (
    <div>
      {/* Other essay details... */}
      
      <KnowledgeGraphViewer essayId={essayId} />
    </div>
  );
}
```

**Example: With Manual Data Loading**

```tsx
function EssayDetailPage({ essayId }: { essayId: number }) {
  const [graphData, setGraphData] = useState(null);
  
  const handleBuildGraph = async () => {
    const response = await fetch(`/api/kg/essay/${essayId}/build-and-export`, {
      method: 'POST'
    });
    const data = await response.json();
    setGraphData(data);
  };
  
  return (
    <div>
      <button onClick={handleBuildGraph}>Build Knowledge Graph</button>
      
      {graphData && (
        <KnowledgeGraphViewer essayId={essayId} graphData={graphData} />
      )}
    </div>
  );
}
```

## 📊 API Response Format

### GET `/api/kg/essay/{essay_id}/knowledge-graph`

**Response:**
```json
{
  "essay_id": 1,
  "nodes": [
    {
      "id": "essay",
      "label": "Essay",
      "type": "Essay",
      "properties": {
        "essay_id": "1",
        "text": "..."
      }
    },
    {
      "id": "concept_1",
      "label": "Renewable Energy",
      "type": "Concept",
      "properties": {
        "frequency": 3
      }
    }
  ],
  "edges": [
    {
      "source": "essay",
      "target": "concept_1",
      "type": "CONTAINS",
      "properties": {}
    }
  ],
  "source": "neo4j",
  "stats": {
    "node_count": 10,
    "edge_count": 15
  }
}
```

## 🎨 Node Types and Colors

The component automatically colors nodes by type:

| Type | Color | Description |
|------|-------|-------------|
| Essay | Purple (#8B5CF6) | Essay node |
| Claim | Red (#EF4444) | Main arguments |
| Evidence | Green (#10B981) | Supporting facts |
| Concept | Blue (#3B82F6) | Key concepts |
| Premise | Amber (#F59E0B) | Supporting premises |
| Counterclaim | Pink (#EC4899) | Opposing arguments |
| Background | Gray (#6B7280) | Background information |

## 🔧 Customization

### Customize Node Colors

Edit `KnowledgeGraphViewer.tsx`:

```tsx
const getNodeColor = (node: GraphNode): string => {
  const type = node.type?.toLowerCase() || 'kgnode';
  const colorMap: Record<string, string> = {
    'claim': '#YOUR_COLOR',
    'evidence': '#YOUR_COLOR',
    // ... add your colors
  };
  return colorMap[type] || '#6366F1';
};
```

### Customize Node Size

Edit `getNodeSize` function:

```tsx
const getNodeSize = (node: GraphNode): number => {
  // Your custom size logic
  return 10; // Fixed size
  // Or based on properties: node.properties?.importance * 5
};
```

### Customize Edge Colors

Edit the `linkColor` prop:

```tsx
linkColor={(edge) => {
  if (edge.type === 'SUPPORTS') return '#10B981';
  if (edge.type === 'CONTRADICTS') return '#EF4444';
  return '#94A3B8';
}}
```

## 📱 Usage Examples

### Example 1: Basic Usage

```tsx
import KnowledgeGraphViewer from '../components/knowledge-graph/KnowledgeGraphViewer';

<KnowledgeGraphViewer 
  essayId={essayId}
  height={600}
/>
```

### Example 2: With Callback

```tsx
const handleGraphLoad = (data: KnowledgeGraphData) => {
  console.log(`Graph loaded: ${data.stats?.node_count} nodes`);
};

<KnowledgeGraphViewer 
  essayId={essayId}
  onLoadGraph={handleGraphLoad}
/>
```

### Example 3: Build and Display

```tsx
const [showGraph, setShowGraph] = useState(false);
const [graphData, setGraphData] = useState(null);

const buildGraph = async () => {
  const response = await fetch(`/api/kg/essay/${essayId}/build-and-export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  setGraphData(data);
  setShowGraph(true);
};

return (
  <>
    <button onClick={buildGraph}>Build Knowledge Graph</button>
    {showGraph && graphData && (
      <KnowledgeGraphViewer essayId={essayId} graphData={graphData} />
    )}
  </>
);
```

## 🎯 Integration Checklist

- [ ] Register `kg_router` in `main.py`
- [ ] Add `KnowledgeGraphViewer` component to frontend
- [ ] Import component in essay detail page
- [ ] Test API endpoint: `GET /api/kg/essay/{id}/knowledge-graph`
- [ ] Test build endpoint: `POST /api/kg/essay/{id}/build-and-export`
- [ ] Display graph in UI
- [ ] Test with real essays

## 🔄 Workflow

1. **Teacher analyzes essay** → Analysis runs
2. **System builds KG** → Knowledge graph created
3. **Exports to Neo4j** → Stored in Neo4j Desktop
4. **Frontend requests graph** → API returns nodes/edges
5. **Graph displayed** → Interactive visualization

## 💡 Tips

1. **Performance:** For large graphs, consider pagination or filtering
2. **Caching:** Cache graph data in frontend state
3. **Updates:** Refresh graph after analysis
4. **Responsive:** Adjust height/width for mobile devices

## 🚀 Next Steps

1. ✅ Add router to `main.py`
2. ✅ Import component in essay pages
3. ✅ Test with sample essays
4. ✅ Customize colors/styling
5. ✅ Add graph statistics display

**Your knowledge graphs will now be visible in your system!** 🎉

