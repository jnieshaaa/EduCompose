import React from "react";
import { motion } from "framer-motion";
import { Settings, Wrench, Construction, ShieldAlert } from "lucide-react";

interface MaintenancePageProps {
  role?: "student" | "teacher" | "global";
  message?: string;
  expectedBack?: string;
}

const Maintenance: React.FC<MaintenancePageProps> = ({ 
  role = "global", 
  message = "We're currently fine-tuning the system to provide you with a better experience.",
  expectedBack = "Shortly"
}) => {

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-2xl relative z-10 flex flex-col items-center text-center">
        {/* Animated Icon Composition */}
        <div className="relative mb-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 bg-primary/10 rounded-[40px] flex items-center justify-center relative"
          >
            <Settings size={48} className="text-primary opacity-50" />
          </motion.div>
          
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 5, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-4 -right-4 w-16 h-16 bg-white shadow-2xl shadow-primary/20 rounded-2xl flex items-center justify-center border border-neutral-100"
          >
            <Construction size={24} className="text-primary" />
          </motion.div>

          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-4 -left-4 w-12 h-12 bg-secondary text-white rounded-xl flex items-center justify-center shadow-lg"
          >
            <ShieldAlert size={20} />
          </motion.div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-neutral-50 rounded-full border border-neutral-100"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
              Maintenance in Progress • {role === "global" ? "Full System" : `${role.toUpperCase()} Portal`}
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-neutral-900 tracking-tighter leading-tight"
          >
            System <br/>
            <span className="text-primary">Update</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-neutral-500 text-sm md:text-base max-w-md mx-auto leading-relaxed font-medium"
          >
            {message}
          </motion.p>
        </div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full bg-neutral-50/50 border border-neutral-100 rounded-[32px] p-8 md:p-10 mb-12 backdrop-blur-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Back Online By</p>
              <p className="text-lg font-black text-neutral-900 leading-tight">{expectedBack}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">System Status</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <p className="text-sm font-black text-neutral-900">Working Normally</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={() => window.location.reload()}
          className="group flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-neutral-400 hover:text-primary transition-all"
        >
          <Wrench size={16} className="group-hover:rotate-12 transition-transform" />
          Check System Again
        </motion.button>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center opacity-20 hover:opacity-100 transition-opacity">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-neutral-400">EduCompose Hub</p>
      </div>
    </div>
  );
};

export default Maintenance;
