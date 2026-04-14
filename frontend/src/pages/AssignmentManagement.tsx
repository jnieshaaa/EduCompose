import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  BookOpen,
  Calendar,
  Clock,
  Users,
  Edit,
  Eye,
  Download,
  AlertCircle,
  CheckCircle,
  Target,
  FileText,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import ProgressBar from "../components/ui/ProgressBar";
import type { Class, Student, Essay } from "../types/Essay";
import { classApi, studentApi, essayApi, essayActivityApi } from "../api";

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
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [filterClass, setFilterClass] = useState<string | number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
        
        // Map activities to Assignment interface
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
          rubric_criteria: [], // Potentially fetch from linked rubrics later
          submissions: fetchedEssays.filter((e: Essay) => e.class_id === a.block_id),
          created_by: a.created_by
        }));

        setAssignments(mappedAssignments);

        // Fetch students for metrics
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
        id: assignments.length + 1,
        ...newAssignment,
        due_date: new Date(newAssignment.due_date).toISOString(),
        created_at: new Date().toISOString(),
        status: "draft",
        rubric_criteria: [
          {
            id: 1,
            name: "Content",
            description: "Quality of content and ideas",
            max_points: 40,
            weight: 40,
          },
          {
            id: 2,
            name: "Organization",
            description: "Structure and flow",
            max_points: 30,
            weight: 30,
          },
          {
            id: 3,
            name: "Grammar",
            description: "Grammar and mechanics",
            max_points: 30,
            weight: 30,
          },
        ],
        submissions: [],
        created_by: 1,
      };

      setAssignments((prev) => [createdAssignment, ...prev]);
      setShowCreateModal(false);
      setNewAssignment({
        title: "",
        description: "",
        instructions: "",
        class_id: 0,
        due_date: "",
        max_score: 100,
        word_limit: 0,
        time_limit: 0,
      });
    } catch (error) {
      console.error("Error creating assignment:", error);
    }
  };

  const handlePublishAssignment = (assignmentId: string | number) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId ? { ...a, status: "published" as const } : a
      )
    );
  };

  const handleCloseAssignment = (assignmentId: string | number) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId ? { ...a, status: "closed" as const } : a
      )
    );
  };

  const getStatusColor = (status: Assignment["status"]) => {
    switch (status) {
      case "published":
        return "success";
      case "draft":
        return "warning";
      case "closed":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const getStatusIcon = (status: Assignment["status"]) => {
    switch (status) {
      case "published":
        return <CheckCircle className="w-4 h-4" />;
      case "draft":
        return <Edit className="w-4 h-4" />;
      case "closed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
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
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-neutral-200 rounded-lg"></div>
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
            Assignment Management
          </h1>
          <p className="text-neutral-600 mt-1">
            Create and manage essay assignments for your classes
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
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Assignment
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
              <p className="text-sm text-neutral-600">Total Assignments</p>
              <p className="text-2xl font-bold text-neutral-900">
                {assignments.length}
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
              <p className="text-sm text-neutral-600">Published</p>
              <p className="text-2xl font-bold text-neutral-900">
                {assignments.filter((a) => a.status === "published").length}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Edit className="w-6 h-6 text-warning-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Drafts</p>
              <p className="text-2xl font-bold text-neutral-900">
                {assignments.filter((a) => a.status === "draft").length}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-info-100 rounded-lg">
              <Users className="w-6 h-6 text-info-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Submissions</p>
              <p className="text-2xl font-bold text-neutral-900">
                {assignments.reduce((sum, a) => sum + a.submissions.length, 0)}
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
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={setSearchTerm}
              type="text"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={filterClass || ""}
              onChange={(e) =>
                setFilterClass(e.target.value ? Number(e.target.value) : null)
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredAssignments.map((assignment) => {
            const stats = getSubmissionStats(assignment);
            const classInfo = classes.find((c) => c.id === assignment.class_id);

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card hover className="h-full">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                          {assignment.title}
                        </h3>
                        <p className="text-sm text-neutral-600 line-clamp-2">
                          {assignment.description}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {classInfo?.name}
                        </p>
                      </div>
                      <Badge
                        variant={getStatusColor(assignment.status)}
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        {getStatusIcon(assignment.status)}
                        <span className="capitalize">{assignment.status}</span>
                      </Badge>
                    </div>

                    {/* Assignment Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-600">
                          Due:{" "}
                          {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-600">
                          Max Score: {assignment.max_score}
                        </span>
                      </div>
                      {(assignment.word_limit || 0) > 0 && (
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-neutral-500" />
                          <span className="text-neutral-600">
                            Word Limit: {assignment.word_limit}
                          </span>
                        </div>
                      )}
                      {(assignment.time_limit || 0) > 0 && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-neutral-500" />
                          <span className="text-neutral-600">
                            Time Limit: {assignment.time_limit} min
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Submission Stats */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Submissions</span>
                        <span className="font-medium">
                          {stats.submissions}/{stats.totalStudents}
                        </span>
                      </div>
                      <ProgressBar
                        value={stats.submissionRate}
                        color={
                          stats.submissionRate >= 80
                            ? "success"
                            : stats.submissionRate >= 50
                            ? "warning"
                            : "error"
                        }
                        size="sm"
                      />
                    </div>

                    {/* Rubric Preview */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-neutral-700">
                        Rubric Criteria:
                      </p>
                      <div className="space-y-1">
                        {assignment.rubric_criteria
                          .slice(0, 3)
                          .map((criteria) => (
                            <div
                              key={criteria.id}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-neutral-600 truncate">
                                {criteria.name}
                              </span>
                              <span className="text-neutral-900 font-medium">
                                {criteria.max_points}pts
                              </span>
                            </div>
                          ))}
                        {assignment.rubric_criteria.length > 3 && (
                          <p className="text-xs text-neutral-500">
                            +{assignment.rubric_criteria.length - 3} more
                            criteria
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2 border-t border-neutral-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowEditModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {assignment.status === "draft" && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePublishAssignment(assignment.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Publish
                        </Button>
                      )}
                      {assignment.status === "published" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCloseAssignment(assignment.id)}
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Close
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
        <Card className="text-center py-12">
          <BookOpen className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            No assignments found
          </h3>
          <p className="text-neutral-600 mb-4">
            {searchTerm || filterClass || filterStatus !== "all"
              ? "Try adjusting your filters to see more results."
              : "Create your first assignment to get started."}
          </p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </Button>
        </Card>
      )}

      {/* Create Assignment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Assignment"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Assignment Title"
            value={newAssignment.title}
            onChange={(value) =>
              setNewAssignment((prev) => ({ ...prev, title: value }))
            }
            placeholder="Enter assignment title..."
            required
          />

          <Input
            label="Description"
            value={newAssignment.description}
            onChange={(value) =>
              setNewAssignment((prev) => ({ ...prev, description: value }))
            }
            placeholder="Brief description of the assignment..."
            type="textarea"
            rows={2}
          />

          <Input
            label="Instructions"
            value={newAssignment.instructions}
            onChange={(value) =>
              setNewAssignment((prev) => ({ ...prev, instructions: value }))
            }
            placeholder="Detailed instructions for students..."
            type="textarea"
            rows={4}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Class
              </label>
              <select
                value={newAssignment.class_id}
                onChange={(e) =>
                  setNewAssignment((prev) => ({
                    ...prev,
                    class_id: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Due Date
              </label>
              <input
                type="datetime-local"
                value={newAssignment.due_date}
                onChange={(e) =>
                  setNewAssignment((prev) => ({
                    ...prev,
                    due_date: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Max Score"
              value={newAssignment.max_score}
              onChange={(value) =>
                setNewAssignment((prev) => ({
                  ...prev,
                  max_score: Number(value),
                }))
              }
              type="number"
              placeholder="100"
            />

            <Input
              label="Word Limit (optional)"
              value={newAssignment.word_limit}
              onChange={(value) =>
                setNewAssignment((prev) => ({
                  ...prev,
                  word_limit: Number(value),
                }))
              }
              type="number"
              placeholder="0"
            />

            <Input
              label="Time Limit (minutes, optional)"
              value={newAssignment.time_limit}
              onChange={(value) =>
                setNewAssignment((prev) => ({
                  ...prev,
                  time_limit: Number(value),
                }))
              }
              type="number"
              placeholder="0"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateAssignment}
              disabled={
                !newAssignment.title ||
                !newAssignment.instructions ||
                !newAssignment.class_id ||
                !newAssignment.due_date
              }
            >
              Create Assignment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assignment Detail Modal */}
      {selectedAssignment && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAssignment(null);
          }}
          title={selectedAssignment.title}
          size="xl"
        >
          <div className="space-y-6">
            {/* Assignment Info */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Assignment Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-600">Class:</span>
                  <span className="ml-2 font-medium">
                    {
                      classes.find((c) => c.id === selectedAssignment.class_id)
                        ?.name
                    }
                  </span>
                </div>
                <div>
                  <span className="text-neutral-600">Due Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date(selectedAssignment.due_date).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-600">Max Score:</span>
                  <span className="ml-2 font-medium">
                    {selectedAssignment.max_score}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-600">Status:</span>
                  <Badge
                    variant={getStatusColor(selectedAssignment.status)}
                    size="sm"
                    className="ml-2"
                  >
                    {selectedAssignment.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Instructions
              </h3>
              <p className="text-neutral-700 whitespace-pre-wrap">
                {selectedAssignment.instructions}
              </p>
            </div>

            {/* Rubric */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Rubric Criteria
              </h3>
              <div className="space-y-3">
                {selectedAssignment.rubric_criteria.map((criteria) => (
                  <div
                    key={criteria.id}
                    className="p-3 border border-neutral-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-neutral-900">
                        {criteria.name}
                      </h4>
                      <span className="text-sm font-semibold text-primary">
                        {criteria.max_points} points ({criteria.weight}%)
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600">
                      {criteria.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Submissions */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Submissions ({selectedAssignment.submissions.length})
              </h3>
              <div className="space-y-2">
                {selectedAssignment.submissions.length > 0 ? (
                  selectedAssignment.submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-neutral-900">
                          {submission.title}
                        </p>
                        <p className="text-sm text-neutral-600">
                          Student ID: {submission.student_id} • Submitted:{" "}
                          {new Date(
                            submission.submitted_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            submission.status === "analyzed"
                              ? "success"
                              : submission.status === "submitted"
                              ? "warning"
                              : "info"
                          }
                          size="sm"
                        >
                          {submission.status}
                        </Badge>
                        {submission.overall_score && (
                          <span className="font-semibold text-neutral-900">
                            {Math.round(submission.overall_score)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-500 text-center py-8">
                    No submissions yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AssignmentManagement;
