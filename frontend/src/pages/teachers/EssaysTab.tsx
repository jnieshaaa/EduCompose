import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { 
  Search, Eye, Play, MessageSquare, Download, MoreVertical, Filter, 
  Upload, FileText, X, Users, Layers, ClipboardList, ArrowLeft
} from 'lucide-react';
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

// Types
type Program = { id: string; name: string };
type Block = { id: string; name: string; programId: string };
type Student = { id: string; name: string; programId: string; blockId: string };
type EssayActivity = {
  id: string;
  title: string;
  programId: string | "all";
  blockId: string | "all";
};

type PendingUpload = {
  id: string;
  file: File;
  studentId: string | "";
};

// Demo data
const demoPrograms: Program[] = [
  { id: "prog-1", name: "BS Computer Science" },
  { id: "prog-2", name: "BS Education" },
  { id: "prog-3", name: "BS Information Technology" },
];

const demoBlocks: Block[] = [
  { id: "block-1", name: "Block A", programId: "prog-1" },
  { id: "block-2", name: "Block B", programId: "prog-1" },
  { id: "block-3", name: "Block C", programId: "prog-2" },
  { id: "block-4", name: "Block A", programId: "prog-3" },
];

const demoStudents: Student[] = [
  { id: "stu-1", name: "Emma Wilson", programId: "prog-1", blockId: "block-1" },
  { id: "stu-2", name: "James Lee", programId: "prog-1", blockId: "block-1" },
  { id: "stu-3", name: "Sarah Martinez", programId: "prog-1", blockId: "block-2" },
  { id: "stu-4", name: "Michael Chen", programId: "prog-2", blockId: "block-3" },
  { id: "stu-5", name: "Olivia Brown", programId: "prog-3", blockId: "block-4" },
  { id: "stu-6", name: "Daniel Garcia", programId: "prog-1", blockId: "block-1" },
  { id: "stu-7", name: "Sophia Taylor", programId: "prog-1", blockId: "block-2" },
  { id: "stu-8", name: "Liam Anderson", programId: "prog-3", blockId: "block-4" },
];

const demoActivities: EssayActivity[] = [
  { id: "activity-1", title: "Argumentative Essay on Climate Change", programId: "prog-1", blockId: "all" },
  { id: "activity-2", title: "Machine Learning Ethics Analysis", programId: "prog-1", blockId: "block-1" },
  { id: "activity-3", title: "Creative Writing: Short Story", programId: "prog-2", blockId: "all" },
];

// Essay submissions with activity relationship
const essaysData = [
  { id: 1, activityId: "activity-1", student: 'Emma Wilson', title: 'Climate Change Impact', program: 'Computer Science 101', section: 'Section A', submitted: '2025-12-10', aiStatus: 'Completed', score: 88, teacherReview: 'Pending' },
  { id: 2, activityId: "activity-1", student: 'James Lee', title: 'Climate Policy Analysis', program: 'Computer Science 101', section: 'Section A', submitted: '2025-12-09', aiStatus: 'Completed', score: 85, teacherReview: 'Reviewed' },
  { id: 3, activityId: "activity-2", student: 'Sarah Martinez', title: 'AI Ethics in Healthcare', program: 'Data Structures', section: 'Section A', submitted: '2025-12-11', aiStatus: 'Pending', score: null, teacherReview: 'Not Started' },
  { id: 4, activityId: "activity-2", student: 'Michael Chen', title: 'ML Bias and Fairness', program: 'Web Development', section: 'Section A', submitted: '2025-12-08', aiStatus: 'Completed', score: 92, teacherReview: 'Reviewed' },
  { id: 5, activityId: "activity-3", student: 'Olivia Brown', title: 'The Last Train Home', program: 'Machine Learning', section: 'Section A', submitted: '2025-12-07', aiStatus: 'Completed', score: 79, teacherReview: 'In Progress' },
  { id: 6, activityId: "activity-1", student: 'Daniel Garcia', title: 'Environmental Policy', program: 'Computer Science 101', section: 'Section B', submitted: '2025-12-12', aiStatus: 'In Progress', score: null, teacherReview: 'Not Started' },
  { id: 7, activityId: "activity-3", student: 'Sophia Taylor', title: 'Midnight in Paris', program: 'Database Systems', section: 'Section A', submitted: '2025-12-06', aiStatus: 'Completed', score: 90, teacherReview: 'Reviewed' },
  { id: 8, activityId: "activity-1", student: 'Liam Anderson', title: 'Global Warming Effects', program: 'Web Development', section: 'Section B', submitted: '2025-12-11', aiStatus: 'Completed', score: 84, teacherReview: 'Pending' },
];

export function EssaysTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState<string | "">("");
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [essays, setEssays] = useState(essaysData);

  // Read activityId from URL on mount
  useEffect(() => {
    const urlActivityId = searchParams.get('activityId');
    if (urlActivityId && demoActivities.some(a => a.id === urlActivityId)) {
      setSelectedActivityId(urlActivityId);
    }
  }, [searchParams]);

  // Get the selected activity details
  const selectedActivity = useMemo(
    () => demoActivities.find(a => a.id === selectedActivityId),
    [selectedActivityId]
  );

  // Filter essays by activity and search
  const filteredEssays = useMemo(() => {
    let filtered = essays;
    
    // Filter by activity if selected
    if (selectedActivityId) {
      filtered = filtered.filter(essay => essay.activityId === selectedActivityId);
    }
    
    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(essay =>
        essay.student.toLowerCase().includes(q) ||
        essay.title.toLowerCase().includes(q) ||
        essay.program.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [essays, selectedActivityId, searchQuery]);

  // Get filtered students for batch upload based on selected activity
  const uploadStudents = useMemo(() => {
    if (!selectedActivity) return demoStudents;
    
    return demoStudents.filter(s => {
      const programMatch = selectedActivity.programId === "all" || s.programId === selectedActivity.programId;
      const blockMatch = selectedActivity.blockId === "all" || s.blockId === selectedActivity.blockId;
      return programMatch && blockMatch;
    });
  }, [selectedActivity]);

  // Stats
  const totalSubmitted = filteredEssays.length;
  const aiCompleted = filteredEssays.filter(e => e.aiStatus === 'Completed').length;
  const pendingAI = filteredEssays.filter(e => e.aiStatus === 'Pending').length;
  const teacherReviewed = filteredEssays.filter(e => e.teacherReview === 'Reviewed').length;
  const avgScore = filteredEssays.filter(e => e.score).reduce((acc, e) => acc + (e.score || 0), 0) / 
    (filteredEssays.filter(e => e.score).length || 1);

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

  // Batch upload handlers
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
      prev.map((u) =>
        u.id === uploadId ? { ...u, studentId } : u
      )
    );
  };

  const handleRemoveUpload = (uploadId: string) => {
    setPendingUploads((prev) => prev.filter((u) => u.id !== uploadId));
  };

  const handleConfirmUploads = () => {
    if (!selectedActivityId) return;

    const uploadsToSave = pendingUploads.filter((u) => u.studentId);
    if (!uploadsToSave.length) return;

    const newEssays = uploadsToSave.map((u, idx) => {
      const student = demoStudents.find((s) => s.id === u.studentId)!;
      return {
        id: essays.length + idx + 1,
        activityId: selectedActivityId,
        student: student.name,
        title: u.file.name.replace(/\.[^/.]+$/, ""),
        program: demoPrograms.find(p => p.id === student.programId)?.name || "Unknown",
        section: demoBlocks.find(b => b.id === student.blockId)?.name || "Unknown",
        submitted: new Date().toISOString().split('T')[0],
        aiStatus: 'Pending' as const,
        score: null,
        teacherReview: 'Not Started' as const,
      };
    });

    setEssays((prev) => [...newEssays, ...prev]);
    setPendingUploads([]);
    setIsBatchUploadOpen(false);
  };

  const getAIStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-600 text-white';
      case 'In Progress':
        return 'bg-blue-600 text-white';
      case 'Pending':
        return 'bg-amber-600 text-white';
      default:
        return 'bg-neutral-600 text-white';
    }
  };

  const getReviewStatusColor = (status: string) => {
    switch (status) {
      case 'Reviewed':
        return 'bg-green-600 text-white';
      case 'In Progress':
        return 'bg-blue-600 text-white';
      case 'Pending':
        return 'bg-amber-600 text-white';
      default:
        return 'bg-neutral-600 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-semibold">Essay Submissions</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {selectedActivity 
              ? `Viewing submissions for "${selectedActivity.title}"`
              : "Review and grade student essay submissions"
            }
          </p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary-300"
          onClick={() => setIsBatchUploadOpen(true)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Submissions
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
          <p className="text-sm text-neutral-500">Total Submitted</p>
          <p className="text-2xl text-neutral-900 mt-1">{totalSubmitted}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">AI Evaluated</p>
          <p className="text-2xl text-success-default mt-1">{aiCompleted}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Pending AI</p>
          <p className="text-2xl text-warning-default mt-1">{pendingAI}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Teacher Reviewed</p>
          <p className="text-2xl text-info-default mt-1">{teacherReviewed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Avg. Score</p>
          <p className="text-2xl text-primary mt-1">{avgScore.toFixed(1)}%</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search by student, title, program..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select 
              className="px-3 py-2 border border-neutral-300 rounded-rd text-sm"
              value={selectedActivityId}
              onChange={(e) => handleActivityChange(e.target.value)}
            >
              <option value="">All Activities</option>
              {demoActivities.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
            <select className="px-3 py-2 border border-neutral-300 rounded-rd text-sm">
              <option>All AI Status</option>
              <option>Completed</option>
              <option>In Progress</option>
              <option>Pending</option>
            </select>
            <select className="px-3 py-2 border border-neutral-300 rounded-rd text-sm">
              <option>All Reviews</option>
              <option>Reviewed</option>
              <option>Pending</option>
              <option>Not Started</option>
            </select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              More
            </Button>
          </div>
        </div>
      </Card>

      {/* Essays Table */}
      <Card>
        {filteredEssays.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-700 mb-2">No submissions found</h3>
            <p className="text-sm text-neutral-500 mb-4">
              {selectedActivityId 
                ? "No submissions for this activity yet. Upload some essays to get started."
                : "Try adjusting your filters or search query."
              }
            </p>
            {selectedActivityId && (
              <Button 
                className="bg-primary hover:bg-primary-300"
                onClick={() => setIsBatchUploadOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Submissions
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Essay Title</TableHead>
                <TableHead>Program / Section</TableHead>
                <TableHead className="text-center">Submitted</TableHead>
                <TableHead className="text-center">AI Status</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Teacher Review</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEssays.map((essay) => (
                <TableRow key={essay.id}>
                  <TableCell>
                    <div className="text-neutral-900">{essay.student}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-neutral-900">{essay.title}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-neutral-600">{essay.program}</div>
                    <Badge variant="outline" className="mt-1 bg-secondary/10 text-secondary border-secondary/20 text-xs">
                      {essay.section}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm text-neutral-600">{essay.submitted}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getAIStatusColor(essay.aiStatus)}>
                      {essay.aiStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {essay.score ? (
                      <Badge className={
                        essay.score >= 85 ? 'bg-green-600 text-white' :
                        essay.score >= 75 ? 'bg-blue-600 text-white' :
                        essay.score >= 60 ? 'bg-amber-600 text-white' :
                        'bg-red-600 text-white'
                      }>
                        {essay.score}%
                      </Badge>
                    ) : (
                      <span className="text-sm text-neutral-400">-</span>
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
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View Essay
                        </DropdownMenuItem>
                        {essay.aiStatus === 'Pending' && (
                          <DropdownMenuItem>
                            <Play className="w-4 h-4 mr-2" />
                            Trigger AI Evaluation
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Add Teacher Feedback
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          Download Essay
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

      {/* Batch Upload Modal */}
      <Modal
        isOpen={isBatchUploadOpen}
        onClose={() => {
          setIsBatchUploadOpen(false);
          setPendingUploads([]);
        }}
        title="Upload Essay Submissions"
        size="lg"
      >
        <div className="space-y-4">
          {/* Activity selector for batch upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Target Activity
            </label>
            <select
              className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
              value={selectedActivityId}
              onChange={(e) => handleActivityChange(e.target.value)}
            >
              <option value="">Select an activity</option>
              {demoActivities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
            {selectedActivity && (
              <p className="mt-1 text-xs text-neutral-500">
                Uploads will be associated with "{selectedActivity.title}"
              </p>
            )}
          </div>

          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Select Files (PDF / Images)
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,image/*"
              onChange={handleFilesSelected}
              className="block w-full text-sm text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-rd file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-300"
              disabled={!selectedActivityId}
            />
            <p className="mt-1 text-xs text-neutral-500">
              After selecting files, assign each one to the correct student below.
            </p>
          </div>

          {/* Pending uploads list */}
          {pendingUploads.length > 0 && (
            <div className="border rounded-rd overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b">
                <span className="text-sm font-medium text-neutral-700">
                  Pending Files ({pendingUploads.length})
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Assign to Student</TableHead>
                      <TableHead className="text-right">Remove</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUploads.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-neutral-500" />
                            <span className="truncate max-w-[160px]">
                              {u.file.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <select
                            className="w-full px-2 py-1 border border-neutral-300 rounded-rd text-sm"
                            value={u.studentId}
                            onChange={(e) => handleAssignStudent(u.id, e.target.value)}
                          >
                            <option value="">Select student</option>
                            {uploadStudents.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUpload(u.id)}
                          >
                            <X className="w-4 h-4 text-neutral-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsBatchUploadOpen(false);
                setPendingUploads([]);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={handleConfirmUploads}
              disabled={
                !selectedActivityId ||
                !pendingUploads.some((u) => u.studentId)
              }
            >
              <Upload className="w-4 h-4 mr-2" />
              Submit Assigned Files
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
