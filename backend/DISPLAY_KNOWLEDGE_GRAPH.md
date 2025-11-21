# Display Knowledge Graph Nodes and Edges in Your System

## ✅ What's Been Created

I've created everything you need to display knowledge graphs in your EduCompose system!

### 1. Backend API ✅

**File:** `backend/app/controllers/kg_controller.py`

**Endpoints:**
- **GET `/api/kg/essay/{essay_id}/knowledge-graph`** - Get graph data (nodes & edges)
- **POST `/api/kg/essay/{essay_id}/build-and-export`** - Build and export graph

**Registered in:** `backend/app/main.py`

### 2. Frontend Component ✅

**File:** `frontend/src/components/knowledge-graph/KnowledgeGraphViewer.tsx`

**Features:**
- Interactive graph visualization using `react-force-graph-2d`
- Color-coded nodes by type (Claim, Evidence, Concept, etc.)
- Node size based on connections
- Zoom, pan, drag controls
- Legend showing node types
- Loading and error states

### 3. API Client ✅

**File:** `frontend/src/api.ts`

**Functions:**
- `kgApi.getKnowledgeGraph(essayId)` - Get graph data
- `kgApi.buildAndExportGraph(essayId)` - Build and export

## 🚀 Quick Start

### Step 1: Register Router (Already Done!)

The router is registered in `main.py`. If not, add:

```python
from .controllers import kg_controller

app.include_router(kg_controller.kg_router, prefix="/api/kg", tags=["Knowledge Graph"])
```

### Step 2: Use Component in Your Pages

**Example: Add to Essay Detail Page**

```tsx
import KnowledgeGraphViewer from '../components/knowledge-graph/KnowledgeGraphViewer';

function EssayDetailPage({ essayId }: { essayId: number }) {
  return (
    <div className="space-y-6">
      {/* Essay details... */}
      
      {/* Knowledge Graph */}
      <KnowledgeGraphViewer essayId={essayId} height={600} />
    </div>
  );
}
```

### Step 3: Test It!

1. **Start backend:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Navigate to essay page** and see the graph!

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
        "essay_id": "1"
      }
    },
    {
      "id": "concept_1",
      "label": "Renewable Energy",
      "type": "Concept",
      "properties": {
        "frequency": 3
      }
    },
    {
      "id": "claim_1",
      "label": "Solar power is effective",
      "type": "Claim",
      "properties": {}
    }
  ],
  "edges": [
    {
      "source": "essay",
      "target": "concept_1",
      "type": "CONTAINS"
    },
    {
      "source": "claim_1",
      "target": "concept_1",
      "type": "SUPPORTS"
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

The component automatically colors nodes:

| Type | Color | Description |
|------|-------|-------------|
| Essay | 🟣 Purple | Essay node |
| Claim | 🔴 Red | Main arguments |
| Evidence | 🟢 Green | Supporting facts |
| Concept | 🔵 Blue | Key concepts |
| Premise | 🟠 Amber | Supporting premises |
| Counterclaim | 🔴 Pink | Opposing arguments |
| Background | ⚪ Gray | Background info |

## 💡 Usage Examples

### Example 1: Basic Display

```tsx
<KnowledgeGraphViewer essayId={essayId} />
```

### Example 2: Custom Height

```tsx
<KnowledgeGraphViewer essayId={essayId} height={800} />
```

### Example 3: Build and Display

```tsx
const [graphData, setGraphData] = useState(null);

const buildGraph = async () => {
  const data = await kgApi.buildAndExportGraph(essayId);
  setGraphData(data);
};

return (
  <>
    <button onClick={buildGraph}>Build Knowledge Graph</button>
    {graphData && (
      <KnowledgeGraphViewer essayId={essayId} graphData={graphData} />
    )}
  </>
);
```

### Example 4: With Callback

```tsx
const handleGraphLoad = (data: KnowledgeGraphData) => {
  console.log(`Loaded: ${data.stats?.node_count} nodes`);
};

<KnowledgeGraphViewer 
  essayId={essayId}
  onLoadGraph={handleGraphLoad}
/>
```

## 🔄 Complete Workflow

1. **Analyze essay** → Analysis runs
2. **Knowledge graph built** → Extracted from essay
3. **Export to Neo4j** → Stored in Neo4j Desktop
4. **Frontend requests graph** → API returns nodes/edges
5. **Graph displayed** → Interactive visualization

## 📋 Where to Add It

### Option 1: Essay Detail Page

Add to your essay detail/view page:

```tsx
import KnowledgeGraphViewer from '../components/knowledge-graph/KnowledgeGraphViewer';

// In your essay detail component:
<KnowledgeGraphViewer essayId={essay.id} />
```

### Option 2: Analysis Results Modal

Add to analysis results display:

```tsx
// In EnhancedEssayAnalysisModal or EssayAnalysisModal
<Tab name="Knowledge Graph">
  <KnowledgeGraphViewer essayId={essayId} />
</Tab>
```

### Option 3: Separate Tab

Create a dedicated knowledge graph page/tab:

```tsx
// New page: EssayKnowledgeGraphPage.tsx
export default function EssayKnowledgeGraphPage({ essayId }: { essayId: number }) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Knowledge Graph</h2>
      <KnowledgeGraphViewer essayId={essayId} height={700} />
    </div>
  );
}
```

## ✅ Checklist

- [x] Backend API created (`kg_controller.py`)
- [x] Router registered (`main.py`)
- [x] Frontend component created (`KnowledgeGraphViewer.tsx`)
- [x] API client functions added (`api.ts`)
- [x] Component uses correct Card format
- [ ] Add component to essay detail page
- [ ] Test with real essays
- [ ] Build knowledge graphs for essays

## 🎯 Next Steps

1. **Add component to a page:**
   - Open your essay detail/view page
   - Import `KnowledgeGraphViewer`
   - Add `<KnowledgeGraphViewer essayId={essayId} />`

2. **Test it:**
   - Start backend: `python -m uvicorn app.main:app --reload`
   - Start frontend: `npm run dev`
   - Navigate to essay page
   - See the graph!

3. **Build graphs for essays:**
   - Use the analysis endpoint to analyze essays
   - Knowledge graphs will be built automatically
   - Or use: `POST /api/kg/essay/{id}/build-and-export`

**Everything is ready! Just add the component to your pages!** 🚀

See `KG_VISUALIZATION_GUIDE.md` for more details!

