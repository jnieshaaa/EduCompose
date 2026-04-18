import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, MessageCircle, HelpCircle, ArrowRight, Info, Shield, Zap, Cpu } from 'lucide-react';
import { useHelp } from '../contexts/HelpContext';

const HelpModal: React.FC = () => {
  const { isHelpOpen, closeHelp } = useHelp();

  return (
    <AnimatePresence>
      {isHelpOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeHelp}
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-neutral-100"
          >
            {/* Close Button */}
            <button
              onClick={closeHelp}
              className="absolute top-6 right-6 z-20 w-10 h-10 bg-white border border-neutral-100 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:shadow-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-8 py-10 sm:px-12 sm:py-14 space-y-16 custom-scrollbar">
              {/* Hero Section: About EduCompose */}
              <div className="space-y-12">
                <div className="flex flex-col lg:flex-row items-center gap-12">
                  <div className="flex-1 space-y-8 text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row items-center gap-5">
                      <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/40">
                        <Info className="w-8 h-8" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Platform Overview</span>
                        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight sm:text-4xl">About EduCompose</h1>
                      </div>
                    </div>
                    
                    <p className="text-base sm:text-lg font-medium text-neutral-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                      EduCompose is an AI-powered evaluation system designed to bridge the gap between learner growth and rigorous academic standards. 
                      Providing meaningful feedback while streamlining assessment.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="flex gap-4 p-6 rounded-3xl bg-neutral-50 border border-neutral-100 hover:border-primary/20 transition-all group/feat shadow-sm text-left">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center text-primary group-hover/feat:bg-primary group-hover/feat:text-white transition-all shadow-sm shrink-0">
                          <Cpu className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-900 text-sm tracking-tight">AI-Driven Insights</h4>
                          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide mt-1">Deep structure analysis</p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-6 rounded-3xl bg-neutral-50 border border-neutral-100 hover:border-primary/20 transition-all group/feat shadow-sm text-left">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center text-primary group-hover/feat:bg-primary group-hover/feat:text-white transition-all shadow-sm shrink-0">
                          <Zap className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-900 text-sm tracking-tight">Instant Feedback</h4>
                          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide mt-1">Real-time suggestions</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-80 space-y-4">
                    <div className="p-8 rounded-[2.5rem] bg-white border border-neutral-100 space-y-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group/integrity overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-full h-1 bg-primary/20 group-hover/integrity:bg-primary transition-colors" />
                      <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.25em]">Platform Integrity</h4>
                      <div className="space-y-4 text-left">
                        <div className="flex justify-between items-center py-3 border-b border-neutral-50">
                          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Version</span>
                          <span className="text-sm font-bold text-neutral-900 tracking-tight">1.2.0</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-neutral-50">
                          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Stability</span>
                          <span className="text-sm font-bold text-neutral-900 tracking-tight">Stable</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Status</span>
                          <span className="text-[10px] px-3 py-1 bg-success-default/10 text-success-default font-bold rounded-lg border border-success-default/10 shadow-sm uppercase tracking-wider">Optimized</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 flex items-center gap-3 text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-100 shadow-sm text-left">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Enterprise Security Layer</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Support Center Section */}
              <div className="pt-12 border-t border-neutral-100 space-y-10">
                <div className="space-y-1 text-center lg:text-left">
                  <h2 className="text-xl font-bold text-neutral-900 tracking-tight sm:text-2xl">Support Center</h2>
                  <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest">Connect with our assistance team and technical support</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Contact Method Box 1: Email */}
                  <div className="p-8 bg-white rounded-3xl border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group overflow-hidden relative text-left">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                    
                    <div className="relative z-10 space-y-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                        <Mail className="w-8 h-8" />
                      </div>
                      
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Email Support</h2>
                        <p className="text-sm font-medium text-neutral-400 leading-relaxed uppercase tracking-wide">
                          Direct communication for technical issues and accounts.
                        </p>
                      </div>

                      <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 flex items-center justify-between group-hover:border-primary/20 transition-all">
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-[0.12em]">Official Inbox</span>
                          <p className="text-sm font-bold text-neutral-900 select-all tracking-tight">educompose04@gmail.com</p>
                        </div>
                        <a 
                          href="mailto:educompose04@gmail.com"
                          className="w-12 h-12 bg-white rounded-xl shadow-sm border border-neutral-100 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center group/btn"
                        >
                          <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Contact Method Box 2: FAQ/Quick Help */}
                  <div className="p-8 bg-white rounded-3xl border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-success-default/5 transition-all group overflow-hidden relative text-left">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-success-default/5 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                    
                    <div className="relative z-10 space-y-6">
                      <div className="w-16 h-16 rounded-2xl bg-success-default/10 flex items-center justify-center text-success-default mb-6 group-hover:scale-110 transition-transform">
                        <HelpCircle className="w-8 h-8" />
                      </div>
                      
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-neutral-900 tracking-tight">System Assistance</h2>
                        <p className="text-sm font-medium text-neutral-400 leading-relaxed uppercase tracking-wide">
                          Reach out to the administrator for internal questions.
                        </p>
                      </div>

                      <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 flex items-center justify-between group-hover:border-success-default/20 transition-all">
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-[0.12em]">Availability</span>
                          <p className="text-sm font-bold text-neutral-900 tracking-tight">Priority Faculty Assistance</p>
                        </div>
                        <div className="w-12 h-12 bg-success-default rounded-xl text-white shadow-lg shadow-success-default/20 flex items-center justify-center">
                          <MessageCircle className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;
