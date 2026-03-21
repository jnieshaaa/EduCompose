import { motion, AnimatePresence } from "framer-motion";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import {
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Users,
  FileText,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { Section } from "../../types/sections";

interface SectionsCardViewProps {
  sections: Section[];
  isDrillDown: boolean;
  onSectionClick: (sectionName: string, programName: string) => void;
  onEditSection: (section: Section) => void;
  onDeleteSection: (section: Section) => void;
}

export function SectionsCardView({
  sections,
  isDrillDown,
  onSectionClick,
  onEditSection,
  onDeleteSection,
}: SectionsCardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {sections.map((section, index) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            layout
          >
            <Card
              className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1"
              onClick={() => onSectionClick(section.name, section.program)}
            >
              {/* Top color bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-secondary/60" />

              <div className="p-5">
                {/* Header with name and menu */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-neutral-900 truncate group-hover:text-primary transition-colors">
                      {section.name}
                    </h3>
                    {!isDrillDown && (
                      <p className="text-sm text-neutral-500 truncate">
                        {section.program}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
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
                </div>

                {/* Term badge */}
                <div className="mb-4">
                  <Badge className="bg-info-default/10 text-info-default border-info-default/20 text-xs flex items-center gap-1 w-fit">
                    <Calendar className="w-3 h-3" />
                    {section.term}
                  </Badge>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-100">
                  <div className="text-center p-3 bg-secondary/5 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-secondary">
                      <Users className="w-4 h-4" />
                      <span className="text-xl font-bold">{section.students}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Students</p>
                  </div>
                  <div className="text-center p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-primary">
                      <FileText className="w-4 h-4" />
                      <span className="text-xl font-bold">{section.essays}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Essays</p>
                  </div>
                </div>

                {/* Drill-down hint */}
                <div className="flex items-center justify-end gap-1 mt-4 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View students</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

