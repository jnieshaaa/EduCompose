import { ArrowLeft, FileText, Edit, MoreVertical } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { CheckCircle2, XCircle } from "lucide-react";
import type { EssayActivity, Student } from "../../types/activityTypes";

interface StudentsViewProps {
  activity: EssayActivity;
  students: Student[];
  programName: string;
  programSection: string;
  onBack: () => void;
}

export function StudentsView({
  activity,
  students,
  programName,
  programSection,
  onBack,
}: StudentsViewProps) {
  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sections
        </Button>
      </div>

      {/* Activity Header */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          {activity.title}
        </h1>
        <p className="text-neutral-600 mb-2">
          {programName} - {programSection}
        </p>
        {activity.description && (
          <p className="text-sm text-neutral-500">{activity.description}</p>
        )}
      </Card>

      {/* Students Table */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-neutral-900">Students</h2>
          <p className="text-sm text-neutral-500">
            {students.length} students in this section
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Coherence</TableHead>
              <TableHead className="text-center">Readability</TableHead>
              <TableHead className="text-center">Argumentative</TableHead>
              <TableHead className="text-center">Grammar</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell className="text-center">
                  {student.status === "submitted" ? (
                    <Badge className="bg-success-default/10 text-success-default border-success-default/20">
                      <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                      Submitted
                    </Badge>
                  ) : (
                    <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200">
                      <XCircle className="w-3 h-3 mr-1 inline" />
                      Not Submitted
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {student.coherence !== undefined ? (
                    <span className="font-medium">{student.coherence}%</span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {student.readability !== undefined ? (
                    <span className="font-medium">{student.readability}%</span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {student.argumentative !== undefined ? (
                    <span className="font-medium">
                      {student.argumentative}%
                    </span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {student.grammar !== undefined ? (
                    <span className="font-medium">{student.grammar}%</span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {student.score !== undefined ? (
                    <Badge
                      className={
                        student.score >= 90
                          ? "bg-success-default text-white"
                          : student.score >= 80
                          ? "bg-info-default text-white"
                          : "bg-warning-default text-white"
                      }
                    >
                      {student.score}%
                    </Badge>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <FileText className="w-4 h-4 mr-2" />
                        View Essay
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Grade Essay
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

