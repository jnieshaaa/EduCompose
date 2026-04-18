import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  TrendingUp,
  Download,
  Eye,
  Edit,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Target,
  Mail,
  FileText,
  ArrowRight,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import ProgressBar from "../components/ui/ProgressBar";
import type { Class, Student, Essay } from "../types/Essay";
import { classApi, studentApi, essayApi } from "../api";
import { readSecureParams } from "../utils/secureUrl";

interface GradebookEntry {
  student: Student;
  essays: Essay[];
  averageScore: number;
  totalEssays: number;
  completedEssays: number;
  lastSubmission: string | null;
  performance: "excellent" | "good" | "average" | "needs-improvement";
}

const Gradebook: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [gradebookEntries, setGradebookEntries] = useState<GradebookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "score" | "submissions">("name");
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedClasses, fetchedEssays] = await Promise.all([
          classApi.getClasses(),
          essayApi.getEssays()
        ]);
        
        setClasses(fetchedClasses);
        setEssays(fetchedEssays);
        
        const studentPromises = fetchedClasses.map(cls => studentApi.getStudentsByClass(cls.id));
        const studentsArrays = await Promise.all(studentPromises);
        const allStudents = studentsArrays.flat();
        const uniqueStudents = Array.from(new Map(allStudents.map(s => [s.id, s])).values());
        
        setStudents(uniqueStudents);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false);

  useEffect(() => {
    const secureParams = readSecureParams(window.location.search);
    const studentIdFromUrl = secureParams?.studentId || searchParams.get("studentId");
    if (!studentIdFromUrl || hasOpenedFromUrl || students.length === 0) {
      return;
    }

    const targetStudent = students.find(
      (s) => s.student_id === studentIdFromUrl
    );

    if (targetStudent) {
      setSelectedStudent(targetStudent);
      setShowStudentModal(true);
      setHasOpenedFromUrl(true);
    }
  }, [searchParams, students, hasOpenedFromUrl]);

  useEffect(() => {
    if (students.length > 0 && essays.length > 0) {
      generateGradebookEntries();
    }
  }, [students, essays, selectedClass]);

  const generateGradebookEntries = () => {
    const filteredStudents = selectedClass
      ? students.filter((s) => s.class_id === selectedClass)
      : students;

    const entries: GradebookEntry[] = filteredStudents.map((student) => {
      const studentEssays = essays.filter((e) => e.student_id === student.id);
      const completedEssays = studentEssays.filter(
        (e) => e.status === "analyzed"
      );
      const averageScore =
        completedEssays.length > 0
          ? Math.round(
              completedEssays.reduce(
                (sum, e) => sum + (e.overall_score || 0),
                0
              ) / completedEssays.length
            )
          : 0;

      let performance: GradebookEntry["performance"] = "needs-improvement";
      if (averageScore >= 90) performance = "excellent";
      else if (averageScore >= 80) performance = "good";
      else if (averageScore >= 70) performance = "average";

      const lastSubmission =
        studentEssays.length > 0
          ? studentEssays.sort(
              (a, b) =>
                new Date(b.submitted_at).getTime() -
                new Date(a.submitted_at).getTime()
            )[0].submitted_at
          : null;

      return {
        student,
        essays: studentEssays,
        averageScore,
        totalEssays: studentEssays.length,
        completedEssays: completedEssays.length,
        lastSubmission,
        performance,
      };
    });

    setGradebookEntries(entries);
  };

  const filteredEntries = gradebookEntries.filter(
    (entry) =>
      `${entry.student.first_name || ''} ${entry.student.last_name || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      entry.student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    switch (sortBy) {
      case "score":
        return b.averageScore - a.averageScore;
      case "submissions":
        return b.totalEssays - a.totalEssays;
      default:
        return `${a.student.first_name || ''} ${a.student.last_name || ''}`.localeCompare(`${b.student.first_name || ''} ${b.student.last_name || ''}`);
    }
  });

  const getPerformanceColor = (performance: GradebookEntry["performance"]) => {
    switch (performance) {
      case "excellent": return "success";
      case "good": return "info";
      case "average": return "warning";
      default: return "error";
    }
  };

  const getPerformanceIcon = (performance: GradebookEntry["performance"]) => {
    switch (performance) {
      case "excellent": return <Award className="w-4 h-4" />;
      case "good": return <CheckCircle className="w-4 h-4" />;
      case "average": return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const classStats = {
    totalStudents: gradebookEntries.length,
    averageScore:
      gradebookEntries.length > 0
        ? Math.round(
            gradebookEntries.reduce((sum, e) => sum + e.averageScore, 0) /
              gradebookEntries.length
          )
        : 0,
    totalEssays: gradebookEntries.reduce((sum, e) => sum + e.totalEssays, 0),
    completedEssays: gradebookEntries.reduce(
      (sum, e) => sum + e.completedEssays,
      0
    ),
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-neutral-50">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-neutral-200 rounded-2xl w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-neutral-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-[500px] bg-neutral-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-6 space-y-8 min-h-screen bg-neutral-50/50 overflow-hidden">
      {/* Visual background flourishes */}
      <div className="absolute top-[-10%] left-[-5%] w-[35%] h-[35%] bg-primary-200/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-success-200/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-neutral-900 tracking-tight">
            Scholastic <span className="text-primary">Gradebook</span>
          </h1>
          <p className="text-neutral-500 font-medium mt-1">
            Tracking academic excellence across all blocks and student cohorts.
          </p>
        </motion.div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="rounded-xl border border-neutral-200 bg-white">
            <Download className="w-4 h-4 mr-2" />
            Full Export
          </Button>
          <Button variant="primary" className="rounded-xl shadow-lg shadow-primary/20">
            <BarChart3 className="w-4 h-4 mr-2" />
            Institutional Analytics
          </Button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="glass" className="border-primary-100/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100/50 rounded-2xl">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Enrollment</p>
              <p className="text-3xl font-black text-neutral-900">{classStats.totalStudents}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="border-success-100/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success-100/50 rounded-2xl">
              <TrendingUp className="w-7 h-7 text-success-default" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Cohort Avg</p>
              <p className="text-3xl font-black text-neutral-900">{classStats.averageScore}%</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="border-info-100/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-info-100/50 rounded-2xl">
              <BookOpen className="w-7 h-7 text-info-default" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Submissions</p>
              <p className="text-3xl font-black text-neutral-900">{classStats.totalEssays}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="border-warning-100/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-warning-100/50 rounded-2xl">
              <CheckCircle className="w-7 h-7 text-warning-default" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Completion</p>
              <p className="text-3xl font-black text-neutral-900">{classStats.completedEssays}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="glass" className="relative z-10 p-4 border-white/40">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              placeholder="Search student identity or blocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/70 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
          <div className="md:w-64">
            <select
              value={selectedClass || ""}
              onChange={(e) => setSelectedClass(e.target.value || null)}
              className="w-full px-4 py-3 bg-white/70 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm"
            >
              <option value="">Aesthetic All Blocks</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:w-64">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-4 py-3 bg-white/70 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm"
            >
              <option value="name">Sort: Alphabetical</option>
              <option value="score">Sort: Highest Academic</option>
              <option value="submissions">Sort: Most Productive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Gradebook Table */}
      <Card variant="glass" className="relative z-10 overflow-hidden border-white/30 p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/40 border-b border-neutral-200/50">
                <th className="text-left py-5 px-6 font-black text-neutral-400 uppercase tracking-widest text-[10px]">
                  Student Entity
                </th>
                <th className="text-left py-5 px-6 font-black text-neutral-400 uppercase tracking-widest text-[10px]">
                  Diagnostic Status
                </th>
                <th className="text-left py-5 px-6 font-black text-neutral-400 uppercase tracking-widest text-[10px]">
                  Academic Index
                </th>
                <th className="text-left py-5 px-6 font-black text-neutral-400 uppercase tracking-widest text-[10px]">
                  Output Rate
                </th>
                <th className="text-left py-5 px-6 font-black text-neutral-400 uppercase tracking-widest text-[10px]">
                  Recency
                </th>
                <th className="text-right py-5 px-6 font-black text-neutral-400 uppercase tracking-widest text-[10px]">
                  Operations
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, index) => (
                <motion.tr
                  key={entry.student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group border-b border-neutral-100/50 hover:bg-primary-50/30 transition-colors"
                >
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${
                        entry.averageScore >= 90 ? 'bg-gradient-to-br from-primary to-primary-600' : 'bg-neutral-300'
                      }`}>
                        {entry.student.first_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900 group-hover:text-primary transition-colors text-base">
                          {entry.student.first_name} {entry.student.last_name}
                        </p>
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-tighter">
                          ID: {entry.student.student_id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={getPerformanceColor(entry.performance)}
                        size="sm"
                        className="flex items-center gap-2 w-fit rounded-lg px-3 py-1 font-bold text-[10px] uppercase tracking-wider"
                      >
                        {getPerformanceIcon(entry.performance)}
                        {entry.performance.replace("-", " ")}
                      </Badge>
                      {entry.performance === "needs-improvement" && (
                        <span className="text-[10px] text-error-default font-black italic flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Intervention Suggested
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-4">
                      <span className="font-black text-lg text-neutral-900 min-w-[3rem]">
                        {entry.averageScore}%
                      </span>
                      <div className="flex-1 max-w-[100px]">
                        <ProgressBar
                          value={entry.averageScore}
                          color={getPerformanceColor(entry.performance)}
                          size="sm"
                          className="rounded-full overflow-hidden h-1.5"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-2">
                       <div className="flex -space-x-1">
                        {[...Array(Math.min(entry.completedEssays, 3))].map((_, i) => (
                           <div key={i} className="w-2 h-2 rounded-full bg-primary/40 border border-white" />
                        ))}
                       </div>
                       <span className="text-sm font-bold text-neutral-700">
                        {entry.completedEssays} / {entry.totalEssays}
                       </span>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-2 text-neutral-500 font-medium text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {entry.lastSubmission
                        ? new Date(entry.lastSubmission).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : "Inactive"}
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        className="h-10 w-10 p-0 rounded-xl hover:bg-white transition-all shadow-sm hover:shadow-md"
                        onClick={() => {
                          setSelectedStudent(entry.student);
                          setShowStudentModal(true);
                        }}
                      >
                        <Eye className="w-5 h-5 text-neutral-600 group-hover:text-primary" />
                      </Button>
                      <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white transition-all shadow-sm hover:shadow-md">
                        <Edit className="w-5 h-5 text-neutral-600" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedEntries.length === 0 && (
          <div className="text-center py-24 bg-white/20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <Users className="w-20 h-20 text-neutral-300 mx-auto mb-6 opacity-20" />
              <h3 className="text-2xl font-black text-neutral-900 mb-2 tracking-tight">
                No Scholars Identified
              </h3>
              <p className="text-neutral-500 max-w-xs mx-auto font-medium">
                Our advanced diagnostic search returned zero results. Refine your filters to discover academic data.
              </p>
            </motion.div>
          </div>
        )}
      </Card>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <Modal
          isOpen={showStudentModal}
          onClose={() => {
            setShowStudentModal(false);
            setSelectedStudent(null);
          }}
          title={`${selectedStudent.first_name} ${selectedStudent.last_name} — Diagnostic Profile`}
          size="xl"
        >
          <div className="space-y-8 p-1">
             {/* Student Identity HUD */}
             <div className="flex flex-col md:flex-row gap-6 items-start md:items-center p-6 bg-neutral-900 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full" />
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-4xl font-black shadow-lg relative z-10">
                   {selectedStudent.first_name?.charAt(0)}
                </div>
                <div className="flex-1 relative z-10">
                   <h2 className="text-3xl font-black tracking-tight">{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                   <div className="flex flex-wrap gap-4 mt-2">
                      <div className="flex items-center gap-2 text-neutral-400 text-sm font-bold">
                         <Target className="w-4 h-4" /> ID: {selectedStudent.student_id}
                      </div>
                      <div className="flex items-center gap-2 text-neutral-400 text-sm font-bold">
                         <Mail className="w-4 h-4" /> {selectedStudent.email || "No Email Bound"}
                      </div>
                   </div>
                </div>
                <div className="px-6 py-2 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                   <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Institutional Standing</p>
                   <p className="text-xl font-black text-success-default">Active Cohort</p>
                </div>
             </div>

            {/* Performance Summary Bento */}
            {(() => {
              const studentEntry = gradebookEntries.find(
                (e) => e.student.id === selectedStudent.id
              );
              if (!studentEntry) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-primary-50 rounded-3xl border border-primary-100/50 text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-2">Academic Index</p>
                    <div className="text-4xl font-black text-primary">{studentEntry.averageScore}%</div>
                    <div className="mt-4 px-3 py-1 bg-primary-100 rounded-full text-[10px] font-black text-primary mx-auto w-fit uppercase">Institutional Rank A+</div>
                  </div>
                  
                  <div className="p-6 bg-success-50 rounded-3xl border border-success-100/50 text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-success-default/70 mb-2">Execution Rate</p>
                    <div className="text-4xl font-black text-success-default">{studentEntry.completedEssays}</div>
                    <p className="text-xs font-bold text-success-600/70 mt-4">Verified Submissions</p>
                  </div>
                  
                  <div className="p-6 bg-info-50 rounded-3xl border border-info-100/50 text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-info-default/70 mb-2">Total Output</p>
                    <div className="text-4xl font-black text-info-default">{studentEntry.totalEssays}</div>
                    <p className="text-xs font-bold text-info-600/70 mt-4">Assigned Activities</p>
                  </div>
                </div>
              );
            })()}

            {/* Essay History — High Fidelity List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-black text-neutral-900 tracking-tight">Academic History</h3>
                 <Badge variant="neutral" className="bg-neutral-100 text-neutral-500 font-black px-3 py-1 rounded-lg border-none uppercase text-[10px]">Archived Records Linked</Badge>
              </div>
              <div className="space-y-3">
                {(() => {
                  const studentEssays = essays.filter(
                    (e) => e.student_id === selectedStudent.id
                  );
                  return studentEssays.length > 0 ? (
                    studentEssays.map((essay, index) => (
                      <motion.div
                        key={essay.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-2xl hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-neutral-50 rounded-xl group-hover:bg-primary-50 transition-colors">
                              <FileText className="w-5 h-5 text-neutral-400 group-hover:text-primary" />
                           </div>
                           <div>
                              <p className="font-bold text-neutral-900 group-hover:text-primary transition-all">
                                {essay.title}
                              </p>
                              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-tighter">
                                Logged: {new Date(essay.submitted_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <Badge
                            variant={
                              essay.status === "analyzed" ? "success" : 
                              essay.status === "submitted" ? "warning" : "info"
                            }
                            size="sm"
                            className="rounded-full px-3 py-1 font-black text-[10px] uppercase tracking-widest"
                          >
                            {essay.status}
                          </Badge>
                          {essay.overall_score !== undefined && (
                            <div className="text-right">
                               <p className="text-xl font-black text-neutral-900 leading-none">{Math.round(essay.overall_score)}%</p>
                               <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Global Pctl</span>
                            </div>
                          )}
                          <ArrowRight className="w-5 h-5 text-neutral-300 group-hover:text-primary transition-all opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-16 bg-neutral-50/50 rounded-3xl border-2 border-dashed border-neutral-200">
                      <BookOpen className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                      <p className="text-neutral-500 font-bold">No academic output detected for this scholar.</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Gradebook;
