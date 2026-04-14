import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

interface CardProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
  variant?: "default" | "glass" | "outline";
}

const Card = ({
  children,
  className = "",
  hover = false,
  variant = "default",
  ...rest
}: CardProps) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "glass":
        return "bg-white/70 backdrop-blur-md border border-white/20 shadow-lg";
      case "outline":
        return "bg-transparent border-2 border-dashed border-neutral-200 shadow-none p-8";
      default:
        return "bg-white border border-neutral-200 shadow-sm";
    }
  };

  const baseClasses = `rounded-2xl p-6 ${getVariantClasses()}`;
  const hoverClasses = hover
    ? "hover:shadow-xl hover:border-primary-300/50 transition-all duration-300 cursor-pointer"
    : "";

  return (
    <motion.div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      {...rest}
      whileHover={
        hover
          ? {
              y: -4,
              scale: 1.01,
              transition: { duration: 0.2 }
            }
          : {}
      }
    >
      {children}
    </motion.div>
  );
};

export default Card;
