import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { BookOpen, ChevronRight, Users, Calendar, GraduationCap } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

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
                    : "TBA",
                  term: tcl.term || "---",
                  academicYear: tcl.academic_year || "---",
                  section: sectionName
                });
              }
            });
          });
        });

        setClasses(flattenedClasses);
      } catch (err) {
        console.error("Error fetching classes tab:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-neutral-500 font-medium animate-pulse">Loading your classes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">My Classes</h1>
        <p className="text-neutral-600">Select a class to view activities and assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.length > 0 ? (
          classes.map((classItem) => (
            <Card 
              key={classItem.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer group border-none shadow-sm hover:ring-2 hover:ring-primary/20 bg-white"
              onClick={() => navigate(`/Student/Classes/${classItem.id}?courseName=${encodeURIComponent(classItem.name)}&courseCode=${encodeURIComponent(classItem.code)}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                  <span className="text-xs font-bold text-primary">Go to class</span>
                  <ChevronRight className="w-4 h-4 text-primary" />
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                  {classItem.code}
                </div>
                <h3 className="text-lg font-bold text-neutral-900 leading-snug">
                  {classItem.name}
                </h3>
              </div>
              
              <div className="space-y-2.5 pt-4 border-t border-neutral-100">
                <div className="flex items-center gap-2.5 text-xs font-medium text-neutral-600">
                  <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>{classItem.instructor}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-neutral-600">
                  <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span>{classItem.term} • {classItem.academicYear}</span>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-neutral-50 rounded text-[10px] font-bold text-neutral-400 uppercase">
                  <GraduationCap className="w-3 h-3" />
                  Block {classItem.section}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
            <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-neutral-900">No classes found</h3>
            <p className="text-neutral-500">You haven't been added to any classes yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

