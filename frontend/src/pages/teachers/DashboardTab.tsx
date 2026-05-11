import { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Layers,
  Users,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  Activity,
  ArrowRight,
  Shield,
  Zap,
  Settings,
  Archive,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { supabase } from "../../lib/supabaseClient";
import {
  fetchCourses,
  fetchSections,
  fetchTeacherProgramLoads,
  fetchTeacherActivities,
} from "../../services/activityService";
import type { EssayActivity } from "../../types/activityTypes";
import { buildFullNameFromObject } from "../../utils/nameUtils";
import { useAuth } from "../../contexts/AuthContext";
import { useAcademicContext } from "../../hooks/useAcademicContext";
import { useAlert } from "../../hooks/useAlert";
import { reportService } from "../../services/reportService";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronDown } from "lucide-react";
import ActivityLogsModal from "../../components/admin/ActivityLogsModal";

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

  return date.toLocaleDateString();
};

interface DashboardData {
  totalPrograms: number;
  totalSections: number;
  totalStudents: number;
  essaysSubmitted: number;
  essaysEvaluated: number;
  pendingReviews: number;
  performanceMetrics: {
    avgScore: { value: string; trend: string; status: "up" | "down" | "neutral" };
    grammarAccuracy: { value: string; trend: string; status: "up" | "down" | "neutral" };
    coherenceScore: { value: string; trend: string; status: "up" | "down" | "neutral" };
    vocabularyComplexity: { value: string; trend: string; status: "up" | "down" | "neutral" };
  };
  recentActivity: Array<{
    essayId: string;
    student: string;
    action: string;
    essay: string;
    time: string;
    status: "new" | "evaluated" | "review";
    score?: number;
    courseId?: string;
    blockId?: string;
    activityId?: string;
    activityTitle?: string;
    courseIds: string[];
    blockIds: string[];
    courseLabel?: string;
    blockLabel?: string;
  }>;
  activityFilterCourses: { id: string; label: string }[];
  activityFilterBlocks: { id: string; name: string; courseId: string }[];
  performanceFilterPrograms: { id: string; label: string }[];
  performanceFilterBlocks: { id: string; name: string; programId: string }[];
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
  activities: EssayActivity[];
  totalActivities: number;
}

const PERF_LINE_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#0891b2", "#ea580c"];

type PerfLineSeries = { dataKey: string; label: string; color: string };

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
  const activityEntries = [...actOrder.entries()].sort((a, b) => a[1].localeCompare(b[1]));

  if (mode === "students") {
    const studentIds = [...new Set(essays.map((e) => e.student_id))].sort();
    const idToName = new Map<string, string>();
    for (const e of essays) idToName.set(e.student_id, e.studentName);
    
    const latestByCell = new Map<string, number>();
    const chronological = [...essays].sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
    for (const e of chronological) {
      const sc = Number(e.overall_score);
      if (!Number.isNaN(sc)) latestByCell.set(`${e.activity_id}|${e.student_id}`, sc);
    }
    const rows = activityEntries.map(([actId, actTitle]) => {
      const row: Record<string, unknown> = { activityTitle: actTitle, activityId: actId };
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

  const blockKeys = [...new Set(essays.map((e) => e.blockIds[0] ?? "__na"))].sort();
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
    const row: Record<string, unknown> = { activityTitle: actTitle, activityId: actId };
    for (const bk of blockKeys) {
      const agg = cell.get(`${actId}|${bk}`);
      row[`b_${bk}`] = agg && agg.n > 0 ? Math.round((agg.sum / agg.n) * 10) / 10 : null;
    }
    return row;
  });
  const series = blockKeys.map((bk, i) => ({
    dataKey: `b_${bk}`,
    label: bk === "__na" ? "Unassigned" : blockNameById.get(bk) ?? `Block ${bk.slice(0, 6)}...`,
    color: PERF_LINE_COLORS[i % PERF_LINE_COLORS.length],
  }));
  return { rows, series };
};

interface EssayRow {
  id: string;
  title: string;
  submitted_at: string;
  status: string;
  student_id: string;
  activity_id: string | null;
  overall_score: number | null;
  grammar_score: number | null;
  coherence_score: number | null;
  argument_strength_score: number | null;
}

interface StudentNameRow {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
}

export function DashboardTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const navigate = useNavigate();
  const [perfChartMode, setPerfChartMode] = useState<"blocks" | "students">("blocks");
  const { currentAY } = useAcademicContext();
  const { showError, showSuccess } = useAlert();
  const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState<string | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [perfSelectedBlock, setPerfSelectedBlock] = useState("all");

  const filteredRecentActivity = useMemo(() => {
    if (!data) return [];
    return data.recentActivity;
  }, [data]);

  const filteredPerformanceEssays = useMemo(() => {
    if (!data) return [];
    let essays = data.performanceEssays;
    if (perfSelectedBlock !== "all") {
      essays = essays.filter(e => e.blockIds.includes(perfSelectedBlock));
    }
    return essays;
  }, [data, perfSelectedBlock]);

  const perfBlockNameById = useMemo(() => {
    if (!data) return new Map<string, string>();
    return new Map(data.performanceFilterBlocks.map((b) => [b.id, b.name]));
  }, [data]);

  const perfActivityChart = useMemo(() =>
    buildPerformanceActivityLines(filteredPerformanceEssays, perfChartMode, perfBlockNameById),
    [filteredPerformanceEssays, perfChartMode, perfBlockNameById]
  );

  const displayPerformanceMetrics = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Average Grade", value: data.performanceMetrics.avgScore.value, trend: data.performanceMetrics.avgScore.trend, status: data.performanceMetrics.avgScore.status, icon: Zap },
      { label: "Grammar", value: data.performanceMetrics.grammarAccuracy.value, trend: data.performanceMetrics.grammarAccuracy.trend, status: data.performanceMetrics.grammarAccuracy.status, icon: CheckCircle },
      { label: "Structure & Clarity", value: data.performanceMetrics.coherenceScore.value, trend: data.performanceMetrics.coherenceScore.trend, status: data.performanceMetrics.coherenceScore.status, icon: Activity },
      { label: "Word Choice", value: data.performanceMetrics.vocabularyComplexity.value, trend: data.performanceMetrics.vocabularyComplexity.trend, status: data.performanceMetrics.vocabularyComplexity.status, icon: BookOpen },
    ];
  }, [data]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const teacherId = user?.id;
        if (!teacherId) throw new Error("Teacher ID not available");

        const [allCourses, allSections, activities, teacherLoads] = await Promise.all([
          fetchCourses(teacherId),
          fetchSections(undefined, teacherId),
          fetchTeacherActivities(undefined, undefined, false, undefined, undefined, teacherId),
          fetchTeacherProgramLoads(undefined, teacherId)
        ]);

        const activityMetaById = new Map();
        for (const a of activities) {
          activityMetaById.set(String(a.id), {
            courseIds: a.courseIds || [],
            blockIds: a.blockIds || [],
            title: a.title,
          });
        }
        const activityIdsArray = activities.map(a => a.id).filter(id => id && id !== "all");

        const { data: essaysDataRows, error: essaysError } = await (activityIdsArray.length > 0 
          ? supabase
              .from("essays")
              .select("id, title, created_at, status, student_id, activity_id")
              .in("activity_id", activityIdsArray)
          : Promise.resolve({ data: [] as any[], error: null }));
        
        if (essaysError) throw essaysError;

        const essaysData = (essaysDataRows as any[] || []).map(e => ({
          ...e,
          submitted_at: e.created_at // Map back for UI consistency
        })) as EssayRow[];

        // Fetch analysis results for analyzed essays to get the scores
        const analyzedEssayIds = essaysData.filter(e => e.status === "analyzed" || e.status === "reviewed").map(e => e.id);
        const analysisMap = new Map();
        if (analyzedEssayIds.length > 0) {
          const { data: analysisRows } = await supabase
            .from("essay_analysis_results")
            .select("essay_id, overall_score, grammar_score, coherence_score")
            .in("essay_id", analyzedEssayIds);
          
          (analysisRows || []).forEach(r => analysisMap.set(String(r.essay_id), r));
        }

        const activeSectionIds = [...new Set(activities.flatMap(a => a.blockIds || []))];

        const { data: blockStudentsRows } = await (activeSectionIds.length > 0
          ? supabase.from("block_students").select("student_id, block_id").in("block_id", activeSectionIds)
          : Promise.resolve({ data: [] }));

        const loadIdToProgramId = new Map(teacherLoads.map(l => [l.id, l.program_id]));
        const performanceFilterPrograms = [...new Map(teacherLoads.map(l => [l.program_id, { id: l.program_id, label: l.program_name }])).values()].sort((a,b) => a.label.localeCompare(b.label));
        const performanceFilterBlocks = allSections.filter(s => activeSectionIds.includes(s.id)).map(s => ({
          id: s.id, name: s.name, programId: loadIdToProgramId.get(s.programLoadId) ?? ""
        }));

        const uniqueStudentIds = new Set((blockStudentsRows || []).map(e => String(e.student_id)));
        const totalStudents = uniqueStudentIds.size;
        const essaysSubmitted = essaysData.length;
        const evaluatedCount = essaysData.filter(e => e.status === "analyzed" || e.status === "reviewed").length;
        const pendingCount = essaysData.filter(e => e.status === "submitted").length;

        const allEssayStudentIds = [...new Set(essaysData.map(e => String(e.student_id)))];
        const studentMap = new Map();
        if (allEssayStudentIds.length > 0) {
          const { data: students } = await supabase.from("users").select("id, first_name, middle_name, last_name").in("id", allEssayStudentIds).eq("role", "student");
          (students as StudentNameRow[] || []).forEach(s => studentMap.set(s.id, buildFullNameFromObject(s)));
        }

        const allRecentActivity = essaysData.sort((a,b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()).map(e => {
          const meta = activityMetaById.get(String(e.activity_id));
          const analysis = analysisMap.get(String(e.id));
          return {
            essayId: e.id, student: studentMap.get(e.student_id) || "Unknown", action: e.status === 'submitted' ? "Submitted" : "Analyzed",
            essay: e.title, time: formatTimeAgo(e.submitted_at), status: e.status === 'submitted' ? "new" : "evaluated",
            score: analysis?.overall_score || undefined, courseIds: meta?.courseIds || [], blockIds: meta?.blockIds || [],
            activityId: e.activity_id || undefined, activityTitle: meta?.title || "Unknown Activity"
          } as DashboardData["recentActivity"][0];
        });

        const performanceEssays = essaysData.filter(e => analysisMap.has(String(e.id))).map(e => {
          const meta = activityMetaById.get(e.activity_id);
          const analysis = analysisMap.get(String(e.id));
          const bid = meta?.blockIds?.[0];
          const sec = bid ? allSections.find(x => x.id === bid) : undefined;
          return {
            submitted_at: e.submitted_at, 
            overall_score: analysis?.overall_score ?? null, 
            grammar_score: analysis?.grammar_score ?? null, 
            coherence_score: analysis?.coherence_score ?? null,
            student_id: e.student_id, studentName: studentMap.get(e.student_id) || "Unknown",
            courseIds: meta?.courseIds || [], blockIds: meta?.blockIds || [], activity_id: e.activity_id || "",
            activity_title: meta?.title || "Activity", program_id: sec ? loadIdToProgramId.get(sec.programLoadId) || "" : "",
          };
        });

        setData({
          totalPrograms: allCourses.length,
          totalSections: activeSectionIds.length,
          totalStudents,
          essaysSubmitted,
          essaysEvaluated: evaluatedCount,
          pendingReviews: pendingCount,
          performanceMetrics: {
            avgScore: { value: evaluatedCount ? `${(performanceEssays.reduce((a,b)=>a+(b.overall_score||0),0)/evaluatedCount).toFixed(1)}%` : "0%", trend: "+2.1%", status: "up" },
            grammarAccuracy: { value: evaluatedCount ? `${(performanceEssays.reduce((a,b)=>a+(b.grammar_score||0),0)/evaluatedCount).toFixed(1)}%` : "0%", trend: "+1.2%", status: "up" },
            coherenceScore: { value: evaluatedCount ? `${(performanceEssays.reduce((a,b)=>a+(b.coherence_score||0),0)/evaluatedCount).toFixed(1)}%` : "0%", trend: "-0.5%", status: "down" },
            vocabularyComplexity: { value: "Advanced", trend: "Steady", status: "neutral" }
          },
          recentActivity: allRecentActivity,
          activityFilterCourses: allCourses.filter(c => [...new Set(activities.flatMap(a => a.courseIds || []))].includes(c.id)).map(c => ({id: c.id, label: c.course_title})),
          activityFilterBlocks: allSections.filter(s => activeSectionIds.includes(s.id)).map(s => ({id: s.id, name: s.name, courseId: (allCourses.find(c => c.id === s.programLoadId))?.id || "" })),
          performanceFilterPrograms,
          performanceFilterBlocks,
          performanceEssays,
          activities,
          totalActivities: activities.length,
          alerts: []
        });
      } catch (err: any) { 
        console.error("Dashboard data load error:", err); 
      } finally { 
        setLoading(false); 
      }
    };
    loadDashboardData();
  }, [user]);

  const handleDownloadReport = async (blockId: string) => {
    if (!data || !currentAY) return;
    
    const block = data.activityFilterBlocks.find(b => b.id === blockId);
    const section = {
      id: blockId,
      block_id: blockId,
      name: block?.name || '',
      year: 1, // Default, will be fetched if needed or mapped
      students_estimated: 0,
    } as any;

    const course = {
      id: block?.courseId || '',
      course_code: (data.activityFilterCourses.find(c => c.id === block?.courseId))?.label.split(':')[0] || '',
      course_title: (data.activityFilterCourses.find(c => c.id === block?.courseId))?.label || '',
    } as any;

    setIsGeneratingReport(blockId);
    try {
      await reportService.generateClassReport(section, course, currentAY);
      showSuccess("Report generated successfully.");
      setIsReportDropdownOpen(false);
    } catch (err) {
      showError("Failed to generate report.");
    } finally {
      setIsGeneratingReport(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
      <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Loading...</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">Overview</h1>
          <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <Zap size={14} className="text-primary/50" />
            Student progress and activities
          </p>
        </div>
        <div className="flex items-center gap-3 relative">
           <button 
            onClick={() => setIsReportDropdownOpen(!isReportDropdownOpen)}
            className="flex items-center justify-center gap-2 bg-white border border-neutral-100 text-neutral-500 text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all group"
           >
             Generate Report
             <ChevronDown size={14} className={`transition-transform ${isReportDropdownOpen ? 'rotate-180' : ''}`} />
           </button>

           <AnimatePresence>
            {isReportDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-80 bg-white border border-neutral-100 rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-neutral-50 bg-neutral-50/50">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Select Class Section</p>
                </div>
                <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                  {data?.activityFilterBlocks.map((block) => (
                    <button
                      key={block.id}
                      disabled={!!isGeneratingReport}
                      onClick={() => handleDownloadReport(block.id)}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-primary/5 text-left group transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                          {block.name.substring(0, 4)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-700 group-hover:text-primary transition-colors truncate">
                            Section {block.name}
                          </p>
                          <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-tight">Class Report</p>
                        </div>
                      </div>
                      {isGeneratingReport === block.id ? (
                        <Loader2 size={14} className="animate-spin text-primary shrink-0 ml-2" />
                      ) : (
                        <Download size={14} className="text-neutral-300 group-hover:text-primary transition-all shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                  {(!data?.activityFilterBlocks || data.activityFilterBlocks.length === 0) && (
                    <p className="p-4 text-center text-xs text-neutral-400">No active sections found.</p>
                  )}
                </div>
              </motion.div>
            )}
           </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Subjects", value: data?.totalPrograms || 0, sub: "Your Courses", icon: Layers, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Activities", value: data?.totalActivities || 0, sub: "Created Activities", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Essays", value: data?.essaysSubmitted || 0, sub: `${data?.pendingReviews} Pending`, icon: FileText, color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Graded", value: data?.essaysEvaluated || 0, sub: "Total graded", icon: BookOpen, color: "text-amber-500", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <motion.div 
            key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-3xl border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group"
          >
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={22} />
            </div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{stat.label}</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-3xl font-bold text-neutral-900 tracking-tight">{stat.value}</p>
              <p className="text-[11px] font-bold text-neutral-300 uppercase mb-1.5">{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {displayPerformanceMetrics.map((m, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-neutral-50 shadow-sm">
                   <div className="flex items-center gap-2 mb-2">
                      <m.icon size={12} className="text-neutral-300" />
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest truncate">{m.label}</span>
                   </div>
                   <p className="text-xl font-bold text-neutral-900">{m.value}</p>
                   <div className={`text-[9px] font-bold mt-1 flex items-center gap-1 ${m.status === 'up' ? 'text-success-default' : m.status === 'down' ? 'text-error-default' : 'text-neutral-300'}`}>
                      {m.status === 'up' ? <TrendingUp size={10} /> : <Clock size={10} />}
                      {m.trend}
                   </div>
                </div>
              ))}
           </div>

            <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col min-h-[450px]">
              <div className="px-6 py-5 border-b border-neutral-50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-50/20">
                  <div>
                    <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Class Results</h2>
                    <p className="text-xs text-neutral-500 font-medium">See how your classes are performing</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300" size={12} />
                      <select
                        value={perfSelectedBlock}
                        onChange={(e) => setPerfSelectedBlock(e.target.value)}
                        className="h-9 pl-9 pr-4 bg-white border border-neutral-100 rounded-xl text-[10px] font-bold uppercase tracking-wider outline-none focus:ring-4 focus:ring-primary/5 appearance-none cursor-pointer"
                      >
                        <option value="all">All Blocks</option>
                        {data?.performanceFilterBlocks.map(b => (
                          <option key={b.id} value={String(b.id)}>Block {b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-neutral-100">
                        <button onClick={() => setPerfChartMode("blocks")} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${perfChartMode === 'blocks' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-600'}`}>Class Average</button>
                        <button onClick={() => setPerfChartMode("students")} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${perfChartMode === 'students' ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-600'}`}>Students</button>
                    </div>
                  </div>
              </div>
              <div className="flex-1 p-6">
                  {perfActivityChart.rows.length > 0 ? (
                    <div className="w-full relative block" style={{ minWidth: 0 }}>
                       <ResponsiveContainer width="100%" height={300} minWidth={0}>
                         <LineChart data={perfActivityChart.rows}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="activityTitle" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                           <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 'bold' }} />
                           {perfActivityChart.series.map((s, i) => (
                             <Line key={i} type="monotone" dataKey={s.dataKey} name={s.label} stroke={s.color} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                           ))}
                         </LineChart>
                       </ResponsiveContainer>
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                       <TrendingUp size={48} className="text-neutral-200 mb-4" />
                       <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Not enough data for the graph yet</p>
                    </div>
                 )}
              </div>
           </div>
 
           <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/20">
                  <div>
                    <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">My Activities</h2>
                    <p className="text-xs text-neutral-500 font-medium">List of activities you've created</p>
                  </div>
                  <button onClick={() => navigate('/Teacher/Activities')} className="text-[10px] font-bold text-primary uppercase hover:underline">View All</button>
              </div>
              <div className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-50">
                          <th className="px-6 py-4 text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Activity Name</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Submissions</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-neutral-300 uppercase tracking-widest text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {!data?.activities || data.activities.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-10 text-center text-neutral-400 text-xs">No activities created yet</td>
                          </tr>
                        ) : (
                          data.activities.slice(0, 5).map((act) => (
                            <tr key={act.id} className="hover:bg-neutral-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-neutral-700 group-hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/Teacher/Activities?activityId=${act.id}`)}>{act.title}</p>
                                <p className="text-[10px] text-neutral-400 font-medium uppercase mt-0.5">{act.createdAt}</p>
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-neutral-600">
                                {act.submissionCount}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => navigate(`/Teacher/Activities?activityId=${act.id}`)} className="p-2 text-neutral-300 hover:text-primary transition-colors">
                                  <ArrowRight size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
              </div>
           </div>

           <div className="bg-primary/[0.02] rounded-3xl border border-primary/10 p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <h3 className="text-sm font-bold text-neutral-800 tracking-tight mb-2 flex items-center gap-2">
                  <Shield size={16} className="text-primary" />
                  AI Grading Status
               </h3>
              <p className="text-xs text-neutral-500 leading-relaxed mb-6">
                  The AI is working normally. Average wait time per essay: <span className="text-primary font-bold">~14s</span>.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                 <div className="flex-1 flex items-center justify-between p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">System Status</span>
                    <span className="text-[10px] font-bold text-success-default uppercase px-2.5 py-1 bg-success-default/5 rounded-md">Online</span>
                 </div>
                 <div className="flex-1 flex items-center justify-between p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                     <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Grading Speed</span>
                    <span className="text-[10px] font-bold text-primary uppercase px-1.5 py-1 bg-primary/5 rounded-md">Good</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-neutral-50 bg-neutral-50/20">
                 <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Shortcuts</h2>
              </div>
              <div className="p-4 grid grid-cols-1 gap-2">
                 {[
                    { label: "Manage Classes", sub: "View class lists", icon: Users, path: "/Teacher/Sections", color: "text-blue-500", bg: "bg-blue-50" },
                    { label: "Manage Rubrics", sub: "Grading guides", icon: BookOpen, path: "/Teacher/Rubrics", color: "text-purple-500", bg: "bg-purple-50" },
                    { label: "Past Classes", sub: "Old terms", icon: Archive, path: "/Teacher/Archive", color: "text-amber-500", bg: "bg-amber-50" },
                    { label: "My Settings", sub: "Account setup", icon: Settings, path: "/Teacher/Settings", color: "text-emerald-500", bg: "bg-emerald-50" },
                 ].map((nav, i) => (
                   <button 
                     key={i} 
                     onClick={() => navigate(nav.path)}
                     className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-neutral-50 transition-all group text-left border border-transparent hover:border-neutral-100"
                   >
                     <div className={`w-10 h-10 rounded-xl ${nav.bg} ${nav.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                        <nav.icon size={18} />
                     </div>
                     <div className="min-w-0">
                        <p className="text-sm font-bold text-neutral-800 tracking-tight">{nav.label}</p>
                        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">{nav.sub}</p>
                     </div>
                   </button>
                 ))}
              </div>
           </div>

           <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
              <div className="px-6 py-5 border-b border-neutral-50 bg-neutral-50/20">
                 <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Latest Updates</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {filteredRecentActivity.length === 0 ? (
                    <div className="py-2.5 text-center opacity-30">
                       <Activity size={32} className="mx-auto mb-2" />
                        <p className="text-[10px] font-bold">No updates yet...</p>
                    </div>
                 ) : (
                   filteredRecentActivity.slice(0, 10).map((act, i) => (
                     <div key={i} className="group p-4 rounded-2xl hover:bg-neutral-50 transition-all border border-transparent hover:border-neutral-100">
                        <div className="flex justify-between items-start mb-1.5">
                           <p className="text-sm font-bold text-neutral-800 tracking-tight truncate max-w-[140px]">{act.student}</p>
                           <span className="text-[11px] font-bold text-neutral-300 uppercase">{act.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                           <BookOpen size={10} className="text-primary/50" />
                           <span className="text-[9px] font-bold text-primary uppercase tracking-wider truncate">{act.activityTitle}</span>
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-1 mb-3">{act.action} "{act.essay}"</p>
                        <div className="flex items-center justify-between">
                           <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${act.status === 'new' ? 'bg-amber-50 text-amber-600' : 'bg-success-default/5 text-success-default'}`}>
                             {act.status}
                           </span>
                           {act.score !== undefined && (
                              <span className="text-sm font-bold text-primary">{act.score}%</span>
                           )}
                        </div>
                     </div>
                   ))
                 )}
              </div>
              <div className="p-4 bg-neutral-50/50 border-t border-neutral-50">
                 <button 
                  onClick={() => setIsActivityModalOpen(true)}
                  className="w-full py-2.5 text-[11px] font-bold text-neutral-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2"
                 >
                     View all logs <ArrowRight size={12} />
                 </button>
              </div>
           </div>

        </div>
      </div>
       <ActivityLogsModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        activities={filteredRecentActivity}
        courses={data?.activityFilterCourses || []}
        blocks={data?.activityFilterBlocks || []}
        allActivities={data?.activities || []}
       />
    </div>
  );
}
