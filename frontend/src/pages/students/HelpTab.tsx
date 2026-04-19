import React from 'react';
import { Mail, HelpCircle, ArrowRight, Shield, Zap, Cpu, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const HelpTab: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-1 space-y-10 pb-12">
      {/* Header Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">Need Help?</h1>
        <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <HelpCircle size={14} className="text-primary/50" />
            Check our guides or talk to us if you need help
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Method Box 1: Email */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all bg-white group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full translate-x-12 -translate-y-12 group-hover:bg-primary/10 transition-colors" />
          
          <div className="relative z-10 space-y-7">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
              <Mail className="w-7 h-7 group-hover:scale-110 transition-transform" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Send an Email</h2>
              <p className="text-neutral-500 text-sm leading-relaxed font-medium">
                Send us an email for any tech issues or account concerns. 
                We usually reply within 24 hours.
              </p>
            </div>

            <div className="bg-neutral-50/50 p-5 rounded-3xl border border-neutral-50 flex items-center justify-between group-hover:border-primary/20 transition-all">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-neutral-300 tracking-widest">Our Email</span>
                <p className="text-neutral-900 font-bold select-all text-sm">educompose04@gmail.com</p>
              </div>
              <a 
                href="mailto:educompose04@gmail.com"
                className="p-3 bg-white rounded-xl shadow-sm border border-neutral-100 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center"
              >
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Contact Method Box 2: FAQ/Quick Help */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/5 transition-all bg-white group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full translate-x-12 -translate-y-12 group-hover:bg-emerald-500/10 transition-colors" />
          
          <div className="relative z-10 space-y-7">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
              <MessageSquare className="w-7 h-7 group-hover:scale-110 transition-transform" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Easy Guides</h2>
              <p className="text-neutral-500 text-sm leading-relaxed font-medium">
                Try reading our guides if you're stuck. For school-related questions, 
                you can ask your teacher directly!
              </p>
            </div>

            <div className="bg-neutral-50/50 p-5 rounded-3xl border border-neutral-50 flex items-center justify-between group-hover:border-emerald-500/20 transition-all">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-neutral-300 tracking-widest">Help Center</span>
                <p className="text-neutral-900 font-bold text-sm tracking-tight text-neutral-300 italic">Coming Soon</p>
              </div>
              <div className="p-3 bg-neutral-100 rounded-xl text-neutral-200 cursor-not-allowed">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* FAQ Guide Card */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-neutral-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-neutral-900/20"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] translate-x-20 -translate-y-20" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="text-center md:text-left space-y-2 flex-1">
            <h3 className="text-2xl font-bold tracking-tight">Check common questions</h3>
            <p className="text-white/50 text-sm font-medium leading-relaxed max-w-md">
              Can't find what you're looking for? Our guide has answers to almost everything.
            </p>
          </div>
          <button className="px-8 py-4 bg-white text-neutral-900 text-[11px] font-bold uppercase tracking-widest rounded-2xl hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95 group shrink-0">
            Read My Guide
            <ArrowRight size={14} className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>

      {/* About Box */}
      <div className="pt-10 border-t border-neutral-50">
        <div className="flex flex-col lg:flex-row items-start gap-12">
          <div className="flex-1 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-xl shadow-neutral-900/20">
                <Zap className="w-6 h-6 fill-primary/20 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">About EduCompose</h2>
            </div>
            
            <p className="text-neutral-400 leading-relaxed font-medium">
              EduCompose is an AI tool that helps you write better essays. We give you tips 
              on how to fix your grammar, make your story flow, and improve your overall writing style.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex gap-4 p-6 rounded-3xl bg-neutral-50/50 border border-neutral-50 group hover:border-primary/20 transition-all">
                <div className="text-primary mt-1"><Cpu className="w-6 h-6" /></div>
                <div className="space-y-1">
                  <h4 className="font-bold text-neutral-900 text-sm tracking-tight">Smart Tips</h4>
                  <p className="text-xs text-neutral-400 font-medium">We check your spelling, tone, and grammar automatically.</p>
                </div>
              </div>
              <div className="flex gap-4 p-6 rounded-3xl bg-neutral-50/50 border border-neutral-50 group hover:border-emerald-500/20 transition-all">
                <div className="text-emerald-500 mt-1"><Zap className="w-6 h-6" /></div>
                <div className="space-y-1">
                  <h4 className="font-bold text-neutral-900 text-sm tracking-tight">Fast Feedback</h4>
                  <p className="text-xs text-neutral-400 font-medium">Get suggestions right away so you can improve fast.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-80 space-y-6">
            <div className="p-8 rounded-[2rem] bg-neutral-50 border border-neutral-50 space-y-6">
              <h4 className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">App Details</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-1 border-b border-neutral-100 pb-4">
                  <span className="text-xs font-bold text-neutral-400">App Version</span>
                  <span className="text-xs font-bold text-neutral-900">1.2.0</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-100 pb-4">
                  <span className="text-xs font-bold text-neutral-400">Last Update</span>
                  <span className="text-xs font-bold text-neutral-900">April 2026</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-bold text-neutral-400">Status</span>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-500 text-[10px] font-bold rounded-lg uppercase tracking-widest">OK</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-neutral-300 px-4">
              <Shield size={14} className="text-primary/30" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Your data is safe with us</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpTab;
