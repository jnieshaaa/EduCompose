import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Upload, FileText, X, Clock, AlertCircle, Loader2, Info, CheckCircle, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { buildFullNameFromObject } from '../../utils/nameUtils';
import { readSecureParams, buildSecureUrl } from '../../utils/secureUrl';
import { getErrorMessage } from '../../utils/errorUtils';
import { useNotification } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface ActivityDetails {
  id: string;
  title: string;
  course: string;
  instructor: string;
  deadline: string;
  instructions: string;
  courseId: string;
  term: string;
  teacherId: string;
  teacherUUID: string;
  minWordCount: number;
}

interface SidebarPost {
  id: number;
  title: string;
  date: string;
  isOverdue: boolean;
  isSubmitted: boolean;
  isCurrent: boolean;
}

export function SubmitEssayTab() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const secureParams = readSecureParams(window.location.search);
  const activityIdParam = secureParams?.activityId || searchParams.get('activityId');
  const classId = secureParams?.classId || searchParams.get('classId');
  const blockId = secureParams?.blockId || searchParams.get('blockId');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityDetails | null>(null);
  const [posts, setPosts] = useState<SidebarPost[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('my-work');
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('text');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [essayContent, setEssayContent] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionDate, setSubmissionDate] = useState<string | null>(null);
  const [isResubmitRequested, setIsResubmitRequested] = useState(false);
  const [requestingResubmission, setRequestingResubmission] = useState(false);
  const [essayScore, setEssayScore] = useState<number | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      if (!user?.auth_id || !activityIdParam) return;

      try {
        setLoading(true);
        setError(null);

        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('auth_user_id', user.auth_id)
          .maybeSingle();

        if (studentError) throw studentError;
        if (!studentData) {
          setError("Student record not found.");
          return;
        }
        setStudentId(studentData.id);

        const { data: actRow, error: actError } = await supabase
          .from('essay_activities')
          .select(`
            *,
            teacher:users (
              title,
              nickname,
              first_name,
              last_name,
              auth_user_id
            )
          `)
          .eq('id', activityIdParam)
          .maybeSingle();

        if (actError) throw actError;

        let courseCode = "N/A";
        if (actRow.course_id && actRow.course_id.length > 0) {
          const { data: courseData } = await supabase
            .from('courses')
            .select('course_code, course_title')
            .eq('id', actRow.course_id[0])
            .maybeSingle();
          if (courseData) {
            courseCode = `${courseData.course_code}`;
          }
        }

        const instructorName = actRow.teacher 
          ? (actRow.teacher.title && actRow.teacher.nickname 
              ? `${actRow.teacher.title} ${actRow.teacher.nickname}` 
              : buildFullNameFromObject(actRow.teacher))
          : "TBA";

        setActivity({
          id: String(actRow.id),
          title: actRow.title,
          course: courseCode,
          instructor: instructorName,
          deadline: actRow.due_date ? new Date(actRow.due_date).toLocaleString(undefined, {
             weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          }) : "No deadline",
          instructions: actRow.instructions || "No instructions provided.",
          courseId: actRow.course_id?.[0] || "",
          term: actRow.term || "N/A",
          teacherId: actRow.teacher_id,
          teacherUUID: actRow.teacher?.auth_user_id || "",
          minWordCount: actRow.min_word_count || 150
        });

        const { data: essayData } = await supabase
          .from('essays')
          .select('*')
          .eq('activity_id', activityIdParam)
          .eq('student_id', studentData.id)
          .maybeSingle();

        if (essayData) {
          setIsSubmitted(true);
          setEssayContent(essayData.content || '');
          setSubmissionDate(new Date(essayData.submitted_at).toLocaleDateString(undefined, {
             month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
          }));
          setEssayScore(essayData.overall_score || null);
          if (essayData.title) {
            setSelectedFileName(essayData.title);
          } else if (essayData.file_path) {
            setSelectedFileName(essayData.file_path.split('/').pop() || 'Submitted File');
          }

          const { data: requestData } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', actRow.teacher_id)
            .eq('type', 'resubmission_request')
            .eq('related_id', activityIdParam)
            .ilike('message', `%${user.nickname || `${user.first_name} ${user.last_name}`}%`)
            .maybeSingle();

          if (requestData) {
            setIsResubmitRequested(true);
          }
        }

        if (actRow.course_id && actRow.course_id.length > 0) {
          const { data: allActs } = await supabase
            .from('essay_activities')
            .select('id, title, due_date')
            .contains('course_id', [actRow.course_id[0]])
            .order('created_at', { ascending: false })
            .limit(10);

          const actIds = allActs?.map(a => a.id) || [];
          const { data: allSubmissions } = await supabase
            .from('essays')
            .select('activity_id')
            .eq('student_id', studentData.id)
            .in('activity_id', actIds);

          const submittedIds = new Set(allSubmissions?.map(s => s.activity_id) || []);

          if (allActs) {
            setPosts(allActs.map(a => ({
              id: a.id,
              title: a.title,
              date: a.due_date ? new Date(a.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "No date",
              isOverdue: a.due_date ? new Date(a.due_date) < new Date() : false,
              isSubmitted: submittedIds.has(a.id),
              isCurrent: String(a.id) === String(activityIdParam)
            })));
          }
        }

      } catch (error) {
        console.error("Error loading submit page:", error);
        setError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [user?.auth_id, activityIdParam]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        showNotification('error', "File is too large. Wrap up at 10MB!");
        return;
      }
      setSelectedFile(file);
      setSelectedFileName(file.name);
    }
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const validateTextEssayQuality = (text: string): string | null => {
    const cleaned = text.trim();
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const alphaTokens = tokens.filter((t) => /[a-zA-Z]/.test(t));
    
    if (tokens.length < (activity?.minWordCount || 150)) {
      return `Your essay is a bit short. Try to reach ${activity?.minWordCount || 150} words!`;
    }
    
    const alphaRatio = tokens.length > 0 ? alphaTokens.length / tokens.length : 0;
    if (alphaRatio < 0.6) {
      return "Hmm, this doesn't look like an essay. Please use full words and sentences.";
    }
    
    return null;
  };

  const handleSubmit = async () => {
    if (!studentId || !activityIdParam) return;
    if (uploadMode === 'text' && !essayContent.trim()) return;
    if (uploadMode === 'file' && !selectedFile) return;

    if (uploadMode === 'text') {
      const qualityError = validateTextEssayQuality(essayContent);
      if (qualityError) {
        showNotification('warning', qualityError);
        return;
      }
    }

    try {
      setLoading(true);

      let filePath = null;
      if (uploadMode === 'file' && selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        filePath = `essays/${activityIdParam}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('essays')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;
      }

      const { error: submitError } = await supabase
        .from('essays')
        .insert({
          student_id: studentId,
          activity_id: activityIdParam,
          block_id: blockId || null,
          teacher_id: activity?.teacherId || null,
          content: uploadMode === 'text' ? essayContent : null,
          file_path: filePath,
          title: selectedFileName || activity?.title || "Essay Work",
          status: 'submitted'
        });

      if (submitError) throw submitError;

      setIsSubmitted(true);
      setSubmissionDate(new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
      
      if (uploadMode === 'file' && selectedFile) {
        setSelectedFileName(selectedFile.name);
      }

      if (activity?.teacherId) {
        const studentName = user?.nickname || (user ? `${user.first_name} ${user.last_name}` : "") || "A student";
        
        await supabase
          .from('notifications')
          .insert({
            user_id: activity.teacherUUID,
            type: 'submission_received',
            title: 'New Essay Work',
            message: `${studentName} sent their work: "${activity.title}".`,
            related_id: activity.id,
            related_type: 'essay_activities'
          });
      }
      
      showNotification('success', "Work sent successfully!");
    } catch (err) {
      console.error("Submission error:", err);
      showNotification('error', "Couldn't send your work. Try again!");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResubmission = async () => {
    if (!activity?.teacherId || !activityIdParam || isResubmitRequested) return;

    try {
      setRequestingResubmission(true);
      const studentName = user?.nickname || (user ? `${user.first_name} ${user.last_name}` : "") || "A student";
      
      const { error: requestError } = await supabase
        .from('notifications')
        .insert({
          user_id: activity.teacherUUID,
          type: 'resubmission_request',
          title: 'Resubmit Request',
          message: `${studentName} wants to fix their work for: "${activity.title}".`,
          related_id: activity.id,
          related_type: 'essay_activities'
        });

      if (requestError) throw requestError;

      setIsResubmitRequested(true);
      showNotification('success', "Ask sent! Your teacher will check it.");
    } catch (err: any) {
      showNotification('error', "Couldn't send request. Try again!");
    } finally {
      setRequestingResubmission(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Loading the task details...</p>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2 tracking-tight">Oops!</h2>
        <p className="text-sm font-medium text-neutral-400 max-w-sm mb-10 leading-relaxed">
          {error || "We couldn't find this task."}
        </p>
        <button 
          onClick={() => navigate('/Student/Classes')}
          className="bg-neutral-900 text-white px-8 py-3.5 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-900/10"
        >
          Back to Classes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full pb-20">
      
      {/* Header Area */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-900/5 mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full translate-x-12 -translate-y-12" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shrink-0">
                 <FileText size={24} className="text-primary fill-primary/20" />
              </div>
              <div>
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded uppercase tracking-widest">{activity.course}</span>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">• Group {blockId?.slice(0, 4) || '---'}</span>
                 </div>
                 <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{activity.title}</h1>
              </div>
           </div>
           <div className="flex items-center gap-6 text-right">
              <div className="space-y-0.5">
                 <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Teacher</p>
                 <p className="text-sm font-bold text-neutral-600">{activity.instructor}</p>
              </div>
              <div className="w-px h-8 bg-neutral-100 hidden md:block" />
              <div className="space-y-0.5">
                 <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Submission Deadline</p>
                 <p className={`text-sm font-bold ${activity.deadline.includes('No') ? 'text-neutral-400' : 'text-red-500'}`}>
                    {activity.deadline}
                 </p>
              </div>
           </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Main Section */}
        <div className="lg:col-span-3 space-y-8">
          
          <div className="flex items-center gap-2 p-1.5 bg-neutral-100/50 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab('details')}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'details' ? 'bg-white text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              Task Details
            </button>
            <button 
              onClick={() => setActiveTab('my-work')}
              className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'my-work' ? 'bg-white text-primary shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              My Essay
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'details' ? (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-900/5 space-y-8"
              >
                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-primary rounded-full" />
                      <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Teacher's Message</h2>
                   </div>
                   <p className="text-sm font-medium text-neutral-500 leading-relaxed italic border-l-4 border-neutral-50 pl-6 py-2">
                     "{activity.instructions}"
                   </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-neutral-50">
                   <div className="space-y-1">
                      <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Min. Word Count</p>
                      <p className="text-base font-bold text-neutral-600">{activity.minWordCount} Words</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Semester</p>
                      <p className="text-base font-bold text-neutral-600">{activity.term}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Status</p>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${isSubmitted ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                        {isSubmitted ? 'Sent' : 'Waiting for file'}
                      </span>
                   </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="my-work"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-8"
              >
                {!isSubmitted ? (
                  <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-900/5 space-y-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                       <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Add My File</h2>
                       <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-xl">
                          <button 
                            onClick={() => setUploadMode('text')}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${uploadMode === 'text' ? 'bg-white text-primary shadow-sm' : 'text-neutral-400'}`}
                          >
                            Type It
                          </button>
                          <button 
                            onClick={() => setUploadMode('file')}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${uploadMode === 'file' ? 'bg-white text-primary shadow-sm' : 'text-neutral-400'}`}
                          >
                            Upload File
                          </button>
                       </div>
                    </div>

                    {uploadMode === 'text' ? (
                      <div className="space-y-4">
                        <textarea 
                          value={essayContent}
                          onChange={(e) => setEssayContent(e.target.value)}
                          placeholder="Type your essay here..."
                          className="w-full min-h-[400px] p-8 rounded-3xl bg-neutral-50/50 border border-neutral-100 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
                        />
                        <div className="flex items-center justify-between px-2">
                           <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${getWordCount(essayContent) < activity.minWordCount ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {getWordCount(essayContent)} / {activity.minWordCount} Words
                              </span>
                              {getWordCount(essayContent) < activity.minWordCount && (
                                <Info size={12} className="text-amber-400" />
                              )}
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                         {!selectedFile ? (
                           <label className="group flex flex-col items-center justify-center w-full h-80 border-4 border-dashed border-neutral-50 rounded-[2rem] bg-neutral-50/30 hover:bg-white hover:border-primary/20 transition-all cursor-pointer">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <div className="p-5 bg-white rounded-3xl shadow-xl shadow-neutral-900/5 mb-4 group-hover:scale-110 transition-transform">
                                   <Upload className="w-8 h-8 text-primary" />
                                </div>
                                <p className="mb-1 text-sm font-bold text-neutral-900">Drop your file here</p>
                                <p className="text-xs font-medium text-neutral-400">PDF, Word, or TXT up to 10MB</p>
                              </div>
                              <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx,.txt" />
                           </label>
                         ) : (
                           <div className="p-8 bg-primary/5 rounded-[2rem] border-2 border-primary/20 flex items-center justify-between animate-in zoom-in-95 duration-300">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white">
                                    <FileText size={20} />
                                 </div>
                                 <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-neutral-900">{selectedFileName}</p>
                                    <p className="text-[10px] font-bold text-primary uppercase">Ready to send</p>
                                 </div>
                              </div>
                              <button 
                                onClick={() => { setSelectedFile(null); setSelectedFileName(null); }}
                                className="p-2 hover:bg-primary/20 rounded-lg text-primary transition-colors"
                              >
                                <X size={20} />
                              </button>
                           </div>
                         )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-8 border-t border-neutral-50">
                       <button className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest hover:text-neutral-500 transition-colors">
                          Save Draft
                       </button>
                       <button 
                        disabled={loading || (uploadMode === 'file' && !selectedFile) || (uploadMode === 'text' && !essayContent.trim())}
                        onClick={handleSubmit}
                        className="flex items-center gap-3 px-10 py-4 bg-neutral-900 text-white font-bold text-[11px] uppercase tracking-widest rounded-2xl shadow-2xl shadow-neutral-900/20 hover:bg-primary transition-all active:scale-95 disabled:opacity-30"
                       >
                         {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send size={14} /> Send Work</>}
                       </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <motion.div 
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-emerald-500 py-4 px-6 rounded-[1.2rem] text-white shadow-xl shadow-emerald-500/10 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[60px] translate-x-24 -translate-y-24" />
                      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                               <CheckCircle size={24} className="text-white" />
                            </div>
                            <div className="space-y-0.5">
                               <h2 className="text-base font-semibold tracking-tight">Sent Successfully!</h2>
                               <p className="text-white/80 font-normal text-[10px]">Your teacher will evaluate your work soon.</p>
                            </div>
                         </div>
                         <div className="text-right shrink-0">
                            <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-0.5">Time of Submission</p>
                            <p className="text-base font-semibold">{submissionDate}</p>
                         </div>
                      </div>
                    </motion.div>

                    {essayScore !== null && (
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-900/5 text-center"
                      >
                         <h3 className="text-[11px] font-black text-neutral-300 uppercase tracking-[0.2em] mb-8">AI Score Results</h3>
                         <div className="relative w-40 h-40 mx-auto mb-10">
                            <svg className="w-full h-full transform -rotate-90">
                               <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="12" className="text-neutral-50" />
                               <motion.circle 
                                 cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="12" 
                                 strokeDasharray="440" 
                                 initial={{ strokeDashoffset: 440 }}
                                 animate={{ strokeDashoffset: 440 - (440 * (essayScore || 0) / 100) }}
                                 transition={{ duration: 2, ease: "easeOut" }}
                                 className="text-primary" 
                               />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <span className="text-4xl font-black text-neutral-900 tracking-tighter">{essayScore}%</span>
                               <span className="text-[9px] font-bold text-neutral-300 uppercase">Success Rate</span>
                            </div>
                         </div>
                         
                         <p className="text-sm font-medium text-neutral-500 max-w-sm mx-auto leading-relaxed mb-8">
                            Great work! Our AI has checked your essay for grammar, flow, and strong ideas.
                         </p>

                         {/* <button 
                          onClick={() => navigate('/Student/Feedback')}
                          className="px-10 py-4 bg-neutral-900 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-neutral-900/20 group"
                         >
                            See AI Tips
                            <ArrowRight size={14} className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                         </button> */}
                      </motion.div>
                    )}

                    {!essayScore && (
                      <div className="bg-white py-8 px-6 rounded-[1.5rem] border border-neutral-100 shadow-lg shadow-neutral-900/5 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-neutral-50 rounded-xl flex items-center justify-center mb-4 text-neutral-200">
                          <Clock size={24} />
                        </div>
                        <h3 className="text-base font-bold text-neutral-900 mb-1">Evaluation is pending</h3>
                        <p className="text-xs font-medium text-neutral-400 max-w-xs leading-relaxed">
                          Your score will appear here once the AI or your teacher completes the review.
                        </p>
                        
                        <div className="mt-6 pt-6 border-t border-neutral-50 w-full">
                           <button 
                            disabled={isResubmitRequested || requestingResubmission}
                            onClick={handleRequestResubmission}
                            className="text-primary text-[9px] font-bold uppercase tracking-widest hover:underline transition-all disabled:opacity-30 disabled:no-underline"
                           >
                              {requestingResubmission ? 'Sending...' : isResubmitRequested ? 'Request Sent' : 'Ask to fix it (Resubmit)'}
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white rounded-[2.25rem] border border-neutral-100 shadow-xl shadow-neutral-900/5 overflow-hidden">
              <div className="p-6 bg-neutral-900 text-white">
                 <h3 className="text-sm font-bold tracking-tight uppercase tracking-[0.1em]">Tasks in Course</h3>
              </div>
              <div className="p-2">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => navigate(buildSecureUrl('/Student/Submit', {
                        activityId: String(post.id),
                        classId: classId || '',
                        blockId: blockId || '',
                        activityTitle: post.title,
                        courseName: activity.course,
                      }))}
                      className={`
                        w-full p-6 text-left rounded-3xl transition-all group relative mb-1
                        ${post.isCurrent ? 'bg-primary/5' : 'hover:bg-neutral-50'}
                      `}
                    >
                      <div className="flex flex-col gap-1.5">
                         <h4 className={`text-xs font-bold leading-snug transition-colors ${post.isCurrent ? 'text-primary' : 'text-neutral-700'}`}>
                           {post.title}
                         </h4>
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                           <Calendar size={12} className="text-neutral-200" />
                           {post.date}
                         </div>
                         {post.isSubmitted && (
                           <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.1em] mt-2 flex items-center gap-1">
                             <CheckCircle size={10} />
                             Done
                           </span>
                         )}
                      </div>
                      {post.isCurrent && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-10 text-center opacity-30 italic text-xs">No other tasks.</div>
                )}
              </div>
           </div>

           <div className="bg-primary/5 p-8 rounded-[2rem] space-y-4 border border-primary/10">
              <Info className="text-primary w-6 h-6" />
              <p className="text-[11px] font-bold text-primary uppercase tracking-widest">A friendly tip</p>
              <p className="text-xs font-medium text-neutral-600 leading-relaxed">
                Make sure you check your grammar and word count before sending. Good luck!
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}

const Calendar = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);