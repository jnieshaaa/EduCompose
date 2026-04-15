import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  BookOpen,
  Calendar,
  Users,
  Edit,
  Download,
  CheckCircle,
  Target,
  FileText,
  Archive,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import ProgressBar from "../components/ui/ProgressBar";
import AlertModal from "../components/ui/AlertModal";
import type { Class, Student, Essay } from "../types/Essay";
import { classApi, studentApi, essayApi, essayActivityApi } from "../api";
import { useNotification } from "../context/NotificationContext";

interface Assignment {
  id: string | number;
  title: string;
  description: string;
  instructions: string;
  class_id: string | number;
  due_date: string;
  created_at: string;
  status: "draft" | "published" | "closed";
  max_score: number;
  word_limit?: number;
  time_limit?: number; // in minutes
  rubric_criteria: RubricCriteria[];
  submissions: Essay[];
  created_by: string | number;
}

interface RubricCriteria {
  id: string | number;
  name: string;
  description: string;
  max_points: number;
  weight: number; // percentage
}

const AssignmentManagement: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [filterClass, setFilterClass] = useState<string | number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<Assignment | null>(null);
  const { showNotification } = useNotification();

  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    instructions: "",
    class_id: "" as string | number,
    due_date: "",
    max_score: 100,
    word_limit: 0,
    time_limit: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedClasses, fetchedEssays, fetchedActivities] = await Promise.all([
          classApi.getClasses(),
          essayApi.getEssays(),
          essayActivityApi.getActivities()
        ]);
        
        setClasses(fetchedClasses);
        
        const mappedAssignments: Assignment[] = fetchedActivities.map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description || "",
          instructions: a.instructions || "",
          class_id: a.block_id,
          due_date: a.deadline || "",
          created_at: a.created_at,
          status: a.status || "published",
          max_score: a.max_score || 100,
          rubric_criteria: [],
          submissions: fetchedEssays.filter((e: Essay) => e.class_id === a.block_id),
          created_by: a.created_by
        }));

        setAssignments(mappedAssignments);

        if (fetchedClasses.length > 0) {
          const studentPromises = fetchedClasses.map(cls => studentApi.getStudentsByClass(cls.id));
          const studentsArrays = await Promise.all(studentPromises);
          setStudents(studentsArrays.flat());
        }
      } catch (error: any) {
        console.error("Error loading data:", error);
        showNotification('error', error.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesClass = !filterClass || assignment.class_id === filterClass;
    const matchesStatus =
      filterStatus === "all" || assignment.status === filterStatus;
    const matchesSearch =
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesClass && matchesStatus && matchesSearch;
  });

  const handleCreateAssignment = async () => {
    try {
      const createdAssignment: Assignment = {
        id: assignments.length + 1000,
        ...newAssignment,
        due_date: new Date(newAssignment.due_date).toISOString(),
        created_at: new Date().toISOString(),
        status: "draft",
        rubric_criteria: [
          { id: 1, name: "Critical Thinking", description: "Analytical depth", max_points: 50, weight: 50 },
          { id: 2, name: "Academic Voice", description: "Clarity and tone", max_points: 50, weight: 50 },
        ],
        submissions: [],
        created_by: 1,
      };

      setAssignments((prev) => [createdAssignment, ...prev]);
      showNotification('success', "Activity initialized successfully");
      setShowCreateModal(false);
      setNewAssignment({
        title: "", description: "", instructions: "", class_id: 0,
        due_date: "", max_score: 100, word_limit: 0, time_limit: 0,
      });
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      showNotification('error', error.message || "Failed to initialize activity");
    }
  };

  const handlePublishAssignment = (assignmentId: string | number) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId ? { ...a, status: "published" as const } : a
      )
    );
    showNotification('success', "Activity deployed to live stream");
  };

  const handleCloseAssignment = (assignmentId: string | number) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId ? { ...a, status: "closed" as const } : a
      )
    );
    showNotification('info', "Activity terminated and closed");
  };


  const handleDeleteAssignment = async (assignment: Assignment) => {
    setConfirmingDelete(assignment);
  };

  const executeDelete = async () => {
    if (!confirmingDelete) return;
    try {
      setAssignments(prev => prev.filter(a => a.id !== confirmingDelete.id));
      showNotification('success', "Activity profile archived");
      setConfirmingDelete(null);
    } catch (error: any) {
      console.error("Failed to delete assignment:", error);
      showNotification('error', error.message || "Failed to archive activity");
    }
  };

  const getStatusColor = (status: Assignment["status"]) => {
    switch (status) {
      case "published": return "success";
      case "draft": return "warning";
      case "closed": return "neutral";
      default: return "neutral";
    }
  };



  const getSubmissionStats = (assignment: Assignment) => {
    const classStudents = students.filter(
      (s) => s.class_id === assignment.class_id
    );
    const submissionRate =
      classStudents.length > 0
        ? (assignment.submissions.length / classStudents.length) * 100
        : 0;

    return {
      totalStudents: classStudents.length,
      submissions: assignment.submissions.length,
      submissionRate: Math.round(submissionRate),
    };
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-neutral-200 rounded-3xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-6 space-y-8 min-h-screen bg-neutral-50/50 overflow-hidden">
      {/* Visual background flourishes */}
      <div className="absolute top-[-5%] right-[-10%] w-[45%] h-[45%] bg-primary-200/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[35%] h-[35%] bg-success-200/10 blur-[110px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-neutral-900 tracking-tight">
            Activity <span className="text-primary">Management</span>
          </h1>
          <p className="text-neutral-500 font-medium mt-1">
            Design and deploy academic challenges for your student rosters.
          </p>
        </motion.div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="rounded-xl border border-neutral-200 bg-white shadow-sm">
            <Download className="w-4 h-4 mr-2" />
            Archive
          </Button>
          <Button
            variant="primary"
            className="rounded-xl shadow-lg shadow-primary/20 px-6 py-5"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            New Assignment
          </Button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="glass" className="border-primary-100/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100/50 rounded-2xl">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Global Pool</p>
              <p className="text-3xl font-black text-neutral-900 leading-tight">{assignments.length}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="border-success-100/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success-100/50 rounded-2xl">
              <CheckCircle className="w-7 h-7 text-success-default" />
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Active Live</p>
              <p className="text-3xl font-black text-neutral-900 leading-tight">
                {assignments.filter((a) => a.status === "published").length}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="border-warning-100/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-warning-100/50 rounded-2xl">
              <Edit className="w-7 h-7 text-warning-default" />
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Queue/Draft</p>
              <p className="text-3xl font-black text-neutral-900 leading-tight">
                {assignments.filter((a) => a.status === "draft").length}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="border-info-100/30 text-white bg-neutral-900/90 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl">
              <Users className="w-7 h-7 text-info-default" />
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total Intake</p>
              <p className="text-3xl font-black leading-tight text-white">
                {assignments.reduce((sum, a) => sum + a.submissions.length, 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters HUD */}
      <Card variant="glass" className="relative z-10 p-5 border-white/40">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              placeholder="Filter by title, content, or context..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/70 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium shadow-sm"
            />
          </div>
          <div className="md:w-64">
            <select
              value={filterClass || ""}
              onChange={(e) => setFilterClass(e.target.value ? Number(e.target.value) : null)}
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 bg-white/70 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm"
            >
              <option value="all">Any Status</option>
              <option value="draft">Draft Protocol</option>
              <option value="published">Active / Live</option>
              <option value="closed">Terminated/Closed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Assignments Grid with Premium Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {filteredAssignments.map((assignment, index) => {
            const stats = getSubmissionStats(assignment);
            const classInfo = classes.find((c) => c.id === assignment.class_id);

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card variant="glass" className="h-full border-primary-100/20 group hover:border-primary-400/30 transition-all p-0 overflow-hidden flex flex-col">
                  {/* Card Header & Backdrop */}
                  <div className="relative p-6 bg-gradient-to-br from-white/60 to-transparent">
                     <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-primary-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                           <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <Badge
                              variant={getStatusColor(assignment.status)}
                              size="sm"
                              className="rounded-lg px-3 py-1 font-black text-[10px] uppercase tracking-widest shadow-sm"
                           >
                              {assignment.status}
                           </Badge>
                           <button 
                              onClick={() => handleDeleteAssignment(assignment)}
                              className="p-1.5 text-neutral-300 hover:text-error-default transition-colors opacity-0 group-hover:opacity-100"
                           >
                              <Archive className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                     <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest mb-1">{classInfo?.name || "Global Block"}</p>
                     <h3 className="text-xl font-bold text-neutral-900 group-hover:text-primary transition-colors leading-tight mb-2">
                        {assignment.title}
                     </h3>
                     <p className="text-xs text-neutral-500 font-medium line-clamp-2 leading-relaxed">
                        {assignment.description}
                     </p>
                  </div>

                  <div className="p-6 pt-0 space-y-5 flex-1 flex flex-col justify-between">
                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="flex items-center gap-2 text-neutral-600">
                          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                             <Calendar className="w-4 h-4 text-neutral-500" />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[9px] font-black text-neutral-400 uppercase leading-none mb-1">Due Date</p>
                             <p className="text-[11px] font-black">{new Date(assignment.due_date).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 text-neutral-600">
                          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                             <Target className="w-4 h-4 text-neutral-500" />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[9px] font-black text-neutral-400 uppercase leading-none mb-1">Intensity</p>
                             <p className="text-[11px] font-black">{assignment.max_score} Index</p>
                          </div>
                       </div>
                    </div>

                    {/* Progress Monitor */}
                    <div className="p-4 bg-white/40 rounded-2xl border border-white/50 shadow-inner">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Submission Trajectory</span>
                          <span className="text-xs font-black text-neutral-900">
                             {stats.submissions} / {stats.totalStudents}
                          </span>
                       </div>
                       <ProgressBar
                          value={stats.submissionRate}
                          color={stats.submissionRate >= 80 ? "success" : stats.submissionRate >= 50 ? "warning" : "error"}
                          size="sm"
                          className="h-1.5 rounded-full"
                       />
                    </div>

                    {/* Action Bar */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="ghost"
                        className="flex-1 rounded-xl bg-white/50 border border-neutral-100 shadow-sm hover:shadow-md transition-all font-black text-[10px] uppercase tracking-widest py-3"
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowEditModal(true);
                        }}
                      >
                        Interface
                      </Button>
                      {assignment.status === "draft" && (
                        <Button
                          variant="primary"
                          className="flex-1 rounded-xl shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest py-3"
                          onClick={() => handlePublishAssignment(assignment.id)}
                        >
                          Deploy
                        </Button>
                      )}
                      {assignment.status === "published" && (
                        <Button
                          variant="secondary"
                          className="flex-1 rounded-xl shadow-md font-black text-[10px] uppercase tracking-widest py-3"
                          onClick={() => handleCloseAssignment(assignment.id)}
                        >
                          Terminate
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredAssignments.length === 0 && (
        <Card variant="glass" className="relative z-10 text-center py-24 border-dashed border-2 border-primary-200">
          <BookOpen className="w-20 h-20 text-primary/20 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-neutral-900 mb-2">Empty Activity Stream</h3>
          <p className="text-neutral-500 max-w-sm mx-auto font-medium mb-8">
            Start by designing a new assignment mission to activate your student cohorts.
          </p>
          <Button variant="primary" className="rounded-2xl px-8 py-6 shadow-xl shadow-primary/20" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-5 h-5 mr-3" />
            Initialize First Activity
          </Button>
        </Card>
      )}

      {/* Create Assignment Modal Redesign */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Institutional Protocol: New Activity"
        size="lg"
      >
        <div className="space-y-6 pt-2">
          <Input
            label="Mission Title"
            value={newAssignment.title}
            onChange={(v) => setNewAssignment((p) => ({ ...p, title: v }))}
            placeholder="e.g. Environmental Ethics Analysis"
            className="rounded-xl"
            required
          />

          <Input
            label="Executive Summary"
            value={newAssignment.description}
            onChange={(v) => setNewAssignment((p) => ({ ...p, description: v }))}
            placeholder="Brief overview of objectives..."
            type="textarea"
            rows={2}
            className="rounded-xl"
          />

          <Input
            label="Detailed Mandate (Instructions)"
            value={newAssignment.instructions}
            onChange={(v) => setNewAssignment((p) => ({ ...p, instructions: v }))}
            placeholder="Specify all student requirements here..."
            type="textarea"
            rows={4}
            className="rounded-xl"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Block Allocation</label>
              <select
                value={newAssignment.class_id}
                onChange={(e) => setNewAssignment((p) => ({ ...p, class_id: e.target.value }))}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                required
              >
                <option value="">Select Target Block</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Filing Deadline</label>
              <input
                type="datetime-local"
                value={newAssignment.due_date}
                onChange={(e) => setNewAssignment((p) => ({ ...p, due_date: e.target.value }))}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Max Proficiency" value={newAssignment.max_score} onChange={(v) => setNewAssignment((p) => ({ ...p, max_score: Number(v) }))} type="number" className="rounded-xl" />
            <Input label="Word Count" value={newAssignment.word_limit} onChange={(v) => setNewAssignment((p) => ({ ...p, word_limit: Number(v) }))} type="number" className="rounded-xl" />
            <Input label="Temporal Window (m)" value={newAssignment.time_limit} onChange={(v) => setNewAssignment((p) => ({ ...p, time_limit: Number(v) }))} type="number" className="rounded-xl" />
          </div>

          <div className="flex gap-4 pt-6 border-t border-neutral-100">
            <Button variant="ghost" className="flex-1 rounded-xl py-4" onClick={() => setShowCreateModal(false)}>Cancel Protocol</Button>
            <Button
              variant="primary"
              className="flex-1 rounded-xl py-4 shadow-lg shadow-primary/10"
              onClick={handleCreateAssignment}
              disabled={!newAssignment.title || !newAssignment.instructions || !newAssignment.class_id || !newAssignment.due_date}
            >
              Initialize Activity
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assignment Detail Modal Redesign */}
      {selectedAssignment && (
        <Modal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setSelectedAssignment(null); }}
          title={selectedAssignment.title}
          size="xl"
        >
          <div className="space-y-8 p-1">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100/50 text-center">
                   <p className="text-[10px] font-black uppercase text-primary mb-1">Status</p>
                   <Badge variant={getStatusColor(selectedAssignment.status)} size="sm">{selectedAssignment.status}</Badge>
                </div>
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-center">
                   <p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Block</p>
                   <p className="text-sm font-bold">{classes.find(c => c.id === selectedAssignment.class_id)?.name || "N/A"}</p>
                </div>
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-center">
                   <p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Target Score</p>
                   <p className="text-sm font-bold">{selectedAssignment.max_score} Impact</p>
                </div>
                <div className="p-4 bg-error-50 rounded-2xl border border-error-100 text-center">
                   <p className="text-[10px] font-black uppercase text-error-default mb-1">Final Deadline</p>
                   <p className="text-[10px] font-black">{new Date(selectedAssignment.due_date).toLocaleString()}</p>
                </div>
             </div>

            <div className="bg-white rounded-3xl border border-neutral-100 p-8 shadow-sm">
              <h3 className="text-xl font-black text-neutral-900 mb-4 flex items-center gap-2">
                 <Target className="w-5 h-5 text-primary" /> Mission Mandate
              </h3>
              <p className="text-neutral-600 font-medium leading-relaxed whitespace-pre-wrap">{selectedAssignment.instructions}</p>
            </div>

            {selectedAssignment.rubric_criteria && selectedAssignment.rubric_criteria.length > 0 && (
              <div>
                <h3 className="text-xl font-black text-neutral-900 mb-6 px-2 tracking-tight">Diagnostic Rubric</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedAssignment.rubric_criteria.map((criteria) => (
                    <div key={criteria.id} className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-primary-100 transition-all group shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-neutral-900 group-hover:text-primary transition-colors">{criteria.name}</h4>
                        <Badge variant="info" className="rounded-lg text-[10px]">{criteria.max_points} Points</Badge>
                      </div>
                      <p className="text-xs text-neutral-500 font-medium">{criteria.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      <AlertModal
        isOpen={!!confirmingDelete}
        onClose={() => setConfirmingDelete(null)}
        type="error"
        title="Archive Assignment Profile"
        message={`Are you absolutely sure you want to archive "${confirmingDelete?.title}"? This will hide the activity from student view and disconnect active submissions.`}
        showCancel
        confirmText="Confirm Archive"
        onConfirm={executeDelete}
      />
    </div>
  );
};

export default AssignmentManagement;
