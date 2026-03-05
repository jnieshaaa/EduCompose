
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MoreVertical, Eye, Edit, Trash2 } from "lucide-react";
import type { Student } from "../../data/studentsData";

interface StudentsTableViewProps {
  students: Student[];
  urlProgramFilter: string | null;
  urlSectionFilter: string | null;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  onViewEssayHistory?: (student: Student) => void;
}

export function StudentsTableView({
  students,
  urlProgramFilter,
  urlSectionFilter,
  onEditStudent,
  onDeleteStudent,
  onViewEssayHistory,
}: StudentsTableViewProps) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student ID</TableHead>
            <TableHead>Name</TableHead>
            {!urlProgramFilter && <TableHead>Program</TableHead>}
            {!urlSectionFilter && <TableHead>Section</TableHead>}
            <TableHead>Email</TableHead>
            <TableHead className='text-center'>Submitted</TableHead>
            <TableHead className='text-center'>Pending</TableHead>
            <TableHead className='text-center'>Missing</TableHead>
            <TableHead className='text-center'>Avg Score</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell>
                <div className='text-sm text-neutral-600'>{student.id}</div>
              </TableCell>
              <TableCell>
                <div className='text-neutral-900'>{student.name}</div>
              </TableCell>
              {!urlProgramFilter && (
                <TableCell>
                  <div className='text-sm text-neutral-600'>
                    {student.program}
                  </div>
                </TableCell>
              )}
              {!urlSectionFilter && (
                <TableCell>
                  <Badge
                    variant='outline'
                    className='bg-secondary/10 text-secondary border-secondary/20'
                  >
                    {student.section}
                  </Badge>
                </TableCell>
              )}
              <TableCell>
                <div className='text-sm text-neutral-600'>{student.email}</div>
              </TableCell>
              <TableCell className='text-center'>
                <Badge
                  variant='outline'
                  className='bg-success-default/10 text-success-default border-success-default/20'
                >
                  {student.submitted}
                </Badge>
              </TableCell>
              <TableCell className='text-center'>
                <Badge
                  variant='outline'
                  className={
                    student.pending > 2
                      ? "bg-error-default/10 text-error-default border-error-default/20"
                      : "bg-warning-default/10 text-warning-default border-warning-default/20"
                  }
                >
                  {student.pending}
                </Badge>
              </TableCell>
              <TableCell className='text-center'>
                <Badge
                  variant='outline'
                  className={
                    student.missing > 0
                      ? "bg-error-default/10 text-error-default border-error-default/20"
                      : "bg-neutral-300/10 text-neutral-600 border-neutral-300/20"
                  }
                >
                  {student.missing}
                </Badge>
              </TableCell>
              <TableCell className='text-center'>
                <Badge
                  className={
                    student.avgScore >= 85
                      ? "bg-green-600 text-white"
                      : student.avgScore >= 75
                      ? "bg-blue-600 text-white"
                      : "bg-amber-600 text-white"
                  }
                >
                  {student.avgScore}%
                </Badge>
              </TableCell>
              <TableCell className='text-right'>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='sm'>
                      <MoreVertical className='w-4 h-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click event if you add one later
                        if (onViewEssayHistory) onViewEssayHistory(student);
                      }}
                    >
                      <Eye className='w-4 h-4 mr-2' />
                      View Essay History
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click event
                        onEditStudent(student);
                      }}
                    >
                      <Edit className='w-4 h-4 mr-2' />
                      Edit Student
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className='text-error-default'
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click event
                        onDeleteStudent(student);
                      }}
                    >
                      <Trash2 className='w-4 h-4 mr-2' />
                      Remove Student
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
