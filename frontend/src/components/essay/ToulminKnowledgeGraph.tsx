import React, { useRef, useEffect, useState } from "react";

interface Node {
  id: string;
  type: string;
  text: string;
  pos: { x: number; y: number };
  color: string;
}

interface Edge {
  from: string;
  to: string;
  label?: string;
}

const ToulminKnowledgeGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Node data with positions (using percentage-based positioning)
  const nodes: Node[] = [
    {
      id: "thesis",
      type: "thesis",
      text: "Digital abundance leads to anxiety, indecision, & regret",
      pos: { x: 50, y: 50 }, // Center
      color: "indigo",
    },
    {
      id: "claim",
      type: "claim",
      text: "Cognitive Overload & Decision Fatigue",
      pos: { x: 25, y: 50 }, // Left-center
      color: "yellow",
    },
    {
      id: "evidence-1",
      type: "evidence",
      text: "Streaming movies draining",
      pos: { x: 20, y: 70 }, // Below claim, left
      color: "light-blue",
    },
    {
      id: "evidence-2",
      type: "evidence",
      text: "Analysis Paralysis leads to Missed opportunities",
      pos: { x: 30, y: 70 }, // Below claim, right
      color: "light-blue",
    },
    {
      id: "warrant",
      type: "warrant",
      text: "Human mind has finite choice capacity",
      pos: { x: 20, y: 30 }, // Top-left
      color: "green",
    },
    {
      id: "backing",
      type: "backing",
      text: "Infinite choice > Internalized blame > High cognitive load",
      pos: { x: 80, y: 30 }, // Top-right
      color: "light-green",
    },
    {
      id: "rebuttal",
      type: "rebuttal",
      text: "is freedom & abundance",
      pos: { x: 75, y: 50 }, // Right-center
      color: "dark-yellow",
    },
    {
      id: "qualifier",
      type: "qualifier",
      text: "Shift perspective; Apply constraint (e.g., 'good enough')",
      pos: { x: 50, y: 80 }, // Bottom-center
      color: "light-indigo",
    },
  ];

  // Edge connections
  const edges: Edge[] = [
    { from: "claim", to: "thesis", label: "SUPPORTED BY" },
    { from: "warrant", to: "thesis", label: "JUSTIFIES" },
    { from: "backing", to: "warrant", label: "BACKING" },
    { from: "rebuttal", to: "thesis", label: "LIMITATION/REBUTTAL" },
    { from: "thesis", to: "qualifier", label: "SOLUTION/QUALIFIER" },
    { from: "claim", to: "evidence-1", label: "EVIDENCE" },
    { from: "claim", to: "evidence-2", label: "EVIDENCE" },
  ];

  // Color mapping
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-500",
    yellow: "bg-yellow-400",
    "light-blue": "bg-sky-300",
    green: "bg-green-500",
    "light-green": "bg-green-300",
    "dark-yellow": "bg-amber-600",
    "light-indigo": "bg-indigo-300",
  };

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Convert percentage to pixel coordinates
  const getPixelPos = (pos: { x: number; y: number }) => {
    return {
      x: (dimensions.width * pos.x) / 100,
      y: (dimensions.height * pos.y) / 100,
    };
  };

  // Draw edges
  useEffect(() => {
    if (!svgRef.current) return;

    // Clear existing edges
    const existingEdges = svgRef.current.querySelectorAll(".edge-group");
    existingEdges.forEach((el) => el.remove());

    edges.forEach((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);

      if (!fromNode || !toNode) return;

      const fromPos = getPixelPos(fromNode.pos);
      const toPos = getPixelPos(toNode.pos);

      // Create edge group to contain line and label
      const edgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      edgeGroup.classList.add("edge-group");

      // Create line element
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", fromPos.x.toString());
      line.setAttribute("y1", fromPos.y.toString());
      line.setAttribute("x2", toPos.x.toString());
      line.setAttribute("y2", toPos.y.toString());
      line.setAttribute("stroke", "#94a3b8");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-dasharray", "5,5");
      line.classList.add("edge-line");

      // Create label group
      const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      labelGroup.classList.add("edge-label");

      if (edge.label) {
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;

        // Background rectangle for label
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textElement.textContent = edge.label;
        textElement.setAttribute("x", midX.toString());
        textElement.setAttribute("y", midY.toString());
        textElement.setAttribute("text-anchor", "middle");
        textElement.setAttribute("dominant-baseline", "middle");
        textElement.setAttribute("font-size", "10");
        textElement.setAttribute("fill", "#64748b");
        textElement.classList.add("edge-label-text");

        // Estimate text dimensions (approximate)
        const estimatedWidth = edge.label.length * 6;
        const estimatedHeight = 14;
        rect.setAttribute("x", (midX - estimatedWidth / 2 - 4).toString());
        rect.setAttribute("y", (midY - estimatedHeight / 2 - 2).toString());
        rect.setAttribute("width", (estimatedWidth + 8).toString());
        rect.setAttribute("height", (estimatedHeight + 4).toString());
        rect.setAttribute("fill", "white");
        rect.setAttribute("rx", "4");
        rect.classList.add("edge-label-bg");

        labelGroup.appendChild(rect);
        labelGroup.appendChild(textElement);
      }

      // Append line and label to edge group
      edgeGroup.appendChild(line);
      if (edge.label) {
        edgeGroup.appendChild(labelGroup);
      }
      
      // Append edge group to SVG
      svgRef.current.appendChild(edgeGroup);
    });
  }, [dimensions, nodes, edges]);

  return (
    <div className="w-full h-full p-4 md:p-6 lg:p-8">
      <style>{`
        .edge-group:hover .edge-label {
          opacity: 1 !important;
          visibility: visible !important;
        }
        .edge-label {
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s, visibility 0.2s;
        }
        .edge-line {
          cursor: pointer;
        }
      `}</style>
      <div className="relative w-full h-[600px] md:h-[700px] lg:h-[800px] bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Edges will be drawn here via useEffect */}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const pixelPos = getPixelPos(node.pos);
          return (
            <div
              key={node.id}
              className="absolute group"
              style={{
                left: `${pixelPos.x}px`,
                top: `${pixelPos.y}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Node circle */}
              <div
                className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full ${colorMap[node.color]} border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110`}
              >
                {/* Node number/icon */}
                <span className="text-white font-bold text-xs md:text-sm lg:text-base">
                  {node.type === "thesis" ? "T" : node.type === "claim" ? "C" : node.type === "evidence" ? "E" : node.type === "warrant" ? "W" : node.type === "backing" ? "B" : node.type === "rebuttal" ? "R" : "Q"}
                </span>
              </div>

              {/* Node text label - hidden by default, visible on hover */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 md:w-56 lg:w-64 z-10">
                <div className="bg-white border border-neutral-200 rounded-lg shadow-xl p-2 md:p-3">
                  <p
                    className="text-xs md:text-sm text-neutral-800 text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
                  >
                    {node.text}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-neutral-600">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-indigo-500"></span>
          <span>Thesis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-yellow-400"></span>
          <span>Claim</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-sky-300"></span>
          <span>Evidence</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-green-500"></span>
          <span>Warrant</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-green-300"></span>
          <span>Backing</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-amber-600"></span>
          <span>Rebuttal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-indigo-300"></span>
          <span>Qualifier</span>
        </div>
      </div>
    </div>
  );
};

export default ToulminKnowledgeGraph;

