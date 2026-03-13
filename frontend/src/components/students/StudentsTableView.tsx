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
import type { Student } from "../../types/academic";

interface StudentsTableViewProps {
  students: Student[];
  urlSectionFilter: string | null;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void; 
  onViewEssayHistory?: (student: Student) => void;
}

export function StudentsTableView({
  students,
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
            {!urlSectionFilter && <TableHead>Block</TableHead>}
            <TableHead>Email</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell>
                <div className='text-sm text-neutral-600'>{student.student_code}</div>
              </TableCell>
              <TableCell>
                <div className='text-neutral-900 font-medium'>
                  {student.last_name}, {student.first_name} {student.middle_name || ""}
                </div>
              </TableCell>
              {!urlSectionFilter && (
                <TableCell>
                  <Badge
                    variant='outline'
                    className='bg-secondary/10 text-secondary border-secondary/20 font-bold'
                  >
                    {student.block_name}
                  </Badge>
                </TableCell>
              )}
              <TableCell>
                <div className='text-sm text-neutral-600'>{student.email}</div>
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
                        e.stopPropagation();
                        if (onViewEssayHistory) onViewEssayHistory(student);
                      }}
                    >
                      <Eye className='w-4 h-4 mr-2' />
                      View Essay History
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditStudent(student);
                      }}
                    >
                      <Edit className='w-4 h-4 mr-2' />
                      Edit Student
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className='text-error-default'
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteStudent(student.id);
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
