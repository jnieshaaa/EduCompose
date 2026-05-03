import { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  AlertCircle, 
  Zap, 
  Lightbulb, 
  Target, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { readSecureParams } from '../../utils/secureUrl';
import { fetchEssayAnalysis } from '../../services/activityService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

interface FeedbackData {
  essayTitle: string;
  submittedDate: string;
  overallScore: number;
  aiConfidence: number;
  criteria: Array<{
    name: string;
    score: number;
    weight: number;
    feedback: string;
    improvements: string[];
  }>;
  highlightedSuggestions: Array<{
    type: string;
    text: string;
    severity: string;
  }>;
  summary: string;
}

export function AIFeedbackTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [essayFeedback, setEssayFeedback] = useState<FeedbackData | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    async function loadData() {
      const params = readSecureParams(window.location.search);
      
      // Fallback: If studentId is missing from params, try to use current user's ID
      const studentId = params?.studentId || user?.auth_id || user?.id;
      const activityId = params?.activityId;

      if (!studentId || !activityId) {
        if (!window.location.search.includes('ref=')) {
          setError("No essay identifiers provided. Please select an essay from your folder.");
        } else {
          setError("Invalid request parameters. Missing essay or activity identification.");
        }
        setLoading(false);
        return;
      }

      try {
        const result = await fetchEssayAnalysis(studentId, activityId);
        if (!result) {
          setError("Could not find score results for this essay.");
          return;
        }

        const analysis = result.analysis as any;
        const mapped: FeedbackData = {
          essayTitle: params.activityTitle || result.title || "Your Essay",
          submittedDate: analysis.generated_at ? new Date(analysis.generated_at).toLocaleDateString() : new Date().toLocaleDateString(),
          overallScore: Math.round(analysis.scores?.overall || 0),
          aiConfidence: Math.round(analysis.scores?.knowledge_graph || 95),
          summary: analysis.diagnostic_summary?.overall_summary || "Score report is ready!",
          criteria: [
            { 
              name: 'Grammar', 
              score: Math.round(analysis.scores?.grammar || 0), 
              weight: 20, 
              feedback: analysis.detailed_analysis?.grammar?.summary || "Checked your spelling and grammar.",
              improvements: analysis.recommendations?.filter((r: any) => r.dimension === 'grammar').flatMap((r: any) => r.action_items) || []
            },
            { 
              name: 'Smoothness', 
              score: Math.round(analysis.scores?.coherence || 0), 
              weight: 25, 
              feedback: analysis.detailed_analysis?.coherence?.summary || "Checked how well your sentences flow.",
              improvements: analysis.recommendations?.filter((r: any) => r.dimension === 'coherence').flatMap((r: any) => r.action_items) || []
            },
            { 
              name: 'Word Choice', 
              score: Math.round(analysis.scores?.readability || 0), 
              weight: 15, 
              feedback: analysis.detailed_analysis?.readability?.summary || "Checked the words you used.",
              improvements: analysis.recommendations?.filter((r: any) => r.dimension === 'readability').flatMap((r: any) => r.action_items) || []
            },
            { 
              name: 'Strong Ideas', 
              score: Math.round(analysis.scores?.argument_strength || 0), 
              weight: 30, 
              feedback: analysis.detailed_analysis?.argumentation?.summary || "Checked your points and evidence.",
              improvements: analysis.recommendations?.filter((r: any) => r.dimension === 'argumentation').flatMap((r: any) => r.action_items) || []
            },
            { 
              name: 'Idea Connections', 
              score: Math.round(analysis.scores?.knowledge_graph || 0), 
              weight: 10, 
              feedback: "Checked how well you connected different topics.",
              improvements: analysis.recommendations?.filter((r: any) => r.dimension === 'knowledge_graph').flatMap((r: any) => r.action_items) || []
            }
          ],
          highlightedSuggestions: (analysis.recommendations || []).map((rec: any) => ({
            type: rec.dimension,
            text: `${rec.message}: ${rec.suggestion}`,
            severity: rec.priority
          }))
        };

        setEssayFeedback(mapped);
      } catch (err) {
        console.error("Error loading feedback:", err);
        setError("Failed to connect to the score service.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Reading your score report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Could not find scores</h2>
        <p className="text-sm font-medium text-neutral-400 max-w-sm mb-8">{error}</p>
        <div className="flex gap-4">
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2.5 bg-neutral-100 text-neutral-600 text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-neutral-200 transition-all"
          >
            Try Again
          </button>
          <button 
            onClick={() => navigate('/Student/MyEssays')}
            className="px-6 py-2.5 bg-neutral-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-neutral-800 transition-all"
          >
            Back to Folder
          </button>
        </div>
      </div>
    );
  }

  if (!essayFeedback) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 px-1">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">AI Score Report</h1>
          <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <Zap size={14} className="text-primary/50" />
            Tips to help you write better
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-100 text-neutral-500 text-[11px] font-bold uppercase tracking-widest rounded-xl shadow-sm hover:bg-neutral-50 transition-all">
            <Download size={14} />
            Save as PDF
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl shadow-xl shadow-neutral-900/10 hover:bg-neutral-800 transition-all">
            <FileText size={14} />
            See My Work
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Hero Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-900/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-bl-full translate-x-12 -translate-y-12" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                 <div className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-lg">
                   {essayFeedback.submittedDate}
                 </div>
              </div>
              
              <h2 className="text-3xl font-bold text-neutral-900 mb-6 tracking-tight leading-tight">
                {essayFeedback.essayTitle}
              </h2>
              
              <div className="flex items-center gap-8">
                 <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Your Total Score</p>
                    <p className="text-5xl font-bold text-primary tracking-tighter">{essayFeedback.overallScore}%</p>
                 </div>
                 <div className="h-12 w-px bg-neutral-100" />
                 <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Confidence</p>
                    <p className="text-xl font-bold text-neutral-800">{essayFeedback.aiConfidence}%</p>
                 </div>
              </div>
            </div>
          </motion.div>

          {/* Criteria Breakdown */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-8">
             <div className="flex items-center justify-between border-b border-neutral-50 pb-6">
                <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest font-bold">How You Scored</h3>
             </div>
             
             <div className="space-y-10">
                {essayFeedback.criteria.map((criterion, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (idx * 0.05) }}
                    className="space-y-4"
                  >
                    <div className="flex items-end justify-between">
                       <div className="space-y-1">
                          <h4 className="text-lg font-bold text-neutral-900 tracking-tight">{criterion.name}</h4>
                          <p className="text-xs text-neutral-400 font-medium">Worth {criterion.weight}% of total</p>
                       </div>
                       <p className={`text-4xl font-bold tracking-tighter ${criterion.score >= 90 ? 'text-emerald-500' : criterion.score >= 75 ? 'text-primary' : 'text-amber-500'}`}>
                         {criterion.score}%
                       </p>
                    </div>
                    
                    <div className="h-2 w-full bg-neutral-50 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${criterion.score}%` }}
                         transition={{ duration: 1, delay: 0.5 }}
                         className={`h-full rounded-full ${criterion.score >= 90 ? 'bg-emerald-500' : criterion.score >= 75 ? 'bg-primary' : 'bg-amber-500'}`}
                       />
                    </div>
                    
                    <p className="text-sm text-neutral-600 leading-relaxed font-medium bg-neutral-50/50 p-4 rounded-2xl border border-neutral-50">
                      {criterion.feedback}
                    </p>

                    {criterion.improvements.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                        {criterion.improvements.map((improvement, i) => (
                          <div key={i} className="flex items-center gap-2 group">
                             <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors shrink-0" />
                             <p className="text-xs text-neutral-500 font-bold group-hover:text-neutral-700 transition-colors uppercase tracking-tight">{improvement}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-8">
           {/* Sidebar Tip Suggestions */}
           <div className="bg-neutral-900 p-8 rounded-[2.5rem] shadow-2xl shadow-neutral-900/20 text-white space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-6">
                  <div className="p-2.5 bg-white/10 rounded-xl">
                    <Lightbulb size={20} className="text-primary" />
                  </div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest">Specific Tips</h3>
              </div>
              
              <div className="space-y-4">
                {essayFeedback.highlightedSuggestions.map((suggestion, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ x: 5 }}
                    className={`p-5 rounded-3xl border transition-all ${
                      suggestion.severity === 'high' ? 'bg-red-500/10 border-red-500/20' :
                      suggestion.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/20' :
                      'bg-white/5 border-white/10'
                    }`}
                  >
                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${
                      suggestion.severity === 'high' ? 'text-red-400' : 'text-primary'
                    }`}>
                      {suggestion.type}
                    </p>
                    <p className="text-xs font-bold leading-relaxed opacity-80">{suggestion.text}</p>
                  </motion.div>
                ))}
              </div>
           </div>

           {/* Call to Action */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 rounded-xl">
                    <Target size={20} className="text-emerald-500" />
                  </div>
                  <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Your Goal</h3>
              </div>
              
              <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                {essayFeedback.summary}
              </p>
              
              <div className="space-y-3 pt-4">
                <button className="w-full flex items-center justify-between gap-3 bg-neutral-900 text-white px-6 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-neutral-900/10 group">
                   Try Again
                   <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => navigate('/Student/MyEssays')}
                  className="w-full text-center py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-900 transition-colors"
                >
                   Close Report
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
