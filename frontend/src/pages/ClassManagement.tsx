import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Users,
  BookOpen,
  Settings,
  Eye,
  Edit,
  Trash2,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import type { Class, Student, Essay } from "../types/Essay";
import { dummyData } from "../api";

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [newClass, setNewClass] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        setTimeout(() => {
          setClasses(dummyData.classes);
          setStudents(dummyData.students);
          setEssays(dummyData.essays);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateClass = async () => {
    try {
      const createdClass: Class = {
        id: classes.length + 1,
        name: newClass.name,
        description: newClass.description,
        teacher_id: 1,
        created_at: new Date().toISOString(),
        is_active: true,
      };

      setClasses((prev) => [...prev, createdClass]);
      setShowCreateModal(false);
      setNewClass({ name: "", description: "" });
    } catch (error) {
      console.error("Error creating class:", error);
    }
  };

  const getClassStats = (classId: number) => {
    const classStudents = students.filter((s) => s.class_id === classId);
    const classEssays = essays.filter((e) => e.class_id === classId);
    const analyzedEssays = classEssays.filter((e) => e.status === "analyzed");

    return {
      studentCount: classStudents.length,
      essayCount: classEssays.length,
      analyzedCount: analyzedEssays.length,
      avgScore:
        analyzedEssays.length > 0
          ? Math.round(
              analyzedEssays.reduce(
                (sum, e) => sum + (e.overall_score || 0),
                0
              ) / analyzedEssays.length
            )
          : 0,
    };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            Class Management
          </h1>
          <p className="text-neutral-600 mt-1">
            Manage your classes and students
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="secondary" size="sm">
            <Users className="w-4 h-4 mr-2" />
            Add Student
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Class
          </Button>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {classes.map((classItem) => {
            const stats = getClassStats(classItem.id);

            return (
              <motion.div
                key={classItem.id}
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
                          {classItem.name}
                        </h3>
                        <p className="text-sm text-neutral-600 line-clamp-2">
                          {classItem.description}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="text-sm text-neutral-600">
                            Students
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-neutral-900">
                          {stats.studentCount}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          <BookOpen className="w-4 h-4 text-success-default" />
                          <span className="text-sm text-neutral-600">
                            Essays
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-neutral-900">
                          {stats.essayCount}
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    {stats.essayCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">
                            Analysis Progress
                          </span>
                          <span className="font-medium">
                            {stats.analyzedCount}/{stats.essayCount}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                (stats.analyzedCount / stats.essayCount) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Average Score */}
                    {stats.avgScore > 0 && (
                      <div className="flex items-center justify-center space-x-2 p-2 bg-primary-50 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="text-sm text-neutral-600">
                          Avg Score:
                        </span>
                        <span className="font-semibold text-primary">
                          {stats.avgScore}/100
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2 border-t border-neutral-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedClass(classItem);
                          setShowStudentsModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Students
                      </Button>
                      <Button variant="primary" size="sm" className="flex-1">
                        <BookOpen className="w-4 h-4 mr-1" />
                        View Essays
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {classes.length === 0 && (
        <Card className="text-center py-12">
          <GraduationCap className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            No classes yet
          </h3>
          <p className="text-neutral-600 mb-4">
            Create your first class to get started with managing students and
            essays.
          </p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Class
          </Button>
        </Card>
      )}

      {/* Create Class Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Class"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Class Name"
            value={newClass.name}
            onChange={(value) =>
              setNewClass((prev) => ({ ...prev, name: value }))
            }
            placeholder="Enter class name..."
            required
          />

          <Input
            label="Description"
            value={newClass.description}
            onChange={(value) =>
              setNewClass((prev) => ({ ...prev, description: value }))
            }
            placeholder="Enter class description..."
            type="textarea"
            rows={3}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateClass}
              disabled={!newClass.name}
            >
              Create Class
            </Button>
          </div>
        </div>
      </Modal>

      {/* Students Modal */}
      <Modal
        isOpen={showStudentsModal}
        onClose={() => setShowStudentsModal(false)}
        title={`Students in ${selectedClass?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          {selectedClass && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-neutral-600">
                  {
                    students.filter((s) => s.class_id === selectedClass.id)
                      .length
                  }{" "}
                  students
                </p>
                <Button variant="primary" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {students
                  .filter((s) => s.class_id === selectedClass.id)
                  .map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-neutral-900">
                          {student.full_name}
                        </p>
                        <p className="text-sm text-neutral-600">
                          ID: {student.student_id}
                        </p>
                        {student.email && (
                          <p className="text-sm text-neutral-500">
                            {student.email}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ClassManagement;
