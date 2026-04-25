import React, { useRef, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import Card from "../ui/Card";

interface GraphNode {
  id: string;
  label: string;
  type?: string;
  properties?: Record<string, unknown>;
  fx?: number;
  fy?: number;
  x?: number;
  y?: number;
  [key: string]: unknown;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
  properties?: Record<string, unknown>;
}

interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats?: {
    node_count: number;
    edge_count: number;
  };
}

interface KnowledgeGraphViewerProps {
  essayId: string;
  graphData?: KnowledgeGraphData;
  onLoadGraph?: (data: KnowledgeGraphData) => void;
  height?: number;
  width?: number;
}

const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({
  essayId,
  graphData,
  onLoadGraph,
  height = 600,
  width,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [data, setData] = useState<KnowledgeGraphData | null>(
    graphData || null
  );
  const [loading, setLoading] = useState(!graphData);
  const [error, setError] = useState<string | null>(null);

  // Load graph data if not provided
  useEffect(() => {
    if (!graphData) {
      loadGraphData();
    }
  }, [essayId, graphData]);

  const loadGraphData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { kgApi } = await import("../../api");
      const graphData = await kgApi.getKnowledgeGraph(essayId);
      setData(graphData);

      if (onLoadGraph) {
        onLoadGraph(graphData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load knowledge graph"
      );
      console.error("Error loading knowledge graph:", err);
    } finally {
      setLoading(false);
    }
  };

  // Node color by type
  const getNodeColor = (node: GraphNode): string => {
    const type = node.type?.toLowerCase() || "kgnode";

    const colorMap: Record<string, string> = {
      essay: "#8B5CF6", // Purple
      claim: "#EF4444", // Red
      evidence: "#10B981", // Green
      concept: "#3B82F6", // Blue
      premise: "#F59E0B", // Amber
      counterclaim: "#EC4899", // Pink
      background: "#6B7280", // Gray
    };

    return colorMap[type] || "#6366F1"; // Default indigo
  };

  // Node size by connections
  const getNodeSize = (node: GraphNode): number => {
    if (!data) return 8;

    const connections = data.edges.filter(
      (e) =>
        (typeof e.source === "string" ? e.source : e.source.id) === node.id ||
        (typeof e.target === "string" ? e.target : e.target.id) === node.id
    ).length;

    return Math.max(8, Math.min(20, 8 + connections * 2));
  };

  if (loading) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Knowledge Graph</h3>
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500">Loading knowledge graph...</div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Knowledge Graph</h3>
          <div className="flex items-center justify-center h-96">
            <div className="text-red-500">Error: {error}</div>
          </div>
        </div>
      </Card>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Knowledge Graph</h3>
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500">
              No knowledge graph data available for this essay.
              <button
                onClick={loadGraphData}
                className="ml-2 text-blue-500 hover:underline"
              >
                Try building it
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Knowledge Graph</h3>
          {data.stats && (
            <span className="text-sm text-gray-500">
              {data.stats.node_count} nodes, {data.stats.edge_count} edges
            </span>
          )}
        </div>
        <div className="relative" style={{ width: width || "100%", height }}>
          <ForceGraph2D
            ref={fgRef}
            graphData={{
              nodes: data.nodes,
              links: data.edges.map((edge) => ({
                source:
                  typeof edge.source === "string"
                    ? edge.source
                    : edge.source.id,
                target:
                  typeof edge.target === "string"
                    ? edge.target
                    : edge.target.id,
                type: edge.type,
                ...(edge.properties && { properties: edge.properties }),
              })),
            }}
            nodeLabel={(node: GraphNode) => `
              ${node.label || node.id}
              ${node.type ? `\nType: ${node.type}` : ""}
              ${
                node.properties
                  ? `\nProperties: ${JSON.stringify(node.properties).slice(
                      0,
                      100
                    )}`
                  : ""
              }
            `}
            nodeColor={(node: GraphNode) => getNodeColor(node)}
            nodeVal={(node: GraphNode) => getNodeSize(node)}
            linkLabel={(edge: GraphEdge) => edge.type || "RELATED_TO"}
            linkColor={() => "#94A3B8"}
            linkWidth={2}
            cooldownTicks={100}
            onNodeDragEnd={(node: GraphNode) => {
              node.fx = node.x;
              node.fy = node.y;
            }}
            onNodeRightClick={(node: GraphNode) => {
              // Stop node movement
              node.fx = node.x;
              node.fy = node.y;
            }}
          />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg text-xs">
            <div className="font-semibold mb-2">Node Types:</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span>Essay</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Claim</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Evidence</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Concept</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              if (fgRef.current) {
                fgRef.current.zoomToFit(400, 20);
              }
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
          >
            Zoom to Fit
          </button>
          <button
            onClick={() => {
              if (fgRef.current) {
                data?.nodes.forEach((node: GraphNode) => {
                  node.fx = undefined;
                  node.fy = undefined;
                });
                fgRef.current.zoomToFit(400, 20);
              }
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
          >
            Reset Layout
          </button>
          <button
            onClick={loadGraphData}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    </Card>
  );
};

export default KnowledgeGraphViewer;
