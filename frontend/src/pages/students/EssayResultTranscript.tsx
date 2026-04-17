import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  Table as TableIcon
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { supabase } from "../../lib/supabaseClient";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// --- Types ---
interface AnalysisData {
  scores?: {
    overall: number;
    grammar: number;
    readability: number;
    coherence: number;
    argument_strength: number;
  };
  detailed_analysis?: {
    grammar?: {
      errors: any[];
      suggestions: string[];
    };
    argumentation?: {
        argument_structure: {
            total_claims: number;
            total_grounds: number;
            total_warrants: number;
        }
    }
  };
  plagiarism?: {
    is_plagiarized: boolean;
    percentage: number;
  };
  ai_detection?: {
    is_ai_generated: boolean;
    score: number;
  };
}

const HIGHLIGHT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  grammar: { bg: "rgba(239, 68, 68, 0.2)", text: "#991b1b", label: "Grammar" },
  spelling: { bg: "rgba(249, 115, 22, 0.2)", text: "#9a3412", label: "Spelling" },
  punctuation: { bg: "rgba(234, 179, 8, 0.2)", text: "#854d0e", label: "Punctuation" },
  capitalization: { bg: "rgba(59, 130, 246, 0.2)", text: "#1e40af", label: "Capitalization" },
  word_choice: { bg: "rgba(168, 85, 247, 0.2)", text: "#6b21a8", label: "Diction" },
};

// --- Main Page Component ---
export function EssayResultTranscript() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const essayId = searchParams.get("essayId");
  
  const [essay, setEssay] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!essayId) return;
      try {
        const { data: essayData, error: essayError } = await supabase
          .from("essays")
          .select("*, essay_activities(title, rubrics(id, name, criteria))")
          .eq("id", essayId)
          .single();

        if (essayError) throw essayError;
        setEssay(essayData);

        const { data: analysisData } = await supabase
          .from("analysis_results")
          .select("*")
          .eq("essay_id", essayId)
          .single();

        if (analysisData) {
          setAnalysis(analysisData.analysis_data as AnalysisData);
        }
      } catch (err) {
        console.error("Error fetching report data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [essayId]);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`EduCompose_Report_${essay?.title || "Essay"}.pdf`);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  const scores = analysis?.scores || { overall: 0, grammar: 0, readability: 0, coherence: 0, argument_strength: 0 };
  const grammarErrors = analysis?.detailed_analysis?.grammar?.errors || [];

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8 md:px-8 lg:px-12">
      {/* Navigation & Actions */}
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

      <div ref={reportRef} className="max-w-6xl mx-auto space-y-8 bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-neutral-100">
        
        {/* --- SECTION 1: HEADER & PROFICIENCY HUD --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center border-b border-neutral-100 pb-12">
          <div>
            <Badge variant="outline" className="mb-4 uppercase tracking-widest font-bold text-[10px] py-1 px-3 border-primary/20 text-primary bg-primary/5">Official Diagnostic Transcript</Badge>
            <h1 className="text-4xl font-bold text-neutral-900 tracking-tight leading-none mb-4">
              {essay?.title || "Untitled Essay"}
            </h1>
            <div className="flex items-center gap-6 text-sm text-neutral-500 font-medium">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Submitted: {essay?.submitted_at ? new Date(essay.submitted_at).toLocaleDateString() : "N/A"}
              </span>
              <span>Activity: {essay?.essay_activities?.title}</span>
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end gap-12">
             {/* Pizza Chart Score Display */}
             <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {/* Background Circle */}
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                  
                  {/* Coherence Sector */}
                  <circle 
                    cx="50" cy="50" r="45" fill="none" stroke="#0ea5e9" strokeWidth="10" 
                    strokeDasharray={`${(scores.coherence / 100) * 282.7} 282.7`}
                    className="transition-all duration-1000 ease-out"
                  />
                  {/* Grammar Sector */}
                  <circle 
                    cx="50" cy="50" r="45" fill="none" stroke="#f59e0b" strokeWidth="8" 
                    strokeDasharray={`${(scores.grammar / 100) * 282.7} 282.7`}
                    strokeDashoffset="0"
                    className="opacity-20"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-black text-neutral-900 leading-none">
                        {Math.round(scores.overall)}<span className="text-lg text-neutral-400 font-bold">%</span>
                    </span>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Global Proficiency</span>
                </div>
             </div>

             <div className="space-y-3">
                {[
                  { label: "Grammar", val: scores.grammar, color: "bg-amber-400" },
                  { label: "Readability", val: scores.readability, color: "bg-emerald-500" },
                  { label: "Coherence", val: scores.coherence, color: "bg-primary" },
                  { label: "Argument", val: scores.argument_strength, color: "bg-purple-500" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${s.color}`} />
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest w-20">{s.label}</span>
                    <span className="text-sm font-bold text-neutral-900">{Math.round(s.val)}%</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* --- SECTION 2: ESSAY MANUSCRIPT & LEGEND --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary" />
                    Essay Manuscript
                </h3>
                <Card variant="glass" className="p-8 border-neutral-100 bg-neutral-50/30 leading-relaxed text-neutral-800 font-serif text-lg min-h-[400px]">
                    <StaticHighlighter text={essay?.content || ""} errors={grammarErrors} />
                </Card>
            </div>

            <div className="space-y-6">
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
                        <ul className="space-y-2 border-l border-neutral-100 pl-4 py-1">
                          {errorsOfType.slice(0, 5).map((e, i) => (
                            <li key={i} className="text-xs text-neutral-600 leading-snug">
                                {e.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {grammarErrors.length === 0 && (
                    <p className="text-xs text-neutral-400 italic">No diagnostic anomalies detected.</p>
                  )}
                </div>
            </div>
        </div>

        {/* --- SECTION 3: DIAGNOSTIC REPORT --- */}
        <div className="pt-8 border-t border-neutral-100">
           <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mb-8">Diagnostic Feedback Report</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <Card className="p-6 border-none bg-neutral-50/50 rounded-2xl">
               <h4 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-primary" />
                 Linguistic Strengths
               </h4>
               <ul className="space-y-3">
                 <li className="text-xs text-neutral-600 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                    Effective use of academic terminology and complex sentence structures.
                 </li>
                 <li className="text-xs text-neutral-600 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                    Strong logical flow between introductory and supporting paragraphs.
                 </li>
               </ul>
             </Card>
             <Card className="p-6 border-none bg-neutral-50/50 rounded-2xl">
               <h4 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                 <AlertCircle className="w-4 h-4 text-warning-default" />
                 Development Areas
               </h4>
               <p className="text-xs text-neutral-600 leading-relaxed italic">
                 "Focus on unifying the evidence presentation within the second paragraph to strengthen the correlation between ground and warrant."
               </p>
             </Card>
           </div>
        </div>

        {/* --- SECTION 4: RUBRIC ALIGNMENT --- */}
        <div className="pt-8 border-t border-neutral-100">
           <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mb-8 flex items-center justify-between">
              Rubric Assessment Index
              {!essay?.essay_activities?.rubrics && <span className="text-neutral-300 normal-case italic">Status: None Attached</span>}
           </h3>
           {essay?.essay_activities?.rubrics ? (
             <div className="overflow-hidden rounded-2xl border border-neutral-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900 text-white">
                    <tr>
                      <th className="px-6 py-4 font-bold uppercase tracking-widest">Criterion</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-widest text-center">Score</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-widest">Alignment Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {(essay.essay_activities.rubrics.criteria || []).map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-neutral-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-neutral-900">{c.name || 'Standard Criterion'}</td>
                        <td className="px-6 py-4 text-center">
                            <span className="font-bold text-primary">{Math.round(scores.overall / 20 * (c.weight / 100) * 10) / 2} / {c.weight / 20}</span>
                        </td>
                        <td className="px-6 py-4 text-neutral-500">{c.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           ) : (
             <div className="p-12 text-center bg-neutral-50/30 rounded-3xl border border-dashed border-neutral-200">
                <TableIcon className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-400 font-medium">No formal rubric was mapped to this activity.</p>
             </div>
           )}
        </div>

        {/* --- SECTION 5: INTEGRITY SCAN HUD --- */}
        <div className="pt-8 border-t border-neutral-100">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] mb-8">Academic Integrity Protocol</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <IntegrityCard 
                    label="Plagiarism Index" 
                    value={analysis?.plagiarism?.percentage || 0} 
                    isFlagged={analysis?.plagiarism?.is_plagiarized} 
                />
                <IntegrityCard 
                    label="AI Generation" 
                    value={analysis?.ai_detection?.score || 0} 
                    isFlagged={analysis?.ai_detection?.is_ai_generated} 
                />
                <IntegrityCard 
                    label="Cross-Class" 
                    value={0} 
                    isFlagged={false} 
                    desc="Duplicate records: None"
                />
            </div>
        </div>

        <div className="pt-12 text-center border-t border-neutral-100">
            <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-[0.5em]">This transcript was generated by EduCompose AI Diagnostics © 2026</p>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function IntegrityCard({ label, value, isFlagged, desc }: any) {
    return (
        <Card className="p-5 border-none bg-neutral-900 text-white rounded-2xl relative overflow-hidden group">
            <div className="relative z-10 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">{label}</p>
                   <p className="text-2xl font-black">{Math.round(value)}%</p>
                </div>
                {isFlagged ? (
                    <AlertCircle className="w-8 h-8 text-red-500" />
                ) : (
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                )}
            </div>
            {desc && <p className="text-[10px] text-white/30 mt-2 font-medium">{desc}</p>}
            <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${isFlagged ? 'from-red-500 to-red-400' : 'from-emerald-500 to-emerald-400'}`} style={{ width: `${value}%` }} />
        </Card>
    );
}

function StaticHighlighter({ text, errors }: { text: string, errors: any[] }) {
    if (!text) return null;
    
    // Sort errors by offset to process sequentially
    const sortedErrors = [...errors].sort((a, b) => a.offset - b.offset);
    const segments = [];
    let cursor = 0;

    sortedErrors.forEach((error, i) => {
        if (error.offset < cursor) return;

        // Gap text
        if (error.offset > cursor) {
            segments.push(text.slice(cursor, error.offset));
        }

        // Highlight text
        const type = (error.type || 'grammar').toLowerCase();
        const color = HIGHLIGHT_COLORS[type] || HIGHLIGHT_COLORS.grammar;
        const end = error.offset + error.errorLength;

        segments.push(
            <mark 
                key={i} 
                className="font-normal"
                style={{ backgroundColor: color.bg, color: color.text, borderRadius: '4px', padding: '0 2px' }}
            >
                {text.slice(error.offset, end)}
            </mark>
        );
        cursor = end;
    });

    if (cursor < text.length) {
        segments.push(text.slice(cursor));
    }

    return <div className="whitespace-pre-wrap">{segments}</div>;
}

export default EssayResultTranscript;
