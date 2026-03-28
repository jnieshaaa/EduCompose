import { useState, useEffect } from "react";
import {
  FileText,
  Edit,
  MoreVertical,
  Eye,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import Tooltip from "../ui/Tooltip";
import { ViewEssayModal } from "./ViewEssayModal";
import { GradingProgressIndicator } from "./GradingProgressIndicator";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import AlertModal, { type AlertType } from "../ui/AlertModal";
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
  const [isGradingAll, setIsGradingAll] = useState(false);
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: AlertType;
    title?: string;
    message: string;
  }>({
    isOpen: false,
    type: "info",
    title: undefined,
    message: "",
  });
  const navigate = useNavigate();

  const showAlert = (
    type: AlertType,
    message: string,
    title?: string,
  ) => {
    setAlertState({ isOpen: true, type, title, message });
  };

  // Check which students have been graded
  useEffect(() => {
    const checkGradedStatus = async () => {
      const gradedSet = new Set<string>();
      const checkPromises = students
        .filter((student) => student.status === "submitted")
        .map(async (student) => {
          try {
            const isGraded = await checkEssayGraded(student.id, activity.id);
            if (isGraded) {
              return student.id;
            }
          } catch {
            // Silently handle errors
          }
          return null;
        });

      const results = await Promise.all(checkPromises);
      results.forEach((studentId) => {
        if (studentId) {
          gradedSet.add(studentId);
        }
      });
      setGradedStudents(gradedSet);
    };

    if (students.length > 0 && activity.id) {
      checkGradedStatus();
    }
  }, [students, activity.id]);

  const handleDeleteEssay = async () => {
    if (!selectedStudentForDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteEssay(
        selectedStudentForDelete.id,
        activity.id,
      );

      if (result.success) {
        showAlert("success", "Essay deleted successfully.");
        setIsDeleteModalOpen(false);
        setSelectedStudentForDelete(null);
        if (onRefresh) await onRefresh();
      } else {
        showAlert(
          "error",
          `Failed to delete essay: ${result.error || "Unknown error"}`,
          "Delete Failed",
        );
      }
    } catch (error) {
      console.error("Delete error:", error);
      showAlert("error", "Failed to delete essay. Please try again.", "Delete Failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAllowResubmission = async (studentId: string) => {
    setIsAllowingResubmission(studentId);
    try {
      const result = await allowResubmission(
        studentId,
        activity.id,
        activity.title,
      );
      if (result.success) {
        showAlert(
          "success",
          "Notification sent to student allowing resubmission or reupload.",
        );
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        showAlert(
          "error",
          `Failed to send notification: ${result.error}`,
          "Notification Failed",
        );
      }
    } catch (error) {
      console.error("Allow resubmission error:", error);
      showAlert(
        "error",
        "An error occurred while sending the notification.",
        "Notification Failed",
      );
    } finally {
      setIsAllowingResubmission(null);
    }
  };

  const handleGradeAll = async () => {
    // Find all submitted students who are not yet graded and not disqualified by word count
    const toGrade = students.filter(
      (s) =>
        s.status === "submitted" &&
        !gradedStudents.has(s.id) &&
        !gradingStudents.has(s.id) &&
        (!s.wordCount || s.wordCount >= (activity.minWordCount || 150)),
    );

    if (toGrade.length === 0) {
      const allSubmitted = students.filter(
        (s) => s.status === "submitted" && !gradedStudents.has(s.id),
      );
      if (allSubmitted.length > 0) {
        showAlert(
          "warning",
          `No valid essays to grade. Some may be below the ${activity.minWordCount || 150} word requirement.`,
        );
      } else {
        showAlert("info", "No pending essays to grade.");
      }
      return;
    }

    if (
      !confirm(
        `Are you sure you want to grade all ${toGrade.length} pending essays?`,
      )
    ) {
      return;
    }

    setIsGradingAll(true);

    // Grade them sequentially to avoid overwhelming the API
    for (const student of toGrade) {
      setGradingStudents((prev) => {
        const newMap = new Map(prev);
        newMap.set(student.id, { progress: 0, step: "Waiting..." });
        return newMap;
      });

      try {
        const result = await gradeEssay(
          student.id,
          student.name,
          activity.id,
          (progress, step) => {
            setGradingStudents((prev) => {
              const newMap = new Map(prev);
              newMap.set(student.id, { progress, step });
              return newMap;
            });
          },
        );

        if (result.success) {
          setGradedStudents((prev) => {
            const newSet = new Set(prev);
            newSet.add(student.id);
            return newSet;
          });
        }
      } catch (err) {
        console.error(`Error grading student ${student.id}:`, err);
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
    showAlert("success", "Batch grading process completed.");
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGradeAll}
            disabled={isGradingAll || isLoading}
            className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-semibold"
          >
            {isGradingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Grading All...
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                Grade All Pending
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Activity Header */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          {activity.title}
        </h1>
        <p className="text-neutral-600 mb-2">
          {courseName} - {courseSection}
        </p>
        {activity.description && (
          <p className="text-sm text-neutral-500">{activity.description}</p>
        )}
      </Card>

      {/* Students Table */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-neutral-900">Students</h2>
          <p className="text-sm text-neutral-500">
            {isLoading
              ? "Loading students..."
              : `${students.length} students in this section`}
          </p>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-neutral-500">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            <p className="text-lg font-medium text-neutral-700 mb-2">
              No students found
            </p>
            <p className="text-sm text-neutral-500">
              There are no students in {courseName} - {courseSection}. Please
              check that the course and section names are correct.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Coherence</TableHead>
                <TableHead className="text-center">Readability</TableHead>
                <TableHead className="text-center">Argumentative</TableHead>
                <TableHead className="text-center">Grammar</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow
                  key={student.id}
                  className={`transition-colors h-16 ${
                    student.wordCount &&
                    student.wordCount < (activity.minWordCount || 150)
                      ? "border-l-4 border-l-red-500 bg-red-50/30 hover:bg-red-50/50"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <TableCell className="font-medium whitespace-nowrap py-4">
                    {student.wordCount &&
                    student.wordCount < (activity.minWordCount || 150) ? (
                      <Tooltip
                        content={
                          student.gradingError ||
                          `Essay is too short (minimum ${activity.minWordCount || 150} words).`
                        }
                        position="right"
                      >
                        <div className="flex flex-col">
                          <span className="text-red-700 font-semibold">
                            {student.name}
                          </span>
                          <span className="text-xs text-red-500 italic flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Low Word Count ({student.wordCount} words)
                          </span>
                        </div>
                      </Tooltip>
                    ) : (
                      <div className="flex flex-col">
                        <span>{student.name}</span>
                        {student.wordCount && (
                          <span className="text-xs text-neutral-400">
                            {student.wordCount} words
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {gradingStudents.has(student.id) ? (
                      <div className="flex items-center justify-center gap-2">
                        <GradingProgressIndicator
                          progress={
                            gradingStudents.get(student.id)?.progress || 0
                          }
                          currentStep={gradingStudents.get(student.id)?.step}
                          size="sm"
                        />
                        <span className="text-xs text-neutral-500">
                          Grading...
                        </span>
                      </div>
                    ) : student.status === "submitted" ? (
                      student.coherence !== undefined ||
                      student.readability !== undefined ||
                      student.argumentative !== undefined ||
                      student.grammar !== undefined ||
                      student.score !== undefined ? (
                        <Badge className="bg-emerald-800 text-white border-emerald-900/20 shadow-sm">
                          <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                          Graded
                        </Badge>
                      ) : (
                        <Badge variant="info" className="shadow-sm">
                          <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                          Submitted
                        </Badge>
                      )
                    ) : (
                      <Badge variant="error" className="shadow-sm">
                        <XCircle className="w-3 h-3 mr-1 inline" />
                        Not Submitted
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {student.coherence !== undefined ? (
                      <span className="font-medium">{Number(student.coherence).toFixed(2)}%</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {student.readability !== undefined ? (
                      <span className="font-medium">
                        {Number(student.readability).toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {student.argumentative !== undefined ? (
                      <span className="font-medium">
                        {Number(student.argumentative).toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {student.grammar !== undefined ? (
                      <span className="font-medium">{Number(student.grammar).toFixed(2)}%</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {student.score !== undefined ? (
                      <Badge
                        className={
                          student.score >= 90
                            ? "bg-green-600 text-white"
                            : student.score >= 80
                              ? "bg-blue-600 text-white"
                              : "bg-amber-600 text-white"
                        }
                      >
                        {Number(student.score).toFixed(2)}%
                      </Badge>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAllowResubmission(student.id);
                          }}
                          disabled={isAllowingResubmission === student.id}
                        >
                          <Loader2
                            className={`w-4 h-4 mr-2 ${isAllowingResubmission === student.id ? "animate-spin" : "hidden"}`}
                          />
                          <CheckCircle2
                            className={`w-4 h-4 mr-2 ${isAllowingResubmission === student.id ? "hidden" : ""}`}
                          />
                          Allow Resubmission
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            if (student.status === "submitted") {
                              setSelectedStudentForView({
                                id: student.id,
                                name: student.name,
                              });
                              setIsViewEssayModalOpen(true);
                            } else {
                              showAlert(
                                "info",
                                "This student has not submitted an essay yet.",
                              );
                            }
                          }}
                          disabled={student.status !== "submitted"}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Essay
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (student.status === "submitted") {
                              if (gradingStudents.has(student.id)) {
                                return;
                              }

                              const isGraded = await checkEssayGraded(
                                student.id,
                                activity.id,
                              );
                              if (isGraded) {
                                const analysisData = await fetchEssayAnalysis(
                                  student.id,
                                  activity.id,
                                );
                                if (analysisData) {
                                  navigate(buildSecureUrl('/Teacher/AnalysisResults', {
                                    s: student.id,
                                    a: activity.id,
                                  }), {
                                    state: {
                                      analysis: analysisData.analysis,
                                      text: analysisData.text,
                                      title: analysisData.title,
                                      studentId: student.id,
                                      studentName: student.name,
                                      activityId: activity.id,
                                    },
                                  });
                                } else {
                                  showAlert(
                                    "error",
                                    "Failed to load analysis results.",
                                    "Analysis Error",
                                  );
                                }
                              } else {
                                setGradingStudents((prev) => {
                                  const newMap = new Map(prev);
                                  newMap.set(student.id, {
                                    progress: 0,
                                    step: "Starting...",
                                  });
                                  return newMap;
                                });

                                const result = await gradeEssay(
                                  student.id,
                                  student.name,
                                  activity.id,
                                  (progress, step) => {
                                    setGradingStudents((prev) => {
                                      const newMap = new Map(prev);
                                      newMap.set(student.id, {
                                        progress,
                                        step,
                                      });
                                      return newMap;
                                    });
                                  },
                                );

                                setGradingStudents((prev) => {
                                  const newMap = new Map(prev);
                                  newMap.delete(student.id);
                                  return newMap;
                                });

                                if (result.success) {
                                  setGradedStudents((prev) => {
                                    const newSet = new Set(prev);
                                    newSet.add(student.id);
                                    return newSet;
                                  });
                                  if (onRefresh) await onRefresh();
                                } else {
                                  showAlert(
                                    "error",
                                    `Failed to grade essay: ${result.error}`,
                                    "Grading Failed",
                                  );
                                  if (onRefresh) await onRefresh();
                                }
                              }
                            } else {
                              showAlert(
                                "info",
                                "This student has not submitted an essay yet.",
                              );
                            }
                          }}
                          disabled={
                            student.status !== "submitted" ||
                            gradingStudents.has(student.id)
                          }
                        >
                          {gradingStudents.has(student.id) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Grading...
                            </>
                          ) : gradedStudents.has(student.id) ? (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Show Result
                            </>
                          ) : (
                            <>
                              <Edit className="w-4 h-4 mr-2" />
                              Grade Essay
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            if (student.status === "submitted") {
                              setSelectedStudentForDelete({
                                id: student.id,
                                name: student.name,
                              });
                              setIsDeleteModalOpen(true);
                            } else {
                              showAlert(
                                "info",
                                "This student has not submitted an essay yet.",
                              );
                            }
                          }}
                          disabled={student.status !== "submitted"}
                          className="text-error-default focus:text-error-default focus:bg-error-default/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Essay
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

      {/* View Essay Modal */}
      {selectedStudentForView && (
        <ViewEssayModal
          isOpen={isViewEssayModalOpen}
          onClose={() => {
            setIsViewEssayModalOpen(false);
            setSelectedStudentForView(null);
          }}
          studentId={selectedStudentForView.id}
          studentName={selectedStudentForView.name}
          activityId={activity.id}
        />
      )}

      {/* Delete Essay Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedStudentForDelete(null);
        }}
        title="Delete Essay Submission"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Are you sure you want to delete the essay submission for{" "}
            <span className="font-semibold text-neutral-900">
              {selectedStudentForDelete?.name}
            </span>
            ? This action cannot be undone and will permanently remove the file
            and all associated analysis data.
          </p>

          <div className="bg-warning-default/10 border border-warning-default/20 rounded-md p-3">
            <p className="text-sm text-warning-default font-medium">
              ⚠️ Warning: This will delete the essay file and all analysis
              results permanently.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedStudentForDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteEssay}
              disabled={isDeleting}
              className="bg-error-default hover:bg-error-dark text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Essay"}
            </Button>
          </div>
        </div>
      </Modal>

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() =>
          setAlertState((prev) => ({ ...prev, isOpen: false }))
        }
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
      />
    </div>
  );
}
