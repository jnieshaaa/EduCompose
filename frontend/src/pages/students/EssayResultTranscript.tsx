import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { readSecureParams } from "../../utils/secureUrl";
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { supabase } from "../../lib/supabaseClient";
import ArgumentKnowledgeGraph from "../../components/essay/ArgumentKnowledgeGraph";
import { exportTranscriptNative } from "../../services/pdfExportService";
import html2canvas from "html2canvas";

// --- Types ---
interface AnalysisData {
  scores?: {
    overall: number;
    grammar: number;
    readability: number;
    coherence: number;
    argument_strength: number;
    knowledge_graph?: number;
  };
  detailed_analysis?: {
    grammar?: {
      score?: number;
      errors: any[];
      error_count?: number;
      suggestions?: string[];
      syntax_patterns?: any;
    };
    argumentation?: {
        argument_structure?: {
            total_claims: number;
            total_grounds: number;
            total_warrants: number;
            total_rebuttals: number;
            total_qualifiers?: number;
        };
        graph?: any;
        metrics?: any;
        score?: number;
    };
    readability?: {
        score?: number;
        flesch_reading_ease?: number;
        flesch_kincaid_grade?: number;
        issues?: any[];
    };
    coherence?: {
        score?: number;
        coherence_issues?: any[];
        paragraph_unity?: number;
        entity_grid_score?: number;
    };
    knowledge_graph?: any;
  };
  plagiarism?: any;
  ai_detection?: any;
  original_text?: string;
  recommendations?: any[];
  diagnostic_summary?: any;
  rubric_scores?: any;
}

// --- Configuration ---
const HIGHLIGHT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  grammar: { bg: "#fee2e2", text: "#b91c1c", label: "Grammar" },
  spelling: { bg: "#fef3c7", text: "#92400e", label: "Spelling" },
  punctuation: { bg: "#dbeafe", text: "#1e40af", label: "Punctuation" },
  capitalization: { bg: "#dbeafe", text: "#1e40af", label: "Capitalization" },
  word_choice: { bg: "#f3e8ff", text: "#6b21a8", label: "Diction" },
};

// --- Main Page Component ---
export function EssayResultTranscript() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const essayId = useMemo(() => readSecureParams(location.search)?.essayId, [location.search]);
  const activityId = useMemo(() => readSecureParams(location.search)?.activityId, [location.search]);
  
  const [essay, setEssay] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!essayId || !user?.auth_id) return;
      try {
        setLoading(true);
        
        // 1. Fetch essay and activity metadata
        const { data: essayData, error: essayError } = await supabase
          .from("essays")
          .select("*, essay_activities(id, title, rubrics(id, name, criteria)), student:users!essays_student_id_fkey(first_name, last_name)")
          .eq("id", essayId)
          .single();

        if (essayError) throw essayError;
        setEssay(essayData);

        // 2. Use centralized fetchEssayAnalysis for scores and detailed data
        // This handles the new JSONB schema (grammar_results, etc.) automatically
        const { fetchEssayAnalysis, fetchDuplicateEssays } = await import("../../services/activityService");
        
        try {
          const analysisResult = await fetchEssayAnalysis(user.id, activityId, essayId);
          
          if (analysisResult && analysisResult.analysis) {
            const analysisData = analysisResult.analysis;
            
            setAnalysis({
              ...analysisData,
              original_text: analysisResult.text || essayData?.content || "",
              plagiarism: analysisResult.plagiarismResults,
              ai_detection: analysisResult.aiDetectionResults
            });
          }
        } catch (err) {
          console.error("[EssayResultTranscript] Error fetching analysis:", err);
          // Simple fallback for scores if fetchEssayAnalysis fails
          setAnalysis({
            scores: {
              overall: Number(essayData.overall_score) || 0,
              grammar: Number(essayData.grammar_score) || 0,
              readability: Number(essayData.readability_score) || 0,
              coherence: Number(essayData.coherence_score) || 0,
              argument_strength: Number(essayData.argument_strength_score) || 0,
            },
            original_text: essayData.content || ""
          } as any);
        }

        // 3. Fetch duplicates
        const dupeGroups = await fetchDuplicateEssays(String(essayData.activity_id));
        const myDupeGroup = dupeGroups.find(g => g.essays.some(e => e.essayId === essayId));
        if (myDupeGroup && myDupeGroup.essays.length > 1) {
            setDuplicates(myDupeGroup.essays.filter(e => e.essayId !== essayId));
        }

      } catch (err) {
        console.error("Error fetching report data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [essayId, user?.auth_id]);

  const handleDownload = async () => {
    try {
      setLoading(true);
      
      // Capture the graph as an image for the native PDF
      let graphImage = null;
      if (graphRef.current) {
          const canvas = await html2canvas(graphRef.current, {
              scale: 2,
              backgroundColor: '#ffffff',
              useCORS: true
          });
          graphImage = canvas.toDataURL("image/png");
      }

      // Use the native vector-based export instead of a screenshot
      await exportTranscriptNative({
        essay,
        analysis,
        scores,
        graphImage
      });
    } catch (err) {
      console.error("Native PDF Export Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const scores = useMemo(() => ({
    overall: Number(analysis?.scores?.overall) || 0,
    grammar: Number(analysis?.scores?.grammar) || 0,
    readability: Number(analysis?.scores?.readability) || 0,
    coherence: Number(analysis?.scores?.coherence) || 0,
    argument_strength: Number(analysis?.scores?.argument_strength) || 0,
  }), [analysis]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  const grammarErrors = analysis?.detailed_analysis?.grammar?.errors || [];

  return (
    <>
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-8 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-neutral-500 hover:text-neutral-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Essays
        </Button>
        <Button onClick={handleDownload} className="bg-neutral-900 hover:bg-black text-white rounded-xl shadow-xl">
          <Download className="w-4 h-4 mr-2" />
          Download Transcript
        </Button>
      </div>

      <div 
        ref={reportRef} 
        className="max-w-6xl mx-auto space-y-8 bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-neutral-100 relative overflow-hidden"
      > 
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center border-b border-neutral-100 pb-12 relative z-10">
          <div>
            <Badge variant="outline" className="mb-4 uppercase tracking-widest font-bold text-[10px] py-1 px-3 border-primary/20 text-primary bg-primary/5">Official Diagnostic Transcript</Badge>
            <h1 className="text-4xl font-bold text-neutral-900 tracking-tight leading-none mb-4">
              {essay?.essay_activities?.title || essay?.title || "Untitled Essay"}
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-400 font-medium">
              <span>File: {essay?.title}</span>
              <span>Submitted: {essay?.submitted_at ? new Date(essay.submitted_at).toLocaleDateString() : "N/A"}</span>
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end gap-12">
             <div className="relative w-48 h-48 drop-shadow-2xl">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                  {/* Each arc is roughly 25% of the 263.8 circumference (2 * pi * 42) */}
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f59e0b" strokeWidth="10" strokeDasharray={`${(scores.grammar / 100) * 65} 263.8`} strokeDashoffset="0" strokeLinecap="round" className="transition-all duration-1000" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray={`${(scores.readability / 100) * 65} 263.8`} strokeDashoffset="-66" strokeLinecap="round" className="transition-all duration-1000" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#0ea5e9" strokeWidth="10" strokeDasharray={`${(scores.coherence / 100) * 65} 263.8`} strokeDashoffset="-132" strokeLinecap="round" className="transition-all duration-1000" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#8b5cf6" strokeWidth="10" strokeDasharray={`${(scores.argument_strength / 100) * 65} 263.8`} strokeDashoffset="-198" strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-black text-neutral-900 leading-none">{Math.round(scores.overall)}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-1">Grade</span>
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-x-12 gap-y-6">
               <div className="min-w-[100px]">
                 <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Grammar</p>
                 <p className="text-2xl font-bold text-neutral-900">{Math.round(scores.grammar)}%</p>
               </div>
               <div className="min-w-[100px]">
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Readability</p>
                 <p className="text-2xl font-bold text-neutral-900">{Math.round(scores.readability)}%</p>
               </div>
               <div className="min-w-[100px]">
                 <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-1">Coherence</p>
                 <p className="text-2xl font-bold text-neutral-900">{Math.round(scores.coherence)}%</p>
               </div>
               <div className="min-w-[100px]">
                 <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">Argument</p>
                 <p className="text-2xl font-bold text-neutral-900">{Math.round(scores.argument_strength)}%</p>
               </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><div className="w-1 h-4 bg-primary" />Essay Manuscript</h3>
                <Card variant="glass" className="p-8 border-neutral-100 bg-neutral-50/30 min-h-[500px]">
                    <StaticHighlighter text={analysis?.original_text || ""} errors={grammarErrors} />
                </Card>
            </div>

            <div className="space-y-8">
                <div>
                   <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mb-6">Grammar Diagnostics</h3>
                   <div className="space-y-4">
                     {Object.entries(HIGHLIGHT_COLORS).map(([type, color]) => {
                       const errorsOfType = grammarErrors.filter(e => (e.type || 'grammar').toLowerCase() === type);
                       if (errorsOfType.length === 0) return null;
                       return (
                         <div key={type} className="group transition-all">
                           <div className="flex items-center gap-2 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color.text }} />
                              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: color.text }}>{color.label}</span>
                              <span className="text-[10px] font-bold text-neutral-300">({errorsOfType.length})</span>
                           </div>
                           <ul className="space-y-1 block pl-4 border-l border-neutral-100">
                             {errorsOfType.slice(0, 3).map((e, i) => (
                               <li key={i} className="text-[11px] text-neutral-500 leading-tight py-1">{e.message}</li>
                             ))}
                           </ul>
                         </div>
                       );
                     })}
                     {grammarErrors.length === 0 && <p className="text-xs text-neutral-400 italic">No diagnostic anomalies detected.</p>}
                   </div>
                </div>

                <div className="pt-8 border-t border-neutral-100">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><div className="w-1 h-4 bg-emerald-500" />Feedback Summary</h3>
                    <div className="space-y-4">
                         <div className="bg-emerald-50/50 p-4 rounded-2xl">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Key Strength</h4>
                             <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                                 {analysis?.diagnostic_summary?.strengths?.[0] || analysis?.recommendations?.find(r => r.type === 'strength')?.message || "Strong linguistic execution detected."}
                             </p>
                         </div>
                         <div className="bg-amber-50/50 p-4 rounded-2xl">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Opportunity</h4>
                             <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                                 {analysis?.diagnostic_summary?.weaknesses?.[0] || analysis?.recommendations?.find(r => r.type === 'suggestion')?.message || "Consider expanding on evidentiary grounds."}
                             </p>
                         </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="pt-12 border-t border-neutral-100">
             <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><div className="w-1 h-4 bg-sky-500" />Argument Architecture</h3>
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                 <div ref={graphRef} className="lg:col-span-3 bg-white border border-neutral-100 rounded-[2.5rem] min-h-[450px] shadow-inner relative group p-6 overflow-hidden">
                    <ArgumentKnowledgeGraph 
                       graph={analysis?.detailed_analysis?.argumentation?.graph || analysis?.detailed_analysis?.knowledge_graph} 
                       metrics={analysis?.detailed_analysis?.argumentation?.metrics}
                    />
                 </div>
                 <div className="space-y-4">
                      {[
                        { label: 'Claims', val: analysis?.detailed_analysis?.argumentation?.argument_structure?.total_claims || 0, color: 'text-sky-600' },
                        { label: 'Grounds', val: analysis?.detailed_analysis?.argumentation?.argument_structure?.total_grounds || 0, color: 'text-emerald-600' },
                        { label: 'Rebuttals', val: analysis?.detailed_analysis?.argumentation?.argument_structure?.total_rebuttals || 0, color: 'text-red-500' },
                      ].map(stat => (
                        <div key={stat.label} className="bg-white border border-neutral-100 p-4 rounded-2xl shadow-sm">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">{stat.label}</p>
                           <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
                        </div>
                      ))}
                 </div>
             </div>
        </div>

        <div className="pt-12 border-t border-neutral-100">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mb-8">Academic Integrity & Protocols</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <IntegrityCard 
                   label="AI Detection Score" 
                   value={analysis?.ai_detection?.ai_score || 0} 
                   isFlagged={analysis?.ai_detection?.is_ai_generated || (analysis?.ai_detection as any)?.is_ai} 
                 />
                 <IntegrityCard 
                   label="Plagiarism Index" 
                   value={analysis?.plagiarism?.plagiarism_percentage || 0} 
                   isFlagged={analysis?.plagiarism?.is_plagiarized} 
                   link={typeof analysis?.plagiarism === 'string' ? analysis.plagiarism : (analysis?.plagiarism?.report_url || analysis?.plagiarism?.url || analysis?.plagiarism?.link || (analysis?.plagiarism?.matches?.[0]?.url))}
                 />
                 <IntegrityCard label="Class Similarity" value={duplicates.length > 0 ? 100 : 0} isFlagged={duplicates.length > 0} desc={duplicates.length > 0 ? `Matches with ${duplicates.length} records` : "No identical submissions found."} />
            </div>
        </div>

        <div className="pt-12 text-center border-t border-neutral-100 opacity-20">
            <p className="text-[10px] font-black uppercase tracking-[1em]">Official EduCompose Diagnostic Certificate 2026</p>
        </div>
      </div>
    </>
  );
}

function IntegrityCard({ label, value, isFlagged, desc, link }: any) {
  return (
    <div className="bg-neutral-50/50 border border-neutral-100 p-6 rounded-[2rem] shadow-sm flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{label}</p>
            {isFlagged ? <AlertCircle className="w-5 h-5 text-amber-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        </div>
        <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-neutral-900">{value}%</span>
            <span className="text-[10px] font-bold text-neutral-400">Index</span>
        </div>
        <p className="text-[11px] font-medium text-neutral-500 leading-relaxed mb-4">{desc || (isFlagged ? "Elevated markers detected. Manual review suggested." : "No significant risk markers detected.")}</p>
        
        {link && (
          <div className="mt-auto pt-2">
            <a 
              href={link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-600 transition-colors"
            >
              View Full Report <ArrowLeft className="w-3 h-3 ml-1 rotate-180" />
            </a>
          </div>
        )}
    </div>
  );
}

function StaticHighlighter({ text, errors }: { text: string, errors: any[] }) {
  const normalizedText = useMemo(() => {
    if (!text) return "";
    return text.replace(/\n/g, " ").replace(/\r/g, " ").replace(/\t/g, " ");
  }, [text]);

  if (!normalizedText) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 opacity-30">
        <FileText className="w-12 h-12 mb-2" />
        <p className="text-sm font-medium">Draft text unavailable</p>
      </div>
    );
  }

  const sortedErrors = [...errors].sort((a, b) => a.offset - b.offset);
  const segments = [];
  let cursor = 0;

  sortedErrors.forEach((error, i) => {
    if (error.offset < cursor) return;
    if (error.offset > normalizedText.length) return;

    if (error.offset > cursor) {
      segments.push(normalizedText.slice(cursor, error.offset));
    }

    const type = (error.type || "grammar").toLowerCase();
    const color = HIGHLIGHT_COLORS[type] || HIGHLIGHT_COLORS.grammar;
    const end = Math.min(error.offset + error.errorLength, normalizedText.length);

    segments.push(
      <mark
        key={i}
        className="font-medium cursor-default transition-all"
        style={{
          backgroundColor: color.bg,
          color: color.text,
          borderRadius: "4px",
          padding: "1px 2px",
          margin: "0 1px",
        }}
        title={error.message}
      >
        {normalizedText.slice(error.offset, end)}
      </mark>
    );
    cursor = end;
  });

  if (cursor < normalizedText.length) {
    segments.push(normalizedText.slice(cursor));
  }

  return (
    <div className="whitespace-pre-line leading-relaxed tracking-normal text-neutral-800 font-serif">
      {segments}
    </div>
  );
}
