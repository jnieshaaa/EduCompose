import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hover = false, 
  onClick 
}) => {
  const baseClasses = 'bg-white rounded-xl shadow-sm border border-neutral-200 p-6';
  const hoverClasses = hover ? 'hover:shadow-md hover:border-primary-200 transition-all duration-200 cursor-pointer' : '';
  
  return (
    <motion.div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
      whileHover={hover ? { y: -2 } : {}}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

export default Card;
