import Card from "../ui/Card";
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
import { MoreVertical, Edit, Archive, Trash2 } from "lucide-react";
import type { Program } from "../../types/programs";
interface ProgramsTableViewProps {
  programs: Program[];
  onProgramClick: (programName: string) => void;
  onEditProgram?: (program: Program) => void;
  onArchiveProgram?: (program: Program) => void;
  onDeleteProgram?: (program: Program) => void;
}

export function ProgramsTableView({
  programs,
  onProgramClick,
  onEditProgram,
  onArchiveProgram,
  onDeleteProgram,
}: ProgramsTableViewProps) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Program Name</TableHead>
            <TableHead className="text-center">Block/Section</TableHead>
            <TableHead className="text-center">Students</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.map((program) => (
            <TableRow
              key={program.id}
              className="cursor-pointer hover:bg-neutral-50"
              onClick={() => onProgramClick(program.name)}
            >
              <TableCell>
                <div className="font-medium text-neutral-900">
                  {program.name}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {program.sectionCount ?? 0}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {program.studentCount ?? 0}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEditProgram) onEditProgram(program);
                      }}
                    >
                      <Edit className='w-4 h-4 mr-2' />
                      Edit Program
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onArchiveProgram) onArchiveProgram(program);
                      }}
                    >
                      <Archive className='w-4 h-4 mr-2' />
                      Archive Program
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className='text-error-default focus:text-error-default focus:bg-error-default/10'
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteProgram) onDeleteProgram(program);
                      }}
                    >
                      <Trash2 className='w-4 h-4 mr-2' />
                      Delete Program
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
