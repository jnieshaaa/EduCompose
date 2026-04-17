import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type NodeObject, type LinkObject, type GraphData } from "react-force-graph-2d";
import type {
  ArgumentGraphData,
  ArgumentMetrics,
  ArgumentStrengthMetric,
  ArgumentGraphNode,
} from "../../types/Essay";

interface ArgumentKnowledgeGraphProps {
  graph?: ArgumentGraphData;
  metrics?: ArgumentMetrics;
}

const NODE_COLORS: Record<string, string> = {
  thesis: "#0ea5e9",
  claim: "#10b981",
  evidence: "#f59e0b",
  warrant: "#6366f1",
  rebuttal: "#6366f1",
  qualifier: "#a855f7",
};

const LINK_COLORS: Record<string, string> = {
  supports: "#0ea5e9",
  elaborates: "#6366f1",
  rebuts: "#ef4444",
};

const ArgumentKnowledgeGraph: React.FC<ArgumentKnowledgeGraphProps> = ({
  graph,
  metrics,
}) => {
  type ForceNode = NodeObject<ArgumentGraphNode> & { x: number; y: number };
  type ForceLink = LinkObject<ForceNode, { type?: string }>;

  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 320 });
  const [hoveredNode, setHoveredNode] = useState<ForceNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const element = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) {
        return;
      }
      const { width, height } = entries[0].contentRect;
      setDimensions({
        width: Math.max(600, width),
        height: Math.max(600, height),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo<GraphData<ForceNode, ForceLink>>(() => {
    if (!graph) {
      return { nodes: [], links: [] };
    }

    // Improved initial positioning using hierarchical layout
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const layerDistance = 150; // Distance between layers

    // Group nodes by type for better layout
    const nodesByType: Record<string, ArgumentGraphNode[]> = {
      thesis: [],
      claim: [],
      evidence: [],
      warrant: [],
      rebuttal: [],
      qualifier: [],
    };

    graph.nodes.forEach((node) => {
      if (nodesByType[node.type]) {
        nodesByType[node.type].push(node);
      }
    });

    // Position nodes in hierarchical layers
    const nodes: ForceNode[] = graph.nodes.map((node) => {
      let x = 0,
        y = 0;

      if (node.type === "thesis") {
        // Thesis at center
        x = centerX;
        y = centerY;
      } else if (node.type === "claim") {
        // Claims in a circle around thesis
        const claimIndex = nodesByType.claim.findIndex((n) => n.id === node.id);
        const totalClaims = nodesByType.claim.length;
        const angle = (claimIndex / totalClaims) * Math.PI * 2;
        const radius = layerDistance * 0.8;
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
      } else if (node.type === "evidence") {
        // Evidence below claims
        const evidenceIndex = nodesByType.evidence.findIndex(
          (n) => n.id === node.id
        );
        const totalEvidence = nodesByType.evidence.length;
        const spacing = dimensions.width / (totalEvidence + 1);
        x = spacing * (evidenceIndex + 1);
        y = centerY + layerDistance * 1.2;
      } else if (node.type === "warrant") {
        // Warrants to the sides
        const warrantIndex = nodesByType.warrant.findIndex(
          (n) => n.id === node.id
        );
        const totalWarrants = nodesByType.warrant.length;
        const angle = (warrantIndex / totalWarrants) * Math.PI * 2;
        const radius = layerDistance * 1.2;
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
      } else if (node.type === "rebuttal") {
        // Rebuttals at top
        const rebuttalIndex = nodesByType.rebuttal.findIndex(
          (n) => n.id === node.id
        );
        const totalRebuttals = nodesByType.rebuttal.length;
        const spacing = dimensions.width / (totalRebuttals + 1);
        x = spacing * (rebuttalIndex + 1);
        y = centerY - layerDistance * 1.2;
      } else if (node.type === "qualifier") {
        // Qualifiers at bottom
        const qualifierIndex = nodesByType.qualifier.findIndex(
          (n) => n.id === node.id
        );
        const totalQualifiers = nodesByType.qualifier.length;
        const spacing = dimensions.width / (totalQualifiers + 1);
        x = spacing * (qualifierIndex + 1);
        y = centerY + layerDistance * 1.5;
      } else {
        // Default: random placement
        x = centerX + (Math.random() - 0.5) * 200;
        y = centerY + (Math.random() - 0.5) * 200;
      }

      return {
        ...node,
        x,
        y,
      } as ForceNode;
    });

    // Map edge sources/targets to actual node objects
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const links = (graph.edges || [])
      .map((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (sourceNode && targetNode) {
          return {
            source: sourceNode,
            target: targetNode,
            type: edge.type,
          } as ForceLink;
        }
        return null;
      })
      .filter((link): link is ForceLink => link !== null);

    return { nodes, links };
  }, [graph, dimensions.width, dimensions.height]);

  // Track connected node IDs for hover highlighting
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNode || !graphData.links) return new Set<string>();
    const connected = new Set<string>([hoveredNode.id as string]);
    graphData.links.forEach((link) => {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source;
      const targetId = typeof link.target === "object" ? link.target.id : link.target;
      if (sourceId === hoveredNode.id) {
        connected.add(targetId as string);
      }
      if (targetId === hoveredNode.id) {
        connected.add(sourceId as string);
      }
    });
    return connected;
  }, [hoveredNode, graphData.links]);

  const strengthMetrics: ArgumentStrengthMetric[] = useMemo(() => {
    return metrics?.argument_strength ?? [];
  }, [metrics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="w-full">
          <div
            ref={containerRef}
            className="w-full h-[600px] md:h-[700px] bg-neutral-50 border border-neutral-200 rounded-rd"
            onMouseMove={(e) => {
              // Track mouse position for tooltip positioning
              setMousePos({ x: e.clientX, y: e.clientY });
            }}
          >
            {graphData.nodes.length > 0 ? (
              <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                backgroundColor="rgba(249,250,251,1)"
                // Force simulation parameters for better spacing
                cooldownTicks={100}
                onEngineStop={() => {
                  // Force simulation complete
                }}
                onNodeHover={(node: ForceNode | null) => {
                  setHoveredNode(node);
                }}
                onLinkHover={() => {
                  setHoveredNode(null);
                }}
                onBackgroundClick={() => {
                  setHoveredNode(null);
                }}
                nodeCanvasObject={(node: ForceNode, ctx) => {
                  const color = NODE_COLORS[node.type] || "#0f172a";
                  const nodeX = typeof node.x === "number" ? node.x : 0;
                  const nodeY = typeof node.y === "number" ? node.y : 0;

                  // Check if node is connected to hovered node
                  const nodeId = node.id as string;
                  const isHighlighted = hoveredNode && connectedNodeIds.has(nodeId);
                  const isDimmed = hoveredNode && !connectedNodeIds.has(nodeId);

                  // Larger nodes based on type
                  const nodeRadius =
                    node.type === "thesis"
                      ? 14
                      : node.type === "claim"
                      ? 12
                      : 10;

                  // Apply dimming effect for non-connected nodes when hovering
                  ctx.globalAlpha = isDimmed ? 0.3 : 1.0;

                  // Draw node circle with solid color and shadow effect
                  ctx.beginPath();
                  ctx.fillStyle = color;
                  ctx.arc(nodeX, nodeY, nodeRadius, 0, 2 * Math.PI, false);
                  ctx.fill();

                  // Add subtle inner highlight
                  const highlightGradient = ctx.createRadialGradient(
                    nodeX - nodeRadius * 0.4,
                    nodeY - nodeRadius * 0.4,
                    0,
                    nodeX,
                    nodeY,
                    nodeRadius
                  );
                  highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
                  highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
                  ctx.fillStyle = highlightGradient;
                  ctx.fill();

                  // Reset fill style
                  ctx.fillStyle = color;

                  // Enhanced border for highlighted nodes
                  ctx.strokeStyle = isHighlighted ? "#0284c7" : "#ffffff";
                  ctx.lineWidth = isHighlighted ? 3 : 2.5;
                  ctx.stroke();

                  // Reset alpha
                  ctx.globalAlpha = 1.0;

                  // No text rendered - tooltip will show on hover instead
                }}
                linkColor={(link: ForceLink) => {
                  // Highlight link if it's connected to hovered node
                  if (hoveredNode) {
                    const sourceId = typeof link.source === "object" ? link.source.id : link.source;
                    const targetId = typeof link.target === "object" ? link.target.id : link.target;
                    const isHighlighted = 
                      sourceId === hoveredNode.id || targetId === hoveredNode.id;
                    if (isHighlighted) {
                      return "#0284c7"; // Highlight color
                    }
                  }
                  return LINK_COLORS[link.type ?? "supports"] || "#94a3b8";
                }}
                linkWidth={(link: ForceLink) => {
                  // Make links thicker when highlighted
                  if (hoveredNode) {
                    const sourceId = typeof link.source === "object" ? link.source.id : link.source;
                    const targetId = typeof link.target === "object" ? link.target.id : link.target;
                    const isHighlighted = 
                      sourceId === hoveredNode.id || targetId === hoveredNode.id;
                    if (isHighlighted) {
                      return link.type === "rebuts" ? 3.5 : 2.5;
                    }
                  }
                  return link.type === "rebuts" ? 2.5 : 1.5;
                }}
                linkDirectionalArrowLength={6}
                linkDirectionalParticles={0}
                // Better force simulation parameters
                nodeRelSize={10}
                nodeLabel={() => ""} // Hide node labels
                linkLabel={() => ""} // Hide link labels
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
                Argument graph data will appear here after analysis.
              </div>
            )}

            {/* High-Visibility Tooltip for nodes */}
            {hoveredNode && (
              <div
                className="fixed pointer-events-none bg-neutral-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl transition-opacity duration-150"
                style={{
                  left: `${mousePos.x + 15}px`,
                  top: `${mousePos.y - 60}px`, 
                  zIndex: 99999, // Extremely high z-index to clear modals
                  width: '240px',
                  opacity: hoveredNode ? 1 : 0
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full shadow-[0_0_8px] shadow-current" style={{ color: NODE_COLORS[hoveredNode.type] || '#fff', backgroundColor: 'currentColor' }} />
                  <span className="font-bold uppercase tracking-[0.2em] text-[10px] text-white/50">
                    {hoveredNode.type}
                  </span>
                </div>
                <p className="text-white text-xs leading-relaxed font-medium line-clamp-4">
                  "{hoveredNode.text || "Structural element"}"
                </p>
                <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center">
                  <span className="text-[9px] text-white/30 truncate">Toulmin's Protocol Node</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-success-default animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Node Legend */}
          {graph?.legend && graph.legend.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-neutral-600">
              <span className="font-semibold text-neutral-700">Nodes:</span>
              {graph.legend.map((entry) => (
                <div key={entry.type} className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: NODE_COLORS[entry.type] || "#0f172a",
                    }}
                  ></span>
                  <span>{entry.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: NODE_COLORS.qualifier,
                  }}
                ></span>
                <span>Qualifier</span>
              </div>
            </div>
          )}

          {/* Edge Legend */}
          {graphData.links.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-neutral-600">
              <span className="font-semibold text-neutral-700">Edges:</span>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-0.5 w-6"
                  style={{
                    backgroundColor: LINK_COLORS.supports || "#0ea5e9",
                  }}
                ></span>
                <span>Supports</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-0.5 w-6"
                  style={{
                    backgroundColor: LINK_COLORS.elaborates || "#6366f1",
                  }}
                ></span>
                <span>Elaborates</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-0.5 w-6"
                  style={{
                    backgroundColor: LINK_COLORS.rebuts || "#ef4444",
                  }}
                ></span>
                <span>Rebuts</span>
              </div>
            </div>
          )}
        </div>

        <div className="w-full space-y-4">
          <div>
            <h5 className="text-sm font-semibold text-neutral-800 mb-2">
              Argument Strength
            </h5>
            {strengthMetrics.length > 0 ? (
              <div className="space-y-3">
                {(() => {
                  // Group duplicate claims
                  const claimGroups = new Map<string, typeof strengthMetrics>();
                  strengthMetrics.forEach((entry) => {
                    const normalizedClaim = entry.claim.trim().toLowerCase();
                    if (!claimGroups.has(normalizedClaim)) {
                      claimGroups.set(normalizedClaim, []);
                    }
                    claimGroups.get(normalizedClaim)!.push(entry);
                  });

                  return Array.from(claimGroups.entries()).map(
                    ([normalizedClaim, entries]) => {
                      const firstEntry = entries[0];
                      const count = entries.length;
                      const totalEvidence = entries.reduce(
                        (sum, e) => sum + e.evidence,
                        0
                      );
                      const totalWarrants = entries.reduce(
                        (sum, e) => sum + e.warrants,
                        0
                      );
                      const totalRebuttals = entries.reduce(
                        (sum, e) => sum + e.rebuttals,
                        0
                      );
                      const avgScore =
                        entries.reduce((sum, e) => sum + e.score, 0) / count;
                      const scorePercent = Math.min(
                        100,
                        Math.round((avgScore / 10) * 100)
                      );

                      return (
                        <div key={`${normalizedClaim}-${firstEntry.claim_id}`}>
                          <p className="text-xs text-neutral-600 mb-1">
                            Claim:{" "}
                            {firstEntry.claim.length > 64
                              ? `${firstEntry.claim.slice(0, 61)}...`
                              : firstEntry.claim}
                            {count > 1 && (
                              <span className="ml-1 text-neutral-400 font-medium">
                                ({count})
                              </span>
                            )}
                          </p>
                          <div className="h-2 bg-neutral-200 rounded-full">
                            <div
                              className="h-2 bg-emerald-500 rounded-full"
                              style={{ width: `${scorePercent}%` }}
                            ></div>
                          </div>
                          <div className="mt-1 text-[11px] text-neutral-500">
                            {totalEvidence} evidence | {totalWarrants} warrants
                            | {totalRebuttals} rebuttals
                          </div>
                        </div>
                      );
                    }
                  );
                })()}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Run an analysis to evaluate the strength of each claim.
              </p>
            )}
          </div>

          {metrics && metrics.verification && metrics.verification.length > 0 && (
            <div className="border-t border-neutral-200 pt-3">
              <h5 className="text-sm font-semibold text-neutral-800 mb-2">
                Evidence Verification
              </h5>
              <div className="space-y-2">
                {metrics.verification.map((item, idx) => (
                  <div
                    key={`${item.statement}-${idx}`}
                    className="flex items-start justify-between gap-2 text-xs"
                  >
                    <span className="text-neutral-600 flex-1">
                      {item.statement.length > 80
                        ? `${item.statement.slice(0, 77)}...`
                        : item.statement}
                    </span>
                    <span
                      className={`font-semibold ${
                        item.status === "Verified"
                          ? "text-emerald-600"
                          : "text-amber-500"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArgumentKnowledgeGraph;
