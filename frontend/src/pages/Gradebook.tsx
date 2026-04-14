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
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
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
  const [gradebookEntries, setGradebookEntries] = useState<GradebookEntry[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string | number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "score" | "submissions">(
    "name"
  );
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
        
        // Fetch students for all classes or selected class
        // For gradebook, we usually want all students of the teacher
        const studentPromises = fetchedClasses.map(cls => studentApi.getStudentsByClass(cls.id));
        const studentsArrays = await Promise.all(studentPromises);
        const allStudents = studentsArrays.flat();
        
        // Remove duplicates if any
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

  // If navigated from StudentsTab with a studentId in the URL, open that student's essay history
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
      entry.student.full_name
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
        return a.student.full_name.localeCompare(b.student.full_name);
    }
  });

  const getPerformanceColor = (performance: GradebookEntry["performance"]) => {
    switch (performance) {
      case "excellent":
        return "success";
      case "good":
        return "info";
      case "average":
        return "warning";
      default:
        return "error";
    }
  };

  const getPerformanceIcon = (performance: GradebookEntry["performance"]) => {
    switch (performance) {
      case "excellent":
        return <Award className="w-4 h-4" />;
      case "good":
        return <CheckCircle className="w-4 h-4" />;
      case "average":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
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
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-neutral-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-neutral-900">Gradebook</h1>
          <p className="text-neutral-600 mt-1">
            Track student performance and grades
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="primary" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Class Filter & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Students</p>
              <p className="text-2xl font-bold text-neutral-900">
                {classStats.totalStudents}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-success-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Average Score</p>
              <p className="text-2xl font-bold text-neutral-900">
                {classStats.averageScore}%
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-info-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-info-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Essays</p>
              <p className="text-2xl font-bold text-neutral-900">
                {classStats.totalEssays}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-warning-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-warning-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Completed</p>
              <p className="text-2xl font-bold text-neutral-900">
                {classStats.completedEssays}
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
              placeholder="Search students..."
              value={searchTerm}
              onChange={setSearchTerm}
              type="text"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={selectedClass || ""}
              onChange={(e) =>
                setSelectedClass(e.target.value || null)
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
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="name">Sort by Name</option>
              <option value="score">Sort by Score</option>
              <option value="submissions">Sort by Submissions</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Gradebook Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                  Student
                </th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                  Performance
                </th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                  Average Score
                </th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                  Essays
                </th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                  Last Submission
                </th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, index) => (
                <motion.tr
                  key={entry.student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-neutral-100 hover:bg-neutral-50"
                >
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-neutral-900">
                        {entry.student.full_name}
                      </p>
                      <p className="text-sm text-neutral-500">
                        ID: {entry.student.student_id}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      variant={getPerformanceColor(entry.performance)}
                      size="sm"
                      className="flex items-center space-x-1 w-fit"
                    >
                      {getPerformanceIcon(entry.performance)}
                      <span className="capitalize">
                        {entry.performance.replace("-", " ")}
                      </span>
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-neutral-900">
                        {entry.averageScore}%
                      </span>
                      <ProgressBar
                        value={entry.averageScore}
                        color={getPerformanceColor(entry.performance)}
                        size="sm"
                        className="w-16"
                      />
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      <span className="text-neutral-900">
                        {entry.completedEssays}/{entry.totalEssays}
                      </span>
                      <span className="text-neutral-500 ml-1">completed</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-neutral-600">
                      {entry.lastSubmission
                        ? new Date(entry.lastSubmission).toLocaleDateString()
                        : "No submissions"}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(entry.student);
                          setShowStudentModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedEntries.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              No students found
            </h3>
            <p className="text-neutral-600">
              {searchTerm || selectedClass
                ? "Try adjusting your filters to see more results."
                : "No students have been added to any classes yet."}
            </p>
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
          title={`${selectedStudent.full_name} - Performance Details`}
          size="xl"
        >
          <div className="space-y-6">
            {/* Student Info */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Student Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-600">Student ID:</span>
                  <span className="ml-2 font-medium">
                    {selectedStudent.student_id}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-600">Email:</span>
                  <span className="ml-2 font-medium">
                    {selectedStudent.email || "Not provided"}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            {(() => {
              const studentEntry = gradebookEntries.find(
                (e) => e.student.id === selectedStudent.id
              );
              if (!studentEntry) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-1">
                        {studentEntry.averageScore}%
                      </div>
                      <div className="text-sm text-neutral-600">
                        Average Score
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-success-default mb-1">
                        {studentEntry.completedEssays}
                      </div>
                      <div className="text-sm text-neutral-600">
                        Completed Essays
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-info-default mb-1">
                        {studentEntry.totalEssays}
                      </div>
                      <div className="text-sm text-neutral-600">
                        Total Essays
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })()}

            {/* Essay History */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Essay History
              </h3>
              <div className="space-y-2">
                {(() => {
                  const studentEssays = essays.filter(
                    (e) => e.student_id === selectedStudent.id
                  );
                  return studentEssays.length > 0 ? (
                    studentEssays.map((essay) => (
                      <div
                        key={essay.id}
                        className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-neutral-900">
                            {essay.title}
                          </p>
                          <p className="text-sm text-neutral-600">
                            Submitted:{" "}
                            {new Date(essay.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              essay.status === "analyzed"
                                ? "success"
                                : essay.status === "submitted"
                                ? "warning"
                                : "info"
                            }
                            size="sm"
                          >
                            {essay.status}
                          </Badge>
                          {essay.overall_score && (
                            <span className="font-semibold text-neutral-900">
                              {Math.round(essay.overall_score)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-neutral-500 text-center py-8">
                      No essays submitted yet
                    </p>
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
