import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Chart from 'chart.js/auto';

// --- Interfaces ---
export interface Entity {
  id: number;
  text: string;
  type: 'Thesis' | 'Claim' | 'Evidence' | 'Counter-Claim' | 'Rebuttal';
}

export interface Relation {
  source: number;
  target: number;
  label: string;
}

export interface KnowledgeBaseEntry {
  status: 'Verified' | 'Unverified';
  source: string;
}

export interface SimulationData {
  entities: Entity[];
  relations: Relation[];
  knowledgeBase: Record<number, KnowledgeBaseEntry>;
}

interface GraphNode extends Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  label: string;
}

// --- Constants ---
export const SIMULATION_DATA: SimulationData = {
  entities: [
    {
      id: 0,
      text: 'To mitigate... a global transition to renewable energy... is imperative.',
      type: 'Thesis',
    },
    {
      id: 1,
      text: 'The primary driver of climate change is... burning fossil fuels.',
      type: 'Claim',
    },
    {
      id: 2,
      text: 'The IPCC has reported... over 75% of global greenhouse gas emissions.',
      type: 'Evidence',
    },
    {
      id: 3,
      text: 'Renewable energy sources... produce little to no greenhouse gas emissions.',
      type: 'Claim',
    },
    {
      id: 4,
      text: 'NREL: wind turbines have a carbon footprint 99% less than coal.',
      type: 'Evidence',
    },
    {
      id: 5,
      text: 'Some argue that renewable energy is unreliable...',
      type: 'Counter-Claim',
    },
    {
      id: 6,
      text: 'Advancements in battery storage... are solving these issues.',
      type: 'Rebuttal',
    },
  ],
  relations: [
    { source: 1, target: 0, label: 'supports' },
    { source: 3, target: 0, label: 'supports' },
    { source: 2, target: 1, label: 'provides_evidence_for' },
    { source: 4, target: 3, label: 'provides_evidence_for' },
    { source: 5, target: 3, label: 'challenges' },
    { source: 6, target: 5, label: 'rebuts' },
  ],
  knowledgeBase: {
    2: { status: 'Verified', source: 'IPCC AR6 Report' },
    4: { status: 'Verified', source: 'NREL Life Cycle Assessment' },
  },
};

export const COLORS: Record<Entity['type'], string> = {
  Thesis: '#38bdf8', // sky-400
  Claim: '#14b8a6', // teal-500
  Evidence: '#f59e0b', // amber-500
  'Counter-Claim': '#6b7280', // gray-500
  Rebuttal: '#6366f1', // indigo-500
};

// --- Custom Hook for ResizeObserver ---
function useResizeObserver(
  ref: React.RefObject<HTMLElement | null>,
  callback: (entry: ResizeObserverEntry) => void
) {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        callback(entries[0]);
      }
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, callback]);
}

// --- Main Component ---
export function KnowledgeGraphSimulation() {
  // State Management
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [coherenceScore, setCoherenceScore] = useState(0);
  const [strengthScores, setStrengthScores] = useState<{ label: string; score: number }[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Refs
  const knowledgeGraphCanvasRef = useRef<HTMLCanvasElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const strengthChartRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | undefined>(undefined);
  const graphNodes = useRef<GraphNode[]>([]);
  const graphEdges = useRef<GraphEdge[]>([]);
  const graphIterations = useRef(0);

  // Evidence Verification Table Data
  const evidenceTableData = useMemo(() => {
    const evidenceEntities = SIMULATION_DATA.entities.filter((e) => e.type === 'Evidence');
    return evidenceEntities.map((evidence) => {
      const verification = SIMULATION_DATA.knowledgeBase[evidence.id];
      const status = verification ? verification.status : 'Unverified';
      return {
        text: evidence.text,
        status: status,
        statusColor: status === 'Verified' ? 'text-green-600' : 'text-red-600',
      };
    });
  }, []);

  // Calculate Coherence Score
  const calculateCoherence = useCallback((): number => {
    const nodes = graphNodes.current;
    const edges = graphEdges.current;
    const thesis = nodes.find((n) => n.type === 'Thesis');
    if (!thesis) return 0;
    let connectedCount = 0;
    const visited = new Set<number>();
    const queue: GraphNode[] = [thesis];
    visited.add(thesis.id);

    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      connectedCount++;
      edges.forEach((edge) => {
        if (edge.source.id === currentNode.id && !visited.has(edge.target.id)) {
          visited.add(edge.target.id);
          queue.push(edge.target);
        }
        if (edge.target.id === currentNode.id && !visited.has(edge.source.id)) {
          visited.add(edge.source.id);
          queue.push(edge.source);
        }
      });
    }
    return Math.round((connectedCount / nodes.length) * 100);
  }, []);

  // Drawing function
  const drawGraph = useCallback(() => {
    const canvas = knowledgeGraphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const connectedNodeIds = new Set<number>();
    if (hoveredNode) {
      connectedNodeIds.add(hoveredNode.id);
      graphEdges.current.forEach((edge) => {
        if (edge.source.id === hoveredNode.id) connectedNodeIds.add(edge.target.id);
        if (edge.target.id === hoveredNode.id) connectedNodeIds.add(edge.source.id);
      });
    }

    // Draw Edges
    graphEdges.current.forEach((edge) => {
      const isHighlighted =
        hoveredNode && (edge.source.id === hoveredNode.id || edge.target.id === hoveredNode.id);
      ctx.beginPath();
      ctx.moveTo(edge.source.x, edge.source.y);
      ctx.lineTo(edge.target.x, edge.target.y);
      ctx.strokeStyle = isHighlighted ? '#0284c7' : '#94a3b8';
      ctx.lineWidth = isHighlighted ? 2.5 : 1;
      ctx.stroke();
    });

    // Draw Nodes
    graphNodes.current.forEach((node) => {
      const isDimmed = hoveredNode && !connectedNodeIds.has(node.id);
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS[node.type];
      ctx.globalAlpha = isDimmed ? 0.3 : 1.0;
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.globalAlpha = 1.0;
  }, [hoveredNode]);

  // Force Layout Simulation
  const runForceLayout = useCallback(() => {
    const attraction = 0.02,
      repulsion = 1000,
      damping = 0.95,
      maxIterations = 200;
    const nodes = graphNodes.current;
    const edges = graphEdges.current;
    const canvas = knowledgeGraphCanvasRef.current;
    if (!canvas) return;

    const update = () => {
      if (graphIterations.current > maxIterations) {
        drawGraph();
        return;
      }

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i],
            nodeB = nodes[j];
          const dx = nodeB.x - nodeA.x,
            dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const force = repulsion / (distance * distance);
          nodeA.vx -= force * (dx / distance);
          nodeA.vy -= force * (dy / distance);
          nodeB.vx += force * (dx / distance);
          nodeB.vy += force * (dy / distance);
        }
      }

      // Attraction
      edges.forEach((edge) => {
        const dx = edge.target.x - edge.source.x,
          dy = edge.target.y - edge.source.y;
        edge.source.vx += dx * attraction;
        edge.source.vy += dy * attraction;
        edge.target.vx -= dx * attraction;
        edge.target.vy -= dy * attraction;
      });

      // Update positions
      nodes.forEach((node) => {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(node.radius, Math.min(canvas.width - node.radius, node.x));
        node.y = Math.max(node.radius, Math.min(canvas.height - node.radius, node.y));
      });

      drawGraph();
      graphIterations.current++;
      animationFrameId.current = requestAnimationFrame(update);
    };
    update();
  }, [drawGraph]);

  // Initialize Graph State
  const initGraph = useCallback(() => {
    const canvas = knowledgeGraphCanvasRef.current;
    if (!canvas) return;

    // Reset and init nodes
    graphIterations.current = 0;
    graphNodes.current = SIMULATION_DATA.entities.map((e) => ({
      ...e,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: 0,
      vy: 0,
      radius: e.type === 'Thesis' ? 20 : 15,
    }));

    // Init edges
    graphEdges.current = SIMULATION_DATA.relations.map((r) => ({
      source: graphNodes.current.find((n) => n.id === r.source)!,
      target: graphNodes.current.find((n) => n.id === r.target)!,
      label: r.label,
    }));

    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    runForceLayout();
  }, [runForceLayout]);

  // Analysis Logic
  const runAnalysis = useCallback(() => {
    // 1. Calculate Strength Scores
    const claims = SIMULATION_DATA.entities.filter((e) => e.type === 'Claim');
    const scores = claims.map((claim) => {
      const evidenceCount = SIMULATION_DATA.relations.filter(
        (r) =>
          r.target === claim.id &&
          SIMULATION_DATA.entities.find((e) => e.id === r.source)?.type === 'Evidence'
      ).length;
      return {
        label: `Claim: "${claim.text.substring(0, 30)}..."`,
        score: evidenceCount * 50 + 50,
      };
    });
    setStrengthScores(scores);

    // 2. Calculate Coherence Score
    setCoherenceScore(calculateCoherence());

    // 3. Mark Analysis Complete
    setIsAnalysisComplete(true);
  }, [calculateCoherence]);

  // Resize canvas using ResizeObserver
  const handleResize = useCallback((entry: ResizeObserverEntry) => {
    const canvas = knowledgeGraphCanvasRef.current;
    if (!canvas) return;

    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;

      // Re-initialize graph if it's already been started
      if (graphNodes.current.length > 0) {
        // Keep nodes within new bounds
        graphNodes.current.forEach((node) => {
          node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
          node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
        });
        drawGraph();
      }
    }
  }, [drawGraph]);

  useResizeObserver(graphContainerRef, handleResize);

  // Handle Simulation Analysis Start Button Click
  const handleSimulationAnalyze = () => {
    setIsAnalyzing(true);
    setIsAnalysisComplete(false);

    // Small delay to allow DOM to render the graph container
    requestAnimationFrame(() => {
      const canvas = knowledgeGraphCanvasRef.current;
      const container = graphContainerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
      initGraph();
    });

    setTimeout(() => {
      runAnalysis();
      setIsAnalyzing(false);
    }, 2500);
  };

  // Graph Mouse Interactions
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = knowledgeGraphCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let foundNode: GraphNode | null = null;
      for (const node of graphNodes.current) {
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        if (dx * dx + dy * dy < node.radius * node.radius) {
          foundNode = node;
          break;
        }
      }

      setHoveredNode(foundNode);
      if (graphIterations.current > 200 || !animationFrameId.current) {
        drawGraph();
      }
    },
    [drawGraph]
  );

  const handleMouseOut = () => {
    if (hoveredNode) {
      setHoveredNode(null);
      if (graphIterations.current > 200 || !animationFrameId.current) {
        drawGraph();
      }
    }
  };

  // Strength Chart (Bar Chart)
  useEffect(() => {
    const ctx = strengthChartRef.current?.getContext('2d');
    let chart: Chart<'bar'> | undefined;

    if (ctx && strengthScores.length > 0) {
      chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: strengthScores.map((s) => s.label),
          datasets: [
            {
              label: 'Strength Score',
              data: strengthScores.map((s) => s.score),
              backgroundColor: '#14b8a6',
              borderColor: '#0f766e',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: { beginAtZero: true, max: 100, grid: { color: '#e5e7eb' } },
            y: { grid: { display: false } },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (context) => context[0].label.split('"')[1] ?? 'Argument Strength',
              },
            },
          },
        },
      });
    }
    return () => {
      chart?.destroy();
    };
  }, [strengthScores]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <section id="simulation" className="bg-white py-16 md:py-24">
      <motion.div
        className="container mx-auto px-6"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: false, amount: 0.1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <motion.header
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <h2 className="text-3xl md:text-4xl font-bold">Live Simulation: From Essay to Insight</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            This simulation demonstrates how EduCompose deconstructs an essay to analyze its
            argumentative structure using a Knowledge Graph.
          </p>
        </motion.header>

        <main className="space-y-12">
          {/* Step 1: The Student Essay */}
          <motion.section
            id="sim-step1"
            className="step-card visible bg-white p-6 rounded-xl shadow-md border border-gray-200"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <div className="flex items-center mb-4">
              <div className="bg-cyan-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="text-2xl font-bold ml-4 text-gray-700">The Student Essay</h3>
            </div>
            <p className="mb-4 text-gray-600">
              This section contains the sample essay to be analyzed. The system will deconstruct
              this text to identify the core claims, supporting evidence, and the main thesis.
              Click the button below to begin the analysis.
            </p>
            <div
              id="essayContainer"
              className="bg-gray-100 p-4 rounded-lg border border-gray-200 text-gray-700 space-y-3"
            >
              <h4 className="font-bold text-center">The Urgency of Renewable Energy Adoption</h4>
              {SIMULATION_DATA.entities.map((entity) => (
                <p key={entity.id}>
                  <span
                    className={`font-semibold ${
                      entity.type === 'Thesis'
                        ? 'text-sky-700'
                        : entity.type === 'Claim'
                        ? 'text-teal-700'
                        : entity.type === 'Evidence'
                        ? 'text-amber-700'
                        : entity.type === 'Counter-Claim'
                        ? 'text-gray-600'
                        : 'text-indigo-700'
                    }`}
                    data-entity-id={entity.id}
                  >
                    [{entity.type}]
                  </span>{' '}
                  {entity.text}
                </p>
              ))}
            </div>
            <div className="text-center mt-6">
              <button
                id="analyzeBtn"
                className="bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-cyan-700 transition-colors shadow disabled:bg-gray-400"
                onClick={handleSimulationAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Begin Analysis'}
              </button>
            </div>
          </motion.section>

          {/* Step 2: Argument Knowledge Graph */}
          <AnimatePresence mode="wait">
            {(isAnalyzing || isAnalysisComplete) && (
              <motion.section
                key="sim-step2"
                id="sim-step2"
                className="step-card bg-white p-6 rounded-xl shadow-md border border-gray-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <div className="flex items-center mb-4">
                  <div className="bg-cyan-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <h3 className="text-2xl font-bold ml-4 text-gray-700">Argument Knowledge Graph</h3>
                </div>
                <p className="mb-4 text-gray-600">
                  The system constructs a Knowledge Graph to map the essay's structure. Nodes
                  represent concepts, and edges show their logical relationships. Hover over a node
                  to see its text and highlight connections.
                </p>
                <div
                  ref={graphContainerRef}
                  id="graph-container"
                  className="w-full h-[500px] bg-gray-100 rounded-lg border border-gray-200 relative"
                >
                  <canvas
                    id="knowledgeGraph"
                    ref={knowledgeGraphCanvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseOut={handleMouseOut}
                    className="w-full h-full"
                  />
                  {hoveredNode && (
                    <div
                      id="tooltip"
                      className="absolute bg-black bg-opacity-75 text-white text-sm rounded-md p-2 pointer-events-none transition-opacity duration-300 max-w-xs"
                      style={{
                        left: `${Math.min(hoveredNode.x + 15, (graphContainerRef.current?.clientWidth ?? 300) - 200)}px`,
                        top: `${hoveredNode.y + 15}px`,
                        opacity: 1,
                      }}
                    >
                      <span className="font-semibold">{hoveredNode.type}:</span> {hoveredNode.text}
                    </div>
                  )}
                </div>
                <div
                  id="legend"
                  className="flex justify-center items-center space-x-4 mt-4 text-sm text-gray-600 flex-wrap"
                >
                  {Object.entries(COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center">
                      <span
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: color }}
                      />
                      {type}
                    </div>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Step 3: Generated Insights */}
          <motion.section
            id="sim-step3"
            className={`step-card bg-white p-6 rounded-xl shadow-md border border-gray-200 transition-opacity duration-500 ${
              isAnalysisComplete ? 'visible opacity-100' : 'opacity-0 hidden'
            }`}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <div className="flex items-center mb-4">
              <div className="bg-cyan-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="text-2xl font-bold ml-4 text-gray-700">Generated Insights</h3>
            </div>
            <p className="mb-6 text-gray-600">
              By analyzing the Knowledge Graph, the system provides scores for key writing
              attributes. This goes beyond grammar to assess the quality of the argumentation
              itself, providing specific, actionable feedback for the teacher.
            </p>
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <h4 className="text-xl font-semibold mb-3 text-center text-gray-700">
                  Argument Strength
                </h4>
                <p className="text-sm text-gray-600 mb-4 text-center">
                  Measures how well each claim is supported by evidence. A higher bar indicates
                  stronger support.
                </p>
                <div className="relative w-full max-w-[600px] h-[350px] md:h-[400px] mx-auto">
                  <canvas id="strengthChart" ref={strengthChartRef} />
                </div>
              </div>
              <div className="space-y-8">
                <div>
                  <h4 className="text-xl font-semibold mb-3 text-gray-700">Coherence Score</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Measures how well all parts of the essay connect to the central thesis. A higher
                    score indicates a more unified argument.
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      id="coherenceBar"
                      className="bg-teal-500 h-6 rounded-full text-center text-white font-medium flex items-center justify-center transition-all duration-1000"
                      style={{ width: `${coherenceScore}%` }}
                    >
                      {coherenceScore}%
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-3 text-gray-700">Evidence Verification</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Checks provided evidence against an external knowledge base to assess its
                    validity.
                  </p>
                  <div className="overflow-x-auto">
                    <table id="evidenceTable" className="w-full text-sm text-left text-gray-600">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                          <th scope="col" className="px-4 py-2">
                            Evidence Statement
                          </th>
                          <th scope="col" className="px-4 py-2">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {evidenceTableData.map((row, index) => (
                          <tr key={index} className="bg-white border-b">
                            <td className="px-4 py-3">{row.text.substring(0, 40)}...</td>
                            <td className={`px-4 py-3 font-semibold ${row.statusColor}`}>
                              {row.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </main>
      </motion.div>
    </section>
  );
}

export default KnowledgeGraphSimulation;

