import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, PenLine, Sparkles } from 'lucide-react';

interface PremiumLoaderProps {
  loading: boolean;
  message?: string;
  transparent?: boolean;
}

export const PremiumLoader: React.FC<PremiumLoaderProps> = ({ 
  loading, 
  message = "EduCompose is processing...", 
  transparent = true 
}) => {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] flex items-center justify-center p-6 ${
            transparent 
              ? 'bg-neutral-900/10 backdrop-blur-md' 
              : 'bg-white'
          }`}
        >
          <div className="flex flex-col items-center max-w-xs text-center">
            <div className="relative mb-8">
              {/* Central Paper Icon */}
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  filter: ["drop-shadow(0 0 0px rgba(16,185,129,0))", "drop-shadow(0 0 15px rgba(16,185,129,0.4))", "drop-shadow(0 0 0px rgba(16,185,129,0))"]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 bg-white rounded-2xl shadow-xl border border-neutral-200 flex items-center justify-center text-primary"
              >
                <FileText size={40} />
              </motion.div>

              {/* Animated Pen */}
              <motion.div
                initial={{ x: 20, y: -20, rotate: -45 }}
                animate={{ 
                  x: [15, 30, 20, 15],
                  y: [-15, -10, -25, -15],
                  rotate: [-45, -35, -55, -45]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-2 -right-4 w-10 h-10 bg-primary text-white rounded-full shadow-lg flex items-center justify-center border-2 border-white"
              >
                <PenLine size={20} />
              </motion.div>

              {/* Sparkles Particle Effect */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                  rotate: [0, 90, 180, 270, 360]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-4 -left-4 text-warning-default"
              >
                <Sparkles size={32} />
              </motion.div>
            </div>

            {/* Custom Loading Text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-xl font-bold text-neutral-900 mb-2">EduCompose</h3>
              <p className="text-neutral-600 font-medium">
                {message}
                <span className="flex justify-center mt-2">
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 1] }}
                    className="inline-flex gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <motion.span 
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-primary" 
                    />
                    <motion.span 
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      className="w-1.5 h-1.5 rounded-full bg-primary" 
                    />
                  </motion.span>
                </span>
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
