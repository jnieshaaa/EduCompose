import { useState, useEffect } from "react";
import Card from "../../components/ui/Card";
import {
  BookOpen,
  Layers,
  Users,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import { supabase } from "../../lib/supabaseClient";
import { fetchTeacherId } from "../../services/rubricService";
import { fetchCourses, fetchSections } from "../../services/activityService";
import { buildFullNameFromObject } from "../../utils/nameUtils";

// Format timestamp to relative time (e.g., "2 minutes ago")
const formatTimeAgo = (timestamp: string | Date): string => {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? "s" : ""} ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? "s" : ""} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString();
};

// Format number with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

interface DashboardData {
  totalPrograms: number;
  totalSections: number;
  totalStudents: number;
  essaysSubmitted: number;
  essaysEvaluated: number;
  pendingReviews: number;
  performanceMetrics: {
    avgScore: {
      value: string;
      trend: string;
      status: "up" | "down" | "neutral";
    };
    grammarAccuracy: {
      value: string;
      trend: string;
      status: "up" | "down" | "neutral";
    };
    coherenceScore: {
      value: string;
      trend: string;
      status: "up" | "down" | "neutral";
    };
    vocabularyComplexity: {
      value: string;
      trend: string;
      status: "up" | "down" | "neutral";
    };
  };
  recentActivity: Array<{
    student: string;
    action: string;
    essay: string;
    time: string;
    status: "new" | "evaluated" | "review";
    score?: number;
  }>;
  alerts: Array<{
    type: "warning" | "error" | "info";
    message: string;
    count: number;
  }>;
}

// No longer using these legacy interfaces

interface EssayRow {
  id: number;
  title: string;
  submitted_at: string;
  status: string;
  student_id: number;
  activity_id: number | null;
  overall_score: number | null;
  grammar_score: number | null;
  coherence_score: number | null;
  argument_strength_score: number | null;
}

interface AnalysisResultRow {
  essay_id: number;
  grammar_score: number | null;
  coherence_score: number | null;
  detailed_analysis: Record<string, unknown> | null;
}

// No longer using these legacy interfaces

interface StudentNameRow {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
}

export function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const teacherId = await fetchTeacherId();
        if (!teacherId) {
          throw new Error("Teacher ID not available");
        }

        // Get teacher's activities to find which courses/sections they work with
        const { data: teacherActivities, error: activitiesError } =
          await supabase
            .from("essay_activities")
            .select("id, course_id, section_id")
            .eq("user_id", teacherId);

        if (activitiesError) throw activitiesError;

        const typedTeacherActivities =
          (teacherActivities as
            | {
                id: number;
                course_id: string | null;
                section_id: string | null;
              }[]
            | null) || [];

        const courseIds = [
          ...new Set(
            typedTeacherActivities
              .map((activity) => activity.course_id)
              .filter((id): id is string => id !== null),
          ),
        ];
        const sectionIds = [
          ...new Set(
            typedTeacherActivities
              .map((activity) => activity.section_id)
              .filter((id): id is string => id !== null),
          ),
        ];

        // Fetch all data in parallel
        const [
          allCourses,
          allSections,
          studentsData,
          essaysData,
          analysisResults,
        ] = await Promise.all([
          fetchCourses(),
          fetchSections(),
          // Get students in teacher's sections through block_students junction table
          supabase
            .from("block_students")
            .select("student_id, block_id")
            .then(({ data, error }) => {
              if (error) throw error;
              const enrollments =
                (data as { student_id: number; block_id: string }[] | null) ||
                [];
              if (sectionIds.length > 0) {
                // Filter enrollments to only include teacher's sections
                return enrollments.filter((enrollment) =>
                  sectionIds.includes(enrollment.block_id),
                );
              }
              return [];
            }),
          // Get essays from teacher's activities
          supabase
            .from("essays")
            .select(
              "id, title, submitted_at, status, student_id, activity_id, overall_score, grammar_score, coherence_score, argument_strength_score",
            )
            .then(({ data, error }) => {
              if (error) throw error;
              return (data as EssayRow[] | null) || [];
            }),
          (async (): Promise<AnalysisResultRow[]> => {
            const { data, error } = await supabase
              .from("essay_analysis_results")
              .select(
                "essay_id, grammar_score, coherence_score, detailed_analysis",
              );

            if (error) {
              if (
                error.code === "PGRST116" ||
                error.code === "42703" ||
                error.code === "PGRST100"
              ) {
                return [];
              }
              throw error;
            }

            return (data as AnalysisResultRow[] | null) || [];
          })(),
        ]);

        // Get activity IDs for the teacher
        const { data: activityIdsData } = await supabase
          .from("essay_activities")
          .select("id")
          .eq("user_id", teacherId);
        const activityIds = (
          (activityIdsData as Array<{ id: number }> | null) || []
        ).map((activity) => activity.id);

        // Filter essays by teacher's activities
        const teacherEssays = (essaysData as EssayRow[]).filter(
          (essay) =>
            essay.activity_id !== null &&
            activityIds.includes(essay.activity_id),
        );

        const teacherCourses = allCourses.filter((c) =>
          courseIds.includes(c.id),
        );
        const teacherSections = allSections.filter((s) =>
          sectionIds.includes(s.id),
        );

        // Count unique students from enrollments
        const uniqueStudentIds = new Set(
          studentsData?.map((enrollment) => enrollment.student_id) || [],
        );
        const totalStudents = uniqueStudentIds.size;

        // Calculate essay statistics
        const essaysSubmitted = teacherEssays.length;
        const essaysEvaluated = teacherEssays.filter(
          (essay) => essay.status === "analyzed" || essay.status === "reviewed",
        ).length;
        const pendingReviews = teacherEssays.filter(
          (essay) => essay.status === "submitted",
        ).length;

        // Calculate performance metrics
        const evaluatedEssays = teacherEssays.filter(
          (essay) => essay.status === "analyzed" || essay.status === "reviewed",
        );

        const avgScore =
          evaluatedEssays.length > 0
            ? evaluatedEssays.reduce(
                (sum: number, essay) => sum + (essay.overall_score || 0),
                0,
              ) / evaluatedEssays.length
            : 0;

        const grammarScores = evaluatedEssays
          .map((essay) => essay.grammar_score)
          .filter(
            (score): score is number => score !== null && score !== undefined,
          );
        const grammarAccuracy =
          grammarScores.length > 0
            ? grammarScores.reduce((sum: number, score) => sum + score, 0) /
              grammarScores.length
            : 0;

        const coherenceScores = evaluatedEssays
          .map((essay) => essay.coherence_score)
          .filter(
            (score): score is number => score !== null && score !== undefined,
          );
        const coherenceScore =
          coherenceScores.length > 0
            ? coherenceScores.reduce((sum: number, score) => sum + score, 0) /
              coherenceScores.length
            : 0;

        // Calculate vocabulary complexity from analysis results
        const vocabScores: number[] = [];
        analysisResults.forEach((result: AnalysisResultRow) => {
          if (
            result.detailed_analysis &&
            typeof result.detailed_analysis === "object"
          ) {
            const detailed = result.detailed_analysis as Record<
              string,
              unknown
            >;
            const vocabulary = detailed.vocabulary as
              | Record<string, unknown>
              | undefined;
            const scores = detailed.scores as
              | Record<string, unknown>
              | undefined;
            const vocab =
              (detailed.vocabulary_complexity as number | undefined) ||
              (vocabulary?.complexity as number | undefined) ||
              (scores?.vocabulary as number | undefined);
            if (typeof vocab === "number") {
              vocabScores.push(vocab);
            }
          }
        });
        const vocabularyComplexity =
          vocabScores.length > 0
            ? vocabScores.reduce((sum, s) => sum + s, 0) / vocabScores.length
            : 0;

        // Get recent activity (last 5 essays)
        const recentEssays = teacherEssays
          .sort(
            (a, b) =>
              new Date(b.submitted_at).getTime() -
              new Date(a.submitted_at).getTime(),
          )
          .slice(0, 5);

        // Fetch student names for recent activity
        const studentIds = [
          ...new Set(recentEssays.map((essay) => essay.student_id)),
        ];
        const { data: students, error: studentsErr } = await supabase
          .from("students")
          .select("id, first_name, middle_name, last_name")
          .in("id", studentIds);

        if (studentsErr) throw studentsErr;

        const typedStudents = (students as StudentNameRow[] | null) || [];
        const studentMap = new Map(
          typedStudents.map((student) => [
            student.id,
            buildFullNameFromObject(student, `Student ${student.id}`),
          ]),
        );

        const recentActivity = recentEssays.map((essay) => {
          const studentName =
            studentMap.get(essay.student_id) || `Student ${essay.student_id}`;
          const status =
            essay.status === "submitted"
              ? ("new" as const)
              : essay.status === "analyzed"
                ? ("evaluated" as const)
                : ("review" as const);

          return {
            student: studentName,
            action:
              essay.status === "submitted"
                ? "Submitted essay"
                : essay.status === "analyzed"
                  ? "Essay evaluated"
                  : "Needs review",
            essay: essay.title,
            time: formatTimeAgo(essay.submitted_at),
            status,
            score: essay.overall_score
              ? Math.round(essay.overall_score)
              : undefined,
          };
        });

        // Calculate alerts
        const alerts: Array<{
          type: "warning" | "error" | "info";
          message: string;
          count: number;
        }> = [];

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentSubmissions = teacherEssays.filter(
          (essay) => new Date(essay.submitted_at) >= oneWeekAgo,
        );
        const studentsWithRecentSubmissions = new Set(
          recentSubmissions.map((essay) => essay.student_id),
        );
        const studentsWithoutSubmissions =
          totalStudents - studentsWithRecentSubmissions.size;

        if (studentsWithoutSubmissions > 0) {
          alerts.push({
            type: "warning",
            message: `${studentsWithoutSubmissions} student${studentsWithoutSubmissions !== 1 ? "s" : ""} have not submitted essays this week`,
            count: studentsWithoutSubmissions,
          });
        }

        if (pendingReviews > 0) {
          alerts.push({
            type: "info",
            message: `${pendingReviews} essay${pendingReviews !== 1 ? "s" : ""} pending review`,
            count: pendingReviews,
          });
        }

        if (evaluatedEssays.length > 0) {
          alerts.push({
            type: "info",
            message: `${evaluatedEssays.length} essay${evaluatedEssays.length !== 1 ? "s" : ""} evaluated`,
            count: evaluatedEssays.length,
          });
        }

        setData({
          totalPrograms: teacherCourses.length,
          totalSections: teacherSections.length,
          totalStudents,
          essaysSubmitted,
          essaysEvaluated,
          pendingReviews,
          performanceMetrics: {
            avgScore: {
              value: `${avgScore.toFixed(1)}%`,
              trend: "",
              status: "neutral",
            },
            grammarAccuracy: {
              value: `${grammarAccuracy.toFixed(1)}%`,
              trend: "",
              status: "neutral",
            },
            coherenceScore: {
              value: `${coherenceScore.toFixed(1)}%`,
              trend: "",
              status: "neutral",
            },
            vocabularyComplexity: {
              value: `${vocabularyComplexity.toFixed(1)}/10`,
              trend: "",
              status: "neutral",
            },
          },
          recentActivity,
          alerts,
        });
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-error-default mx-auto mb-4" />
          <p className="text-lg text-neutral-900 mb-2">
            Error loading dashboard
          </p>
          <p className="text-sm text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const statsCards = [
    {
      label: "Total Courses",
      value: formatNumber(data.totalPrograms),
      icon: BookOpen,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Blocks",
      value: formatNumber(data.totalSections),
      icon: Layers,
      color: "text-support",
      bg: "bg-support/10",
    },
    {
      label: "Total Students",
      value: formatNumber(data.totalStudents),
      icon: Users,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Essays Submitted",
      value: formatNumber(data.essaysSubmitted),
      icon: FileText,
      color: "text-info-default",
      bg: "bg-info-default/10",
    },
    {
      label: "Essays Evaluated",
      value: formatNumber(data.essaysEvaluated),
      icon: CheckCircle,
      color: "text-success-default",
      bg: "bg-success-default/10",
    },
    {
      label: "Pending Reviews",
      value: formatNumber(data.pendingReviews),
      icon: Clock,
      color: "text-warning-default",
      bg: "bg-warning-default/10",
    },
  ];

  const performanceMetrics = [
    {
      label: "Average Essay Score",
      value: data.performanceMetrics.avgScore.value,
      trend: data.performanceMetrics.avgScore.trend,
      status: data.performanceMetrics.avgScore.status,
    },
    {
      label: "Grammar Accuracy",
      value: data.performanceMetrics.grammarAccuracy.value,
      trend: data.performanceMetrics.grammarAccuracy.trend,
      status: data.performanceMetrics.grammarAccuracy.status,
    },
    {
      label: "Coherence Score",
      value: data.performanceMetrics.coherenceScore.value,
      trend: data.performanceMetrics.coherenceScore.trend,
      status: data.performanceMetrics.coherenceScore.status,
    },
    {
      label: "Vocabulary Complexity",
      value: data.performanceMetrics.vocabularyComplexity.value,
      trend: data.performanceMetrics.vocabularyComplexity.trend,
      status: data.performanceMetrics.vocabularyComplexity.status,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">{stat.label}</p>
                  <p className="text-2xl text-neutral-900">{stat.value}</p>
                </div>
                <div className={`${stat.bg} ${stat.color} p-2 rounded-rd`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Performance Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-neutral-900">Performance Overview</h2>
          <Badge className="bg-primary/10 text-primary">AI-Powered</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.map((metric, idx) => (
            <div key={idx} className="space-y-2">
              <p className="text-sm text-neutral-500">{metric.label}</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl text-neutral-900">{metric.value}</p>
                {metric.trend && (
                  <div
                    className={`flex items-center text-sm ${
                      metric.status === "up"
                        ? "text-success-default"
                        : metric.status === "down"
                          ? "text-error-default"
                          : "text-neutral-500"
                    }`}
                  >
                    {metric.status !== "neutral" && (
                      <TrendingUp
                        className={`w-4 h-4 mr-1 ${
                          metric.status === "down" ? "rotate-180" : ""
                        }`}
                      />
                    )}
                    {metric.trend}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-xl text-neutral-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {data.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              data.recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-neutral-100 rounded-rd hover:bg-neutral-200 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-neutral-900">
                        {activity.student}
                      </span>
                      <span className="text-sm text-neutral-500">•</span>
                      <span className="text-sm text-neutral-500">
                        {activity.action}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600">{activity.essay}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {activity.status === "new" && (
                      <Badge className="bg-blue-600 text-white">New</Badge>
                    )}
                    {activity.status === "evaluated" &&
                      activity.score !== undefined && (
                        <Badge className="bg-green-600 text-white">
                          {activity.score}%
                        </Badge>
                      )}
                    {activity.status === "review" && (
                      <Badge className="bg-amber-600 text-white">Review</Badge>
                    )}
                    <span className="text-xs text-neutral-400 whitespace-nowrap">
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Alerts */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">Alerts</h2>
          <div className="space-y-3">
            {data.alerts.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No alerts</p>
              </div>
            ) : (
              data.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-rd border-l-4 ${
                    alert.type === "warning"
                      ? "bg-warning-light/20 border-warning-default"
                      : alert.type === "error"
                        ? "bg-error-light/20 border-error-default"
                        : "bg-info-light/20 border-info-default"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`w-5 h-5 mt-0.5 ${
                        alert.type === "warning"
                          ? "text-warning-default"
                          : alert.type === "error"
                            ? "text-error-default"
                            : "text-info-default"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-neutral-900">
                        {alert.message}
                      </p>
                    </div>
                    <Badge
                      className={`${
                        alert.type === "warning"
                          ? "bg-warning-default"
                          : alert.type === "error"
                            ? "bg-error-default"
                            : "bg-info-default"
                      } text-white`}
                    >
                      {alert.count}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
