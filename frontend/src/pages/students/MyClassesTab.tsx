import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Calendar, GraduationCap, Loader2, ArrowRight } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabaseClient';
import { buildSecureUrl } from '../../utils/secureUrl';
import { motion, AnimatePresence } from 'framer-motion';

interface AcademicClass {
  id: string; // teacher_course_load_id
  code: string;
  name: string;
  instructor: string;
  term: string;
  academicYear: string;
  section: string;
}

export function MyClassesTab() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Get student record
        let { data: student } = await supabase
          .from("students")
          .select("id, email, year, block_name")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!student && user.email) {
          const { data: emailData } = await supabase
            .from("students")
            .select("id, email, year, block_name")
            .eq("email", user.email)
            .maybeSingle();
          student = emailData;
        }

        if (!student) {
          setIsLoading(false);
          return;
        }

        // 2. Get enrollments with full details
        const { data: enrollments, error } = await supabase
          .from("block_students")
          .select(`
            block_id,
            blocks (
              name,
              year,
              teacher_program_loads!fk_block_program_load (
                teacher_course_loads (
                  id,
                  course_id,
                  teacher_id,
                  academic_year,
                  term,
                  courses (
                    course_code,
                    course_title
                  ),
                  users:teacher_id (
                    first_name,
                    last_name,
                    title,
                    nickname
                  )
                )
              )
            )
          `)
          .eq("student_id", student.id);

        if (error) throw error;

        const flattenedClasses: AcademicClass[] = [];
        enrollments?.forEach(enrollment => {
          const block = enrollment.blocks as any;
          if (!block) return;

          const sectionName = `${block.year}${block.name}`;
          const tplData = block.teacher_program_loads;
          const tpls = Array.isArray(tplData) ? tplData : (tplData ? [tplData] : []);

          tpls.forEach((tpl: any) => {
            const tclData = tpl.teacher_course_loads;
            const tcls = Array.isArray(tclData) ? tclData : (tclData ? [tclData] : []);

            tcls.forEach((tcl: any) => {
              if (tcl && tcl.courses) {
                flattenedClasses.push({
                  id: tcl.id,
                  code: tcl.courses.course_code,
                  name: tcl.courses.course_title,
                  instructor: tcl.users 
                    ? (tcl.users.title && tcl.users.nickname 
                      ? `${tcl.users.title} ${tcl.users.nickname}` 
                      : (tcl.users.title ? `${tcl.users.title} ${tcl.users.last_name}` : tcl.users.last_name))
                    : "No Teacher yet",
                  term: tcl.term || "---",
                  academicYear: tcl.academic_year || "---",
                  section: sectionName
                });
              }
            });
          });
        });

        setClasses(flattenedClasses);
      } catch (err: any) {
        console.error("Error fetching classes tab:", err);
        showNotification('error', "Failed to load your classes. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Looking for your classes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 px-1">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">Your Classes</h1>
          <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <GraduationCap size={14} className="text-primary/50" />
            Pick a class to see your homework and tasks
          </p>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {classes.length > 0 ? (
            classes.map((classItem, i) => (
              <motion.div 
                key={classItem.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -5 }}
                className="bg-white p-7 rounded-3xl border border-neutral-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all cursor-pointer group relative overflow-hidden"
                onClick={() => navigate(buildSecureUrl(`/Student/Classes/${classItem.id}`, { courseName: classItem.name, courseCode: classItem.code }))}
              >
                {/* Accent Decor */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full translate-x-12 -translate-y-12 group-hover:bg-primary/10 transition-colors" />

                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="p-3.5 bg-primary/5 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <BookOpen size={24} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all -translate-x-3 group-hover:translate-x-0">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Open Class</span>
                    <ArrowRight size={14} className="text-primary" />
                  </div>
                </div>
                
                <div className="mb-6 relative z-10">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5 px-2 py-0.5 bg-primary/5 w-fit rounded-lg">
                    {classItem.code}
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 leading-[1.2] group-hover:text-primary transition-colors pr-4">
                    {classItem.name}
                  </h3>
                </div>
                
                <div className="space-y-3.5 pt-5 border-t border-neutral-50 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center shrink-0">
                      <Users size={14} className="text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Teacher</p>
                      <p className="text-xs font-bold text-neutral-600">{classItem.instructor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center shrink-0">
                      <Calendar size={14} className="text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Schedule</p>
                      <p className="text-xs font-bold text-neutral-600">{classItem.term} • {classItem.academicYear}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-50/50 w-fit px-3 py-1.5 rounded-xl">
                    <Users size={12} className="text-neutral-300" />
                    Group {classItem.section}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-neutral-50 shadow-sm">
              <div className="w-20 h-20 bg-neutral-50 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                <BookOpen size={32} className="text-neutral-200" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">No classes yet</h3>
              <p className="text-sm font-medium text-neutral-400">You haven't been added to any classes right now.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

