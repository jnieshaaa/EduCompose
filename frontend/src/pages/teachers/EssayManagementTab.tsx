import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Plus,
  Upload,
  FileText,
  Users,
  BookOpen,
  Layers,
  ClipboardList,
  Loader2,
  AlertCircle,
  Search,
  Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { buildSecureUrl } from "../../utils/secureUrl";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { buildFullNameFromObject } from "../../utils/nameUtils";

// Types
type Program = { id: string; name: string; code: string };
type Block = { id: string; name: string; programId: string };
type Rubric = { id: string; title: string };
type Student = { id: string; name: string; programId: string; blockId: string; studentCode: string };

type EssayActivity = {
  id: string;
  title: string;
  programId: string | "all";
  blockId: string | "all";
  rubricId: string | null;
  dueDate?: string;
  description?: string;
};

type EssaySubmission = {
  id: string;
  activityId: string;
  studentId: string;
  studentName: string;
  fileName: string;
  status: string;
  submittedAt: string;
};

type PendingUpload = {
  id: string;
  file: File;
  studentId: string | "";
};

export function EssayManagementTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  // Data States
  const [programs, setPrograms] = useState<Program[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<EssayActivity[]>([]);
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [selectedActivityForUpload, setSelectedActivityForUpload] = useState<string | "">("");
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Activity Form State
  const [newActivity, setNewActivity] = useState({
    title: "",
    programId: "all",
    blockId: "all",
    rubricId: "",
    dueDate: "",
    description: "",
  });

  // Modal States for individual assignment
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitUploadId, setSubmitUploadId] = useState<string | null>(null);
  const [submitStudentQuery, setSubmitStudentQuery] = useState("");

  // 1. Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.auth_id) return;
      
      try {
        setLoading(true);
        
        // Fetch Programs and Blocks via teacher_program_loads
        const { data: tplData, error: tplErr } = await supabase
          .from('teacher_program_loads')
          .select(`
            id,
            program_id,
            programs_lookup (id, program_name, program_code),
            blocks (id, block_name),
            teacher_course_loads!inner (teacher_id)
          `)
          .eq('teacher_course_loads.teacher_id', user.auth_id);
        
        if (tplErr) throw tplErr;

        if (tplData) {
          const progMap = new Map<string, Program>();
          const blockList: Block[] = [];

          tplData.forEach((row: any) => {
            if (row.programs_lookup) {
              progMap.set(row.programs_lookup.id, {
                id: row.programs_lookup.id,
                name: row.programs_lookup.program_name,
                code: row.programs_lookup.program_code
              });
            }
            if (row.blocks) {
              blockList.push({
                id: row.blocks.id,
                name: row.blocks.block_name,
                programId: row.program_id
              });
            }
          });

          setPrograms(Array.from(progMap.values()));
          setBlocks(blockList);
        }

        // Fetch Rubrics (Public + Teacher's own)
        const [pubRubrics, userRubrics] = await Promise.all([
          supabase.from('rubrics').select('id, title').eq('is_public', true),
          supabase.from('rubrics').select('id, title').eq('user_id', user.auth_id)
        ]);
        
        const combinedRubrics = [
          ...(pubRubrics.data || []),
          ...(userRubrics.data || [])
        ].map(r => ({ id: String(r.id), title: r.title }));
        
        setRubrics(combinedRubrics);

        // Fetch Teacher Activities
        const { data: actData, error: aErr } = await supabase
          .from('essay_activities')
          .select('*')
          .eq('teacher_id', user.auth_id)
          .order('created_at', { ascending: false });
        
        if (aErr) throw aErr;
        if (actData) {
          const mappedActs = actData.map(a => ({
            id: a.id,
            title: a.title,
            programId: a.program_id?.[0] || 'all',
            blockId: a.block_id?.[0] || 'all',
            rubricId: a.rubric_id,
            dueDate: a.due_date,
            description: a.instructions
          }));
          setActivities(mappedActs);
          if (mappedActs.length > 0 && !activeActivityId) {
            setActiveActivityId(mappedActs[0].id);
          }
        }

      } catch (err) {
        console.error("Error fetching management data:", err);
        showNotification('error', "Failed to load management data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.auth_id, showNotification, activeActivityId]);

  // 2. Fetch Students when program/block changes
  const fetchStudents = useCallback(async (targetProgramId: string, targetBlockId: string) => {
    try {
      let query = supabase.from('students').select('*').eq('teacher_id', user?.auth_id);
      
      if (targetBlockId !== 'all') {
        const { data: enrollmentData } = await supabase
          .from('block_students')
          .select('student_id')
          .eq('block_id', targetBlockId);
        
        const studentIds = enrollmentData?.map(e => String(e.student_id)) || [];
        if (studentIds.length > 0) {
          query = query.in('id', studentIds);
        } else {
          setStudents([]);
          return;
        }
      } else if (targetProgramId !== 'all') {
         query = query.eq('program_id', targetProgramId);
      }

      const { data: studentData, error: sErr } = await query.order('last_name').limit(200);
      if (sErr) throw sErr;
      
      if (studentData) {
        setStudents(studentData.map(s => ({
          id: s.id,
          name: buildFullNameFromObject(s),
          programId: s.program_id || '',
          blockId: targetBlockId,
          studentCode: s.student_code
        })));
      }
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  }, []);

  // 3. Fetch Submissions for active activity
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!activeActivityId) return;

      const { data, error } = await supabase
        .from('essays')
        .select(`
          *,
          student:students (
            first_name,
            last_name,
            nickname
          )
        `)
        .eq('activity_id', activeActivityId);

      if (error) {
        console.error("Error fetching submissions:", error);
        return;
      }

      if (data) {
        setSubmissions(data.map(s => ({
          id: s.id,
          activityId: s.activity_id,
          studentId: s.student_id,
          studentName: buildFullNameFromObject(s.student),
          fileName: s.title || s.file_path?.split('/').pop() || 'Submission',
          status: s.status,
          submittedAt: s.submitted_at
        })));
      }
    };

    fetchSubmissions();
    
    // Also update student list based on activity scope
    const act = activities.find(a => a.id === activeActivityId);
    if (act) {
      fetchStudents(act.programId, act.blockId);
    }
  }, [activeActivityId, activities, fetchStudents]);

  // Derived Values
  const filteredBlocks = useMemo(
    () =>
      newActivity.programId === "all"
        ? blocks
        : blocks.filter((b) => b.programId === newActivity.programId),
    [newActivity.programId, blocks]
  );

  const submitModalStudentSuggestions = useMemo(() => {
    if (!submitStudentQuery.trim()) return students.slice(0, 8);
    const q = submitStudentQuery.toLowerCase();
    return students.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [students, submitStudentQuery]);

  // Handlers
  const handleCreateActivity = async () => {
    if (!newActivity.title.trim() || !user?.auth_id) return;

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('essay_activities')
        .insert({
          title: newActivity.title.trim(),
          teacher_id: user.auth_id,
          program_id: newActivity.programId === 'all' ? null : [newActivity.programId],
          block_id: newActivity.blockId === 'all' ? null : [newActivity.blockId],
          rubric_id: newActivity.rubricId || null,
          due_date: newActivity.dueDate || null,
          instructions: newActivity.description || null,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      const created: EssayActivity = {
        id: data.id,
        title: data.title,
        programId: data.program_id?.[0] || 'all',
        blockId: data.block_id?.[0] || 'all',
        rubricId: data.rubric_id,
        dueDate: data.due_date,
        description: data.instructions
      };

      setActivities(prev => [created, ...prev]);
      setActiveActivityId(created.id);
      showNotification('success', "Activity created successfully.");
      
      setNewActivity({
        title: "",
        programId: "all",
        blockId: "all",
        rubricId: "",
        dueDate: "",
        description: "",
      });
    } catch (err) {
      console.error("Error creating activity:", err);
      showNotification('error', "Failed to create activity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const newItems: PendingUpload[] = files.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      file,
      studentId: "",
    }));
    setPendingUploads((prev) => [...prev, ...newItems]);
    event.target.value = "";
  };

  const handleAssignStudent = (uploadId: string, studentId: string) => {
    setPendingUploads((prev) =>
      prev.map((u) => u.id === uploadId ? { ...u, studentId } : u)
    );
  };

  const handleConfirmUploads = async () => {
    if (!selectedActivityForUpload || !user?.auth_id) return;

    try {
      setIsSubmitting(true);
      const uploadsToSave = pendingUploads.filter((u) => u.studentId);
      
      for (const upload of uploadsToSave) {
        const fileExt = upload.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `essays/${selectedActivityForUpload}/${fileName}`;

        const { error: storageError } = await supabase.storage
          .from('essays')
          .upload(filePath, upload.file);

        if (storageError) throw storageError;

        const { error: insertError } = await supabase.from('essays').insert({
          student_id: upload.studentId,
          activity_id: selectedActivityForUpload,
          teacher_id: user.auth_id,
          file_path: filePath,
          title: upload.file.name,
          status: 'submitted'
        });

        if (insertError) throw insertError;
      }

      showNotification('success', `Successfully uploaded ${uploadsToSave.length} essays.`);
      setPendingUploads(prev => prev.filter(u => !u.studentId));
      
      if (selectedActivityForUpload === activeActivityId) {
        setActiveActivityId(null);
        setTimeout(() => setActiveActivityId(selectedActivityForUpload), 10);
      }
    } catch (err) {
      console.error("Batch upload error:", err);
      showNotification('error', "Failed to upload some essays.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-neutral-500 font-medium">Loading management dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-bold">Manage Essays</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Create activities and upload student essays.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Create Activity */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="p-6 space-y-4 shadow-sm border-neutral-200">
            <div className="flex items-center gap-2 border-b pb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-neutral-900">
                New Activity
              </h2>
            </div>

            <Input
              label="Essay Title"
              placeholder="e.g. Critical Analysis of Modernism"
              value={newActivity.title}
              onChange={(value) => setNewActivity((prev) => ({ ...prev, title: value }))}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-widest">
                  Program
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  value={newActivity.programId}
                  onChange={(e) =>
                    setNewActivity((prev) => ({
                      ...prev,
                      programId: e.target.value,
                      blockId: "all",
                    }))
                  }
                >
                  <option value="all">All Programs</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-widest">
                  Class
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  value={newActivity.blockId}
                  onChange={(e) => setNewActivity((prev) => ({ ...prev, blockId: e.target.value }))}
                >
                  <option value="all">All Classes</option>
                  {filteredBlocks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-widest">
                  Rubric
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  value={newActivity.rubricId}
                  onChange={(e) => setNewActivity((prev) => ({ ...prev, rubricId: e.target.value }))}
                >
                  <option value="">Select rubric (optional)</option>
                  {rubrics.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-widest">
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  value={newActivity.dueDate}
                  onChange={(e) => setNewActivity((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <Input
              label="Instructions"
              placeholder="Provide clear instructions for students..."
              type="textarea"
              rows={4}
              value={newActivity.description}
              onChange={(value) => setNewActivity((prev) => ({ ...prev, description: value }))}
            />

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleCreateActivity}
                disabled={!newActivity.title.trim() || isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                New Activity
              </Button>
            </div>
          </Card>

          {/* Batch Upload */}
          <Card className="p-6 space-y-4 shadow-sm border-neutral-200">
            <div className="flex items-center gap-2 border-b pb-3">
              <div className="p-2 bg-success-default/10 rounded-lg">
                <Upload className="w-5 h-5 text-success-default" />
              </div>
              <h2 className="text-lg font-bold text-neutral-900">
                Upload Multiple Essays
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1 uppercase tracking-widest">
                  Select Activity
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  value={selectedActivityForUpload}
                  onChange={(e) => setSelectedActivityForUpload(e.target.value)}
                >
                  <option value="">Select an activity</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-widest">
                  Select Files (PDF/Images)
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={handleFilesSelected}
                    className="hidden"
                    id="batch-file-input"
                    disabled={!selectedActivityForUpload}
                  />
                  <label 
                    htmlFor="batch-file-input"
                    className={`
                      flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-xl p-6 cursor-pointer
                      transition-all duration-200 hover:border-primary hover:bg-primary/5
                      ${!selectedActivityForUpload ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <Upload className="w-8 h-8 text-neutral-400 mb-2 group-hover:text-primary" />
                    <span className="text-sm font-medium text-neutral-700">Click to browse or drop files</span>
                    <span className="text-xs text-neutral-500 mt-1">Accepts PDF, JPG, PNG</span>
                  </label>
                </div>
              </div>
            </div>

            {pendingUploads.length > 0 && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-neutral-800">
                    Files selected ({pendingUploads.length})
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-xl bg-neutral-50/50">
                  <Table>
                    <TableBody>
                      {pendingUploads.map((u) => (
                        <TableRow key={u.id} className="hover:bg-white transition-colors">
                          <TableCell className="text-sm p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span className="truncate max-w-[120px] font-medium" title={u.file.name}>
                                {u.file.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="p-3">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full text-xs truncate"
                              onClick={() => {
                                setSubmitUploadId(u.id);
                                setIsSubmitModalOpen(true);
                              }}
                            >
                              {u.studentId ? students.find(s => s.id === u.studentId)?.name || 'Assigned' : "Assign to Student"}
                            </Button>
                          </TableCell>
                          <TableCell className="p-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-danger-default hover:bg-danger-default/10"
                              onClick={() => setPendingUploads(prev => prev.filter(p => p.id !== u.id))}
                            >
                              <Plus className="w-4 h-4 rotate-45" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleConfirmUploads}
                  disabled={!selectedActivityForUpload || !pendingUploads.some((u) => u.studentId) || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload {pendingUploads.filter(u => u.studentId).length} Essays
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Activities list & details */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="p-6 space-y-4 shadow-sm border-neutral-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-neutral-900">
                  Existing Activities
                </h2>
              </div>
              <Badge className="bg-neutral-100 text-neutral-600 border-none">{activities.length} total</Badge>
            </div>

            {activities.length === 0 ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500 font-medium">No activities created yet.</p>
                <p className="text-xs text-neutral-400 mt-1">Use the form on the left to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activities.map((activity) => {
                  const isActive = activity.id === activeActivityId;
                  const prog = programs.find(p => p.id === activity.programId);
                  const blk = blocks.find(b => b.id === activity.blockId);
                  const subCount = submissions.filter(s => s.activityId === activity.id).length;

                  return (
                    <button
                      key={activity.id}
                      className={`
                        text-left border rounded-xl p-4 transition-all duration-200 group relative
                        ${isActive 
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary' 
                          : 'border-neutral-200 hover:border-primary/50 hover:bg-neutral-50'}
                      `}
                      onClick={() => setActiveActivityId(activity.id)}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-bold transition-colors ${isActive ? 'text-primary' : 'text-neutral-900'}`}>
                            {activity.title}
                          </h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] py-0 bg-white">
                            <Users className="w-2.5 h-2.5 mr-1" />
                            {prog ? prog.code : 'All Programs'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0 bg-white">
                            <Layers className="w-2.5 h-2.5 mr-1" />
                            {blk ? blk.name : 'All Classes'}
                          </Badge>
                          <Badge className="ml-auto bg-neutral-900 text-white text-[10px] py-0">
                            {subCount} Submissions
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Activity details: students & submissions */}
          {activeActivityId && (
            <Card className="p-0 shadow-sm border-neutral-200 overflow-hidden animate-in slide-in-from-top-2">
              <div className="p-6 border-b flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">Student Submissions</h2>
                    <p className="text-xs text-neutral-500">Managing activity: {activities.find(a => a.id === activeActivityId)?.title}</p>
                  </div>
                </div>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-neutral-50">
                    <TableRow>
                      <TableHead className="py-4 pl-6">Student Name</TableHead>
                      <TableHead className="py-4">Student ID</TableHead>
                      <TableHead className="py-4 text-center">Status</TableHead>
                      <TableHead className="py-4 text-right pr-6">File Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center text-neutral-400 italic">
                          No students found in the selected course/class.
                        </TableCell>
                      </TableRow>
                    ) : (
                      students.map((student) => {
                        const sub = submissions.find(s => s.studentId === student.id);
                        return (
                          <TableRow key={student.id} className="hover:bg-neutral-50/50 transition-colors">
                            <TableCell className="py-4 pl-6 font-medium text-neutral-900">
                              {student.name}
                            </TableCell>
                            <TableCell className="py-4 text-neutral-500 font-mono text-xs">
                              {student.studentCode}
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              {sub ? (
                                <Badge className="bg-success-default/10 text-success-default border-success-default/20">
                                  Submitted
                                </Badge>
                              ) : (
                                <Badge className="bg-neutral-100 text-neutral-400 border-none">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-4 text-right pr-6">
                              {sub ? (
                                <div className="flex items-center justify-end gap-3 text-primary font-medium text-sm">
                                  <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-3.5 h-3.5" />
                                      <span className="truncate max-w-[120px] text-xs" title={sub.fileName}>{sub.fileName}</span>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 px-3 border-primary/20 hover:bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest"
                                    onClick={() => {
                                      const url = buildSecureUrl("/Teacher/Evaluation", {
                                        studentId: student.id,
                                        activityId: activeActivityId || '',
                                        activityTitle: sub.fileName,
                                        studentName: student.name
                                      });
                                      navigate(url);
                                    }}
                                  >
                                    <Eye className="w-3 h-3 mr-1.5" />
                                    Grade
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-neutral-300">---</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Submit-to modal for assigning a single uploaded file */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Assign Essay to Student"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Search for the student who submitted the file: <span className="font-bold text-primary">{pendingUploads.find(u => u.id === submitUploadId)?.file.name}</span>
          </p>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Search by name or student ID..."
              value={submitStudentQuery}
              onChange={(e) => setSubmitStudentQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto border rounded-xl bg-neutral-50/50">
            {submitModalStudentSuggestions.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500 italic">No students found matching your search.</div>
            ) : (
              <div className="divide-y divide-neutral-200/60">
                {submitModalStudentSuggestions.map((s) => (
                  <button
                    key={s.id}
                    className="w-full text-left px-4 py-3 hover:bg-white transition-all duration-200 flex items-center justify-between group"
                    onClick={() => {
                      if (submitUploadId) {
                        handleAssignStudent(submitUploadId, s.id);
                        setIsSubmitModalOpen(false);
                        setSubmitStudentQuery("");
                      }
                    }}
                  >
                    <div>
                      <div className="font-bold text-neutral-900 group-hover:text-primary transition-colors">{s.name}</div>
                      <div className="text-xs text-neutral-500 font-mono mt-0.5">{s.studentCode}</div>
                    </div>
                    <div className="p-1.5 bg-neutral-100 rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <Plus className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
