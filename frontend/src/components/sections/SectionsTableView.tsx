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
import { MoreVertical, Edit, Trash2, Users } from "lucide-react";
import type { Section } from "../../types/sections";

interface SectionsTableViewProps {
  sections: Section[];
  isDrillDown: boolean;
  onSectionClick: (sectionName: string, programName: string) => void;
  onEditSection: (section: Section) => void;
  onDeleteSection: (section: Section) => void;
}

export function SectionsTableView({
  sections,
  isDrillDown,
  onSectionClick,
  onEditSection,
  onDeleteSection,
}: SectionsTableViewProps) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Section Name</TableHead>
            {!isDrillDown && <TableHead>Program</TableHead>}
            <TableHead>Academic Term</TableHead>
            <TableHead className="text-center">Students</TableHead>
            <TableHead className="text-center">Essays</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map((section) => (
            <TableRow
              key={section.id}
              className="cursor-pointer hover:bg-primary/5 transition-colors group"
              onClick={() => onSectionClick(section.name, section.program)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="text-neutral-900 group-hover:text-primary transition-colors font-medium">
                    {section.name}
                  </div>
                  <Users className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </TableCell>
              {!isDrillDown && (
                <TableCell>
                  <div className="text-sm text-neutral-600">
                    {section.program}
                  </div>
                </TableCell>
              )}
              <TableCell>
                <Badge
                  variant="outline"
                  className="bg-info-default/10 text-info-default border-info-default/20"
                >
                  {section.term}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant="outline"
                  className="bg-secondary/10 text-secondary border-secondary/20"
                >
                  {section.students}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {section.essays}
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
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSection(section);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Block
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-error-default"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSection(section);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Block
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

