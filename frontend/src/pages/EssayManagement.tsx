import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  BookOpen,
  Clock,
  TrendingUp,
  CheckCircle,
  Download,
} from "lucide-react";
import EssayCard from "../components/essay/EssayCard";
import EssayAnalysisModal from "../components/essay/EssayAnalysisModal";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import type { Essay, Class, Student } from "../types/Essay";
import { dummyData } from "../api";

const EssayManagement: React.FC = () => {
  const [essays, setEssays] = useState<Essay[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEssay, setSelectedEssay] = useState<Essay | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showNewEssayModal, setShowNewEssayModal] = useState(false);
  const [newEssay, setNewEssay] = useState({
    title: "",
    content: "",
    student_id: 0,
    class_id: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Simulate API calls
        setTimeout(() => {
          setEssays(dummyData.essays);
          setClasses(dummyData.classes);
          setStudents(dummyData.students);
          setLoading(false);
        }, 1000);
  } catch (error) {
        console.error("Error loading data:", error);
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
      // Simulate analysis API call
      console.log("Analyzing essay:", essay.id);
      // In a real app, you would call: await analysisApi.analyzeEssay(essay.id);

      // Update essay status
      setEssays((prev) =>
        prev.map((e) =>
          e.id === essay.id
            ? { ...e, status: "analyzed" as const, overall_score: 85 }
            : e
        )
      );
    } catch (error) {
      console.error("Error analyzing essay:", error);
    }
  };

  const handleViewAnalysis = (essay: Essay) => {
    setSelectedEssay(essay);
    setShowAnalysisModal(true);
  };

  const handleCreateEssay = async () => {
    try {
      // Simulate API call
      console.log("Creating essay:", newEssay);
      // In a real app, you would call: await essayApi.createEssay(newEssay);

      const createdEssay: Essay = {
        id: essays.length + 1,
        student_id: newEssay.student_id,
        teacher_id: 1,
        class_id: newEssay.class_id,
        title: newEssay.title,
        content: newEssay.content,
        submitted_at: new Date().toISOString(),
        status: "submitted",
      };

      setEssays((prev) => [createdEssay, ...prev]);
      setShowNewEssayModal(false);
      setNewEssay({ title: "", content: "", student_id: 0, class_id: 0 });
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
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-neutral-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            Essay Management
          </h1>
          <p className="text-neutral-600 mt-1">
            Manage and analyze student essays
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowNewEssayModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Essay
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Essays</p>
              <p className="text-2xl font-bold text-neutral-900">
                {statusCounts.all}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Clock className="w-6 h-6 text-warning-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Pending</p>
              <p className="text-2xl font-bold text-neutral-900">
                {statusCounts.submitted}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-info-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-info-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Analyzed</p>
              <p className="text-2xl font-bold text-neutral-900">
                {statusCounts.analyzed}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-success-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Reviewed</p>
              <p className="text-2xl font-bold text-neutral-900">
                {statusCounts.reviewed}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search essays..."
              value={searchTerm}
              onChange={setSearchTerm}
              type="text"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={selectedClass || ""}
              onChange={(e) =>
                setSelectedClass(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="analyzed">Analyzed</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Essays Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredEssays.map((essay) => (
            <motion.div
              key={essay.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
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
        <Card className="text-center py-12">
          <BookOpen className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            No essays found
          </h3>
          <p className="text-neutral-600 mb-4">
            {searchTerm || selectedClass || statusFilter !== "all"
              ? "Try adjusting your filters to see more results."
              : "Get started by creating your first essay."}
          </p>
          <Button variant="primary" onClick={() => setShowNewEssayModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Essay
          </Button>
        </Card>
      )}

      {/* Analysis Modal */}
      {selectedEssay && (
        <EssayAnalysisModal
          isOpen={showAnalysisModal}
          onClose={() => {
            setShowAnalysisModal(false);
            setSelectedEssay(null);
          }}
          essay={selectedEssay}
        />
      )}

      {/* New Essay Modal */}
      <Modal
        isOpen={showNewEssayModal}
        onClose={() => setShowNewEssayModal(false)}
        title="Create New Essay"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Essay Title"
            value={newEssay.title}
            onChange={(value) =>
              setNewEssay((prev) => ({ ...prev, title: value }))
            }
            placeholder="Enter essay title..."
            required
          />

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Class
            </label>
            <select
              value={newEssay.class_id}
              onChange={(e) =>
                setNewEssay((prev) => ({
                  ...prev,
                  class_id: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value={0}>Select a class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Student
          </label>
          <select
              value={newEssay.student_id}
              onChange={(e) =>
                setNewEssay((prev) => ({
                  ...prev,
                  student_id: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value={0}>Select a student</option>
              {students
                .filter((s) => s.class_id === newEssay.class_id)
                .map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}
              </option>
            ))}
          </select>
        </div>

          <Input
            label="Essay Content"
            value={newEssay.content}
            onChange={(value) =>
              setNewEssay((prev) => ({ ...prev, content: value }))
            }
            placeholder="Enter essay content..."
            type="textarea"
            rows={8}
            required
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setShowNewEssayModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateEssay}
              disabled={
                !newEssay.title ||
                !newEssay.content ||
                !newEssay.class_id ||
                !newEssay.student_id
              }
            >
              Create Essay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EssayManagement;
