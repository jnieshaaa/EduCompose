import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Upload, FileText, Eye } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useInView,
  useAnimation,
} from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import HeaderPublic from "../components/HeaderPublic";
import AuthModal from "../components/LoginModal";
import TextAnalysisModal from "../components/essay/TextAnalysisModal";

const MIN_WORDS = 150;

// --- About Page Interfaces and Constants ---
interface Entity {
  id: number;
  text: string;
  type: "Thesis" | "Claim" | "Evidence" | "Counter-Claim" | "Rebuttal";
}

interface Relation {
  source: number;
  target: number;
  label: string;
}

interface KnowledgeBaseEntry {
  status: "Verified" | "Unverified";
  source: string;
}

interface SimulationData {
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

const SIMULATION_DATA: SimulationData = {
  entities: [
    {
      id: 0,
      text: "To mitigate... a global transition to renewable energy... is imperative.",
      type: "Thesis",
    },
    {
      id: 1,
      text: "The primary driver of climate change is... burning fossil fuels.",
      type: "Claim",
    },
    {
      id: 2,
      text: "The IPCC has reported... over 75% of global greenhouse gas emissions.",
      type: "Evidence",
    },
    {
      id: 3,
      text: "Renewable energy sources... produce little to no greenhouse gas emissions.",
      type: "Claim",
    },
    {
      id: 4,
      text: "NREL: wind turbines have a carbon footprint 99% less than coal.",
      type: "Evidence",
    },
    {
      id: 5,
      text: "Some argue that renewable energy is unreliable...",
      type: "Counter-Claim",
    },
    {
      id: 6,
      text: "Advancements in battery storage... are solving these issues.",
      type: "Rebuttal",
    },
  ],
  relations: [
    { source: 1, target: 0, label: "supports" },
    { source: 3, target: 0, label: "supports" },
    { source: 2, target: 1, label: "provides_evidence_for" },
    { source: 4, target: 3, label: "provides_evidence_for" },
    { source: 5, target: 3, label: "challenges" },
    { source: 6, target: 5, label: "rebuts" },
  ],
  knowledgeBase: {
    2: { status: "Verified", source: "IPCC AR6 Report" },
    4: { status: "Verified", source: "NREL Life Cycle Assessment" },
  },
};

const COLORS: Record<Entity["type"], string> = {
  Thesis: "#38bdf8", // sky-400
  Claim: "#14b8a6", // teal-500
  Evidence: "#f59e0b", // amber-500
  "Counter-Claim": "#6b7280", // gray-500
  Rebuttal: "#6366f1", // indigo-500
};

const LandingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  // Show login modal if redirected from a protected route
  useEffect(() => {
    if (location.state?.from) {
      setShowLogin(true);
    }
    // Restore text if navigating back from AnalysisResults
    if (location.state?.text) {
      setText(location.state.text);
    }
  }, [location.state]);
  const [showTextAnalysisModal, setShowTextAnalysisModal] = useState(false);

  // --- About Page State Management ---
  const [activeTechStep, setActiveTechStep] = useState<
    "nlp" | "kg" | "llm" | null
  >(null);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [coherenceScore, setCoherenceScore] = useState(0);
  const [strengthScores, setStrengthScores] = useState<
    { label: string; score: number }[]
  >([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // --- About Page Ref Management ---
  const teacherWorkloadChartRef = useRef<HTMLCanvasElement>(null);
  const strengthChartRef = useRef<HTMLCanvasElement>(null);
  const knowledgeGraphCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | undefined>(undefined);
  const graphNodes = useRef<GraphNode[]>([]);
  const graphEdges = useRef<GraphEdge[]>([]);
  const graphIterations = useRef(0);
  const chartInstanceRef = useRef<Chart<"doughnut"> | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chartScaleRef = useRef<HTMLDivElement>(null);
  const chartScaleControls = useAnimation();
  const isChartScaleInView = useInView(chartScaleRef, { amount: 0.3 });

  // Essay box animation
  const essayBoxRef = useRef<HTMLDivElement>(null);
  const essayBoxControls = useAnimation();
  const isEssayBoxInView = useInView(essayBoxRef, { once: false, amount: 0.3 });

  // Tech steps animation refs and controls
  const techStepsRef = useRef<HTMLDivElement>(null);
  const isTechStepsInView = useInView(techStepsRef, {
    once: false,
    amount: 0.3,
  });
  const techStep1Controls = useAnimation();
  const techStep2Controls = useAnimation();
  const techStep3Controls = useAnimation();
  const techStep4Controls = useAnimation();

  // Gap section animation refs and controls
  const gapSectionRef = useRef<HTMLDivElement>(null);
  const isGapSectionInView = useInView(gapSectionRef, { amount: 0.3 });
  const gapTitleControls = useAnimation();
  const gapItem1Controls = useAnimation();
  const gapItem2Controls = useAnimation();
  const gapItem3Controls = useAnimation();

  // Chart scale animation - scales in when entering view, resets when out of view
  useEffect(() => {
    if (isChartScaleInView) {
      chartScaleControls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.25, ease: "easeOut" },
      });
    } else {
      chartScaleControls.set({ scale: 0.7, opacity: 0 });
    }
  }, [isChartScaleInView, chartScaleControls]);

  // Essay box animation - animates once when in view, fades out when leaving
  useEffect(() => {
    if (isEssayBoxInView) {
      essayBoxControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: "easeOut" },
      });
    } else {
      essayBoxControls.start({
        opacity: 0,
        transition: { duration: 0.5, ease: "easeOut" },
      });
    }
  }, [isEssayBoxInView, essayBoxControls]);

  // Tech steps animation - scales down when in view, resets instantly when out
  useEffect(() => {
    if (isTechStepsInView) {
      techStep1Controls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, delay: 0, ease: "easeOut" },
      });
      techStep2Controls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, delay: 0.15, ease: "easeOut" },
      });
      techStep3Controls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, delay: 0.3, ease: "easeOut" },
      });
      techStep4Controls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, delay: 0.45, ease: "easeOut" },
      });
    } else {
      techStep1Controls.set({ scale: 1.15, opacity: 0 });
      techStep2Controls.set({ scale: 1.15, opacity: 0 });
      techStep3Controls.set({ scale: 1.15, opacity: 0 });
      techStep4Controls.set({ scale: 1.15, opacity: 0 });
    }
  }, [
    isTechStepsInView,
    techStep1Controls,
    techStep2Controls,
    techStep3Controls,
    techStep4Controls,
  ]);

  // Gap section staggered animation - only animates forward, resets when out of view
  useEffect(() => {
    if (isGapSectionInView) {
      gapTitleControls.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, ease: "easeOut" },
      });
      gapItem1Controls.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, delay: 0.1, ease: "easeOut" },
      });
      gapItem2Controls.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, delay: 0.25, ease: "easeOut" },
      });
      gapItem3Controls.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, delay: 0.4, ease: "easeOut" },
      });
    } else {
      gapTitleControls.set({ opacity: 0, x: -50 });
      gapItem1Controls.set({ opacity: 0, x: -30 });
      gapItem2Controls.set({ opacity: 0, x: -30 });
      gapItem3Controls.set({ opacity: 0, x: -30 });
    }
  }, [
    isGapSectionInView,
    gapTitleControls,
    gapItem1Controls,
    gapItem2Controls,
    gapItem3Controls,
  ]);

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const charCount = text.length;

  // Determine button text and behavior
  const showViewResult = false; // Always show analyze button

  const handleAnalyze = async () => {
    if (!text.trim()) {
      // Show error in a simple way or just return
      return;
    }

    // Navigate to AnalysisResults page with text in state
    // The loading will happen on the AnalysisResults page
    navigate("/AnalysisResults", {
      state: {
        text: text,
        title: "Essay Analysis",
      },
    });
  };

  const handleViewResult = () => {
    // Open the modal to view results
    if (text.trim()) {
      setShowTextAnalysisModal(true);
    }
  };

  // --- About Page Functions ---

  // Tech Details Interaction
  const handleTechStepClick = (step: "nlp" | "kg" | "llm") => {
    setActiveTechStep(step);
  };

  // Calculate Coherence Score
  const calculateCoherence = useCallback((): number => {
    const nodes = graphNodes.current;
    const edges = graphEdges.current;
    const thesis = nodes.find((n) => n.type === "Thesis");
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const connectedNodeIds = new Set<number>();
    if (hoveredNode) {
      connectedNodeIds.add(hoveredNode.id);
      graphEdges.current.forEach((edge) => {
        if (edge.source.id === hoveredNode.id)
          connectedNodeIds.add(edge.target.id);
        if (edge.target.id === hoveredNode.id)
          connectedNodeIds.add(edge.source.id);
      });
    }

    // Draw Edges
    graphEdges.current.forEach((edge) => {
      const isHighlighted =
        hoveredNode &&
        (edge.source.id === hoveredNode.id ||
          edge.target.id === hoveredNode.id);
      ctx.beginPath();
      ctx.moveTo(edge.source.x, edge.source.y);
      ctx.lineTo(edge.target.x, edge.target.y);
      ctx.strokeStyle = isHighlighted ? "#0284c7" : "#94a3b8";
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
      ctx.strokeStyle = "#e2e8f0";
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
        node.x = Math.max(
          node.radius,
          Math.min(canvas.width - node.radius, node.x)
        );
        node.y = Math.max(
          node.radius,
          Math.min(canvas.height - node.radius, node.y)
        );
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
      radius: e.type === "Thesis" ? 20 : 15,
    }));

    // Init edges
    graphEdges.current = SIMULATION_DATA.relations.map((r) => ({
      source: graphNodes.current.find((n) => n.id === r.source)!,
      target: graphNodes.current.find((n) => n.id === r.target)!,
      label: r.label,
    }));

    if (animationFrameId.current)
      cancelAnimationFrame(animationFrameId.current);
    runForceLayout();
  }, [runForceLayout]);

  // Analysis Logic (run after graph simulation starts)
  const runAnalysis = useCallback(() => {
    // 1. Calculate Strength Scores
    const claims = SIMULATION_DATA.entities.filter((e) => e.type === "Claim");
    const scores = claims.map((claim) => {
      const evidenceCount = SIMULATION_DATA.relations.filter(
        (r) =>
          r.target === claim.id &&
          SIMULATION_DATA.entities.find((e) => e.id === r.source)?.type ===
            "Evidence"
      ).length;
      // Simplified scoring: 50 for being a claim, +50 for one piece of evidence
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

  // Handle Simulation Analysis Start Button Click
  const handleSimulationAnalyze = () => {
    setIsAnalyzing(true);
    setIsAnalysisComplete(false); // Reset state

    setTimeout(() => {
      // Resize canvas after container is rendered
      const canvas = knowledgeGraphCanvasRef.current;
      if (canvas) {
        const container = canvas.parentElement;
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        }
      }
      initGraph();
    }, 600);
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
        drawGraph(); // Redraw on hover change if simulation is stopped
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

  // Evidence Verification Table Data
  const evidenceTableData = useMemo(() => {
    const evidenceEntities = SIMULATION_DATA.entities.filter(
      (e) => e.type === "Evidence"
    );
    return evidenceEntities.map((evidence) => {
      const verification = SIMULATION_DATA.knowledgeBase[evidence.id];
      const status = verification ? verification.status : "Unverified";
      return {
        text: evidence.text,
        status: status,
        statusColor: status === "Verified" ? "text-green-600" : "text-red-600",
      };
    });
  }, []);

  // --- About Page useEffect Hooks ---

  // Track current section and scroll position
  useEffect(() => {
    const heroElement = document.getElementById("hero");
    const challengeElement = document.getElementById("challenge");

    if (!heroElement || !challengeElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const currentSection =
              entry.target.id === "hero" ? "hero" : "about";
            sessionStorage.setItem("currentSection", currentSection);
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: "0px",
      }
    );

    observer.observe(heroElement);
    observer.observe(challengeElement);

    // Save scroll position when in about section (throttled)
    const handleScroll = () => {
      if (scrollTimeoutRef.current) return;

      scrollTimeoutRef.current = setTimeout(() => {
        const savedSection = sessionStorage.getItem("currentSection");
        if (savedSection === "about") {
          sessionStorage.setItem("scrollPosition", window.scrollY.toString());
        }
        scrollTimeoutRef.current = null;
      }, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle scroll restoration on page load/refresh
  useEffect(() => {
    // Prevent browser from automatically restoring scroll position
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    // Check if we were in the about section before refresh
    const previousSection = sessionStorage.getItem("currentSection");
    const savedScrollPosition = sessionStorage.getItem("scrollPosition");

    if (previousSection === "about" && savedScrollPosition) {
      // Restore scroll position for about section
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition, 10));
      }, 0);
    } else {
      // Scroll to top for hero section or first visit
      window.scrollTo(0, 0);
      sessionStorage.removeItem("currentSection");
      sessionStorage.removeItem("scrollPosition");
    }
  }, []);

  // Chart.js Initialization for Teacher Workload
  useEffect(() => {
    const ctx = teacherWorkloadChartRef.current?.getContext("2d");
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    if (isChartScaleInView) {
      chartInstanceRef.current = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: [
            "Grading & Feedback",
            "Lesson Planning",
            "Instruction",
            "Administrative Tasks",
          ],
          datasets: [
            {
              label: "Time Allocation",
              data: [45, 25, 20, 10],
              backgroundColor: ["#0891b2", "#0e7490", "#67e8f9", "#a5f3fc"],
              borderColor: "#F8F9FA",
              borderWidth: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1200,
            delay: 250,
            easing: "easeOutQuart",
          },
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#343A40",
                font: { family: "'Inter', sans-serif" },
              },
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  let label = context.label || "";
                  if (label) {
                    label += ": ";
                  }
                  if (context.parsed !== null) {
                    label += context.parsed + "%";
                  }
                  return label;
                },
              },
            },
          },
          cutout: "60%",
        },
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isChartScaleInView]);

  // Strength Chart (Bar Chart)
  useEffect(() => {
    const ctx = strengthChartRef.current?.getContext("2d");
    let chart: Chart<"bar"> | undefined;

    if (ctx && strengthScores.length > 0) {
      chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: strengthScores.map((s) => s.label),
          datasets: [
            {
              label: "Strength Score",
              data: strengthScores.map((s) => s.score),
              backgroundColor: "#14b8a6", // teal-500
              borderColor: "#0f766e", // teal-700
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "y",
          scales: {
            x: { beginAtZero: true, max: 100, grid: { color: "#e5e7eb" } },
            y: { grid: { display: false } },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (context) =>
                  context[0].label.split('"')[1] ?? "Argument Strength",
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

  // Scroll Observer for Navigation
  useEffect(() => {
    const sections = document.querySelectorAll("main section");
    const navLinks = document.querySelectorAll(".nav-link");
    const observerOptions = { root: null, rootMargin: "0px", threshold: 0.4 };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach((link) => {
            link.classList.toggle(
              "active",
              link.getAttribute("href") === `#${id}`
            );
          });
        }
      });
    }, observerOptions);

    sections.forEach((section) => {
      sectionObserver.observe(section);
    });

    return () => {
      sections.forEach((section) => sectionObserver.unobserve(section));
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <HeaderPublic onLoginClick={() => setShowLogin(true)} />
      {showLogin && <AuthModal onClose={() => setShowLogin(false)} />}

      {/* Hero Section */}
      <div id="hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="mx-auto px-4 lg:px-6 xl:px-8">
            <div className="flex flex-col items-center justify-center gap-3 lg:gap-3 w-full max-w-[90vw] my-10 m-auto">
              <motion.div
                ref={essayBoxRef}
                initial={{ opacity: 0, y: 30 }}
                animate={essayBoxControls}
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl mx-auto h-[70vh] mb-5 flex flex-col"
              >
                <div className="relative flex-1">
                  <textarea
                    placeholder="Paste your essay here to get started..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full h-full border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none outline-none text-lg leading-relaxed px-2 py-3"
                    style={{
                      overflowY: "auto",
                    }}
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                  <div className="px-3 py-2 rounded text-sm">
                    <span
                      className={`font-semibold ${
                        wordCount >= MIN_WORDS
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {wordCount}
                    </span>
                    <span className="text-gray-500"> Words </span>
                    <span className="text-gray-500">
                      {charCount} Characters
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <label className="hover:bg-support/20 text-gray-700 font-semibold px-6 py-2.5 rounded-full transition-all cursor-pointer flex items-center gap-2 text-sm">
                      <Upload className="w-4 h-4" />
                      Upload
                      <input
                        type="file"
                        accept=".txt,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            setText(content);
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>

                    <button
                      onClick={
                        showViewResult ? handleViewResult : handleAnalyze
                      }
                      className={`font-semibold px-6 py-2.5 rounded-full transition-all duration-300 flex items-center gap-2 text-sm ${
                        !showViewResult && wordCount < MIN_WORDS
                          ? "bg-neutral-300/50"
                          : "bg-primary text-white transform hover:bg-primary-100 hover:shadow-lg "
                      }`}
                    >
                      {showViewResult ? (
                        <>
                          <Eye className="w-4 h-4" />
                          View Result
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          Analyze Essay
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Text Analysis Modal for word requirement guide */}
              <TextAnalysisModal
                isOpen={showTextAnalysisModal}
                onClose={() => setShowTextAnalysisModal(false)}
                text={text}
                title="Essay Analysis"
              />

              {/* Hero Section Description */}
              <motion.div
                id="hero-bottom"
                className="container mx-auto px-6 text-center mt-6"
                initial={{ opacity: 0 }}
                animate={essayBoxControls}
              >
                <p className="text-xl md:text-2xl">
                  Knowledge Graph–Enhanced NLP for Teacher-Assisted Essay
                  Evaluation
                </p>
                <p className="mt-4 max-w-3xl mx-auto text-lg">
                  Empowering educators with AI-driven insights to provide
                  deeper, more effective feedback on student writing, without
                  replacing the human touch.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* About Page Sections */}
      <main>
        {/* Challenge Section */}
        <section id="challenge" className="py-16 md:py-24 bg-gray-50">
          <motion.div
            className="container mx-auto px-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                The Challenge: An Unsustainable Workload
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                Essay evaluation is crucial for learning but places an immense
                burden on teachers, making personalized and consistent feedback
                a significant challenge.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div ref={gapSectionRef}>
                <motion.h3
                  className="text-2xl font-semibold mb-4"
                  initial={{ opacity: 0, x: -50 }}
                  animate={gapTitleControls}
                >
                  The Gap in Current Tools
                </motion.h3>
                <ul className="space-y-4 text-gray-700">
                  <motion.li
                    className="flex items-start"
                    initial={{ opacity: 0, x: -30 }}
                    animate={gapItem1Controls}
                  >
                    <span className="text-cyan-500 font-bold mr-3 mt-1">✓</span>
                    <div>
                      <strong className="text-gray-800">
                        Student-Facing Focus:
                      </strong>{" "}
                      Tools like Grammarly are designed for students, risking AI
                      over-reliance and bypassing the teacher's instructional
                      role.
                    </div>
                  </motion.li>
                  <motion.li
                    className="flex items-start"
                    initial={{ opacity: 0, x: -30 }}
                    animate={gapItem2Controls}
                  >
                    <span className="text-cyan-500 font-bold mr-3 mt-1">✓</span>
                    <div>
                      <strong className="text-gray-800">
                        Surface-Level Feedback:
                      </strong>{" "}
                      Most tools excel at grammar and spelling but fail to
                      analyze higher-order skills like argument strength,
                      coherence, and clarity.
                    </div>
                  </motion.li>
                  <motion.li
                    className="flex items-start"
                    initial={{ opacity: 0, x: -30 }}
                    animate={gapItem3Controls}
                  >
                    <span className="text-cyan-500 font-bold mr-3 mt-1">✓</span>
                    <div>
                      <strong className="text-gray-800">
                        Lack of Instructional Insight:
                      </strong>{" "}
                      Existing software doesn't provide teachers with analytics
                      on class-wide weaknesses, which is vital for targeted
                      instruction.
                    </div>
                  </motion.li>
                </ul>
              </div>
              <motion.div
                ref={chartScaleRef}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={chartScaleControls}
              >
                <div
                  id="chart-container"
                  className="bg-white p-6 rounded-lg shadow-lg"
                >
                  <h3 className="text-xl font-semibold text-center mb-4">
                    Typical Teacher Time Allocation per Essay Batch
                  </h3>
                  <div className="relative w-full max-w-[400px] h-[300px] md:h-[350px] mx-auto">
                    <canvas
                      id="teacherWorkloadChart"
                      ref={teacherWorkloadChartRef}
                    ></canvas>
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Automating the initial analysis allows teachers to shift
                    their focus from repetitive error-checking to high-impact
                    mentoring.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Solution Section */}
        <section id="solution" className="bg-white py-16 md:py-24">
          <motion.div
            className="container mx-auto px-6 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                Our Solution: A Teacher-Centered Approach
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                EduCompose is not another grammar checker. It's an analytical
                partner for educators, designed to enhance their expertise and
                streamline their workflow.
              </p>
            </motion.div>
            <div className="mt-12 grid md:grid-cols-3 gap-8">
              <motion.div
                className="bg-gray-50 p-8 rounded-lg border border-gray-200"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="text-3xl text-cyan-600 mb-4">🎯</div>
                <h3 className="text-xl font-semibold mb-2">
                  Augment, Not Automate
                </h3>
                <p className="text-gray-600">
                  The system generates analytical reports on student writing,
                  highlighting potential areas for improvement. The final
                  feedback and guidance always come from the teacher.
                </p>
              </motion.div>
              <motion.div
                className="bg-cyan-50 p-8 rounded-lg border border-cyan-200 ring-2 ring-cyan-500"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
              >
                <div className="text-3xl text-cyan-600 mb-4">🚀</div>
                <h3 className="text-xl font-semibold mb-2">
                  Enhance Efficiency
                </h3>
                <p className="text-gray-600">
                  By automating the first-pass analysis of grammar, readability,
                  and logical flow, EduCompose saves teachers hours of grading
                  time, freeing them to focus on mentoring.
                </p>
              </motion.div>
              <motion.div
                className="bg-gray-50 p-8 rounded-lg border border-gray-200"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
              >
                <div className="text-3xl text-cyan-600 mb-4">🎓</div>
                <h3 className="text-xl font-semibold mb-2">
                  Preserve Educational Value
                </h3>
                <p className="text-gray-600">
                  We ensure students receive authentic, human feedback. The tool
                  supports the teacher-student relationship rather than
                  inserting AI between them.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section id="tech" className="py-16 md:py-24">
          <motion.div
            className="container mx-auto px-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                How It Works: The Technology Stack
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                EduCompose integrates multiple AI technologies to perform a
                multi-layered analysis of student essays. Click on each step
                below to learn more about the tools and processes involved.
              </p>
            </motion.div>

            <div
              ref={techStepsRef}
              className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4 mb-8"
            >
              <motion.div
                id="step-nlp"
                className={`process-step text-center p-4 border-2 rounded-lg bg-white w-full md:w-1/4 transition-all duration-300 ${
                  activeTechStep === "nlp"
                    ? "active bg-support-superlight/35 border-primary-100 transform scale-105"
                    : "border-gray-300 cursor-pointer"
                }`}
                onClick={() => handleTechStepClick("nlp")}
                initial={{ scale: 1.15, opacity: 0 }}
                animate={techStep1Controls}
              >
                <h4 className="font-semibold">1. NLP Analysis</h4>
                <p className="text-sm text-gray-500">Grammar & Readability</p>
              </motion.div>
              <div className="text-2xl text-gray-400 font-light hidden md:block">
                →
              </div>
              <motion.div
                id="step-kg"
                className={`process-step text-center p-4 border-2 rounded-lg bg-white w-full md:w-1/4 transition-all duration-300 ${
                  activeTechStep === "kg"
                    ? "active bg-support-superlight/35 border-primary-100 transform scale-105"
                    : "border-gray-300 cursor-pointer"
                }`}
                onClick={() => handleTechStepClick("kg")}
                initial={{ scale: 1.15, opacity: 0 }}
                animate={techStep2Controls}
              >
                <h4 className="font-semibold">2. Knowledge Graph</h4>
                <p className="text-sm text-gray-500">Coherence & Argument</p>
              </motion.div>
              <div className="text-2xl text-gray-400 font-light hidden md:block">
                →
              </div>
              <motion.div
                id="step-llm"
                className={`process-step text-center p-4 border-2 rounded-lg bg-white w-full md:w-1/4 transition-all duration-300 ${
                  activeTechStep === "llm"
                    ? "active bg-support-superlight/35 border-primary-100 transform scale-105"
                    : "border-gray-300 cursor-pointer"
                }`}
                onClick={() => handleTechStepClick("llm")}
                initial={{ scale: 1.15, opacity: 0 }}
                animate={techStep3Controls}
              >
                <h4 className="font-semibold">3. Insight Generation</h4>
                <p className="text-sm text-gray-500">Synthesis with LLMs</p>
              </motion.div>
              <div className="text-2xl text-gray-400 font-light hidden md:block">
                →
              </div>
              <motion.div
                className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-100 w-full md:w-1/4"
                initial={{ scale: 1.15, opacity: 0 }}
                animate={techStep4Controls}
              >
                <h4 className="font-semibold">4. Teacher Report</h4>
                <p className="text-sm text-gray-500">Actionable Insights</p>
              </motion.div>
            </div>

            <motion.div
              id="tech-details"
              className="mt-8 bg-white p-8 rounded-lg shadow-inner max-w-4xl mx-auto border border-gray-200"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.8, ease: "easeOut" }}
            >
              <AnimatePresence mode="wait">
                {activeTechStep === "nlp" && (
                  <motion.div
                    key="nlp"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-2xl font-semibold mb-3">
                      Natural Language Processing (NLP) Modules
                    </h3>
                    <p className="mb-4">
                      This is the foundational layer. We use established NLP
                      libraries to perform a "surface-level" check, identifying
                      objective issues in writing mechanics.
                    </p>
                    <ul className="list-disc list-inside space-y-2">
                      <li>
                        <strong>Grammar & Syntax Analysis:</strong> Using
                        libraries like spaCy, the system identifies grammatical
                        errors and awkward phrasing.
                      </li>
                      <li>
                        <strong>Readability Scores:</strong> We calculate
                        metrics like Flesch-Kincaid to assess writing
                        complexity.
                      </li>
                      <li>
                        <strong>Topic Modeling:</strong> Techniques like LDA
                        help identify the main topics, checking for prompt
                        relevance.
                      </li>
                    </ul>
                  </motion.div>
                )}
                {activeTechStep === "kg" && (
                  <motion.div
                    key="kg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-2xl font-semibold mb-3">
                      Knowledge Graph (KG) Integration
                    </h3>
                    <p className="mb-4">
                      This is our key innovation. KGs help us analyze the
                      *meaning* and *connections* between concepts, which is
                      vital for evaluating argument strength.
                    </p>
                    <ul className="list-disc list-inside space-y-2">
                      <li>
                        <strong>Conceptual Coherence:</strong> We map essay
                        terms to a KG (like ConceptNet) to measure logical
                        distance between ideas. Large jumps may indicate a lack
                        of coherence.
                      </li>
                      <li>
                        <strong>Argument Connection Analysis:</strong> The
                        system traces relationships between claims and evidence.
                        Weak or missing connections signify a poorly supported
                        argument.
                      </li>
                    </ul>
                  </motion.div>
                )}
                {activeTechStep === "llm" && (
                  <motion.div
                    key="llm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-2xl font-semibold mb-3">
                      Insight Generation with Large Language Models (LLMs)
                    </h3>
                    <p className="mb-4">
                      An LLM synthesizes the structured data from the NLP and KG
                      modules into a human-readable summary for the teacher.
                    </p>
                    <ul className="list-disc list-inside space-y-2">
                      <li>
                        <strong>Synthesizing Findings:</strong> The LLM
                        translates raw data (e.g., "5 passive voice instances")
                        into descriptive summaries ("The student frequently uses
                        passive voice...").
                      </li>
                      <li>
                        <strong>Highlighting Patterns:</strong> It can identify
                        recurring issues across a batch of essays, providing
                        class-wide insights.
                      </li>
                      <li>
                        <strong>Controlled Generation:</strong> The LLM only
                        summarizes pre-analyzed data, ensuring the output is
                        grounded and reliable.
                      </li>
                    </ul>
                  </motion.div>
                )}
                {activeTechStep === null && (
                  <motion.div
                    key="placeholder"
                    id="desc-placeholder"
                    className="text-center text-gray-500"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p>
                      Select a process step above to see the technical details.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </section>

        {/* Simulation Section */}
        <section id="simulation" className="bg-white py-16 md:py-24">
          <motion.div
            className="container mx-auto px-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.header
              className="text-center mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                Live Simulation: From Essay to Insight
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                This simulation demonstrates how EduCompose deconstructs an
                essay to analyze its argumentative structure using a Knowledge
                Graph.
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
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <div className="flex items-center mb-4">
                  <div className="bg-cyan-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <h3 className="text-2xl font-bold ml-4 text-gray-700">
                    The Student Essay
                  </h3>
                </div>
                <p className="mb-4 text-gray-600">
                  This section contains the sample essay to be analyzed. The
                  system will deconstruct this text to identify the core claims,
                  supporting evidence, and the main thesis. Click the button
                  below to begin the analysis.
                </p>
                <div
                  id="essayContainer"
                  className="bg-gray-100 p-4 rounded-lg border border-gray-200 text-gray-700 space-y-3"
                >
                  <h4 className="font-bold text-center">
                    The Urgency of Renewable Energy Adoption
                  </h4>
                  {SIMULATION_DATA.entities.map((entity) => (
                    <p key={entity.id}>
                      <span
                        className={`font-semibold ${
                          entity.type === "Thesis"
                            ? "text-sky-700"
                            : entity.type === "Claim"
                            ? "text-teal-700"
                            : entity.type === "Evidence"
                            ? "text-amber-700"
                            : entity.type === "Counter-Claim"
                            ? "text-gray-600"
                            : "text-indigo-700"
                        }`}
                        data-entity-id={entity.id}
                      >
                        [{entity.type}]
                      </span>{" "}
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
                    {isAnalyzing ? "Analyzing..." : "Begin Analysis"}
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
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <div className="flex items-center mb-4">
                      <div className="bg-cyan-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">
                        2
                      </div>
                      <h3 className="text-2xl font-bold ml-4 text-gray-700">
                        Argument Knowledge Graph
                      </h3>
                    </div>
                    <p className="mb-4 text-gray-600">
                      The system constructs a Knowledge Graph to map the essay's
                      structure. Nodes represent concepts, and edges show their
                      logical relationships. Hover over a node to see its text
                      and highlight connections.
                    </p>
                    <div
                      id="graph-container"
                      className="w-full h-[500px] bg-gray-100 rounded-lg border border-gray-200 relative"
                    >
                      <canvas
                        id="knowledgeGraph"
                        ref={knowledgeGraphCanvasRef}
                        onMouseMove={handleMouseMove}
                        onMouseOut={handleMouseOut}
                      ></canvas>
                      {hoveredNode && (
                        <div
                          id="tooltip"
                          className="absolute bg-black bg-opacity-75 text-white text-sm rounded-md p-2 pointer-events-none transition-opacity duration-300"
                          style={{
                            left: `${hoveredNode.x + 15 || 0}px`,
                            top: `${hoveredNode.y + 15 || 0}px`,
                            opacity: 1,
                          }}
                        >
                          {hoveredNode.type}: {hoveredNode.text}
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
                          ></span>
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
                  isAnalysisComplete
                    ? "visible opacity-100"
                    : "opacity-0 hidden"
                }`}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <div className="flex items-center mb-4">
                  <div className="bg-cyan-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <h3 className="text-2xl font-bold ml-4 text-gray-700">
                    Generated Insights
                  </h3>
                </div>
                <p className="mb-6 text-gray-600">
                  By analyzing the Knowledge Graph, the system provides scores
                  for key writing attributes. This goes beyond grammar to assess
                  the quality of the argumentation itself, providing specific,
                  actionable feedback for the teacher.
                </p>
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div>
                    <h4 className="text-xl font-semibold mb-3 text-center text-gray-700">
                      Argument Strength
                    </h4>
                    <p className="text-sm text-gray-600 mb-4 text-center">
                      Measures how well each claim is supported by evidence. A
                      higher bar indicates stronger support.
                    </p>
                    <div className="relative w-full max-w-[600px] h-[350px] md:h-[400px] mx-auto">
                      <canvas
                        id="strengthChart"
                        ref={strengthChartRef}
                      ></canvas>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-xl font-semibold mb-3 text-gray-700">
                        Coherence Score
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Measures how well all parts of the essay connect to the
                        central thesis. A higher score indicates a more unified
                        argument.
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
                      <h4 className="text-xl font-semibold mb-3 text-gray-700">
                        Evidence Verification
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Checks provided evidence against an external knowledge
                        base to assess its validity.
                      </p>
                      <div className="overflow-x-auto">
                        <table
                          id="evidenceTable"
                          className="w-full text-sm text-left text-gray-600"
                        >
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
                                <td className="px-4 py-3">
                                  {row.text.substring(0, 40)}...
                                </td>
                                <td
                                  className={`px-4 py-3 font-semibold ${row.statusColor}`}
                                >
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

        {/* Research Plan Section */}
        <section id="research" className="py-16 md:py-24">
          <motion.div
            className="container mx-auto px-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                The Research Plan
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                Our study is structured to develop a robust tool and validate
                its effectiveness in a real-world educational context.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Research Plan Cards */}
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">General Objective</h4>
                <p>
                  To develop and evaluate an NLP-based essay evaluation system
                  that supports teachers in identifying and addressing student
                  writing weaknesses.
                </p>
              </motion.div>
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">Specific Objectives</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Collect & preprocess annotated essays.</li>
                  <li>Implement NLP & KG modules.</li>
                  <li>Generate automated evaluation reports.</li>
                  <li>Validate system outputs with teachers.</li>
                </ul>
              </motion.div>
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">Scope</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>For teachers only, not students.</li>
                  <li>Focus on English expository essays.</li>
                  <li>
                    Reports on grammar, clarity, coherence, and argumentation.
                  </li>
                </ul>
              </motion.div>
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">Limitations</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Highlights weaknesses, does not assign grades.</li>
                  <li>KG coverage is finite.</li>
                  <li>Serves as a teacher aid, not a replacement.</li>
                </ul>
              </motion.div>
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">Research Locale</h4>
                <p>
                  Partner schools or universities where English teachers
                  regularly evaluate student essays, providing both essay
                  datasets and teacher expertise for validation.
                </p>
              </motion.div>
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">Target Respondents</h4>
                <p>
                  <strong>Primary:</strong> Senior high school and college
                  English teachers. <br />
                  <strong>Secondary:</strong> Students who produce the essay
                  datasets.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Impact Section */}
        <section id="impact" className="bg-white py-16 md:py-24">
          <motion.div
            className="container mx-auto px-6 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">Overall Impact</h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                EduCompose aims to make a meaningful contribution to education
                by bridging the gap between advanced AI and practical classroom
                needs.
              </p>
            </motion.div>
            <motion.div
              className="mt-12 max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg border"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeInOut" }}
            >
              <p className="text-xl leading-relaxed text-gray-700">
                By empowering teachers with deeper insights into student
                writing, we can foster a more efficient and effective
                educational environment. This research supports a future where
                technology serves as a powerful assistant to educators,
                enhancing their ability to provide the personalized,
                high-quality feedback that is essential for student growth and
                success in writing.
              </p>
            </motion.div>
          </motion.div>
        </section>

        <footer className="bg-neutral-900 text-white py-2">
          <motion.div
            className="container mx-auto px-6 text-center font-semibold"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <p className="text-white animate-pulse">
              &copy; 2025 EduCompose | Team Nonchalant.
            </p>
          </motion.div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
