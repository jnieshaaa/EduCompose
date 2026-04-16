import React from 'react';
import { Mail, MessageCircle, HelpCircle, ArrowRight, Info, Shield, Zap, Cpu } from 'lucide-react';
import Card from '../../components/ui/Card';

const HelpTab: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Support Center</h1>
        <p className="text-neutral-500 font-medium">Get internal assistance and connect with our technical support team.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Method Box 1: Email */}
        <Card className="p-8 border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
          
          <div className="relative z-10 space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
              <Mail className="w-7 h-7" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-neutral-900">Email Support</h2>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Send us an email for any technical issues, account concerns, or feature requests. 
                We typically respond within 24 hours.
              </p>
            </div>

            <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100 flex items-center justify-between group-hover:border-primary/20 transition-colors">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Official Email</span>
                <p className="text-neutral-900 font-bold select-all">educompose04@gmail.com</p>
              </div>
              <a 
                href="mailto:educompose04@gmail.com"
                className="p-3 bg-white rounded-xl shadow-sm border border-neutral-200 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center"
              >
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </Card>

        {/* Contact Method Box 2: FAQ/Quick Help */}
        <Card className="p-8 border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
          
          <div className="relative z-10 space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-6">
              <HelpCircle className="w-7 h-7" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-neutral-900">In-App Assistance</h2>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Need immediate help with navigating the platform? Check our guides or reach out
                to your teacher for internal academic questions.
              </p>
            </div>

            <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100 flex items-center justify-between group-hover:border-emerald-500/20 transition-colors">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Live Chat</span>
                <p className="text-neutral-900 font-bold">Coming Soon</p>
              </div>
              <div className="p-3 bg-neutral-200 rounded-xl text-neutral-400 cursor-not-allowed">
                <MessageCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="bg-neutral-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-1">Frequently Asked Questions</h3>
            <p className="text-white/60 text-sm font-medium">Can't find the answer you're looking for?</p>
          </div>
          <button className="px-6 py-3 bg-white text-neutral-900 font-bold rounded-2xl hover:bg-neutral-100 transition-all shadow-lg active:scale-95">
            View FAQ Guide
          </button>
        </div>
      </div>

      {/* About Platform Information */}
      <div className="pt-8 border-t border-neutral-200">
        <div className="flex flex-col md:flex-row items-start gap-10">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <Info className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900">About EduCompose</h2>
            </div>
            
            <p className="text-neutral-600 leading-relaxed font-medium">
              EduCompose is an AI-powered written evaluation system designed to bridge the gap between student growth and rigorous academic standards. 
              Our mission is to provide students with meaningful, actionable feedback while streamlining the assessment process for educators.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="text-primary mt-1"><Cpu className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-bold text-neutral-900 text-sm">AI-Driven Insights</h4>
                  <p className="text-xs text-neutral-500">Advanced analysis of structure, grammar, and tone.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="text-primary mt-1"><Zap className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-bold text-neutral-900 text-sm">Instant Feedback</h4>
                  <p className="text-xs text-neutral-500">Real-time suggestions to improve academic writing.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-80 space-y-4">
            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Platform Details</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-neutral-200/50">
                  <span className="text-sm text-neutral-600">Version</span>
                  <span className="text-sm font-bold text-neutral-900">1.2.0</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-200/50">
                  <span className="text-sm text-neutral-600">Stable Release</span>
                  <span className="text-sm font-bold text-neutral-900">April 2026</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-neutral-600">Build Status</span>
                  <span className="text-xs px-2 py-0.5 bg-success-default/10 text-success-default font-bold rounded-full">OPTIMIZED</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 flex items-center gap-3 text-neutral-400">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-medium uppercase tracking-tight">Enterprise Secure Infrastructure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpTab;
