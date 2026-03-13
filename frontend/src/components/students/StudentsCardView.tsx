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
  User,
  GraduationCap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { Student } from "../../types/academic";

interface StudentsCardViewProps {
  students: Student[];
  urlSectionFilter: string | null;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onViewEssayHistory?: (student: Student) => void;
}

export function StudentsCardView({
  students,
  urlSectionFilter,
  onEditStudent,
  onDeleteStudent,
  onViewEssayHistory,
}: StudentsCardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {students.map((student, index) => {
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
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60" />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-neutral-900 truncate">
                          {student.last_name}, {student.first_name}
                        </h3>
                      </div>
                      <p className="text-sm text-neutral-500 font-mono">{student.student_code}</p>
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
                        <DropdownMenuItem
                          onClick={() =>
                            onViewEssayHistory && onViewEssayHistory(student)
                          }
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Essay History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditStudent(student)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Student
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-error-default"
                          onClick={() => onDeleteStudent(student.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Student
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{student.email || "No email"}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs flex items-center gap-1">
                      <GraduationCap size={12} />
                      Year {student.year}
                    </Badge>
                    {!urlSectionFilter && (
                      <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-xs">
                        {student.block_name}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-100 text-xs text-neutral-400 font-medium">
                    <div className="flex items-center gap-1">
                       <User size={12} />
                       UID: {student.id.split('-')[0]}...
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
