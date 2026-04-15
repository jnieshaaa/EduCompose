import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Users,
  Search,
  // ChevronDown,
  // X,
  Eye,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  History,
  Sparkles,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import {
  fetchActivitiesWithDuplicates,
  fetchDuplicateEssays,
  fetchStudentsForActivity,
  fetchEssayTextsForStudents,
  analyzeEssaySimilarity,
  saveComparisonAnalysis,
  fetchComparisonHistory,
  type DuplicateEssayGroup,
  type ComparisonAnalysis,
  type ComparisonHighlight,
} from "../../services/activityService";
import type { EssayActivity } from "../../types/activityTypes";
import { ViewEssayModal } from "../../components/activities/ViewEssayModal";
import { useNotification } from "../../context/NotificationContext";

type ComparisonResult = {
  insights: string;
  similarityScore: number;
  highlights: ComparisonHighlight[];
  studentEssays: Array<{
    studentId: number;
    studentName: string;
    essayId: number;
    text: string;
  }>;
};

export function CompareActivitiesTab() {
  const [activitiesWithDuplicates, setActivitiesWithDuplicates] = useState<
    EssayActivity[]
  >([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateEssayGroup[]>(
    []
  );
  const [allStudents, setAllStudents] = useState<
    Array<{
      id: string;
      studentId: number;
      essayId: number;
      name: string;
      programName: string;
      sectionName: string;
      hasEssay: boolean;
    }>
  >([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(
    new Set()
  );
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [viewingEssayStudentId, setViewingEssayStudentId] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isViewEssayModalOpen, setIsViewEssayModalOpen] = useState(false);

  // Comparison state
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "comparison" | "history">(
    "list"
  );
  const [comparisonHistory, setComparisonHistory] = useState<
    ComparisonAnalysis[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { showNotification } = useNotification();

  // Load activities with duplicates
  useEffect(() => {
    const loadActivities = async () => {
      setIsLoadingActivities(true);
      try {
        const activities = await fetchActivitiesWithDuplicates();
        setActivitiesWithDuplicates(activities);
      } catch (error) {
        console.error("Error loading activities with duplicates:", error);
      } finally {
        setIsLoadingActivities(false);
      }
    };

    loadActivities();
  }, []);

  // Load duplicates when activity is selected
  useEffect(() => {
    if (!selectedActivityId) {
      setDuplicateGroups([]);
      setAllStudents([]);
      return;
    }

    const loadData = async () => {
      setIsLoadingDuplicates(true);
      setIsLoadingStudents(true);
      try {
        const [duplicates, students] = await Promise.all([
          fetchDuplicateEssays(selectedActivityId),
          fetchStudentsForActivity(selectedActivityId),
        ]);
        setDuplicateGroups(duplicates);
        setAllStudents(students);
      } catch (error) {
        console.error("Error loading data:", error);
        setDuplicateGroups([]);
        setAllStudents([]);
      } finally {
        setIsLoadingDuplicates(false);
        setIsLoadingStudents(false);
      }
    };

    loadData();
  }, [selectedActivityId]);

  // Load comparison history when viewing history
  useEffect(() => {
    if (viewMode === "history" && selectedActivityId) {
      const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const history = await fetchComparisonHistory(selectedActivityId);
          setComparisonHistory(history);
        } catch (error) {
          console.error("Error loading comparison history:", error);
          setComparisonHistory([]);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      loadHistory();
    }
  }, [viewMode, selectedActivityId]);

  const selectedActivity = useMemo(() => {
    return activitiesWithDuplicates.find((a) => a.id === selectedActivityId);
  }, [activitiesWithDuplicates, selectedActivityId]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    const query = studentSearchQuery.toLowerCase();
    return allStudents.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.programName.toLowerCase().includes(query) ||
        student.sectionName.toLowerCase().includes(query)
    );
  }, [allStudents, studentSearchQuery]);

  const handleOpenStudentModal = () => {
    setSelectedStudents(new Set());
    setStudentSearchQuery("");
    setIsStudentModalOpen(true);
  };

  const handleToggleStudent = (studentId: number) => {
    setSelectedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleCompareStudents = async () => {
    if (selectedStudents.size < 2) {
      showNotification('warning', "Please select at least 2 students to compare");
      return;
    }

    setIsComparing(true);
    setIsStudentModalOpen(false);

    try {
      const studentIdsArray = Array.from(selectedStudents);

      // Fetch essay texts for selected students
      const essayData = await fetchEssayTextsForStudents(
        studentIdsArray,
        selectedActivityId
      );

      if (essayData.length < 2) {
        showNotification('error', "Could not fetch essays for selected students. Please ensure they have submitted essays.");
        setIsComparing(false);
        return;
      }

      // Extract texts and names
      const essayTexts = essayData.map((e) => e.text);
      const studentNames = essayData.map((e) => e.studentName);

      // Call LLM analysis
      const analysisResult = await analyzeEssaySimilarity(
        essayTexts,
        studentNames
      );

      // Create comparison result
      const result: ComparisonResult = {
        insights: analysisResult.insights,
        similarityScore: analysisResult.similarityScore,
        highlights: analysisResult.highlights,
        studentEssays: essayData,
      };

      setComparisonResult(result);
      setViewMode("comparison");

      // Save to database
      try {
        await saveComparisonAnalysis({
          activityId: selectedActivityId,
          studentIds: studentIdsArray,
          essayIds: essayData.map((e) => e.essayId),
          insights: analysisResult.insights,
          highlights: analysisResult.highlights,
          similarityScore: analysisResult.similarityScore,
        });
      } catch (error) {
        console.error("Error saving comparison:", error);
        // Continue even if save fails
      }
    } catch (error) {
      console.error("Error comparing essays:", error);
      showNotification('error', "Failed to compare essays. Please try again.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleViewEssay = (studentId: number, studentName: string) => {
    setViewingEssayStudentId({ id: String(studentId), name: studentName });
    setIsViewEssayModalOpen(true);
  };

  const handleBackToList = () => {
    setViewMode("list");
    setComparisonResult(null);
  };

  const handleViewHistory = async () => {
    setViewMode("history");
  };

  const handleViewHistoryComparison = async (
    historyItem: ComparisonAnalysis
  ) => {
    // Fetch the essay texts for this history item
    const essayData = await fetchEssayTextsForStudents(
      historyItem.studentIds,
      historyItem.activityId
    );

    const result: ComparisonResult = {
      insights: historyItem.insights,
      similarityScore: historyItem.similarityScore || 0,
      highlights: historyItem.highlights,
      studentEssays: essayData,
    };

    setComparisonResult(result);
    setViewMode("comparison");
  };

  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  // Function to apply highlights to text
  const applyHighlights = (
    text: string,
    studentIndex: number,
    highlights: ComparisonHighlight[]
  ) => {
    const studentHighlights = highlights.filter(
      (h) => h.studentIndex === studentIndex
    );
    if (studentHighlights.length === 0) return escapeHtml(text);

    // Sort highlights by start position (reverse to avoid index shifting)
    const sortedHighlights = [...studentHighlights].sort(
      (a, b) => b.start - a.start
    );

    let result = escapeHtml(text);
    for (const highlight of sortedHighlights) {
      // Ensure valid indices
      const start = Math.max(0, Math.min(highlight.start, result.length));
      const end = Math.max(start, Math.min(highlight.end, result.length));

      if (start >= end) continue; // Skip invalid highlights

      const before = result.substring(0, start);
      const highlighted = result.substring(start, end);
      const after = result.substring(end);
      // Use more visible highlighting with amber/yellow color
      result = `${before}<mark style="background-color: #fcd34d; color: #78350f; padding: 2px 4px; border-radius: 3px; font-weight: 500;" class="similarity-highlight">${highlighted}</mark>${after}`;
    }

    return result;
  };

  // History View
  if (viewMode === "history") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to List
            </Button>
            <h1 className="text-2xl font-bold text-neutral-900">
              Comparison History
            </h1>
            <p className="text-neutral-600 mt-1">
              View past essay comparisons for{" "}
              {selectedActivity?.title || "this activity"}
            </p>
          </div>
        </div>

        {isLoadingHistory ? (
          <Card className="p-12">
            <div className="text-center text-neutral-500">
              Loading history...
            </div>
          </Card>
        ) : comparisonHistory.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <History className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 font-medium">
                No comparison history found
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                Past comparisons will appear here
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {comparisonHistory.map((item) => (
              <Card
                key={item.id}
                className="p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {item.studentIds.length} students
                      </Badge>
                      {item.similarityScore !== undefined && (
                        <Badge
                          className={
                            item.similarityScore > 70
                              ? "bg-red-100 text-red-700 border-red-200"
                              : item.similarityScore > 50
                              ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                              : "bg-green-100 text-green-700 border-green-200"
                          }
                        >
                          {item.similarityScore.toFixed(0)}% similar
                        </Badge>
                      )}
                      {item.createdAt && (
                        <span className="text-sm text-neutral-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-700 line-clamp-2">
                      {item.insights}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleViewHistoryComparison(item)}
                    className="ml-4"
                  >
                    View Comparison
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Comparison Result View
  if (viewMode === "comparison" && comparisonResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBackToList}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </div>

        {/* LLM Insights */}
        <Card className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                Similarity Analysis
              </h2>
              <div className="flex items-center gap-4 mb-4">
                <Badge
                  className={
                    comparisonResult.similarityScore > 0.7
                      ? "bg-red-500 text-red-700 border-red-200 text-lg px-4 py-1"
                      : comparisonResult.similarityScore > 0.5
                      ? "bg-yellow-500 text-yellow-700 border-yellow-200 text-lg px-4 py-1"
                      : "bg-green-500 text-green-700 border-green-200 text-lg px-4 py-1"
                  }
                >
                  {(comparisonResult.similarityScore * 100).toFixed(0)}% Similar
                </Badge>
              </div>
              <p className="text-neutral-700 whitespace-pre-wrap">
                {comparisonResult.insights}
              </p>
            </div>
          </div>
        </Card>

        {/* Side-by-Side Essays */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {comparisonResult.studentEssays.map((studentEssay, index) => (
            <Card key={studentEssay.studentId} className="p-6">
              <div className="mb-4 pb-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {studentEssay.studentName}
                </h3>
                <p className="text-sm text-neutral-500">
                  Student {index + 1} of {comparisonResult.studentEssays.length}
                </p>
              </div>
              <div
                className="prose prose-sm max-w-none text-neutral-700"
                dangerouslySetInnerHTML={{
                  __html: applyHighlights(
                    studentEssay.text,
                    index,
                    comparisonResult.highlights
                  ),
                }}
              />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Main List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Compare Similar Essays
          </h1>
          <p className="text-neutral-600 mt-1">
            Find and compare activities where students have submitted similar
            essays
          </p>
        </div>
        {selectedActivityId && (
          <Button
            variant="outline"
            onClick={handleViewHistory}
            className="flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            History
          </Button>
        )}
      </div>

      {/* Activity Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Select Activity with Similar Outputs
            </label>
            {isLoadingActivities ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-neutral-500">Loading activities...</p>
              </div>
            ) : activitiesWithDuplicates.length === 0 ? (
              <div className="flex items-center justify-center py-8 border border-neutral-200 rounded-rd bg-neutral-50">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                  <p className="text-neutral-600 font-medium">
                    No activities with similar outputs found
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">
                    Activities with duplicate essays will appear here
                  </p>
                </div>
              </div>
            ) : (
              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 bg-white"
              >
                <option value="">Select an activity...</option>
                {activitiesWithDuplicates.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedActivity && (
            <div className="pt-4 border-t border-neutral-200">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {selectedActivity.title}
                  </h3>
                  {selectedActivity.description && (
                    <p className="text-sm text-neutral-600 mt-1">
                      {selectedActivity.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <Badge className="bg-primary/80 text-primary border-primary/20">
                      {selectedActivity.submissionCount} submissions
                    </Badge>
                    {selectedActivity.dueDate && (
                      <span className="text-sm text-neutral-500">
                        Due:{" "}
                        {new Date(
                          selectedActivity.dueDate
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleOpenStudentModal}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Compare Any Students
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Duplicate Groups */}
      {selectedActivityId && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">
              Similar Essay Groups
            </h2>
            {isLoadingDuplicates && (
              <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200">
                Loading...
              </Badge>
            )}
          </div>

          {isLoadingDuplicates ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-neutral-500">Loading similar essays...</p>
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="flex items-center justify-center py-12 border border-neutral-200 rounded-rd bg-neutral-50">
              <div className="text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-neutral-600 font-medium">
                  No similar essays found
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  All essays in this activity appear to be unique
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicateGroups.map((group, index) => (
                <div
                  key={group.contentHash}
                  className="border border-neutral-200 rounded-rd p-4 hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-warning-default/80 text-warning-default border-warning-default/20">
                          Group {index + 1}
                        </Badge>
                        <span className="text-sm text-neutral-500">
                          {group.essays.length} similar essay
                          {group.essays.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.essays.slice(0, 3).map((essay) => (
                          <div
                            key={essay.essayId}
                            className="flex items-center gap-3 text-sm"
                          >
                            <Users className="w-4 h-4 text-neutral-400" />
                            <span className="font-medium text-neutral-900">
                              {essay.studentName}
                            </span>
                            <span className="text-neutral-500">
                              • {essay.programName} - {essay.sectionName}
                            </span>
                          </div>
                        ))}
                        {group.essays.length > 3 && (
                          <p className="text-sm text-neutral-500 ml-7">
                            +{group.essays.length - 3} more student
                            {group.essays.length - 3 > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={handleOpenStudentModal}
                      className="flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Select Students
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Student Selection Modal */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title="Select Students to Compare"
        size="lg"
        contentClassName="flex flex-col overflow-hidden p-0"
      >
        <div className="flex flex-col flex-1 overflow-hidden px-6 pb-6">
          {/* Search Bar */}
          <div className="mb-4 pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="search"
                placeholder="Search students by name, program, or section..."
                value={studentSearchQuery}
                onChange={setStudentSearchQuery}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-neutral-500 mt-2">
              Select 2 or more students to compare their essays
            </p>
          </div>

          {/* Student List */}
          <div className="border border-neutral-300 rounded-lg overflow-hidden flex-1 overflow-y-auto max-h-96">
            {isLoadingStudents ? (
              <div className="p-8 text-center text-neutral-500">
                <p>Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <p>No students found matching your search</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudents.has(student.studentId);
                  return (
                    <div
                      key={student.studentId}
                      className={`p-4 hover:bg-neutral-50 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary/5 border-l-4 border-l-primary"
                          : ""
                      }`}
                      onClick={() => handleToggleStudent(student.studentId)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleToggleStudent(student.studentId)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-neutral-900">
                                {student.name}
                              </span>
                              {isSelected && (
                                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                                  Selected
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-neutral-600">
                              <span>{student.programName}</span>
                              <span>•</span>
                              <span>{student.sectionName}</span>
                            </div>
                          </div>
                        </div>
                        {student.hasEssay && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e?.stopPropagation();
                              handleViewEssay(student.studentId, student.name);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-200">
            <div className="text-sm text-neutral-600">
              {selectedStudents.size > 0 ? (
                <span className="font-medium text-primary">
                  {selectedStudents.size} student
                  {selectedStudents.size > 1 ? "s" : ""} selected
                </span>
              ) : (
                <span>Select at least 2 students to compare</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsStudentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompareStudents}
                disabled={selectedStudents.size < 2 || isComparing}
              >
                {isComparing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>Compare ({selectedStudents.size})</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* View Essay Modal */}
      {viewingEssayStudentId && (
        <ViewEssayModal
          isOpen={isViewEssayModalOpen}
          onClose={() => {
            setIsViewEssayModalOpen(false);
            setViewingEssayStudentId(null);
          }}
          studentId={viewingEssayStudentId.id}
          studentName={viewingEssayStudentId.name}
          activityId={selectedActivityId}
        />
      )}
    </div>
  );
}
