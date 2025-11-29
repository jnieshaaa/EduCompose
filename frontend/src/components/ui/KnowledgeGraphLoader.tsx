import React from "react";
import { motion } from "framer-motion";

interface KnowledgeGraphLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const KnowledgeGraphLoader: React.FC<KnowledgeGraphLoaderProps> = ({
  className = "",
  size = "md",
}) => {
  const sizeMap = {
    sm: { width: 200, height: 200, nodeRadius: 8, strokeWidth: 2 },
    md: { width: 300, height: 300, nodeRadius: 10, strokeWidth: 2.5 },
    lg: { width: 400, height: 400, nodeRadius: 12, strokeWidth: 3 },
  };

  const dimensions = sizeMap[size];
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  // Define node positions in a circular arrangement with 3D depth variation
  const nodes = [
    { id: 0, x: centerX, y: centerY - 60, z: 0, label: "Essay" },
    { id: 1, x: centerX + 50, y: centerY - 30, z: -20, label: "Grammar" },
    { id: 2, x: centerX + 60, y: centerY + 40, z: 20, label: "Coherence" },
    { id: 3, x: centerX, y: centerY + 60, z: -15, label: "Argument" },
    { id: 4, x: centerX - 60, y: centerY + 40, z: 15, label: "Structure" },
    { id: 5, x: centerX - 50, y: centerY - 30, z: -10, label: "Readability" },
  ];

  // Define edges (connections between nodes)
  const edges = [
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 0, to: 3 },
    { from: 0, to: 4 },
    { from: 0, to: 5 },
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
    { from: 4, to: 5 },
    { from: 5, to: 1 },
  ];

  // Calculate edge path for SVG line
  const getEdgePath = (from: number, to: number) => {
    const fromNode = nodes[from];
    const toNode = nodes[to];
    return `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        className="relative"
        style={{ perspective: "1000px" }}
        animate={{
          rotateY: [0, 360],
          rotateX: [0, 15, 0],
        }}
        transition={{
          rotateY: {
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          },
          rotateX: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      >
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
          style={{
            transformStyle: "preserve-3d",
            filter: "drop-shadow(0 10px 30px rgba(16, 185, 129, 0.3)) drop-shadow(0 5px 15px rgba(59, 130, 246, 0.2))",
          }}
        >
        {/* Gradient definitions for edges and nodes */}
        <defs>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
          </linearGradient>
          <radialGradient id="nodeGradient">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4"/>
          </filter>
        </defs>

        {/* Animated edges */}
        {edges.map((edge, index) => {
          const fromNode = nodes[edge.from];
          const toNode = nodes[edge.to];
          
          return (
            <g key={`edge-${edge.from}-${edge.to}`}>
              {/* Base edge line */}
              <motion.line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="url(#edgeGradient)"
                strokeWidth={dimensions.strokeWidth}
                strokeLinecap="round"
                filter="url(#glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 1, 1],
                  opacity: [0, 0.8, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  delay: index * 0.1,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "easeInOut",
                }}
              />
              {/* Animated particle flowing along edge */}
              {[...Array(2)].map((_, particleIndex) => {
                const progress = particleIndex * 0.5;
                return (
                  <motion.circle
                    key={`particle-${edge.from}-${edge.to}-${particleIndex}`}
                    r={3}
                    fill="#3b82f6"
                    initial={{ 
                      cx: fromNode.x, 
                      cy: fromNode.y,
                      opacity: 0 
                    }}
                    animate={{
                      cx: [fromNode.x, toNode.x],
                      cy: [fromNode.y, toNode.y],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      delay: index * 0.15 + progress,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Animated nodes with 3D depth */}
        {nodes.map((node, index) => {
          // Calculate 3D scale based on z position (simulate depth)
          const depthScale = 1 + (node.z || 0) / 100;
          const depthOpacity = 0.9 + (node.z || 0) / 200;
          
          return (
            <g key={node.id} style={{ transformStyle: "preserve-3d" }}>
              {/* Multiple glow layers for 3D effect */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={dimensions.nodeRadius + 8}
                fill="url(#nodeGradient)"
                opacity={0.1 * depthOpacity}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, depthScale * 1.2, depthScale * 1.8, depthScale * 1.2],
                  opacity: [0, 0.1, 0.3, 0.1],
                }}
                transition={{
                  duration: 2,
                  delay: index * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={dimensions.nodeRadius + 4}
                fill="url(#nodeGradient)"
                opacity={0.2 * depthOpacity}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, depthScale, depthScale * 1.5, depthScale],
                  opacity: [0, 0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 2,
                  delay: index * 0.2 + 0.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              {/* Node circle with 3D effect */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={dimensions.nodeRadius * depthScale}
                fill="url(#nodeGradient)"
                stroke="#ffffff"
                strokeWidth={2}
                filter="url(#glow) url(#shadow)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, depthScale * 1.3, depthScale, depthScale * 1.3, depthScale],
                  opacity: [0, depthOpacity, depthOpacity * 0.9, depthOpacity, depthOpacity * 0.9],
                }}
                transition={{
                  duration: 1.5,
                  delay: index * 0.15,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              {/* Multiple pulse rings for depth */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={dimensions.nodeRadius * depthScale}
                fill="none"
                stroke="#10b981"
                strokeWidth={2}
                opacity={depthOpacity}
                initial={{ scale: 1, opacity: 0 }}
                animate={{
                  scale: [1, 2.5, 1],
                  opacity: [0.8 * depthOpacity, 0, 0],
                }}
                transition={{
                  duration: 2,
                  delay: index * 0.2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={dimensions.nodeRadius * depthScale}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5}
                opacity={depthOpacity * 0.6}
                initial={{ scale: 1, opacity: 0 }}
                animate={{
                  scale: [1, 3, 1],
                  opacity: [0.6 * depthOpacity, 0, 0],
                }}
                transition={{
                  duration: 2.5,
                  delay: index * 0.2 + 0.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            </g>
          );
        })}

        </svg>
      </motion.div>
    </div>
  );
};

export default KnowledgeGraphLoader;

