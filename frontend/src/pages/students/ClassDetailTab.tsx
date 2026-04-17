import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { AlertCircle, Calendar, BookOpen, ChevronRight, BarChart2, Clock, CheckCircle, FileText } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { buildSecureUrl } from '../../utils/secureUrl';

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
  loginTime?: string;
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

        // 1. Get student & block context using Auth UUID
        const { data: student } = await supabase
          .from("students")
          .select("id")
          .eq("auth_user_id", user.auth_id)
          .maybeSingle();

        if (!student) return;
          
        // 2. Get Class Info
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
              title,
              nickname
            )
          `)
          .eq("id", classId)
          .single();

        if (tclError) throw tclError;

        // 3. Find which block the student is in for this Course Load
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
        let programId: string | null = null;
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
              programId = matchingTpl.program_id ? String(matchingTpl.program_id) : null;
              sectionName = `${block.year}${block.name}`;
              break;
            }
          }
        }

        // console.log("Context - Course:", tcl.course_id, "Block:", currentBlockId, "Program:", programId);
        setBlockId(currentBlockId);

        const instructors = Array.isArray(tcl.users) ? tcl.users : (tcl.users ? [tcl.users] : []);
        const instructorObj = instructors[0] as any;

        setClassData({
          code: (tcl.courses as any).course_code,
          name: (tcl.courses as any).course_title,
          instructor: instructorObj 
          ? (instructorObj.title && instructorObj.nickname 
            ? `${instructorObj.title} ${instructorObj.nickname}` 
            : (instructorObj.title ? `${instructorObj.title} ${instructorObj.last_name}` : instructorObj.last_name))
          : "TBA",
          term: `${tcl.term} A.Y. ${tcl.academic_year}`,
          section: sectionName
        });

        // 4. Fetch Activities
        // Activities assigned specifically to this block OR broadly to this course OR to this program
        let query = supabase
          .from("essay_activities")
          .select("*")
          .order("created_at", { ascending: false });

        const filterParts = [`course_id.cs.{${tcl.course_id}}`];
        if (currentBlockId && currentBlockId !== "undefined") filterParts.push(`block_id.cs.{${currentBlockId}}`);
        if (programId && programId !== "undefined") filterParts.push(`program_id.cs.{${programId}}`);

        query = query.or(filterParts.join(','));

        const { data: activityRows, error: activitiesError } = await query;
        console.log("Fetched Activities Count:", activityRows?.length || 0);

        if (activitiesError) throw activitiesError;

        // 5. Check submission status for each activity
        const { data: studentEssays } = await supabase
          .from("essays")
          .select("activity_id")
          .eq("student_id", student.id);

        const submittedActivityIds = new Set(studentEssays?.map(e => String(e.activity_id)));

        const mappedActivities: StudentClassActivity[] = (activityRows || []).map((row: any) => ({
          id: String(row.id),
          title: row.title,
          type: "Essay Activity",
          status: submittedActivityIds.has(String(row.id)) ? "DONE" : "PENDING",
          deadline: row.due_date ? new Date(row.due_date).toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
          }) : undefined,
          postedDate: new Date(row.created_at).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
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
  }, [classId, user?.id]);

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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-neutral-500 font-medium animate-pulse">Loading class content...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-error-default mx-auto mb-4" />
        <h2 className="text-xl font-bold">Class Not Found</h2>
        <Button onClick={() => navigate('/Student/Classes')} className="mt-4">
          Return to Classes
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
      {/* Course Header Banner */}
      <div className="mb-8 bg-success-default rounded-2xl p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
        {/* Subtle decorative circle */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/15 transition-colors duration-500"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-md text-[10px] font-bold uppercase tracking-wider">
                {classData.code}
              </span>
              <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-md text-[10px] font-bold uppercase tracking-wider">
                Block {classData.section}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold mb-2 tracking-tight">
              {classData.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/90 text-sm font-medium">
              <span className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded-full">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                {classData.instructor}
              </span>
              <span className="flex items-center gap-2">
                <div className="p-1 bg-white/10 rounded-full">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                {classData.term}
              </span>
            </div>
          </div>
          
          <Button 
            className="bg-white !text-[#0791B2] hover:bg-white hover:shadow-2xl hover:shadow-black/30 shadow-lg shadow-black/20 font-bold px-6 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
            onClick={() => navigate('/Student/Progress')}
          >
            <BarChart2 className="w-4 h-4 !text-[#0791B2]" />
            My Performance
          </Button>
        </div>
      </div>

      {/* Activities Section Header */}
      <div className="flex items-center gap-2 mb-6 ml-1">
        <div className="w-1.5 h-5 bg-primary rounded-full"></div>
        <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Essay Activities</h2>
        <Badge variant="outline" className="ml-2 bg-primary/5 text-primary border-primary/20">
          {activities.length} Available
        </Badge>
      </div>

      {/* Activities List */}
      <div className="grid grid-cols-1 gap-5">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <Card
              key={activity.id}
              className={`
                group relative border-none shadow-sm hover:shadow-md transition-all duration-300 p-5 cursor-pointer rounded-2xl overflow-hidden
                ${activity.status === 'DONE' 
                  ? 'bg-neutral-50/50' 
                  : 'bg-white'
                }
              `}
              onClick={() => handleActivityClick(activity.activityId)}
            >
              {/* Status Indicator Bar */}
              <div className={`absolute top-0 left-0 bottom-0 w-1.5 transition-all duration-300 ${
                activity.status === 'DONE' 
                  ? 'bg-success-default/60 group-hover:bg-success-default' 
                  : 'bg-primary/40 group-hover:bg-primary'
              }`}></div>

              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 ml-2">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between sm:justify-start gap-4">
                    <div className={`p-3 rounded-2xl flex-shrink-0 transition-colors ${
                      activity.status === 'DONE' 
                        ? 'bg-success-default/10 text-success-default' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                          {activity.type}
                        </span>
                        {activity.status === 'DONE' && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-success-default bg-success-default/10 px-1.5 py-0.5 rounded uppercase">
                            <CheckCircle className="w-2.5 h-2.5" />
                            Completed
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-neutral-900 tracking-tight group-hover:text-primary transition-colors">
                        {activity.title}
                      </h3>
                    </div>
                  </div>

                  {activity.instructions && (
                    <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2 max-w-3xl">
                      {activity.instructions}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Posted {activity.postedDate}</span>
                    </div>
                    {activity.deadline && (
                      <div className={`flex items-center gap-2 text-xs font-bold ${
                        activity.status === 'DONE' ? 'text-neutral-400' : 'text-primary'
                      }`}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Ends {activity.deadline}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center self-stretch gap-4 w-full sm:w-auto">
                  <div className="sm:hidden w-px h-10 bg-neutral-100"></div>
                  <Button 
                    variant="ghost" 
                    className={`
                      font-bold gap-2 px-4 py-2 rounded-xl transition-all
                      ${activity.status === 'DONE' 
                        ? 'text-neutral-400 hover:text-primary hover:bg-primary/5' 
                        : 'text-primary bg-primary/5 hover:bg-primary hover:text-white'
                      }
                    `}
                  >
                    {activity.status === 'DONE' ? 'Review Submission' : 'Start Essay'}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-neutral-100 shadow-sm">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-100">
              <BookOpen className="w-8 h-8 text-neutral-300" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Activities coming soon</h3>
            <p className="text-neutral-500 max-w-sm mx-auto">Your instructor hasn't posted any essay activities for this block yet. Stay tuned!</p>
          </div>
        )}
      </div>
    </div>
  );
}

