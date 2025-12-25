import { motion, AnimatePresence } from "framer-motion";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Mail,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { Student } from "../../data/studentsData";

interface StudentsCardViewProps {
  students: Student[];
  urlProgramFilter: string | null;
  urlSectionFilter: string | null;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
}

export function StudentsCardView({
  students,
  urlProgramFilter,
  urlSectionFilter,
  onEditStudent,
  onDeleteStudent,
}: StudentsCardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {students.map((student, index) => {
          const isAtRisk = student.missing > 2 || student.avgScore < 70;
          return (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              layout
            >
              <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
                {/* Status indicator bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isAtRisk
                      ? "bg-gradient-to-r from-error-default to-error-default/60"
                      : student.avgScore >= 85
                      ? "bg-gradient-to-r from-success-default to-success-default/60"
                      : "bg-gradient-to-r from-info-default to-info-default/60"
                  }`}
                />

                <div className="p-5">
                  {/* Header with name and menu */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-neutral-900 truncate">
                          {student.name}
                        </h3>
                        {isAtRisk && (
                          <Badge className="bg-error-default/10 text-error-default border-error-default/20 text-xs flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            At Risk
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500">{student.id}</p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View Essay History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditStudent(student)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Student
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-error-default"
                          onClick={() => onDeleteStudent(student)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Student
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{student.email}</span>
                  </div>

                  {/* Program & Section badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {!urlProgramFilter && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        {student.program}
                      </Badge>
                    )}
                    {!urlSectionFilter && (
                      <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-xs">
                        {student.section}
                      </Badge>
                    )}
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-2 pt-4 border-t border-neutral-100">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-success-default">
                        <FileText className="w-3 h-3" />
                        <span className="text-lg font-bold">
                          {student.submitted}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">Done</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-warning-default">
                        <span className="text-lg font-bold">
                          {student.pending}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">Pending</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-error-default">
                        <span className="text-lg font-bold">
                          {student.missing}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">Missing</p>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-lg font-bold ${
                          student.avgScore >= 85
                            ? "text-success-default"
                            : student.avgScore >= 75
                            ? "text-info-default"
                            : "text-warning-default"
                        }`}
                      >
                        {student.avgScore}%
                      </div>
                      <p className="text-xs text-neutral-500">Avg</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

