import { useState, useEffect } from "react";
import {
  FileText,
  Edit,
  MoreVertical,
  Eye,
  CheckCircle2,
  Trash2,
  Loader2,
  ArrowLeft,
  Search,
  AlertCircle,
  Users,
  ArrowUpDown
} from "lucide-react";
import { ViewEssayModal } from "./ViewEssayModal";
import { GradingProgressIndicator } from "./GradingProgressIndicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import type { EssayActivity, Student } from "../../types/activityTypes";
import {
  deleteEssay,
  checkEssayGraded,
  gradeEssay,
  fetchEssayAnalysis,
  allowResubmission,
} from "../../services/activityService";
import { buildSecureUrl } from "../../utils/secureUrl";
import { useNotification } from "../../contexts/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";

interface StudentsViewProps {
  activity: EssayActivity;
  students: Student[];
  courseName: string;
  courseSection: string;
  onBack: () => void;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

export function StudentsView({
  activity,
  students,
  courseName,
  courseSection,
  onBack,
  isLoading = false,
  onRefresh,
}: StudentsViewProps) {
  const [isViewEssayModalOpen, setIsViewEssayModalOpen] = useState(false);
  const [selectedStudentForView, setSelectedStudentForView] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudentForDelete, setSelectedStudentForDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [gradingStudents, setGradingStudents] = useState<
    Map<string, { progress: number; step: string }>
  >(new Map());
  const [gradedStudents, setGradedStudents] = useState<Set<string>>(new Set());
  const [isAllowingResubmission, setIsAllowingResubmission] = useState<
    string | null
  >(null);
  const [isViewingResult, setIsViewingResult] = useState<string | null>(null);
  const [isGradingAll, setIsGradingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  // Check which students have been graded
  useEffect(() => {
    const checkGradedStatus = async () => {
      const gradedSet = new Set<string>();
      const checkPromises = students
        .filter((student) => student.status === "submitted")
        .map(async (student) => {
          try {
            const isGraded = await checkEssayGraded(student.id, activity.id);
            if (isGraded) return student.id;
          } catch { /* ignore */ }
          return null;
        });

      const results = await Promise.all(checkPromises);
      results.forEach((studentId) => {
        if (studentId) gradedSet.add(studentId);
      });
      setGradedStudents(gradedSet);
    };

    if (students.length > 0 && activity.id) {
      checkGradedStatus();
    }
  }, [students, activity.id]);

  const handleDeleteEssay = async () => {
    if (!selectedStudentForDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteEssay(selectedStudentForDelete.id, activity.id);
      if (result.success) {
        showNotification('success', "Essay deleted successfully.");
        setIsDeleteModalOpen(false);
        setSelectedStudentForDelete(null);
        if (onRefresh) await onRefresh();
      } else {
        showNotification('error', `Deletion failed: ${result.error}`);
      }
    } catch (error) {
      showNotification('error', "System error during deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAllowResubmission = async (studentId: string) => {
    setIsAllowingResubmission(studentId);
    try {
      const result = await allowResubmission(studentId, activity.id, activity.title);
      if (result.success) {
        showNotification('success', "Student notified for resubmission.");
        if (onRefresh) await onRefresh();
      } else {
        showNotification('error', "Failed to send notification.");
      }
    } catch (error) {
      showNotification('error', "System error occurred.");
    } finally {
      setIsAllowingResubmission(null);
    }
  };

  const handleGradeAll = async () => {
    const toGrade = students.filter(
      (s) =>
        s.status === "submitted" &&
        !gradedStudents.has(s.id) &&
        !gradingStudents.has(s.id) &&
        (!s.wordCount || s.wordCount >= (activity.minWordCount || 150)),
    );

    if (toGrade.length === 0) {
      showNotification('info', "No essays found to grade.");
      return;
    }

    if (!confirm(`Start grading for ${toGrade.length} essays?`)) return;

    setIsGradingAll(true);
    for (const student of toGrade) {
      setGradingStudents((prev) => new Map(prev).set(student.id, { progress: 0, step: "Waiting..." }));
      try {
        const result = await gradeEssay(student.id, student.name, activity.id, (progress, step) => {
          setGradingStudents((prev) => new Map(prev).set(student.id, { progress, step }));
        });
        if (result.success) {
          setGradedStudents((prev) => new Set(prev).add(student.id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setGradingStudents((prev) => {
          const newMap = new Map(prev);
          newMap.delete(student.id);
          return newMap;
        });
      }
    }
    if (onRefresh) await onRefresh();
    setIsGradingAll(false);
    showNotification('success', "Finished grading.");
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue: any = a[sortConfig.key as keyof typeof a];
    let bValue: any = b[sortConfig.key as keyof typeof b];

    if (sortConfig.key === 'grade') {
       aValue = a.score || 0;
       bValue = b.score || 0;
    } else if (sortConfig.key === 'status') {
       aValue = a.status === 'submitted' ? ((gradedStudents.has(a.id) || a.isGraded) ? 2 : 1) : 0;
       bValue = b.status === 'submitted' ? ((gradedStudents.has(b.id) || b.isGraded) ? 2 : 1) : 0;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center bg-white border border-neutral-100 hover:bg-neutral-50 text-neutral-400 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-neutral-900 leading-tight truncate">
              {activity.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest truncate">
                {courseName}
              </span>
              <span className="text-neutral-200">/</span>
              <span className="text-[10px] font-bold text-primary uppercase bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
                {courseSection}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGradeAll}
            disabled={isGradingAll || isLoading}
            className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isGradingAll ? <Loader2 size={16} className="animate-spin" /> : <Edit size={14} />}
            {isGradingAll ? "Grading..." : "Grade All"}
          </button>
        </div>
      </div>

      {/* Main Content Board */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-neutral-50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-50/20">
          <div>
            <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Student List</h2>
            <p className="text-xs text-neutral-500 font-medium ml-1 mt-0.5">
              {isLoading ? "Updating list..." : `${students.length} students`}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300" size={14} />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-100 rounded-xl text-xs placeholder:text-neutral-300 focus:outline-none focus:border-primary/30 transition-all shadow-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-20 text-center">
            <Loader2 className="animate-spin text-primary/30 w-8 h-8 mx-auto mb-4" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Loading...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-20 text-center">
            <Users className="w-12 h-12 text-neutral-100 mx-auto mb-4" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Empty Section</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-50/50">
                <TableRow>
                   <TableHead 
                     className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest pl-6 cursor-pointer hover:text-primary transition-colors"
                     onClick={() => handleSort('name')}
                   >
                     Student Name <ArrowUpDown size={10} className="inline ml-1" />
                   </TableHead>
                   <TableHead 
                     className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest text-center cursor-pointer hover:text-primary transition-colors"
                     onClick={() => handleSort('status')}
                   >
                     Status <ArrowUpDown size={10} className="inline ml-1" />
                   </TableHead>
                   <TableHead className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest text-center">Analysis</TableHead>
                   <TableHead 
                     className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest text-center cursor-pointer hover:text-primary transition-colors"
                     onClick={() => handleSort('grade')}
                   >
                     Grade <ArrowUpDown size={10} className="inline ml-1" />
                   </TableHead>
                   <TableHead className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-neutral-50">
                {sortedStudents.map((student) => {
                  const isLowWordCount = student.wordCount && student.wordCount < (activity.minWordCount || 150);
                  const isGrading = gradingStudents.has(student.id);
                  const isSubmitted = student.status === "submitted";
                  const isGraded = isSubmitted && (gradedStudents.has(student.id) || !!student.isGraded);

                  return (
                    <TableRow
                      key={student.id}
                      className={`transition-colors group ${isLowWordCount ? "bg-error-default/[0.02]" : "hover:bg-neutral-50/30"}`}
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${isLowWordCount ? 'text-error-default' : 'text-neutral-800'}`}>
                            {student.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
                               {student.wordCount || 0} WORDS
                             </span>
                             {isLowWordCount && (
                                  <span className="flex items-center gap-1 text-[8px] font-bold text-error-default uppercase bg-error-default/5 px-1.5 py-0.5 rounded-md">
                                   <AlertCircle size={8} /> Too short
                                 </span>
                             )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {isGrading ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <GradingProgressIndicator
                              progress={gradingStudents.get(student.id)?.progress || 0}
                              currentStep={gradingStudents.get(student.id)?.step}
                              size="sm"
                            />
                             <span className="text-[9px] font-bold text-primary uppercase animate-pulse">Grading...</span>
                          </div>
                        ) : isSubmitted ? (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            isGraded 
                            ? 'bg-success-default text-white border-success-default shadow-sm' 
                            : 'bg-primary/5 text-primary border-primary/20'
                          }`}>
                            {isGraded ? <CheckCircle2 size={10} /> : <FileText size={10} />}
                            {isGraded ? "Graded" : "Submitted"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-neutral-50 text-neutral-300 border border-neutral-100">
                             No Submission
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-3">
                            {[
                              { label: 'COH', val: student.coherence },
                              { label: 'READ', val: student.readability },
                              { label: 'ARG', val: student.argumentative },
                              { label: 'GRM', val: student.grammar }
                            ].map((m, i) => (
                              <div key={i} className="flex flex-col items-center min-w-[36px]">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">{m.label}</span>
                                <span className={`text-xs font-bold ${m.val !== undefined ? 'text-neutral-800' : 'text-neutral-300'}`}>
                                  {m.val !== undefined ? Math.round(Number(m.val)) : '—'}
                                </span>
                              </div>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {student.score !== undefined ? (
                          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-xs font-bold shadow-sm border ${
                            student.score >= 85 ? 'bg-success-default text-white border-success-default' :
                            student.score >= 75 ? 'bg-blue-500 text-white border-blue-500' : 'bg-amber-500 text-white border-amber-500'
                          }`}>
                            {Math.round(Number(student.score))}%
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-200 font-bold tracking-widest">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          {isSubmitted && !isGrading && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (isGraded) {
                                  setIsViewingResult(student.id);
                                  try {
                                    const analysisData = await fetchEssayAnalysis(student.id, activity.id);
                                    if (analysisData) {
                                      navigate(buildSecureUrl('/Teacher/AnalysisResults', {
                                        s: student.id,
                                        a: activity.id,
                                        activityId: activity.id,
                                        activityTitle: activity.title,
                                        programSection: courseSection,
                                        programName: courseName,
                                        studentName: student.name,
                                        studentId: student.id,
                                      }), { state: { ...analysisData, studentId: student.id, studentName: student.name, activityId: activity.id } });
                                    } else {
                                      showNotification('error', "Evaluation data not found. Try grading again.");
                                    }
                                  } catch (err) {
                                    showNotification('error', "Could not load results. System may be busy.");
                                  } finally {
                                    setIsViewingResult(null);
                                  }
                                } else {
                                  setGradingStudents((prev) => new Map(prev).set(student.id, { progress: 0, step: "Starting..." }));
                                  const result = await gradeEssay(student.id, student.name, activity.id, (progress, step) => {
                                    setGradingStudents((prev) => new Map(prev).set(student.id, { progress, step }));
                                  });
                                  setGradingStudents((prev) => {
                                    const n = new Map(prev); n.delete(student.id); return n;
                                  });
                                  if (result.success) {
                                    setGradedStudents((prev) => new Set(prev).add(student.id));
                                    if (onRefresh) await onRefresh();
                                    showNotification('success', `Essay for ${student.name} graded successfully!`);
                                  } else {
                                    showNotification('error', `Grading failed: ${result.error}`);
                                  }
                                }
                              }}
                              className={`p-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                                isGraded 
                                  ? "bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200" 
                                  : "bg-primary text-white hover:scale-[1.02] active:scale-[0.98] shadow-primary/10"
                              }`}
                              title={isGraded ? "View Evaluation" : "Grade Now"}
                            >
                               {isViewingResult === student.id ? (
                                 <Loader2 size={12} className="animate-spin" />
                               ) : (
                                 isGraded ? <Eye size={12} /> : <Edit size={12} />
                               )}
                               {isViewingResult === student.id ? "Loading..." : (isGraded ? "View" : "Grade")}
                            </button>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 text-neutral-300 hover:text-neutral-500 hover:bg-neutral-50 rounded-xl transition-all">
                                <MoreVertical size={15} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 shadow-xl">
                              <DropdownMenuItem
                                className="text-xs font-medium cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAllowResubmission(student.id);
                                }}
                                disabled={isAllowingResubmission === student.id}
                              >
                                {isAllowingResubmission === student.id ? <Loader2 size={13} className="mr-2 animate-spin" /> : <CheckCircle2 size={13} className="mr-2" />}
                                Let student resubmit
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="text-xs font-medium cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (student.status === "submitted") {
                                    setSelectedStudentForView({ id: student.id, name: student.name });
                                    setIsViewEssayModalOpen(true);
                                  }
                                }}
                                disabled={student.status !== "submitted"}
                                title="View extracted text"
                              >
                                <Eye size={13} className="mr-2" /> View Essay
                              </DropdownMenuItem>

                              {student.filePath && (
                                <DropdownMenuItem
                                  className="text-xs font-medium cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStudentForView({ id: student.id, name: student.name });
                                    setIsViewEssayModalOpen(true);
                                  }}
                                  title="View original uploaded file"
                                >
                                  <FileText size={13} className="mr-2" /> View Original File
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                 className="text-xs font-medium text-error-default cursor-pointer"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setSelectedStudentForDelete({ id: student.id, name: student.name });
                                   setIsDeleteModalOpen(true);
                                 }}
                                 disabled={student.status !== "submitted"}
                              >
                                <Trash2 size={13} className="mr-2" /> Delete Essay
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modals integrated with design system */}
      {selectedStudentForView && (
        <ViewEssayModal
          isOpen={isViewEssayModalOpen}
          onClose={() => { setIsViewEssayModalOpen(false); setSelectedStudentForView(null); }}
          studentId={selectedStudentForView.id}
          studentName={selectedStudentForView.name}
          activityId={activity.id}
        />
      )}

      {/* Standardized Delete Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleteModalOpen(false)} className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-error-default/10 text-error-default rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} />
                </div>
                 <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Are you sure?</h3>
                 <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                   This will permanently delete <span className="text-neutral-700 font-bold">{selectedStudentForDelete?.name}'s</span> essay and its grade.
                 </p>
              </div>
              <div className="p-4 bg-neutral-50 flex gap-2">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-600">Cancel</button>
                <button onClick={handleDeleteEssay} disabled={isDeleting} className="flex-1 px-4 py-2 bg-error-default text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-error-default/20 disabled:opacity-50">
                  {isDeleting ? "Deleting..." : "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="text-center">
         <button onClick={onBack} className="text-[11px] font-bold text-neutral-300 uppercase tracking-widest hover:text-primary transition-all">Back</button>
      </div>
    </div>
  );
}
