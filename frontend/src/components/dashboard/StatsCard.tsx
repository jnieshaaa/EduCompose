import React from "react";
import { motion } from "framer-motion";
import Card from "../ui/Card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  color?: "primary" | "success" | "warning" | "error" | "info";
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  color = "primary",
  className = "",
}) => {
  const colorClasses = {
    primary: "text-primary bg-primary-50",
    success: "text-success-default bg-success-50",
    warning: "text-warning-default bg-warning-50",
    error: "text-error-default bg-error-50",
    info: "text-info-default bg-info-50",
  };

  const changeColorClasses = {
    increase: "text-success-default",
    decrease: "text-error-default",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
            {change && (
              <div className="flex items-center mt-1">
                <span
                  className={`text-sm font-medium ${
                    changeColorClasses[change.type]
                  }`}
                >
                  {change.type === "increase" ? "+" : "-"}
                  {Math.abs(change.value)}%
                </span>
                <span className="text-xs text-neutral-500 ml-1">
                  vs last month
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default StatsCard;
