import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BrainCircuit } from 'lucide-react';

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
              ? 'bg-white/40 backdrop-blur-[12px]' 
              : 'bg-white'
          }`}
        >
          {/* Ambient Background Glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1],
                x: [-20, 20, -20],
                y: [-20, 20, -20]
              }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]"
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.1, 0.2, 0.1],
                x: [20, -20, 20],
                y: [20, -20, 20]
              }}
              transition={{ duration: 12, repeat: Infinity }}
              className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px]"
            />
          </div>

          <div className="relative flex flex-col items-center max-w-sm text-center">
            <div className="relative mb-12">
              {/* Rotating Outer Rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-20px] rounded-full border-2 border-dashed border-primary/20"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-40px] rounded-full border border-secondary/10"
              />

              {/* Central Premium Container */}
              <motion.div
                animate={{ 
                  y: [0, -12, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-24 h-24 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-neutral-100 flex items-center justify-center text-primary group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-[2rem]" />
                <motion.div
                   animate={{ 
                     scale: [1, 1.1, 1],
                     opacity: [0.8, 1, 0.8]
                   }}
                   transition={{ duration: 2, repeat: Infinity }}
                >
                  <BrainCircuit size={48} className="relative z-20" />
                </motion.div>
                
                {/* Floating Orbitals */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border border-neutral-100 rounded-lg shadow-sm flex items-center justify-center">
                    <Sparkles size={10} className="text-warning-default" />
                  </div>
                </motion.div>
              </motion.div>

              {/* Status Indicator Tooltip-like element */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-neutral-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap shadow-xl"
              >
                System Active
              </motion.div>
            </div>

            {/* Content Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight italic">Edu<span className="text-primary">Compose</span></h3>
                <div className="h-1 w-12 bg-primary/20 mx-auto rounded-full" />
              </div>
              
              <div className="space-y-3">
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed">
                  {message}
                </p>
                
                {/* Modern Progress Bar */}
                <div className="w-48 h-1.5 bg-neutral-100 rounded-full mx-auto overflow-hidden relative">
                  <motion.div 
                    animate={{ 
                      x: [-200, 200]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
