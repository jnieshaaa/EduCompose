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
import { MoreVertical, Edit, Archive, Layers, FileText, Users } from "lucide-react";
import type { Program } from "../../data/programsData";

interface ProgramsTableViewProps {
  programs: Program[];
  onProgramClick: (programName: string) => void;
}

export function ProgramsTableView({
  programs,
  onProgramClick,
}: ProgramsTableViewProps) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Program Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-center">Sections</TableHead>
            <TableHead className="text-center">Courses</TableHead>
            <TableHead className="text-center">Avg Class Size</TableHead>
            <TableHead className="text-center">Status</TableHead>
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
                <div className="font-medium text-neutral-900">{program.name}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-neutral-500 max-w-xs truncate">
                  {program.description || "No description"}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <Layers className="w-3 h-3 mr-1" />
                  {program.tracks}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-secondary/10 text-secondary border-secondary/20">
                  <FileText className="w-3 h-3 mr-1" />
                  {program.courses}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-success-default/10 text-success-default border-success-default/20">
                  <Users className="w-3 h-3 mr-1" />
                  {program.avgClassSize}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  className={
                    program.status === "Active"
                      ? "bg-success-default text-white"
                      : "bg-neutral-400 text-white"
                  }
                >
                  {program.status}
                </Badge>
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
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Program
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive Program
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

