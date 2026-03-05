import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

interface CardProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
}

const Card = ({
  children,
  className = "",
  hover = false,
  ...rest
}: CardProps) => {
  const baseClasses =
    "bg-white rounded-rd shadow-sm border border-neutral-200 p-6";
  const hoverClasses = hover
    ? "hover:shadow-md hover:border-primary-200 transition-all duration-200 cursor-pointer"
    : "";

  return (
    <motion.div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      {...rest}
      whileHover={
        hover
          ? {
              boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
              backgroundColor: "rgba(255,255,255,0.97)",
              scale: 1.015, // subtle “pop” illusion
            }
          : {}
      }
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

export default Card;
