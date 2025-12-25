import { motion, AnimatePresence } from "framer-motion";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import {
  MoreVertical,
  Edit,
  Archive,
  Layers,
  FileText,
  Users,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { Program } from "../../data/programsData";

interface ProgramsCardViewProps {
  programs: Program[];
  onProgramClick: (programName: string) => void;
}

export function ProgramsCardView({
  programs,
  onProgramClick,
}: ProgramsCardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {programs.map((program, index) => (
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            layout
          >
            <Card
              className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1"
              onClick={() => onProgramClick(program.name)}
            >
              {/* Status indicator bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  program.status === "Active"
                    ? "bg-gradient-to-r from-success-default to-success-default/60"
                    : "bg-gradient-to-r from-neutral-400 to-neutral-300"
                }`}
              />

              <div className="p-5">
                {/* Header with title and menu */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-neutral-900 truncate group-hover:text-primary transition-colors">
                        {program.name}
                      </h3>
                      <Badge
                        className={
                          program.status === "Active"
                            ? "bg-success-default/10 text-success-default border-success-default/20 text-xs"
                            : "bg-neutral-300/50 text-neutral-600 border-neutral-300/30 text-xs"
                        }
                      >
                        {program.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-500 line-clamp-2">
                      {program.description || "No description available"}
                    </p>
                  </div>

                  {/* Actions dropdown */}
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
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-primary">
                      <Layers className="w-4 h-4" />
                      <span className="text-xl font-bold">{program.tracks}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Sections</p>
                  </div>
                  <div className="text-center p-3 bg-secondary/5 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-secondary">
                      <FileText className="w-4 h-4" />
                      <span className="text-xl font-bold">{program.courses}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Courses</p>
                  </div>
                  <div className="text-center p-3 bg-success-default/5 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-success-default">
                      <Users className="w-4 h-4" />
                      <span className="text-xl font-bold">
                        {program.avgClassSize}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Avg Size</p>
                  </div>
                </div>

                {/* Drill-down hint */}
                <div className="flex items-center justify-end gap-1 mt-4 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View sections</span>
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

