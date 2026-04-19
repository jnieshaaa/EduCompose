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
  Thesis: '#0891b2', // cyan-600
  Claim: '#0e7490', // cyan-700
  Evidence: '#f59e0b', // amber-500
  'Counter-Claim': '#64748b', // slate-500
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
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [coherenceScore, setCoherenceScore] = useState(0);
  const [strengthScores, setStrengthScores] = useState<{ label: string; score: number }[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  const knowledgeGraphCanvasRef = useRef<HTMLCanvasElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const strengthChartRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | undefined>(undefined);
  const graphNodes = useRef<GraphNode[]>([]);
  const graphEdges = useRef<GraphEdge[]>([]);
  const graphIterations = useRef(0);

  const evidenceTableData = useMemo(() => {
    const evidenceEntities = SIMULATION_DATA.entities.filter((e) => e.type === 'Evidence');
    return evidenceEntities.map((evidence) => {
      const verification = SIMULATION_DATA.knowledgeBase[evidence.id];
      const status = verification ? verification.status : 'Unverified';
      return {
        text: evidence.text,
        status: status,
        statusColor: status === 'Verified' ? 'text-emerald-600' : 'text-rose-600',
      };
    });
  }, []);

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
          queue.push(edge.target);
        }
      });
    }
    return Math.round((connectedCount / nodes.length) * 100);
  }, []);

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

    graphEdges.current.forEach((edge) => {
      const isHighlighted = hoveredNode && (edge.source.id === hoveredNode.id || edge.target.id === hoveredNode.id);
      ctx.beginPath();
      ctx.moveTo(edge.source.x, edge.source.y);
      ctx.lineTo(edge.target.x, edge.target.y);
      ctx.strokeStyle = isHighlighted ? '#0891b2' : '#e2e8f0';
      ctx.lineWidth = isHighlighted ? 2.5 : 1;
      ctx.stroke();
    });

    graphNodes.current.forEach((node) => {
      const isDimmed = hoveredNode && !connectedNodeIds.has(node.id);
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS[node.type];
      ctx.globalAlpha = isDimmed ? 0.3 : 1.0;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.globalAlpha = 1.0;
  }, [hoveredNode]);

  const runForceLayout = useCallback(() => {
    const attraction = 0.02, repulsion = 1000, damping = 0.95, maxIterations = 200;
    const nodes = graphNodes.current;
    const edges = graphEdges.current;
    const canvas = knowledgeGraphCanvasRef.current;
    if (!canvas) return;

    const update = () => {
      if (graphIterations.current > maxIterations) {
        drawGraph();
        return;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i], nodeB = nodes[j];
          const dx = nodeB.x - nodeA.x, dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const force = repulsion / (distance * distance);
          nodeA.vx -= force * (dx / distance);
          nodeA.vy -= force * (dy / distance);
          nodeB.vx += force * (dx / distance);
          nodeB.vy += force * (dy / distance);
        }
      }
      edges.forEach((edge) => {
        const dx = edge.target.x - edge.source.x, dy = edge.target.y - edge.source.y;
        edge.source.vx += dx * attraction;
        edge.source.vy += dy * attraction;
        edge.target.vx -= dx * attraction;
        edge.target.vy -= dy * attraction;
      });
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

  const initGraph = useCallback(() => {
    const canvas = knowledgeGraphCanvasRef.current;
    if (!canvas) return;
    graphIterations.current = 0;
    graphNodes.current = SIMULATION_DATA.entities.map((e) => ({
      ...e,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: 0,
      vy: 0,
      radius: e.type === 'Thesis' ? 24 : 18,
    }));
    graphEdges.current = SIMULATION_DATA.relations.map((r) => ({
      source: graphNodes.current.find((n) => n.id === r.source)!,
      target: graphNodes.current.find((n) => n.id === r.target)!,
      label: r.label,
    }));
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    runForceLayout();
  }, [runForceLayout]);

  const runAnalysis = useCallback(() => {
    const claims = SIMULATION_DATA.entities.filter((e) => e.type === 'Claim');
    const scores = claims.map((claim) => {
      const evidenceCount = SIMULATION_DATA.relations.filter(
        (r) => r.target === claim.id && SIMULATION_DATA.entities.find((e) => e.id === r.source)?.type === 'Evidence'
      ).length;
      return {
        label: `Claim: "${claim.text.substring(0, 30)}..."`,
        score: evidenceCount * 50 + 50,
      };
    });
    setStrengthScores(scores);
    setCoherenceScore(calculateCoherence());
    setIsAnalysisComplete(true);
  }, [calculateCoherence]);

  const handleResize = useCallback((entry: ResizeObserverEntry) => {
    const canvas = knowledgeGraphCanvasRef.current;
    if (!canvas) return;
    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;
      if (graphNodes.current.length > 0) {
        graphNodes.current.forEach((node) => {
          node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
          node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
        });
        drawGraph();
      }
    }
  }, [drawGraph]);

  useResizeObserver(graphContainerRef, handleResize);

  const handleSimulationAnalyze = () => {
    setIsAnalyzing(true);
    setIsAnalysisComplete(false);
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
    }, 2000);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
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
    if (graphIterations.current > 200) drawGraph();
  }, [drawGraph]);

  useEffect(() => {
    const ctx = strengthChartRef.current?.getContext('2d');
    let chart: Chart<'bar'> | undefined;
    if (ctx && strengthScores.length > 0) {
      chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: strengthScores.map((s) => s.label),
          datasets: [{
            label: 'Strength Score',
            data: strengthScores.map((s) => s.score),
            backgroundColor: '#0891b2',
            borderRadius: 8,
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { font: { size: 10 } } },
          },
          plugins: { legend: { display: false } },
        },
      });
    }
    return () => chart?.destroy();
  }, [strengthScores]);

  return (
    <div className="space-y-12">
      {/* Simulation Stepper */}
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex items-center gap-4 mb-6">
                <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">1</span>
                <div>
                   <h3 className="font-bold text-slate-800 text-xl tracking-tight">The Student Essay</h3>
                   <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Initial Data Source</p>
                </div>
             </div>
             
             <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm max-h-[400px] overflow-y-auto custom-scrollbar">
                <h4 className="font-bold text-center mb-4 text-slate-700">The Urgency of Renewable Energy Adoption</h4>
                <div className="space-y-4 text-sm leading-relaxed text-slate-600">
                  {SIMULATION_DATA.entities.map((entity) => (
                    <p key={entity.id}>
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase mr-2 ${
                        entity.type === 'Thesis' ? 'bg-cyan-100 text-cyan-700' :
                        entity.type === 'Claim' ? 'bg-blue-100 text-blue-700' :
                        entity.type === 'Evidence' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {entity.type}
                      </span>
                      {entity.text}
                    </p>
                  ))}
                </div>
             </div>

             <button
                className="w-full mt-6 bg-primary text-white font-bold py-4 px-6 rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                onClick={handleSimulationAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing Essay...
                  </span>
                ) : 'Run Writing Analytics'}
              </button>
          </div>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            {!isAnalyzing && !isAnalysisComplete ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-[550px] bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-12"
              >
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                   <span className="text-4xl">🚀</span>
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">Ready for Simulation</h4>
                <p className="text-slate-500 text-sm">Click "Run Writing Analytics" to deconstruct the essay into a semantic Knowledge Graph.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="active"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-4 left-6 z-10">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Logical Mapping</p>
                      <h3 className="text-white font-bold">Argument Knowledge Graph</h3>
                   </div>
                   
                   <div ref={graphContainerRef} className="h-[450px] w-full rounded-[2rem] bg-slate-800/50 relative">
                      <canvas
                        ref={knowledgeGraphCanvasRef}
                        onMouseMove={handleMouseMove}
                        onMouseOut={() => setHoveredNode(null)}
                        className="w-full h-full cursor-crosshair"
                      />
                      {hoveredNode && (
                        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl pointer-events-none max-w-[250px] transition-all">
                          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">{hoveredNode.type}</p>
                          <p className="text-xs text-white/90 leading-relaxed font-medium">"{hoveredNode.text}"</p>
                        </div>
                      )}
                   </div>

                   <div className="mt-4 flex flex-wrap gap-4 px-4 pb-2 justify-center">
                     {Object.entries(COLORS).map(([type, color]) => (
                       <div key={type} className="flex items-center gap-2 text-[10px] font-bold text-white/60 uppercase tracking-wider">
                         <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                         {type}
                       </div>
                     ))}
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isAnalysisComplete && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-8"
          >
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl overflow-hidden relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-full blur-3xl -mr-16 -mt-16" />
               <div className="flex items-center gap-4 mb-8">
                  <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">2</span>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xl tracking-tight">Coherence & Strength</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Generated Assessment</p>
                  </div>
               </div>

               <div className="space-y-10">
                  <div>
                    <div className="flex justify-between items-end mb-3">
                       <p className="text-sm font-bold text-slate-700 tracking-tight">Overall Coherence Score</p>
                       <p className="text-2xl font-black text-primary">{coherenceScore}%</p>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${coherenceScore}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="bg-gradient-to-r from-primary to-cyan-500 h-full rounded-full"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 italic leading-relaxed">
                       *Logic Analysis: {coherenceScore > 70 ? 'High logical unity detected.' : 'Some fragmented claims identified.'}
                    </p>
                  </div>

                  <div className="h-[300px]">
                      <p className="text-sm font-bold text-slate-700 tracking-tight mb-4 text-center">Claim Support Strength</p>
                      <canvas ref={strengthChartRef} />
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl flex flex-col">
               <div className="flex items-center gap-4 mb-8">
                  <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">3</span>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xl tracking-tight">Evidence Verification</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Cross-Reference Layer</p>
                  </div>
               </div>

               <div className="flex-1 space-y-4">
                  {evidenceTableData.map((row, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-6"
                    >
                      <p className="text-xs font-medium text-slate-600 leading-normal">"{row.text.substring(0, 80)}..."</p>
                      <div className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shrink-0 shadow-sm ${
                        row.status === 'Verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {row.status}
                      </div>
                    </motion.div>
                  ))}
               </div>

               <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                  <p className="text-sm text-slate-400 font-medium">
                     Simulated analysis complete. 
                  </p>
                  <p className="text-[11px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-2">EduCompose x Laguna University</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default KnowledgeGraphSimulation;

