import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { 
  Search, Eye, MessageSquare, Download, MoreVertical, Filter, 
  Upload, FileText, X, ClipboardList, Loader2, Info, Brain
} from 'lucide-react';
import { useGrading } from '../../contexts/GradingContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { supabase } from '../../lib/supabaseClient';
import { buildSecureUrl } from '../../utils/secureUrl';
import { useAuth } from '../../contexts/AuthContext';
// Types
type EssayActivity = {
  id: string;
  title: string;
  course_id: string;
  block_id: string | null;
};

type EssaySubmission = {
  id: string;
  activityId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  title: string;
  program: string;
  section: string;
  submitted: string;
  status: string;
  score: number | null;
  teacherReview: string;
  activityTitle: string;
};

export function EssaysTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState<string | "">("");
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  
  const [activities, setActivities] = useState<EssayActivity[]>([]);
  const [essays, setEssays] = useState<EssaySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const { startGrading, isTaskActive } = useGrading();

  // 1. Fetch Teacher context and activities
  useEffect(() => {
    async function loadInitialData() {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch teacher's activities
        const { data: actData, error: actError } = await supabase
          .from('essay_activities')
          .select('id, title, course_id, block_id')
          .eq('teacher_id', (user as any).auth_id || user.id)
          .order('created_at', { ascending: false });

        if (actError) throw actError;
        setActivities(actData || []);
        // Sync with URL
        const urlActivityId = searchParams.get('activityId');
        if (urlActivityId && actData?.some(a => a.id === urlActivityId)) {
          setSelectedActivityId(urlActivityId);
        }
      } catch (err) {
        console.error("Error loading activities:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [user, searchParams]);

  // 2. Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    if (!user) return;
    try {
      const teacherActivityIds = activities.map(a => a.id);
      
      let query = supabase
        .from('essays')
        .select(`
          id, 
          title, 
          submitted_at, 
          status, 
          overall_score, 
          activity_id,
          student_id,
          essay_activities (title),
          users!student_id (
            id, 
            first_name, 
            last_name, 
            student_code,
            programs_lookup (name)
          ),
          blocks (id, section_name)
        `);

      if (selectedActivityId) {
        query = query.eq('activity_id', selectedActivityId);
      } else if (teacherActivityIds.length > 0) {
        query = query.in('activity_id', teacherActivityIds);
      } else {
        // No activities, no essays should be shown
        setEssays([]);
        return;
      }

      const { data, error } = await query.order('submitted_at', { ascending: false });
      if (error) throw error;

      const formatted: EssaySubmission[] = (data || []).map(e => {
        const student = (e.users as any);
        const program = student?.programs_lookup?.name || "No Program";
        const section = (e.blocks as any)?.section_name || "No Section";
        
        const statusDisplay = e.status === 'analyzed' ? 'Graded' : (e.status === 'submitted' ? 'Submitted' : 'Grading');
        
        return {
          id: e.id,
          activityId: e.activity_id,
          studentId: e.student_id,
          studentName: `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || "Unknown",
          studentCode: student?.student_code || "---",
          title: e.title || "Untitled",
          program: program,
          section: section,
          submitted: new Date(e.submitted_at).toLocaleDateString(),
          status: statusDisplay,
          score: e.overall_score,
          teacherReview: e.status === 'reviewed' ? 'Reviewed' : 'Pending',
          activityTitle: (e.essay_activities as any)?.title || "Unknown Activity"
        };
      });

      setEssays(formatted);
    } catch (err) {
      console.error("Error fetching essays:", err);
    }
  }, [selectedActivityId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Handlers
  const handleTriggerAI = async (_essayId: string, studentId: string, studentName: string, activityId: string, activityTitle: string) => {
    try {
      await startGrading(activityId, studentId, activityTitle, studentName);
    } catch (err) {
      console.error("Error triggering AI evaluation:", err);
    }
  };

  const handleClearActivityFilter = () => {
    setSelectedActivityId("");
    setSearchParams({});
  };

  const handleActivityChange = (activityId: string) => {
    setSelectedActivityId(activityId);
    if (activityId) {
      setSearchParams({ activityId });
    } else {
      setSearchParams({});
    }
  };

  // Filter local state based on search query
  const filteredEssays = useMemo(() => {
    if (!searchQuery) return essays;
    const q = searchQuery.toLowerCase();
    return essays.filter(e => 
      e.studentName.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      e.studentCode.toLowerCase().includes(q) ||
      e.program.toLowerCase().includes(q)
    );
  }, [essays, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = filteredEssays.length;
    const evaluated = filteredEssays.filter(e => e.status === 'Graded').length;
    const pending = total - evaluated;
    const reviewed = filteredEssays.filter(e => e.teacherReview === 'Reviewed').length;
    const scores = filteredEssays.filter(e => e.score !== null).map(e => e.score as number);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    return { total, evaluated, pending, reviewed, avg };
  }, [filteredEssays]);

  const getAIStatusColor = (status: string) => {
    switch (status) {
      case 'Graded': return 'bg-green-600 text-white';
      case 'Grading': return 'bg-blue-600 text-white';
      case 'Submitted': return 'bg-amber-600 text-white';
      default: return 'bg-neutral-600 text-white';
    }
  };

  const getReviewStatusColor = (status: string) => {
    return status === 'Reviewed' ? 'bg-green-600 text-white' : 'bg-amber-600 text-white';
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const selectedActivity = activities.find(a => a.id === selectedActivityId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-bold">Submissions</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {selectedActivity 
              ? `Viewing submissions for "${selectedActivity.title}"`
              : "Check and grade your student essays"
            }
          </p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary-300"
          onClick={() => setIsBatchUploadOpen(true)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Essays
        </Button>
      </div>

      {/* Activity Filter Banner */}
      {selectedActivityId && selectedActivity && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Filtered by Activity</p>
                <p className="font-semibold text-neutral-900">{selectedActivity.title}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearActivityFilter}>
              <X className="w-4 h-4 mr-1" />
              Clear Filter
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-neutral-500 font-medium">Total Submitted</p>
          <p className="text-2xl text-neutral-900 font-bold mt-1">{stats.total}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <p className="text-sm text-neutral-500 font-medium">Graded by AI</p>
          <p className="text-2xl text-green-600 font-bold mt-1">{stats.evaluated}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-sm text-neutral-500 font-medium">To be graded</p>
          <p className="text-2xl text-amber-600 font-bold mt-1">{stats.pending}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <p className="text-sm text-neutral-500 font-medium">Reviewed</p>
          <p className="text-2xl text-blue-600 font-bold mt-1">{stats.reviewed}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-primary">
          <p className="text-sm text-neutral-500 font-medium">Average Grade</p>
          <p className="text-2xl text-primary font-bold mt-1">{stats.avg.toFixed(1)}%</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search by student, title, code..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-neutral-400">
            <select 
              className="px-3 py-2 border border-neutral-300 rounded-rd text-sm bg-white text-neutral-900 outline-none focus:ring-2 focus:ring-primary/20"
              value={selectedActivityId}
              onChange={(e) => handleActivityChange(e.target.value)}
            >
              <option value="">All Activities</option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Essays Table */}
      <Card className="overflow-hidden border-none shadow-sm">
        {filteredEssays.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-neutral-300" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No submissions found</h3>
            <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
              {selectedActivityId 
                ? "There are no student submissions for this specific activity yet."
                : "Try adjusting your filters or search terms to find what you're looking for."
              }
            </p>
            {selectedActivityId && (
              <Button 
                className="bg-primary hover:bg-primary-300"
                onClick={() => setIsBatchUploadOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Essays
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-neutral-50/50">
              <TableRow>
                <TableHead className="font-bold text-neutral-400 uppercase tracking-widest text-xs">Student</TableHead>
                <TableHead className="font-bold text-neutral-400 uppercase tracking-widest text-xs">Essay Title</TableHead>
                <TableHead className="font-bold text-neutral-400 uppercase tracking-widest text-xs">Course / Class</TableHead>
                <TableHead className="text-center font-bold text-neutral-400 uppercase tracking-widest text-xs">Submitted</TableHead>
                <TableHead className="text-center font-bold text-neutral-400 uppercase tracking-widest text-xs">Status</TableHead>
                <TableHead className="text-center font-bold text-neutral-400 uppercase tracking-widest text-xs">Grade</TableHead>
                <TableHead className="text-center font-bold text-neutral-400 uppercase tracking-widest text-xs">Your Review</TableHead>
                <TableHead className="text-right font-bold text-neutral-400 uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEssays.map((essay) => (
                <TableRow key={essay.id} className="hover:bg-neutral-50/30 transition-colors">
                  <TableCell>
                    <div className="font-medium text-neutral-900">{essay.studentName}</div>
                    <div className="text-[10px] text-neutral-400 font-mono tracking-tighter uppercase">{essay.studentCode}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-neutral-900 font-medium">{essay.title}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-neutral-600">{essay.program}</div>
                    <Badge variant="outline" className="mt-1 bg-secondary/10 text-secondary border-secondary/20 text-[10px] font-bold py-0 h-4">
                      {essay.section}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-xs text-neutral-500">{essay.submitted}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getAIStatusColor(essay.status)}>
                      {essay.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {essay.score !== null ? (
                      <Badge className={
                        essay.score >= 85 ? 'bg-green-600 text-white' :
                        essay.score >= 75 ? 'bg-blue-600 text-white' :
                        essay.score >= 60 ? 'bg-amber-600 text-white' :
                        'bg-red-600 text-white'
                      }>
                        {essay.score.toFixed(1)}%
                      </Badge>
                    ) : (
                      <span className="text-sm text-neutral-400">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getReviewStatusColor(essay.teacherReview)}>
                      {essay.teacherReview}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4 text-neutral-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onClick={() => {
                            const url = buildSecureUrl("/Teacher/Evaluation", {
                              studentId: essay.studentId,
                              activityId: essay.activityId,
                              activityTitle: essay.title,
                              studentName: essay.studentName
                            });
                            navigate(url);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2 text-primary" />
                          View Grade
                        </DropdownMenuItem>

                        {(essay.status === 'Submitted' || essay.status === 'Grading') && (
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => handleTriggerAI(essay.id, essay.studentId, essay.studentName, essay.activityId, essay.activityTitle)}
                            disabled={isTaskActive(`${essay.activityId}-${essay.studentId}`)}
                          >
                            {isTaskActive(`${essay.activityId}-${essay.studentId}`) ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
                            ) : (
                              <Brain className="w-4 h-4 mr-2 text-primary" />
                            )}
                            {isTaskActive(`${essay.activityId}-${essay.studentId}`) ? "Evaluating..." : "Trigger AI Evaluation"}
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem className="cursor-pointer">
                          <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                          Send Feedback
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem className="cursor-pointer">
                          <Download className="w-4 h-4 mr-2 text-neutral-500" />
                          Download
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Batch Upload Modal Modal */}
      <Modal
        isOpen={isBatchUploadOpen}
        onClose={() => {
          setIsBatchUploadOpen(false);
        }}
        title="Upload Essays"
        size="lg"
      >
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-rd mb-4 flex gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800">
            To upload multiple essays at once, please use the <strong>Manage Essays</strong> tab for a better way to manage classes. Files uploaded here are for quick reference.
          </p>
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <Button
            className="bg-primary"
            onClick={() => navigate('/Teacher/EssayManagement')}
          >
            Go to Manage Essays
          </Button>
        </div>
      </Modal>
    </div>
  );
}
