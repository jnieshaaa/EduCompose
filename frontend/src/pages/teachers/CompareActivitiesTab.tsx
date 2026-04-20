import { useState, useEffect, useMemo } from "react";
import {
  Users,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  History,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import {
  fetchActivitiesWithDuplicates,
  fetchDuplicateEssays,
  fetchEssayTextsForStudents,
  fetchComparisonHistory,
  type DuplicateEssayGroup,
  type ComparisonAnalysis,
  type ComparisonHighlight,
} from "../../services/activityService";
import type { EssayActivity } from "../../types/activityTypes";
import { ViewEssayModal } from "../../components/activities/ViewEssayModal";
import { useNotification } from "../../contexts/NotificationContext";

type ComparisonResult = {
  insights: string;
  similarityScore: number;
  highlights: ComparisonHighlight[];
  studentEssays: Array<{
    studentId: string;
    studentName: string;
    essayId: string;
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

  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false);

  const [viewingEssayStudentId, setViewingEssayStudentId] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isViewEssayModalOpen, setIsViewEssayModalOpen] = useState(false);

  // Comparison state
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult | null>(null);
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
      return;
    }

    const loadData = async () => {
      setIsLoadingDuplicates(true);
      try {
        const duplicates = await fetchDuplicateEssays(selectedActivityId);
        setDuplicateGroups(duplicates);
      } catch (error) {
        console.error("Error loading data:", error);
        setDuplicateGroups([]);
      } finally {
        setIsLoadingDuplicates(false);
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



  const handleViewDuplicateGroup = async (group: DuplicateEssayGroup) => {
    try {
      const studentIdsArray = group.essays.map(e => e.studentId);

      // Fetch essay texts for selected students
      const essayData = await fetchEssayTextsForStudents(
        studentIdsArray,
        selectedActivityId
      );

      if (essayData.length < 2) {
        showNotification('error', "Could not fetch full essays for these students to view side-by-side.");
        return;
      }

      // Create comparison result omitting the AI analysis
      const result: ComparisonResult = {
        insights: "Identical submissions detected by EduCompose Integrity System.",
        similarityScore: 1.00, // It's essentially 100% since they tripped the duplicate detector
        highlights: [], // We omit LLM highlights
        studentEssays: essayData,
      };

      setComparisonResult(result);
      setViewMode("comparison");

    } catch (error) {
      console.error("Error viewing essays:", error);
      showNotification('error', "Failed to load the essays side-by-side. Please try again.");
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setComparisonResult(null);
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
              Past Comparisons
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

        {/* Simple Warning Banner instead of AI insights */}
        <Card className="p-6 bg-red-50 border-red-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-red-900 mb-2">
                Plagiarism Alert
              </h2>
              <p className="text-red-700 whitespace-pre-wrap">
                These students have submitted highly identical written works. Their essays are displayed below for comparison.
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
            Duplicate Detection
          </h1>
          <p className="text-neutral-600 mt-1">
            Find and check for similar essays from students
          </p>
        </div>
      </div>

      {/* Activity Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Select Activity
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
                    No similar essays found
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
              Similar Essays
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
                      onClick={() => handleViewDuplicateGroup(group)}
                      className="flex items-center gap-2"
                    >
                      View Essays
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}



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
