import React from "react";
import { motion } from "framer-motion";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  variant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "success"
    | "warning"
    | "error"
    | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  type = "button",
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary:
      "bg-primary text-white hover:bg-primary-300 focus:ring-primary-500",
    secondary:
      "bg-secondary text-white hover:bg-secondary-300 focus:ring-secondary-500",
    tertiary:
      "bg-tertiary text-white hover:bg-tertiary-300 focus:ring-tertiary-500",
    success:
      "bg-success-default text-white hover:bg-success-dark focus:ring-success-default",
    warning:
      "bg-warning-default text-white hover:bg-warning-dark focus:ring-warning-default",
    error:
      "bg-error-default text-white hover:bg-error-dark focus:ring-error-default",
    ghost:
      "bg-transparent text-primary border border-primary hover:bg-primary hover:text-white focus:ring-primary-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm rounded-rs", // Small controls: 6px
    md: "px-4 py-2 text-base rounded-rd", // Default: 8px
    lg: "px-6 py-3 text-lg rounded-rd", // Default: 8px
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.1 }}
    >
      {loading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
};

export default Button;
