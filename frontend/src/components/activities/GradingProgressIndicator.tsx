import React from "react";
import { Loader2 } from "lucide-react";

interface GradingProgressIndicatorProps {
  progress: number; // 0-100
  currentStep?: string;
  size?: "sm" | "md";
}

export function GradingProgressIndicator({
  progress,
  currentStep,
  size = "sm",
}: GradingProgressIndicatorProps) {
  const sizeConfig = {
    sm: { width: 24, height: 24, radius: 10, strokeWidth: 2, fontSize: "text-xs" },
    md: { width: 32, height: 32, radius: 14, strokeWidth: 2.5, fontSize: "text-sm" },
  };

  const config = sizeConfig[size];
  const centerX = config.width / 2;
  const centerY = config.height / 2;
  const circumference = 2 * Math.PI * config.radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" title={currentStep || `Processing... ${Math.round(progress)}%`}>
      <svg
        className="transform -rotate-90"
        width={config.width}
        height={config.height}
      >
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={config.radius}
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          fill="none"
          className="text-neutral-200"
        />
        {/* Progress circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={config.radius}
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-300"
        />
      </svg>
      {/* Center spinner */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader2 className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} animate-spin text-primary`} />
      </div>
    </div>
  );
}

