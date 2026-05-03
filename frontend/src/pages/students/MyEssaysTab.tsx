import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Eye, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Zap, 
  Filter,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildSecureUrl } from '../../utils/secureUrl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { getErrorMessage } from '../../utils/errorUtils';
import { supabase } from '../../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

export function MyEssaysTab() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [essaysData, setEssaysData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEssays = async () => {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user) return;

        const { data: student } = await supabase
          .from('users')
          .select(`
            id,
            student_profiles!user_id ( student_code )
          `)
          .eq('id', authUser.user.id)
          .maybeSingle();

        if (!student) return;
        const studentCode = (student.student_profiles as any)?.[0]?.student_code;

        const { data: essaysData, error } = await supabase
          .from('essays')
          .select('id, title, file_path, content, submitted_at, status, essay_activities(id, title)')
          .eq('student_id', student.id)
          .order('submitted_at', { ascending: false });

        if (error) throw error;

        // Fetch analysis results for analyzed essays
        const analyzedEssayIds = (essaysData || []).filter(e => e.status === 'analyzed' || e.status === 'reviewed').map(e => e.id);
        const analysisMap = new Map();
        if (analyzedEssayIds.length > 0) {
          const { data: analysisRows } = await supabase
            .from('essay_analysis_results')
            .select('essay_id, overall_score')
            .in('essay_id', analyzedEssayIds);
          
          (analysisRows || []).forEach(r => analysisMap.set(String(r.essay_id), r));
        }

        const formattedData = (essaysData || []).map(e => {
          const analysis = analysisMap.get(String(e.id));
          return {
            id: e.id,
            title: (e.essay_activities as any)?.title || 'Untitled Assignment',
            filename: e.title || 'No name',
            submitted: new Date(e.submitted_at).toLocaleDateString(),
            status: e.status === 'reviewed' ? 'Teacher Checked' : (e.status === 'analyzed' ? 'Done' : 'Sent'),
            aiScore: (e.status === 'analyzed' || e.status === 'reviewed') ? (analysis?.overall_score ?? null) : null,
            hasAiFeedback: e.status === 'analyzed' || e.status === 'reviewed',
            hasTeacherFeedback: e.status === 'reviewed',
            activityId: (e.essay_activities as any)?.id,
            studentCode: studentCode,
            filePath: e.file_path,
            content: e.content,
          };
        });
        setEssaysData(formattedData);
      } catch (error) {
        console.error('Error fetching essays:', error);
        setError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchEssays();

    // Realtime listener for essay updates (grading/deletion)
    let channel: any;
    
    const setupSubscription = async () => {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) return;

      channel = supabase
        .channel(`student-essays-${authUser.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'essays',
            filter: `student_id=eq.${authUser.user.id}`,
          },
          () => {
            fetchEssays();
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const filteredEssays = useMemo(() => {
    return essaysData.filter(essay =>
      essay.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [essaysData, searchQuery]);

  const stats = useMemo(() => {
    const total = essaysData.length;
    const reviewed = essaysData.filter(e => e.hasTeacherFeedback).length;
    const pending = total - reviewed;
    const scores = essaysData.filter(e => e.aiScore !== null).map(e => e.aiScore);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + '%' : '0%';
    
    return { total, reviewed, pending, avgScore };
  }, [essaysData]);

  if (loading && essaysData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Opening your folder...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Something went wrong</h2>
        <p className="text-sm font-medium text-neutral-400 max-w-sm mb-8">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2.5 bg-neutral-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-neutral-800 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (essaysData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 bg-neutral-50 rounded-[2rem] flex items-center justify-center mb-8"
        >
          <FileText size={48} className="text-neutral-200" />
        </motion.div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2 tracking-tight">No work sent yet</h2>
        <p className="text-sm font-medium text-neutral-400 max-w-sm mb-10 leading-relaxed">
          You haven't sent any essays yet. Send your first assignment to get AI tips and improve your writing!
        </p>
        {/* <button 
          onClick={() => navigate('/Student/Submit')}
          className="group flex items-center gap-3 bg-neutral-900 text-white px-8 py-3.5 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-primary/10"
        >
          Send My First Work
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button> */}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'All Work', value: stats.total, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Teacher Checked', value: stats.reviewed, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Waiting', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Total Score', value: stats.avgScore, icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon size={18} />
            </div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
          <input
            type="text"
            placeholder="Find by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-5 h-14 bg-white border border-neutral-100 rounded-3xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary/50 outline-none transition-all shadow-sm"
          />
        </div>
        <button className="h-14 px-6 bg-white border border-neutral-100 rounded-3xl flex items-center gap-2 text-[11px] font-bold text-neutral-400 uppercase tracking-widest hover:bg-neutral-50 transition-all shadow-sm">
          <Filter size={14} />
          All Progress
        </button>
      </div>

      {/* Main Table Card */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50/50 hover:bg-neutral-50/50 border-b border-neutral-50">
                <TableHead className="py-5 px-6 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Assignment Name</TableHead>
                <TableHead className="text-center text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Sent On</TableHead>
                <TableHead className="text-center text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Progress</TableHead>
                <TableHead className="text-center text-[11px] font-bold text-neutral-400 uppercase tracking-widest">AI Score</TableHead>
                <TableHead className="text-right px-6 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredEssays.map((essay, idx) => (
                  <motion.tr 
                    key={essay.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group hover:bg-neutral-50/50 border-b border-neutral-50 last:border-0 transition-all"
                  >
                    <TableCell className="py-4 px-6">
                      <div className="font-bold text-neutral-800 tracking-tight text-sm mb-0.5 group-hover:text-primary transition-colors">
                        {essay.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                        <FileText size={10} />
                        {essay.filename}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-[11px] font-bold text-neutral-500">{essay.submitted}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide
                        ${essay.status === 'Teacher Checked' || essay.status === 'Done' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-amber-50 text-amber-600'}`}>
                        {essay.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-neutral-800">
                        {essay.aiScore !== null ? `${essay.aiScore}%` : <span className="text-neutral-200">--</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            const url = buildSecureUrl("/Student/Essays/Result", {
                              essayId: essay.id,
                              activityId: essay.activityId,
                              activityTitle: essay.title,
                              studentId: essay.studentCode,
                              fromEssays: "true"
                            });
                            navigate(url);
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all group/btn"
                          title="See Score"
                        >
                          <Eye size={14} />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Score</span>
                        </button>
                        
                        <button 
                          onClick={async () => {
                            try {
                              if (essay.filePath) {
                                // Download from storage
                                const { data, error } = await supabase.storage
                                  .from('essays')
                                  .download(essay.filePath);
                                
                                if (error) {
                                  if (error.message.includes("Object not found")) {
                                    alert("The file could not be found in storage. It may have been removed.");
                                  } else if (error.message.includes("download is not allowed")) {
                                    alert("Access denied. Please check if the storage bucket permissions are set correctly.");
                                  } else {
                                    throw error;
                                  }
                                  return;
                                }
                                
                                const url = window.URL.createObjectURL(data);
                                const link = document.createElement('a');
                                link.href = url;
                                
                                // Clean filename - use filename if provided, else derive from path
                                let finalFilename = essay.filename || 'essay-file';
                                if (finalFilename === 'No name' && essay.filePath) {
                                  finalFilename = essay.filePath.split('/').pop() || 'essay-file';
                                }
                                
                                link.setAttribute('download', finalFilename);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                window.URL.revokeObjectURL(url);
                              } else if (essay.content) {
                                // Download content as text file
                                const blob = new Blob([essay.content], { type: 'text/plain' });
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', `${essay.title || 'essay'}.txt`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                window.URL.revokeObjectURL(url);
                              } else {
                                alert("No file or content available for this essay.");
                              }
                            } catch (err: any) {
                              console.error("Download failed:", err);
                              alert(`Download failed: ${err.message || "Unknown error"}`);
                            }
                          }}
                          className="p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-all border border-transparent hover:border-neutral-200"
                          title="Download File"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
          {filteredEssays.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-[11px] font-bold text-neutral-300 uppercase tracking-widest">Nothing found with that name</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
