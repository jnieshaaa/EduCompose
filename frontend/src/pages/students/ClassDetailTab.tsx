import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, BookOpen, BarChart2, Clock, CheckCircle, FileText, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { buildSecureUrl } from '../../utils/secureUrl';
import { motion, AnimatePresence } from 'framer-motion';

interface StudentClassActivity {
  id: string;
  title: string;
  type: string;
  status: "PENDING" | "DONE";
  deadline?: string;
  postedDate: string;
  instructions?: string;
  color: "purple" | "green";
  activityId: string;
}

interface ClassHeaderData {
  code: string;
  name: string;
  instructor: string;
  term: string;
  section: string;
}

export function ClassDetailTab() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [classData, setClassData] = useState<ClassHeaderData | null>(null);
  const [activities, setActivities] = useState<StudentClassActivity[]>([]);
  const [blockId, setBlockId] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassDetails = async () => {
      if (!user?.auth_id || !classId) return;

      try {
        setIsLoading(true);

        const { data: student } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.auth_id)
          .eq("role", "student")
          .maybeSingle();

        if (!student) return;
          
        const { data: tcl, error: tclError } = await supabase
          .from("teacher_course_loads")
          .select(`
            id,
            academic_year,
            term,
            course_id,
            courses!course_id (
              course_code,
              course_title
            ),
            users!teacher_id (
              first_name,
              last_name,
              teacher_profiles!user_id (
                title,
                nickname
              )
            )
          `)
          .eq("id", classId)
          .single();

        if (tclError) throw tclError;

        const { data: enrollments } = await supabase
          .from("block_students")
          .select(`
            block_id,
            blocks (
              name,
              year,
              teacher_program_loads!fk_block_program_load (
                course_load_id
              )
            )
          `)
          .eq("student_id", student.id);

        let currentBlockId: string | null = null;
        let sectionName = "N/A";

        if (enrollments) {
          for (const ent of enrollments) {
            const block = ent.blocks as any;
            if (!block) continue;
            
            const tplData = block.teacher_program_loads;
            const tpls = Array.isArray(tplData) ? tplData : (tplData ? [tplData] : []);
            
            const matchingTpl = tpls.find((tpl: any) => String(tpl.course_load_id) === String(classId));
            if (matchingTpl) {
              currentBlockId = ent.block_id ? String(ent.block_id) : null;
              sectionName = `${block.year}${block.name}`;
              break;
            }
          }
        }

        setBlockId(currentBlockId);

        const instructorObj = (Array.isArray(tcl.users) ? tcl.users[0] : tcl.users) as any;
        const instructorProfile = instructorObj?.teacher_profiles?.[0] || instructorObj?.teacher_profiles;
        const instrTitle = instructorProfile?.title || "";
        const instrNick = instructorProfile?.nickname || instructorObj?.first_name || "";
        const instrLast = instructorObj?.last_name || "";

        setClassData({
          code: (tcl.courses as any).course_code,
          name: (tcl.courses as any).course_title,
          instructor: instructorObj 
          ? (instrTitle && instrNick 
            ? `${instrTitle} ${instrNick} ${instrLast}` 
            : (instrTitle ? `${instrTitle} ${instrLast}` : (instrLast || "TBA")))
          : "TBA",
          term: `${tcl.term} A.Y. ${tcl.academic_year}`,
          section: sectionName
        });

        let query = supabase
          .from("essay_activities")
          .select("*")
          .eq("course_id", tcl.course_id)
          .order("created_at", { ascending: false });

        if (currentBlockId && currentBlockId !== "undefined") {
          query = query.or(`block_id.is.null,block_id.cs.{${currentBlockId}}`);
        }

        const { data: activityRows, error: activitiesError } = await query;
        if (activitiesError) throw activitiesError;

        const { data: studentEssays } = await supabase
          .from("essays")
          .select("activity_id")
          .eq("student_id", student.id);

        const submittedActivityIds = new Set(studentEssays?.map(e => String(e.activity_id)));

        const mappedActivities: StudentClassActivity[] = (activityRows || []).map((row: any) => ({
          id: String(row.id),
          title: row.title,
          type: "Essay Work",
          status: submittedActivityIds.has(String(row.id)) ? "DONE" : "PENDING",
          deadline: row.due_date ? new Date(row.due_date).toLocaleDateString(undefined, {
            weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
          }) : undefined,
          postedDate: new Date(row.created_at).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
          }),
          instructions: row.instructions,
          color: submittedActivityIds.has(String(row.id)) ? "green" : "purple",
          activityId: String(row.id)
        }));

        setActivities(mappedActivities);

      } catch (err) {
        console.error("Error loading class detail:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassDetails();
  }, [classId, user?.auth_id]);

  const handleActivityClick = (activityId: string) => {
    const activity = activities.find(a => a.activityId === activityId);
    const title = activity?.title || "Essay";
    const courseName = classData?.name || "";
    const courseCode = classData?.code || "";
    navigate(buildSecureUrl('/Student/Submit', {
      activityId,
      classId: classId || '',
      blockId: blockId || '',
      activityTitle: title,
      courseName,
      courseCode,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Opening class materials...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2 tracking-tight">Class Not Found</h2>
        <p className="text-sm font-medium text-neutral-400 max-w-sm mb-10 leading-relaxed">
          We couldn't find the class info you're looking for.
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
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Premium Class Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-900/5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full translate-x-12 -translate-y-12" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-6 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3.5 py-1.5 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest rounded-xl">
                {classData.code}
              </span>
              <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-xl">
                Group {classData.section}
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 leading-tight tracking-tight">
              {classData.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-50 flex items-center justify-center shrink-0">
                  <BookOpen size={18} className="text-neutral-400" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Teacher</p>
                  <p className="text-sm font-bold text-neutral-600">{classData.instructor}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-50 flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-neutral-400" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Semester</p>
                  <p className="text-sm font-bold text-neutral-600">{classData.term}</p>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/Student/Progress')}
            className="flex items-center gap-3 px-8 py-4 bg-neutral-900 text-white font-bold text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-neutral-900/20 hover:bg-primary transition-all group shrink-0"
          >
            <BarChart2 size={16} />
            See My Scores
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>

      {/* Activities Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Your Tasks</h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Homework and assignments</p>
          </div>
          <div className="px-3 py-1 bg-neutral-50 rounded-lg text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            {activities.length} To Do
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {activities.length > 0 ? (
              activities.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleActivityClick(activity.activityId)}
                  className={`
                    group bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer relative overflow-hidden
                    ${activity.status === 'DONE' ? 'opacity-80' : ''}
                  `}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-start gap-5 flex-1">
                      <div className={`p-4 rounded-[1.25rem] shrink-0 transition-colors ${
                        activity.status === 'DONE' 
                          ? 'bg-emerald-50 text-emerald-500' 
                          : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'
                      }`}>
                        <FileText size={28} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{activity.type}</span>
                          {activity.status === 'DONE' && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-widest">
                              <CheckCircle size={10} />
                              Finished
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 leading-snug group-hover:text-primary transition-colors pr-10">
                          {activity.title}
                        </h3>
                        {activity.instructions && (
                          <p className="text-sm text-neutral-400 font-medium line-clamp-1 max-w-2xl italic">
                            {activity.instructions}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap md:flex-col items-center md:items-end gap-x-6 gap-y-4">
                      <div className="space-y-1 md:text-right">
                        <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Sent on</p>
                        <p className="text-xs font-bold text-neutral-500">{activity.postedDate}</p>
                      </div>
                      
                      {activity.deadline && (
                        <div className="space-y-1 md:text-right">
                          <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Due on</p>
                          <div className={`flex items-center gap-2 text-xs font-bold ${
                            activity.status === 'DONE' ? 'text-neutral-400' : 'text-primary'
                          }`}>
                            <Clock size={12} />
                            {activity.deadline}
                          </div>
                        </div>
                      )}

                      <button className={`
                        flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all
                        ${activity.status === 'DONE' 
                          ? 'bg-neutral-50 text-neutral-400' 
                          : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'}
                      `}>
                        {activity.status === 'DONE' ? 'See My Work' : 'Start Writing'}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-24 text-center bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm">
                <div className="w-20 h-20 bg-neutral-50 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                  <BookOpen size={36} className="text-neutral-100" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">No tasks yet</h3>
                <p className="text-sm font-medium text-neutral-400 max-w-sm mx-auto px-6">
                  Your teacher hasn't given any homework for this class yet.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

