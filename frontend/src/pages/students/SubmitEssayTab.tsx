import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Textarea } from '../../components/ui/textarea';
import Badge from '../../components/ui/Badge';
import { Upload, FileText, X, Clock, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { buildFullNameFromObject } from '../../utils/nameUtils';

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
  
  const activityIdParam = searchParams.get('activityId');
  const classId = searchParams.get('classId'); // teacher_course_loads.id (legacy/backup)
  const blockId = searchParams.get('blockId'); // blocks.id (UUID)
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityDetails | null>(null);
  const [posts, setPosts] = useState<SidebarPost[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  
  const [activeTab, setActiveTab] = useState('my-work');
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('text');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [essayContent, setEssayContent] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionDate, setSubmissionDate] = useState<string | null>(null);
  const [isResubmitRequested, setIsResubmitRequested] = useState(false);
  const [requestingResubmission, setRequestingResubmission] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      if (!user?.auth_id || !activityIdParam) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Get Student ID
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

        // 2. Fetch Activity Details
        const { data: actRow, error: actError } = await supabase
          .from('essay_activities')
          .select(`
            *,
            teacher:users (
              title,
              nickname,
              first_name,
              last_name
            )
          `)
          .eq('id', parseInt(activityIdParam))
          .single();

        if (actError) throw actError;

        // Fetch Course Details for the header (optional but nice)
        // We might need to join with courses table if we want the course title
        let courseCode = "N/A";
        if (actRow.course_id && actRow.course_id.length > 0) {
          const { data: courseData } = await supabase
            .from('courses')
            .select('course_code, course_title')
            .eq('id', actRow.course_id[0])
            .maybeSingle();
          if (courseData) {
            courseCode = `${courseData.course_code} - ${courseData.course_title}`;
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
          deadline: actRow.due_date ? new Date(actRow.due_date).toLocaleString() : "No deadline",
          instructions: actRow.instructions || "No instructions provided.",
          courseId: actRow.course_id?.[0] || "",
          term: actRow.term || "N/A",
          teacherId: actRow.teacher_id,
          minWordCount: actRow.min_word_count || 150
        });

        // 3. Fetch Existing Submission
        const { data: essayData } = await supabase
          .from('essays')
          .select('*')
          .eq('activity_id', parseInt(activityIdParam))
          .eq('student_id', studentData.id)
          .maybeSingle();

        if (essayData) {
          setIsSubmitted(true);
          setEssayContent(essayData.content || '');
          setSubmissionDate(new Date(essayData.submitted_at).toLocaleString());
          if (essayData.title) {
            setSelectedFileName(essayData.title);
          } else if (essayData.file_path) {
            setSelectedFileName(essayData.file_path.split('/').pop() || 'Submitted File');
          }

          // Check if resubmission is already requested
          const { data: requestData } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', actRow.teacher_id)
            .eq('type', 'resubmission_request')
            .eq('related_id', activityIdParam)
            .ilike('message', `%${user.nickname || user.full_name}%`)
            .maybeSingle();

          if (requestData) {
            setIsResubmitRequested(true);
          }
        }

        // 4. Fetch All Activities in same Course (sidebar)
        if (actRow.course_id && actRow.course_id.length > 0) {
          // Fetch all activities for this course
          const { data: allActs } = await supabase
            .from('essay_activities')
            .select('id, title, due_date')
            .contains('course_id', [actRow.course_id[0]])
            .order('created_at', { ascending: false })
            .limit(10);

          // Fetch all submissions for these activities by this student
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
              date: a.due_date ? new Date(a.due_date).toLocaleDateString() : "No date",
              isOverdue: a.due_date ? new Date(a.due_date) < new Date() : false,
              isSubmitted: submittedIds.has(a.id),
              isCurrent: String(a.id) === String(activityIdParam)
            })));
          }
        }

      } catch (err: any) {
        console.error("Error loading submit page:", err);
        setError(err.message || "Failed to load content.");
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
        // File size validation - using alert for now, can be replaced with modal if needed
        alert("File is too large. Maximum size is 10MB.");
        return;
      }
      setSelectedFile(file);
      setSelectedFileName(file.name);
    }
  };

  const handleSubmit = async () => {
    if (!studentId || !activityIdParam) return;
    if (uploadMode === 'text' && !essayContent.trim()) return;
    if (uploadMode === 'file' && !selectedFile) return;

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

      console.log("[handleSubmit] Submitting essay:", {
        studentId,
        activityId: activityIdParam,
        blockId: classId,
        teacherId: activity?.teacherId,
        uploadMode
      });

      const { error: submitError } = await supabase
        .from('essays')
        .insert({
          student_id: studentId,
          activity_id: parseInt(activityIdParam),
          block_id: blockId || null, // Use UUID from URL or null
          teacher_id: activity?.teacherId || null, // Ensure teacher can see it
          content: uploadMode === 'text' ? essayContent : null,
          file_path: filePath,
          title: selectedFileName || activity?.title || "Essay Submission",
          status: 'submitted'
        });

      if (submitError) {
        console.error("[handleSubmit] Insert error:", submitError);
        throw submitError;
      }

      console.log("[handleSubmit] Insert successful");

      setIsSubmitted(true);
      setSubmissionDate(new Date().toLocaleString());
      // Ensure the filename is set in state if it's a file upload
      if (uploadMode === 'file' && selectedFile) {
        setSelectedFileName(selectedFile.name);
      }

      // Notify the teacher
      if (activity?.teacherId) {
        console.log("[handleSubmit] Notifying teacher:", activity.teacherId);
        const studentName = user?.nickname || user?.full_name || "A student";
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert({
            user_id: activity.teacherId,
            type: 'submission_received',
            title: 'New Essay Submission',
            message: `${studentName} has uploaded an activity: "${activity.title}".`,
            related_id: parseInt(activity.id),
            related_type: 'essay_activities'
          });

        if (notifyError) {
          console.error("[handleSubmit] Notification error:", notifyError);
        } else {
          console.log("[handleSubmit] Notification successful");
        }
      } else {
        console.warn("[handleSubmit] No teacherId found, skipping notification");
      }
    } catch (err: any) {
      console.error("Error submitting essay:", err);
      alert("Failed to submit: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResubmission = async () => {
    if (!activity?.teacherId || !activityIdParam || isResubmitRequested) return;

    try {
      setRequestingResubmission(true);
      const studentName = user?.nickname || user?.full_name || "A student";
      
      const { error: requestError } = await supabase
        .from('notifications')
        .insert({
          user_id: activity.teacherId,
          type: 'resubmission_request',
          title: 'Resubmission Requested',
          message: `${studentName} is requesting to resubmit their work for activity: "${activity.title}".`,
          related_id: activity.id,
          related_type: 'essay_activities'
        });

      if (requestError) throw requestError;

      setIsResubmitRequested(true);
      alert("Resubmission request sent to your teacher.");
    } catch (err: any) {
      console.error("Error requesting resubmission:", err);
      alert("Failed to send request: " + err.message);
    } finally {
      setRequestingResubmission(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-neutral-500 font-medium">Loading activity details...</p>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <Card className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-error-default mx-auto mb-4" />
        <h2 className="text-xl font-bold">Error</h2>
        <p className="text-neutral-600 mt-2">{error || "Activity not found."}</p>
        <Button onClick={() => navigate('/Student/Classes')} className="mt-4">
          Return to Classes
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full font-sans">
      {/* Page Header */}
      <div className="mb-6 bg-success-default/10 border border-success-default/20 p-6 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-success-default text-white rounded-full">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{activity.title}</h1>
            <p className="text-neutral-600 mt-1 line-clamp-2">{activity.instructions}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            
            {/* 1. UPDATED: Custom styled tabs with bottom border indicator */}
            <TabsList className="flex w-fit bg-transparent p-0 rounded-none justify-start gap-2">
              <TabsTrigger 
                value="details"
                className="
                  w-fit rounded-none px-3 py-2 text-sm font-medium
                  text-neutral-500 hover:text-neutral-700
                  data-[state=active]:bg-white
                  data-[state=active]:text-primary
                  data-[state=active]:shadow-sm
                  bg-transparent shadow-none transition-all
                "
              >
                DETAILS
              </TabsTrigger>

              <TabsTrigger 
                value="my-work"
                className="
                  w-fit rounded-none px-3 py-2 text-sm font-medium
                  text-neutral-500 hover:text-neutral-700
                  data-[state=active]:bg-white
                  data-[state=active]:text-primary
                  data-[state=active]:shadow-sm
                  bg-transparent shadow-none transition-all
                "
              >
                MY WORK
              </TabsTrigger>
            </TabsList>



            {/* DETAILS TAB */}
            <TabsContent value="details">
              <Card className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-neutral-900 block">Course:</span>
                    <span className="text-neutral-600">{activity.course}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900 block">Instructor:</span>
                    <span className="text-neutral-600">{activity.instructor}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900 block">Term:</span>
                    <span className="text-neutral-600">{activity.term}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900 block">Deadline:</span>
                    <span className="text-danger-default font-medium">{activity.deadline}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900 block">Min. Word Count:</span>
                    <span className="text-neutral-600">{activity.minWordCount} words</span>
                  </div>
                </div>
                <div className="prose text-neutral-700 text-sm">
                  <p>{activity.instructions}</p>
                </div>
              </Card>
            </TabsContent>

            {/* MY WORK TAB */}
            <TabsContent value="my-work" className="space-y-6">
              
              {/* If NOT submitted, show the upload area */}
              {!isSubmitted ? (
                <Card className="p-6">
                  <h2 className="text-xl text-neutral-900 mb-4">Add Work</h2>
                  <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'file' | 'text')}>
                    <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                      <TabsTrigger value="file"><Upload className="w-4 h-4 mr-2" />File Upload</TabsTrigger>
                      <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Text Editor</TabsTrigger>
                    </TabsList>

                    <TabsContent value="file" className="space-y-4">
                      {!selectedFile ? (
                        <div className="border-2 border-dashed border-neutral-300 rounded-rd p-12 text-center hover:border-primary transition-colors relative">
                          <input 
                            type="file" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                          />
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                              <Upload className="w-8 h-8 text-primary" />
                            </div>
                            <p className="text-neutral-900">Drop your file here or click to browse</p>
                            <p className="text-xs text-danger-default">* Maximum size 10MB</p>
                            <Button className="mt-2 pointer-events-none bg-primary">Choose File</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-neutral-200 rounded-rd p-4 flex items-center justify-between">
                          <span className="text-sm font-medium">{selectedFileName}</span>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedFile(null); setSelectedFileName(null); }}><X className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="text">
                      <div className="space-y-2">
                        <Textarea 
                          placeholder="Type your submission..." 
                          className="min-h-[300px]" 
                          value={essayContent}
                          onChange={(e) => setEssayContent(e.target.value)}
                        />
                        <div className="flex justify-between items-center px-1">
                          <span className={`text-xs font-medium ${
                            essayContent.trim().split(/\s+/).filter(w => w.length > 0).length < activity.minWordCount 
                              ? 'text-danger-default' 
                              : 'text-success-default'
                          }`}>
                            Word Count: {essayContent.trim().split(/\s+/).filter(w => w.length > 0).length} / {activity.minWordCount}
                          </span>
                          {essayContent.trim().split(/\s+/).filter(w => w.length > 0).length < activity.minWordCount && (
                             <span className="text-[10px] text-danger-default italic">
                               * Below minimum requirement
                             </span>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 flex justify-end gap-3">
                     <Button variant="outline">Save Draft</Button>
                     <Button 
                       className="bg-primary hover:bg-primary-300" 
                       disabled={loading || (uploadMode === 'file' && !selectedFile) || (uploadMode === 'text' && !essayContent.trim())}
                       onClick={handleSubmit}
                     >
                       {loading ? "Submitting..." : "Submit Assignment"}
                     </Button>
                  </div>
                </Card>
              ) : (
                // If SUBMITTED, show the success state + Grade Placeholder
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="p-6 flex items-center justify-between bg-success-default/5 border-success-default/20">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-success-default rounded-full flex items-center justify-center text-white">
                          <FileText className="w-5 h-5" />
                        </div>
                         <div>
                          <p className="font-medium text-neutral-900">{selectedFileName || "Essay Submission"}</p>
                          <p className="text-xs text-neutral-500">Submitted on {submissionDate}</p>
                        </div>
                     </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleRequestResubmission}
                          disabled={isResubmitRequested || requestingResubmission}
                        >
                          {requestingResubmission ? "Sending..." : isResubmitRequested ? "Request Sent" : "Request Resubmission"}
                        </Button>
                        <Badge className="bg-success-default text-white">Submitted</Badge>
                      </div>
                  </Card>

                  {/* 2. UPDATED: Grade Placeholder - Only appears when submitted */}
                  <div className="text-center py-10 text-neutral-400 text-sm">
                    <div className="flex justify-center mb-3">
                      <div className="w-8 h-8 rounded-full border-2 border-neutral-300 flex items-center justify-center">
                         <span className="font-serif font-bold text-lg">!</span>
                      </div>
                    </div>
                    Your grade for this work will appear here.
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-white shadow-sm border border-neutral-200 sticky top-4 overflow-hidden">
             <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
               <h3 className="font-semibold text-neutral-700 flex items-center gap-2">
                 <span className="text-lg">📰</span> Posts in {activity.course.split(' - ')[0]}
               </h3>
             </div>
             
              <div className="divide-y divide-neutral-100">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <div 
                      key={post.id} 
                      onClick={() => navigate(`/Student/Submit?activityId=${post.id}&classId=${classId}&blockId=${blockId}&activityTitle=${encodeURIComponent(post.title)}&courseName=${encodeURIComponent(activity.course.split(' - ')[1] || "")}&courseCode=${encodeURIComponent(activity.course.split(' - ')[0])}`)}
                      className={`
                        p-4 hover:bg-neutral-50 transition-colors cursor-pointer group relative
                        ${post.isCurrent ? 'bg-primary/5 border-l-4 border-l-primary' : ''}
                      `}
                    >
                      <h4 className={`
                        text-sm font-medium mb-1 transition-colors
                        ${post.isCurrent ? 'text-primary' : ''}
                        ${!post.isCurrent && post.isSubmitted ? 'text-success-default' : ''}
                        ${!post.isCurrent && !post.isSubmitted ? 'text-danger-default' : ''}
                      `}>
                        {post.title}
                      </h4>
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span className={post.isOverdue ? 'text-danger-default font-medium' : 'text-neutral-500'}>
                          {post.date}
                        </span>
                      </div>
                      {post.isSubmitted && (
                        <div className="mt-2 text-[10px] font-bold text-success-default uppercase tracking-wide">
                          ✓ Submitted
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-neutral-500 italic">
                    No activities found for this course.
                  </div>
                )}
               
               {/* View All Button always visible at bottom */}
               <div className="p-4 text-center border-t border-neutral-100">
                 <Button variant="outline" className="w-full text-primary border-primary/20 hover:bg-primary/5">
                   View all posts
                 </Button>
               </div>
             </div>
          </Card>
        </div>

      </div>
    </div>
  );
}