import React from "react";
import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: "primary" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = "primary",
  size = "md",
  className = "",
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorClasses = {
    primary: "bg-primary",
    success: "bg-success-default",
    warning: "bg-warning-default",
    error: "bg-error-default",
    info: "bg-info-default",
  };

  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-neutral-700">{label}</span>
          {showPercentage && (
            <span className="text-sm text-neutral-500">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div
        className={`w-full bg-neutral-200 rounded-full overflow-hidden ${sizeClasses[size]}`}
      >
        <motion.div
          className={`h-full ${colorClasses[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
