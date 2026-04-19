import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap, BookOpen, Users } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

const Hero: React.FC<HeroProps> = ({ onGetStarted, onLearnMore }) => {
  return (
    <div id="hero" className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-[1.1] tracking-tight text-slate-900">
            A writing-analytics workspace
            <br />
            <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent italic">
              built for Laguna University
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            EduCompose is a secure, account-based platform where LU faculty assign
            activities, students submit work, and AI-assisted analysis supports
            the professional review workflow.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
            <button
              onClick={onGetStarted}
              className="group bg-primary text-white font-semibold px-8 py-4 rounded-full transition-all duration-300 flex items-center gap-2 text-lg hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 active:scale-95"
            >
              Sign in to workspace
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onLearnMore}
              className="bg-white text-slate-700 font-semibold px-8 py-4 rounded-full transition-all duration-300 border border-slate-200 hover:border-primary hover:text-primary hover:shadow-lg active:scale-95"
            >
              How the platform works
            </button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              { icon: Zap, color: "bg-cyan-100 text-cyan-600", title: "Structured workflow", desc: "Activities and rubrics stay tied to real classes—not anonymous uploads." },
              { icon: BookOpen, color: "bg-primary-50 text-primary-300", title: "Rich writing signals", desc: "Coherence, argument structure, and clarity dimensions you configure." },
              { icon: Users, color: "bg-blue-100 text-blue-600", title: "School-ready roles", desc: "Separate experiences for teachers and students with secure sign-in." }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className={`${f.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
