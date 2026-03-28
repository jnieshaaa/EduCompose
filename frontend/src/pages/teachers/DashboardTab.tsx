import { useState, useEffect, useMemo } from "react";
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
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import { supabase } from "../../lib/supabaseClient";
import { fetchTeacherUUID } from "../../services/rubricService";
import {
  fetchCourses,
  fetchSections,
  fetchTeacherProgramLoads,
} from "../../services/activityService";
import { buildFullNameFromObject } from "../../utils/nameUtils";
import { useAuth } from "../../contexts/AuthContext";

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

/** essay_activities.course_id / block_id are string[] in the live schema — normalize for lookups. */
const normalizeIdList = (value: unknown): string[] => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .filter((v) => v != null && v !== "")
      .map((v) => String(v));
  }
  if (typeof value === "string" || typeof value === "number") {
    const s = String(value);
    return s ? [s] : [];
  }
  return [];
};

/** Prefer title + nickname (e.g. "Mr. Sunsun") for dashboard greeting */
const formatTeacherSalutation = (u: {
  title?: string;
  nickname?: string;
  full_name?: string;
} | null): string | null => {
  if (!u) return null;
  const title = (u.title ?? "").trim();
  const nick = (u.nickname ?? "").trim();
  if (title && nick) return `${title} ${nick}`;
  if (nick) return nick;
  if (title && (u.full_name ?? "").trim()) {
    const first = u.full_name!.trim().split(/\s+/)[0];
    return `${title} ${first}`;
  }
  const full = (u.full_name ?? "").trim();
  return full || null;
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
    essayId: string | number;
    student: string;
    action: string;
    essay: string;
    time: string;
    status: "new" | "evaluated" | "review";
    score?: number;
    courseId?: string;
    blockId?: string;
    courseIds: string[];
    blockIds: string[];
    courseLabel?: string;
    blockLabel?: string;
  }>;
  activityFilterCourses: { id: string; label: string }[];
  activityFilterBlocks: { id: string; name: string; courseId: string }[];
  /** Degree programs (abbr / name) the teacher teaches — for performance filters */
  performanceFilterPrograms: { id: string; label: string }[];
  /** Blocks with program_id for performance filters (e.g. 1A, 1B) */
  performanceFilterBlocks: { id: string; name: string; programId: string }[];
  /** Evaluated essays for performance chart (filtered in UI) */
  performanceEssays: Array<{
    submitted_at: string;
    overall_score: number | null;
    grammar_score: number | null;
    coherence_score: number | null;
    student_id: string;
    studentName: string;
    courseIds: string[];
    blockIds: string[];
    activity_id: string;
    activity_title: string;
    program_id: string;
  }>;
  alerts: Array<{
    type: "warning" | "error" | "info";
    message: string;
    count: number;
  }>;
}

const PERF_LINE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#ea580c",
  "#db2777",
  "#4f46e5",
  "#0d9488",
  "#b45309",
  "#be123c",
];

type PerfLineSeries = { dataKey: string; label: string; color: string };

/** X = activities (titles), Y = score; one colored line per student or per block. */
const buildPerformanceActivityLines = (
  essays: DashboardData["performanceEssays"],
  mode: "blocks" | "students",
  blockNameById: Map<string, string>,
): { rows: Record<string, unknown>[]; series: PerfLineSeries[] } => {
  if (essays.length === 0) return { rows: [], series: [] };

  const actOrder = new Map<string, string>();
  for (const e of essays) {
    if (!actOrder.has(e.activity_id)) {
      actOrder.set(e.activity_id, e.activity_title || "Activity");
    }
  }
  const activityEntries = [...actOrder.entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );

  if (mode === "students") {
    const studentIds = [...new Set(essays.map((e) => e.student_id))].sort();
    const idToName = new Map<string, string>();
    for (const e of essays) {
      idToName.set(e.student_id, e.studentName);
    }
    const latestByCell = new Map<string, number>();
    const chronological = [...essays].sort(
      (a, b) =>
        new Date(a.submitted_at).getTime() -
        new Date(b.submitted_at).getTime(),
    );
    for (const e of chronological) {
      const sc = Number(e.overall_score);
      if (Number.isNaN(sc)) continue;
      latestByCell.set(`${e.activity_id}|${e.student_id}`, sc);
    }
    const rows = activityEntries.map(([actId, actTitle]) => {
      const row: Record<string, unknown> = {
        activityTitle: actTitle,
        activityId: actId,
      };
      for (const sid of studentIds) {
        const v = latestByCell.get(`${actId}|${sid}`);
        row[`s_${sid}`] = v === undefined ? null : v;
      }
      return row;
    });
    const series = studentIds.map((sid, i) => ({
      dataKey: `s_${sid}`,
      label: idToName.get(sid) ?? sid,
      color: PERF_LINE_COLORS[i % PERF_LINE_COLORS.length],
    }));
    return { rows, series };
  }

  const blockKeys = [
    ...new Set(essays.map((e) => e.blockIds[0] ?? "__na")),
  ].sort();
  const cell = new Map<string, { sum: number; n: number }>();
  for (const e of essays) {
    const bk = e.blockIds[0] ?? "__na";
    const sc = Number(e.overall_score);
    if (Number.isNaN(sc)) continue;
    const k = `${e.activity_id}|${bk}`;
    const cur = cell.get(k) ?? { sum: 0, n: 0 };
    cur.sum += sc;
    cur.n += 1;
    cell.set(k, cur);
  }
  const rows = activityEntries.map(([actId, actTitle]) => {
    const row: Record<string, unknown> = {
      activityTitle: actTitle,
      activityId: actId,
    };
    for (const bk of blockKeys) {
      const agg = cell.get(`${actId}|${bk}`);
      row[`b_${bk}`] =
        agg && agg.n > 0 ? Math.round((agg.sum / agg.n) * 10) / 10 : null;
    }
    return row;
  });
  const series = blockKeys.map((bk, i) => ({
    dataKey: `b_${bk}`,
    label:
      bk === "__na"
        ? "Unassigned"
        : blockNameById.get(bk) ?? `Block ${bk.slice(0, 6)}…`,
    color: PERF_LINE_COLORS[i % PERF_LINE_COLORS.length],
  }));
  return { rows, series };
};

// No longer using these legacy interfaces

interface EssayRow {
  id: string | number;
  title: string;
  submitted_at: string;
  status: string;
  student_id: string | number;
  activity_id: string | number | null;
  overall_score: number | null;
  grammar_score: number | null;
  coherence_score: number | null;
  argument_strength_score: number | null;
}

interface AnalysisResultRow {
  essay_id: string | number;
  grammar_score: number | null;
  coherence_score: number | null;
  detailed_analysis: Record<string, unknown> | null;
}

// No longer using these legacy interfaces

interface StudentNameRow {
  id: string | number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
}

export function DashboardTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activityCourseFilter, setActivityCourseFilter] =
    useState<string>("all");
  const [activityBlockFilter, setActivityBlockFilter] =
    useState<string>("all");
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [perfProgramFilter, setPerfProgramFilter] = useState<string>("all");
  const [perfBlockFilter, setPerfBlockFilter] = useState<string>("all");
  const [perfStudentFilter, setPerfStudentFilter] = useState<string>("all");
  const [perfChartMode, setPerfChartMode] = useState<"blocks" | "students">(
    "blocks",
  );

  const activityBlockSelectOptions = useMemo(() => {
    if (!data) return [];
    if (activityCourseFilter === "all") return data.activityFilterBlocks;
    return data.activityFilterBlocks.filter(
      (b) => b.courseId === activityCourseFilter,
    );
  }, [data, activityCourseFilter]);

  const filteredRecentActivity = useMemo(() => {
    if (!data) return [];
    let rows = data.recentActivity;
    if (activityCourseFilter !== "all") {
      rows = rows.filter(
        (r) =>
          r.courseIds.includes(activityCourseFilter) ||
          r.courseId === activityCourseFilter,
      );
    }
    if (activityBlockFilter !== "all") {
      rows = rows.filter(
        (r) =>
          r.blockIds.includes(activityBlockFilter) ||
          r.blockId === activityBlockFilter,
      );
    }
    const q = activitySearchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.student.toLowerCase().includes(q) ||
          r.essay.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [
    data,
    activityCourseFilter,
    activityBlockFilter,
    activitySearchQuery,
  ]);

  const perfBlockOptions = useMemo(() => {
    if (!data) return [];
    if (perfProgramFilter === "all") return data.performanceFilterBlocks;
    return data.performanceFilterBlocks.filter(
      (b) => b.programId === perfProgramFilter,
    );
  }, [data, perfProgramFilter]);

  const perfStudentOptions = useMemo(() => {
    if (!data) return [];
    const m = new Map<string, string>();
    for (const p of data.performanceEssays) {
      m.set(p.student_id, p.studentName);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const filteredPerformanceEssays = useMemo(() => {
    if (!data) return [];
    let rows = data.performanceEssays;
    if (perfProgramFilter !== "all") {
      rows = rows.filter((r) => r.program_id === perfProgramFilter);
    }
    if (perfBlockFilter !== "all") {
      rows = rows.filter(
        (r) =>
          r.blockIds.length === 0 || r.blockIds.includes(perfBlockFilter),
      );
    }
    if (perfStudentFilter !== "all") {
      rows = rows.filter((r) => r.student_id === perfStudentFilter);
    }
    return rows;
  }, [data, perfProgramFilter, perfBlockFilter, perfStudentFilter]);

  const perfBlockNameById = useMemo(() => {
    if (!data) return new Map<string, string>();
    return new Map(
      data.performanceFilterBlocks.map((b) => [b.id, b.name]),
    );
  }, [data]);

  const perfActivityChart = useMemo(
    () =>
      buildPerformanceActivityLines(
        filteredPerformanceEssays,
        perfChartMode,
        perfBlockNameById,
      ),
    [filteredPerformanceEssays, perfChartMode, perfBlockNameById],
  );

  const filtersNarrowPerformance =
    perfProgramFilter !== "all" ||
    perfBlockFilter !== "all" ||
    perfStudentFilter !== "all";

  const displayPerformanceMetrics = useMemo(() => {
    if (!data) return [];
    const base = [
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
    if (
      !filtersNarrowPerformance ||
      filteredPerformanceEssays.length === 0
    ) {
      return base;
    }
    const rows = filteredPerformanceEssays;
    const avg =
      rows.reduce((s, r) => s + (Number(r.overall_score) || 0), 0) /
      rows.length;
    const grammarVals = rows
      .map((r) => r.grammar_score)
      .filter((v): v is number => v != null && !Number.isNaN(Number(v)))
      .map(Number);
    const grammarAvg =
      grammarVals.length > 0
        ? grammarVals.reduce((a, b) => a + b, 0) / grammarVals.length
        : 0;
    const cohVals = rows
      .map((r) => r.coherence_score)
      .filter((v): v is number => v != null && !Number.isNaN(Number(v)))
      .map(Number);
    const cohAvg =
      cohVals.length > 0
        ? cohVals.reduce((a, b) => a + b, 0) / cohVals.length
        : 0;
    return [
      {
        label: "Average Essay Score",
        value: `${avg.toFixed(1)}%`,
        trend: "",
        status: "neutral" as const,
      },
      {
        label: "Grammar Accuracy",
        value: grammarVals.length ? `${grammarAvg.toFixed(1)}%` : "—",
        trend: "",
        status: "neutral" as const,
      },
      {
        label: "Coherence Score",
        value: cohVals.length ? `${cohAvg.toFixed(1)}%` : "—",
        trend: "",
        status: "neutral" as const,
      },
      base[3],
    ];
  }, [
    data,
    filteredPerformanceEssays,
    filtersNarrowPerformance,
  ]);

  useEffect(() => {
    setActivityBlockFilter("all");
  }, [activityCourseFilter]);

  useEffect(() => {
    setPerfBlockFilter("all");
  }, [perfProgramFilter]);

  useEffect(() => {
    if (perfChartMode === "blocks") {
      setPerfStudentFilter("all");
    } else {
      setPerfBlockFilter("all");
    }
  }, [perfChartMode]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const teacherId = await fetchTeacherUUID();
        if (!teacherId) {
          throw new Error("Teacher ID not available");
        }

        // Activities define essay scope; course_id / block_id are array fields in DB
        const { data: teacherActivities, error: activitiesError } =
          await supabase
            .from("essay_activities")
            .select("id, course_id, block_id, title")
            .eq("teacher_id", teacherId);

        if (activitiesError) throw activitiesError;

        type ActivityScopeRow = {
          id: string | number;
          course_id: unknown;
          block_id: unknown;
          title?: string | null;
        };

        const typedTeacherActivities =
          (teacherActivities as ActivityScopeRow[] | null) || [];

        const activityMetaById = new Map<
          string,
          { courseIds: string[]; blockIds: string[]; title: string }
        >();
        for (const a of typedTeacherActivities) {
          const t = (a.title ?? "").trim();
          activityMetaById.set(String(a.id), {
            courseIds: normalizeIdList(a.course_id),
            blockIds: normalizeIdList(a.block_id),
            title: t || "Activity",
          });
        }

        const activityIdSet = new Set(
          typedTeacherActivities.map((a) => String(a.id)),
        );

        const [
          allCourses,
          allSections,
          essaysData,
          analysisResults,
          teacherProgramLoads,
        ] = await Promise.all([
          fetchCourses(),
          fetchSections(),
          supabase
            .from("essays")
            .select(
              "id, title, submitted_at, status, student_id, activity_id, overall_score, grammar_score, coherence_score, argument_strength_score",
            )
            .then(({ data, error: essaysError }) => {
              if (essaysError) throw essaysError;
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
          fetchTeacherProgramLoads(),
        ]);

        const loadIdToProgramId = new Map(
          teacherProgramLoads.map((l) => [l.id, l.program_id]),
        );
        const performanceFilterPrograms = [
          ...new Map(
            teacherProgramLoads.map((l) => [
              l.program_id,
              { id: l.program_id, label: l.program_name },
            ]),
          ).values(),
        ].sort((a, b) => a.label.localeCompare(b.label));

        let courseIds = [
          ...new Set(
            typedTeacherActivities.flatMap((a) =>
              normalizeIdList(a.course_id),
            ),
          ),
        ];
        let sectionIds = [
          ...new Set(
            typedTeacherActivities.flatMap((a) =>
              normalizeIdList(a.block_id),
            ),
          ),
        ];
        // Activities missing course/block arrays still need counts from the teacher's load
        if (courseIds.length === 0) {
          courseIds = allCourses.map((c) => c.id);
        }
        if (sectionIds.length === 0) {
          sectionIds = allSections.map((s) => s.id);
        }

        const { data: blockStudentsRows, error: blockStudentsError } =
          await supabase.from("block_students").select("student_id, block_id");
        if (blockStudentsError) throw blockStudentsError;
        const enrollments =
          (blockStudentsRows as
            | { student_id: string | number; block_id: string | number }[]
            | null) || [];
        const studentsData =
          sectionIds.length > 0
            ? enrollments.filter((e) =>
                sectionIds.includes(String(e.block_id)),
              )
            : [];

        // Filter essays linked to this teacher's activities (string-safe IDs)
        const teacherEssays = (essaysData as EssayRow[]).filter(
          (essay) =>
            essay.activity_id != null &&
            activityIdSet.has(String(essay.activity_id)),
        );

        const teacherCourses = allCourses.filter((c) =>
          courseIds.includes(c.id),
        );
        const teacherSections = allSections.filter((s) =>
          sectionIds.includes(s.id),
        );
        const performanceFilterBlocks = teacherSections.map((s) => ({
          id: s.id,
          name: s.name,
          programId: loadIdToProgramId.get(s.programLoadId) ?? "",
        }));

        // Count unique students from enrollments
        const uniqueStudentIds = new Set(
          studentsData?.map((enrollment) => String(enrollment.student_id)) ||
            [],
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

        // Recent activity pool (newest first); filters narrow this list in the UI
        const recentEssays = teacherEssays
          .sort(
            (a, b) =>
              new Date(b.submitted_at).getTime() -
              new Date(a.submitted_at).getTime(),
          )
          .slice(0, 80);

        const allEssayStudentIds = [
          ...new Set(teacherEssays.map((e) => String(e.student_id))),
        ];
        let typedStudents: StudentNameRow[] = [];
        if (allEssayStudentIds.length > 0) {
          const { data: students, error: studentsErr } = await supabase
            .from("students")
            .select("id, first_name, middle_name, last_name")
            .in("id", allEssayStudentIds);
          if (studentsErr) throw studentsErr;
          typedStudents = (students as StudentNameRow[] | null) || [];
        }
        const studentMap = new Map(
          typedStudents.map((student) => [
            String(student.id),
            buildFullNameFromObject(student, `Student ${student.id}`),
          ]),
        );

        const performanceEssays = teacherEssays
          .filter(
            (e) =>
              (e.status === "analyzed" || e.status === "reviewed") &&
              e.overall_score != null,
          )
          .map((essay) => {
            const meta =
              essay.activity_id != null
                ? activityMetaById.get(String(essay.activity_id))
                : undefined;
            const bid = meta?.blockIds[0];
            const sec = bid
              ? teacherSections.find((x) => x.id === bid)
              : undefined;
            const program_id = sec
              ? loadIdToProgramId.get(sec.programLoadId) ?? ""
              : "";
            return {
              submitted_at: essay.submitted_at,
              overall_score: essay.overall_score,
              grammar_score: essay.grammar_score,
              coherence_score: essay.coherence_score,
              student_id: String(essay.student_id),
              studentName:
                studentMap.get(String(essay.student_id)) ||
                `Student ${essay.student_id}`,
              courseIds: meta?.courseIds ?? [],
              blockIds: meta?.blockIds ?? [],
              activity_id: String(essay.activity_id ?? ""),
              activity_title: meta?.title ?? "Activity",
              program_id,
            };
          });

        const recentActivity = recentEssays.map((essay) => {
          const studentName =
            studentMap.get(String(essay.student_id)) ||
            `Student ${essay.student_id}`;
          const status =
            essay.status === "submitted"
              ? ("new" as const)
              : essay.status === "analyzed"
                ? ("evaluated" as const)
                : ("review" as const);

          const meta =
            essay.activity_id != null
              ? activityMetaById.get(String(essay.activity_id))
              : undefined;
          const courseIdsForRow = meta?.courseIds ?? [];
          const blockIdsForRow = meta?.blockIds ?? [];
          const cid = courseIdsForRow[0];
          const bid = blockIdsForRow[0];
          const courseRow = courseIdsForRow.length
            ? teacherCourses.find((c) => courseIdsForRow.includes(c.id))
            : undefined;
          const blockRow = blockIdsForRow.length
            ? teacherSections.find((s) => blockIdsForRow.includes(s.id))
            : undefined;

          return {
            essayId: essay.id,
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
            courseId: cid,
            blockId: bid,
            courseIds: courseIdsForRow,
            blockIds: blockIdsForRow,
            courseLabel: courseRow
              ? `${courseRow.course_code} — ${courseRow.course_title}`
              : undefined,
            blockLabel: blockRow?.name,
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
          activityFilterCourses: teacherCourses.map((c) => ({
            id: c.id,
            label: `${c.course_code} — ${c.course_title}`,
          })),
          activityFilterBlocks: teacherSections.map((s) => ({
            id: s.id,
            name: s.name,
            courseId: s.courseId,
          })),
          performanceFilterPrograms,
          performanceFilterBlocks,
          performanceEssays,
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

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const teacherSalutation = formatTeacherSalutation(user);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Dashboard · {todayLabel}
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight leading-tight">
          {teacherSalutation ? (
            <>
              Welcome back, {teacherSalutation}
              <span className="text-primary">.</span>
            </>
          ) : (
            <>Welcome back.</>
          )}
        </h1>
      </header>

      <section className="space-y-4" aria-labelledby="at-a-glance-heading">
        <h2
          id="at-a-glance-heading"
          className="text-lg font-semibold text-neutral-900"
        >
          At a glance
        </h2>

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-xl text-neutral-900">Performance Overview</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              <strong className="font-medium text-neutral-700">By block</strong>{" "}
              / <strong className="font-medium text-neutral-700">By student</strong>{" "}
              draws one colored line per block or per student. The horizontal
              axis lists your activities; the vertical axis is score (%). Hover
              a point to see who it is.{" "}
              <strong className="font-medium text-neutral-700">Program</strong>{" "}
              (e.g. BSCS-DS, BSIT) scopes data;{" "}
              {perfChartMode === "blocks" ? (
                <strong className="font-medium text-neutral-700">Block</strong>
              ) : (
                <strong className="font-medium text-neutral-700">Student</strong>
              )}{" "}
              narrows further.
            </p>
          </div>
          <Badge className="bg-primary/10 text-primary w-fit">AI-Powered</Badge>
        </div>

        <div
          className="flex flex-wrap gap-2 mb-4"
          role="group"
          aria-label="Chart point type"
        >
          <button
            type="button"
            onClick={() => setPerfChartMode("blocks")}
            className={`rounded-rd border px-3 py-2 text-sm font-medium transition-colors ${
              perfChartMode === "blocks"
                ? "border-red-600 bg-red-50 text-red-800"
                : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            By block
          </button>
          <button
            type="button"
            onClick={() => setPerfChartMode("students")}
            className={`rounded-rd border px-3 py-2 text-sm font-medium transition-colors ${
              perfChartMode === "students"
                ? "border-blue-600 bg-blue-50 text-blue-900"
                : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            By student
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Program
            </label>
            <p className="text-xs text-neutral-500 mb-1.5">
              Degree programs you teach (e.g. BSCS-DS, BSIT)—not course codes.
            </p>
            <select
              className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm bg-white"
              value={perfProgramFilter}
              onChange={(e) => setPerfProgramFilter(e.target.value)}
            >
              <option value="all">All programs</option>
              {data.performanceFilterPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {perfChartMode === "blocks" ? (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Block
              </label>
              <p className="text-xs text-neutral-500 mb-1.5">
                Sections for the program above (e.g. 1A, 1B)—or all.
              </p>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm bg-white"
                value={perfBlockFilter}
                onChange={(e) => setPerfBlockFilter(e.target.value)}
              >
                <option value="all">All blocks</option>
                {perfBlockOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Student
              </label>
              <p className="text-xs text-neutral-500 mb-1.5">
                Optional: one learner only, or everyone in the program above.
              </p>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm bg-white"
                value={perfStudentFilter}
                onChange={(e) => setPerfStudentFilter(e.target.value)}
              >
                <option value="all">All students</option>
                {perfStudentOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="rounded-rd border border-neutral-200 bg-white p-2 sm:p-4 mb-6 min-h-[300px]">
          {filteredPerformanceEssays.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-neutral-500 px-4 text-center">
              No scored essays match these filters yet. Try widening program
              {perfChartMode === "blocks" ? " or block" : " or student"}
              —or complete more evaluations.
            </div>
          ) : perfActivityChart.rows.length === 0 ||
            perfActivityChart.series.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-neutral-500 px-4 text-center">
              Not enough activity data to draw lines yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <LineChart
                data={perfActivityChart.rows}
                margin={{ top: 8, right: 12, left: 4, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="activityTitle"
                  type="category"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={95}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  width={44}
                  label={{
                    value: "Score %",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#6b7280", fontSize: 11 },
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-rd border border-neutral-200 bg-white px-3 py-2 text-sm shadow-md max-w-xs">
                        <p className="font-semibold text-neutral-900 border-b border-neutral-100 pb-1 mb-1">
                          {label}
                        </p>
                        {payload.map((item) => (
                          <p
                            key={String(item.dataKey)}
                            className="text-neutral-800"
                            style={{ color: item.color }}
                          >
                            <span className="font-medium">{item.name}</span>
                            {": "}
                            {item.value != null && item.value !== ""
                              ? `${item.value}%`
                              : "—"}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                {perfActivityChart.series.map((s) => (
                  <Line
                    key={s.dataKey}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 4, fill: s.color, strokeWidth: 0 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {filtersNarrowPerformance && filteredPerformanceEssays.length > 0 && (
          <p className="text-xs text-neutral-500 mb-2">
            Score averages below match your filters. Vocabulary stays
            account-wide.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2 border-t border-neutral-100">
          {displayPerformanceMetrics.map((metric, idx) => (
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
          <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="text-xl text-neutral-900">Recent Activity</h2>
            <p className="text-xs text-neutral-500 sm:max-w-[220px] sm:text-right">
              Showing up to 80 recent submissions. Narrow by course, block, or
              name.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Course
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm bg-white"
                value={activityCourseFilter}
                onChange={(e) => setActivityCourseFilter(e.target.value)}
              >
                <option value="all">All courses</option>
                {data.activityFilterCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Block
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm bg-white"
                value={activityBlockFilter}
                onChange={(e) => setActivityBlockFilter(e.target.value)}
              >
                <option value="all">All blocks</option>
                {activityBlockSelectOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Find student or essay
              </label>
              <Input
                type="search"
                placeholder="Search by name or title…"
                value={activitySearchQuery}
                onChange={(value) => setActivitySearchQuery(value)}
                className="w-full"
              />
            </div>
          </div>

          <div
            className="max-h-[min(28rem,55vh)] overflow-y-auto overscroll-y-contain space-y-3 p-2 pr-1 rounded-rd border border-neutral-100 bg-neutral-50/50"
            role="region"
            aria-label="Recent activity list"
          >
            {data.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : filteredRecentActivity.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No activity matches these filters</p>
                <p className="text-xs mt-2 text-neutral-400">
                  Try another course, block, or clear the search.
                </p>
              </div>
            ) : (
              filteredRecentActivity.map((activity) => (
                <div
                  key={activity.essayId}
                  className="flex items-center justify-between p-3 bg-neutral-100 rounded-rd hover:bg-neutral-200 transition-colors gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-neutral-900 font-medium">
                        {activity.student}
                      </span>
                      <span className="text-sm text-neutral-500">•</span>
                      <span className="text-sm text-neutral-500">
                        {activity.action}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 truncate">
                      {activity.essay}
                    </p>
                    {(activity.courseLabel || activity.blockLabel) && (
                      <p className="text-xs text-neutral-500 mt-1.5 truncate">
                        {[activity.courseLabel, activity.blockLabel]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
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
      </section>
    </div>
  );
}
