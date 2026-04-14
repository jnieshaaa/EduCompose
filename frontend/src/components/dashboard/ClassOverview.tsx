import React from "react";
import { motion } from "framer-motion";
import { Users, BookOpen, TrendingUp, Calendar } from "lucide-react";
import Card from "../ui/Card";
import ProgressBar from "../ui/ProgressBar";

interface ClassStats {
  id: string | number;
  name: string;
  essay_count: number;
  student_count: number;
}

interface ClassOverviewProps {
  classes: ClassStats[];
  onClassClick?: (classId: string | number) => void;
}

const ClassOverview: React.FC<ClassOverviewProps> = ({
  classes,
  onClassClick,
}) => {
  const totalStudents = classes.reduce(
    (sum, cls) => sum + cls.student_count,
    0
  );
  const totalEssays = classes.reduce((sum, cls) => sum + cls.essay_count, 0);
  const avgEssaysPerStudent =
    totalStudents > 0 ? (totalEssays / totalStudents).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-rs">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Classes</p>
              <p className="text-2xl font-bold text-neutral-900">
                {classes.length}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success-100 rounded-rs">
              <BookOpen className="w-6 h-6 text-success-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Total Students</p>
              <p className="text-2xl font-bold text-neutral-900">
                {totalStudents}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-info-100 rounded-rs">
              <TrendingUp className="w-6 h-6 text-info-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Avg Essays/Student</p>
              <p className="text-2xl font-bold text-neutral-900">
                {avgEssaysPerStudent}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Class List */}
      <Card>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          Class Overview
        </h3>
        <div className="space-y-4">
          {classes.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">No classes created yet</p>
            </div>
          ) : (
            classes.map((classItem, index) => (
              <motion.div
                key={classItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border border-neutral-200 rounded-rd hover:border-primary-200 hover:shadow-sm transition-all duration-200 cursor-pointer"
                onClick={() => onClassClick?.(classItem.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-medium text-neutral-900">
                    {classItem.name}
                  </h4>
                  <div className="flex items-center space-x-2 text-sm text-neutral-500">
                    <Calendar className="w-4 h-4" />
                    <span>Created recently</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm text-neutral-600">
                      {classItem.student_count} students
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-success-default" />
                    <span className="text-sm text-neutral-600">
                      {classItem.essay_count} essays
                    </span>
                  </div>
                </div>

                {classItem.student_count > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-neutral-500 mb-1">
                      <span>Essay completion rate</span>
                      <span>
                        {Math.round(
                          (classItem.essay_count / classItem.student_count) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    <ProgressBar
                      value={
                        (classItem.essay_count / classItem.student_count) * 100
                      }
                      color="primary"
                      size="sm"
                    />
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default ClassOverview;
