import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { AlertCircle, Calendar, ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

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

        console.log("Context - Course:", tcl.course_id, "Block:", currentBlockId, "Program:", programId);
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
    navigate(`/Student/Submit?activityId=${activityId}&classId=${classId}&blockId=${blockId}&activityTitle=${encodeURIComponent(title)}&courseName=${encodeURIComponent(courseName)}&courseCode=${encodeURIComponent(courseCode)}`);
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
    <div className="max-w-7xl mx-auto w-full">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/Student/Classes')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to My Classes
      </Button>

      {/* Course Header Banner */}
      <div className="mb-6 bg-success-default rounded-lg p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase tracking-wider">
                {classData.code}
              </span>
              <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase tracking-wider">
                Block {classData.section}
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-1">
              {classData.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 opacity-90 text-sm">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {classData.instructor}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {classData.term}
              </span>
            </div>
          </div>
          <Button className="bg-white text-success-default hover:bg-neutral-100 shadow-sm font-bold">
            My Performance
          </Button>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <Card
              key={activity.id}
              className={`p-6 cursor-pointer hover:shadow-lg transition-all group overflow-hidden ${
                activity.status === 'DONE' 
                  ? 'border-l-4 border-success-default bg-success-default/5' 
                  : 'border-l-4 border-primary bg-white'
              }`}
              onClick={() => handleActivityClick(activity.activityId)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activity.status === 'DONE' 
                          ? 'bg-success-default/10 text-success-default' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-0.5">
                          {activity.type}
                        </span>
                        <h3 className="text-lg font-bold text-neutral-900 leading-tight">
                          {activity.title}
                        </h3>
                      </div>
                    </div>
                    <Badge className={
                      activity.status === 'DONE'
                        ? 'bg-success-default/10 text-success-default border-success-default/20'
                        : 'bg-primary/10 text-primary border-primary/20'
                    }>
                      {activity.status}
                    </Badge>
                  </div>

                  {activity.instructions && (
                    <p className="text-sm text-neutral-600 mb-4 line-clamp-2 italic">
                      {activity.instructions}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-neutral-100">
                    {activity.deadline && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-warning-default">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Deadline: {activity.deadline}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Posted on {activity.postedDate}</span>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center self-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                  <Button variant="ghost" size="sm" className="text-primary font-bold">
                    Open
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="py-20 text-center bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
            <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-neutral-900">No activities found</h3>
            <p className="text-neutral-500">Your instructor hasn't posted any essay activities for this block yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

