import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "neutral" | "outline"; // <-- FIX: Added 'outline'
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  className = "",
}) => {
  // Badges intentionally use rounded-full (pill shape) for design consistency
  const baseClasses = "inline-flex items-center font-medium rounded-full";

  const variantClasses = {
    default: "bg-primary text-white",
    success: "bg-success-default text-white",
    warning: "bg-warning-default text-white",
    error: "bg-error-default text-white",
    info: "bg-info-default text-white",
    neutral: "bg-neutral-200 text-neutral-700",
    // <-- FIX: Added 'outline' class for type compatibility
    outline: "bg-white text-neutral-700 border border-neutral-300",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;