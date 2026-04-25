import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  BookOpen,
  Clock,
  TrendingUp,
  CheckCircle,
  Download,
  Target,
} from "lucide-react";
import EssayCard from "../components/essay/EssayCard";
import EnhancedEssayAnalysisModal from "../components/essay/EnhancedEssayAnalysisModal";
import BatchAnalysisButton from "../components/essay/BatchAnalysisButton";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import type { Essay, Class, Student } from "../types/Essay";
import { classApi, studentApi, essayApi, analysisApi } from "../api";

const EssayManagement: React.FC = () => {
  const navigate = useNavigate();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEssay, setSelectedEssay] = useState<Essay | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedEssays, setSelectedEssays] = useState<(string)[]>([]);
  const [showNewEssayModal, setShowNewEssayModal] = useState(false);
  const [newEssay, setNewEssay] = useState({
    title: "",
    content: "",
    student_id: "" as string,
    class_id: "" as string,
  });

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
        
        if (fetchedClasses.length > 0) {
          const studentPromises = fetchedClasses.map(cls => studentApi.getStudentsByClass(cls.id));
          const studentsArrays = await Promise.all(studentPromises);
          setStudents(studentsArrays.flat());
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredEssays = essays.filter((essay) => {
    const matchesSearch =
      essay.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      essay.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = !selectedClass || essay.class_id === selectedClass;
    const matchesStatus =
      statusFilter === "all" || essay.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleAnalyzeEssay = async (essay: Essay) => {
    try {
      setEssays((prev) =>
        prev.map((e) =>
          e.id === essay.id
            ? { ...e, status: "analyzed" as const, overall_score: 85 }
            : e,
        ),
      );
    } catch (error) {
      console.error("Error analyzing essay:", error);
    }
  };

  const handleViewAnalysis = async (essay: Essay) => {
    try {
      if (essay.status === "analyzed") {
        const result = await analysisApi.analyzeEssay(
          essay.id,
          "comprehensive",
        );
        navigate("/Teacher/AnalysisResults", {
          state: {
            analysis: result,
            text: essay.content,
            title: essay.title,
          },
        });
      } else {
        navigate("/Teacher/AnalysisResults", {
          state: {
            text: essay.content,
            title: essay.title,
            essayId: essay.id,
          },
        });
      }
    } catch (_error) {
      navigate("/Teacher/AnalysisResults", {
        state: {
          text: essay.content,
          title: essay.title,
          essayId: essay.id,
        },
      });
    }
  };

  const handleCreateEssay = async () => {
    try {
      if (!newEssay.class_id || !newEssay.student_id) return;
      
      const createdEssay = await essayApi.createEssay({
        title: newEssay.title,
        content: newEssay.content,
        student_id: newEssay.student_id,
        class_id: newEssay.class_id
      });

      setEssays((prev) => [createdEssay, ...prev]);
      setShowNewEssayModal(false);
      setNewEssay({ title: "", content: "", student_id: "", class_id: "" });
    } catch (error) {
      console.error("Error creating essay:", error);
    }
  };

  const getStatusCounts = () => {
    return {
      all: essays.length,
      submitted: essays.filter((e) => e.status === "submitted").length,
      analyzed: essays.filter((e) => e.status === "analyzed").length,
      reviewed: essays.filter((e) => e.status === "reviewed").length,
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-neutral-50/50">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-neutral-200 rounded-2xl w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-neutral-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
      <div className="absolute top-[-5%] right-[-10%] w-[45%] h-[45%] bg-primary-200/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[35%] h-[35%] bg-info-200/10 blur-[110px] rounded-full pointer-events-none" />

      {/* Header Section */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-neutral-900 tracking-tight">
            Submission <span className="text-primary font-black">Archive</span>
          </h1>
          <p className="text-neutral-500 font-medium mt-1">
            Analyze, review, and manage student essay rosters.
          </p>
        </motion.div>
        <div className="flex items-center gap-3">
          {selectedEssays.length > 0 && (
            <BatchAnalysisButton
              selectedEssays={essays.filter((e) =>
                selectedEssays.includes(e.id),
              )}
              onAnalysisComplete={() => {
                setSelectedEssays([]);
              }}
            />
          )}
          <Button variant="ghost" className="rounded-xl border border-neutral-200 bg-white shadow-sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="primary"
            className="rounded-xl shadow-lg shadow-primary/20 px-6 py-5"
            onClick={() => setShowNewEssayModal(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            New Essay
          </Button>
        </div>
      </div>

      {/* Institutional Insight HUD */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="glass" className="border-primary-100/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100/50 rounded-2xl">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Total Vault</p>
              <p className="text-3xl font-black text-neutral-900 leading-none">{statusCounts.all}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="border-warning-100/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-warning-100/50 rounded-2xl">
              <Clock className="w-7 h-7 text-warning-default" />
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Awaiting Intel</p>
              <p className="text-3xl font-black text-neutral-900 leading-none">{statusCounts.submitted}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="border-info-100/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-info-100/50 rounded-2xl">
              <TrendingUp className="w-7 h-7 text-info-default" />
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Analyzed</p>
              <p className="text-3xl font-black text-neutral-900 leading-none">{statusCounts.analyzed}</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="border-success-100/30 bg-neutral-900/90 text-white shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl">
              <CheckCircle className="w-7 h-7 text-success-default" />
            </div>
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Finalized</p>
              <p className="text-3xl font-black text-white leading-none">{statusCounts.reviewed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Diagnostic Filters */}
      <Card variant="glass" className="relative z-10 p-5 border-white/40">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              placeholder="Search by title, content, or student keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/70 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium shadow-sm outline-none"
            />
          </div>
          <div className="md:w-64">
            <select
              value={selectedClass || ""}
              onChange={(e) =>setSelectedClass(e.target.value || null)}
              className="w-full px-4 py-3 bg-white/70 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm"
            >
              <option value="">Aesthetic All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div className="md:w-64">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 bg-white/70 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm"
            >
              <option value="all">Any Strategy Status</option>
              <option value="submitted">Initial Submission</option>
              <option value="analyzed">AI Diagnostic Done</option>
              <option value="reviewed">Verified & Reviewed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Submissions Stream */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredEssays.map((essay, index) => (
            <motion.div
              key={essay.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <EssayCard
                essay={essay}
                onClick={() => handleViewAnalysis(essay)}
                onAnalyze={() => handleAnalyzeEssay(essay)}
                showStudent={true}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredEssays.length === 0 && (
        <Card variant="glass" className="relative z-10 text-center py-24 border-dashed border-2 border-primary-200">
          <BookOpen className="w-20 h-20 text-primary/20 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-neutral-900 mb-2">No Submissions Found</h3>
          <p className="text-neutral-500 max-w-sm mx-auto font-medium mb-8">Refine your search parameters or initialize a manual intake process.</p>
          <Button variant="primary" className="rounded-2xl px-8 py-6 shadow-xl shadow-primary/20" onClick={() => setShowNewEssayModal(true)}>
            <Plus className="w-5 h-5 mr-3" />Manual Archive Intake
          </Button>
        </Card>
      )}

      {/* Enhanced Analysis HUD */}
      {selectedEssay && (
        <EnhancedEssayAnalysisModal
          isOpen={showAnalysisModal}
          onClose={() => {
            setShowAnalysisModal(false);
            setSelectedEssay(null);
          }}
          essay={selectedEssay}
          onAnalysisComplete={(analysis) => {
            setEssays((prev) =>
              prev.map((e) =>
                e.id === selectedEssay.id
                  ? {
                      ...e,
                      status: "analyzed" as const,
                      overall_score: analysis.scores.overall,
                      grammar_score: analysis.scores.grammar,
                      readability_score: analysis.scores.readability,
                      coherence_score: analysis.scores.coherence,
                      argument_strength_score: analysis.scores.argument_strength,
                    }
                  : e,
              ),
            );
          }}
        />
      )}

      {/* New Essay Intake Modal */}
      <Modal
        isOpen={showNewEssayModal}
        onClose={() => setShowNewEssayModal(false)}
        title="Institutional Protocol: Manual Intake"
        size="lg"
      >
        <div className="space-y-6 pt-2">
          <Input
            label="Intel Title"
            value={newEssay.title}
            onChange={(v) => setNewEssay((p) => ({ ...p, title: v }))}
            placeholder="e.g. Philosophical Analysis on AI Ethics"
            className="rounded-xl"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Block Allocation</label>
              <select
                value={newEssay.class_id}
                onChange={(e) => setNewEssay((p) => ({ ...p, class_id: e.target.value }))}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                required
              >
                <option value="">Select Target Block</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Student Identity</label>
              <select
                value={newEssay.student_id}
                onChange={(e) => setNewEssay((p) => ({ ...p, student_id: e.target.value }))}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                required
                disabled={!newEssay.class_id}
              >
                <option value="">{newEssay.class_id ? "Select Student" : "Select Block First"}</option>
                {students
                  .filter((s) => s.class_id === newEssay.class_id)
                  .map((student) => (
                    <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>
                  ))}
              </select>
            </div>
          </div>

          <Input
            label="Intel Content (Manuscript)"
            value={newEssay.content}
            onChange={(v) => setNewEssay((p) => ({ ...p, content: v }))}
            placeholder="Paste student manuscript content here..."
            type="textarea"
            rows={10}
            className="rounded-xl"
            required
          />

          <div className="flex gap-4 pt-4 border-t border-neutral-100">
            <Button variant="ghost" className="flex-1 rounded-xl py-4" onClick={() => setShowNewEssayModal(false)}>Discard Intake</Button>
            <Button
              variant="primary"
              className="flex-1 rounded-xl py-4 shadow-xl shadow-primary/10"
              onClick={handleCreateEssay}
              disabled={!newEssay.title || !newEssay.content || !newEssay.class_id || !newEssay.student_id}
            >
              Finalize Submission
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EssayManagement;
