import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { NodeObject, LinkObject, GraphData } from "react-force-graph-2d";
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
  const [dimensions, setDimensions] = useState({ width: 600, height: 320 });

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
        width: Math.max(320, width),
        height: Math.max(260, height),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo<GraphData<ForceNode, ForceLink>>(() => {
    if (!graph) {
      return { nodes: [], links: [] };
    }

    const nodes = graph.nodes.map((node, idx) => ({
      ...node,
      x: idx,
      y:
        node.type === "thesis"
          ? 0
          : node.type === "claim"
          ? 1
          : node.type === "evidence"
          ? 2
          : node.type === "warrant"
          ? 3
          : 4,
    })) as ForceNode[];

    const links = (graph.edges || []).map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
    })) as ForceLink[];

    return { nodes, links };
  }, [graph]);

  const strengthMetrics: ArgumentStrengthMetric[] = useMemo(() => {
    return metrics?.argument_strength ?? [];
  }, [metrics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="w-full">
          <div
            ref={containerRef}
            className="w-full h-64 md:h-72 bg-neutral-50 border border-neutral-200 rounded-lg"
          >
            {graphData.nodes.length > 0 ? (
              <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                backgroundColor="rgba(249,250,251,1)"
                nodeCanvasObject={(node: ForceNode, ctx, globalScale) => {
                  const label = node.text ?? "";
                  // Scale text size with zoom: smaller when zoomed in, larger when zoomed out
                  // globalScale < 1 = zoomed out, globalScale > 1 = zoomed in
                  // Use inverse scaling so text shrinks when zoomed in
                  const baseFontSize = 12;
                  const fontSize = Math.max(8, Math.min(16, baseFontSize / Math.sqrt(globalScale)));
                  const color = NODE_COLORS[node.type] || "#0f172a";
                  const nodeX = typeof node.x === "number" ? node.x : 0;
                  const nodeY = typeof node.y === "number" ? node.y : 0;

                  ctx.beginPath();
                  ctx.fillStyle = color;
                  ctx.arc(nodeX, nodeY, 6, 0, 2 * Math.PI, false);
                  ctx.fill();

                  ctx.font = `${fontSize}px Inter, sans-serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "top";
                  ctx.fillStyle = "#1f2937";
                  // Adjust text truncation based on zoom level (more text when zoomed in)
                  const maxLength = globalScale > 1.5 ? 50 : globalScale > 1 ? 40 : 30;
                  const text =
                    label.length > maxLength ? `${label.slice(0, maxLength - 3)}...` : label;
                  ctx.fillText(text, nodeX, nodeY + 8);
                }}
                linkColor={(link: ForceLink) =>
                  LINK_COLORS[link.type ?? "supports"] || "#94a3b8"
                }
                linkWidth={(link: ForceLink) =>
                  link.type === "rebuts" ? 2.5 : 1.5
                }
                linkDirectionalArrowLength={4}
                linkDirectionalParticles={0}
                nodeRelSize={6}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-neutral-500">
                Argument graph data will appear here after analysis.
              </div>
            )}
          </div>

          {graph?.legend && graph.legend.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-neutral-600">
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
                {strengthMetrics.map((entry) => {
                  const scorePercent = Math.min(
                    100,
                    Math.round((entry.score / 10) * 100)
                  );
                  return (
                    <div key={entry.claim_id}>
                      <p className="text-xs text-neutral-600 mb-1">
                        Claim:{" "}
                        {entry.claim.length > 64
                          ? `${entry.claim.slice(0, 61)}...`
                          : entry.claim}
                      </p>
                      <div className="h-2 bg-neutral-200 rounded-full">
                        <div
                          className="h-2 bg-emerald-500 rounded-full"
                          style={{ width: `${scorePercent}%` }}
                        ></div>
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500">
                        {entry.evidence} evidence | {entry.warrants} warrants |{" "}
                        {entry.rebuttals} rebuttals
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Run an analysis to evaluate the strength of each claim.
              </p>
            )}
          </div>

          <div className="border-t border-neutral-200 pt-3">
            <h5 className="text-sm font-semibold text-neutral-800 mb-2">
              Coherence
            </h5>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(metrics?.coherence ?? 0)
                  )}%`,
                }}
              ></div>
            </div>
            <span className="text-xs text-neutral-500 mt-1 inline-block">
              {Math.round(metrics?.coherence ?? 0)}%
            </span>
          </div>

          {metrics && metrics.verification.length > 0 && (
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
