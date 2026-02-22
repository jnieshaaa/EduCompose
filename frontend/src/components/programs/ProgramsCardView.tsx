import { motion, AnimatePresence } from "framer-motion";
import Card from "../ui/Card";
import Button from "../ui/Button";
import {
  MoreVertical,
  Edit,
  Archive,
  ArrowRight,
  Trash2,
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
  // Added these prop functions so the buttons actually do something
  onEditProgram?: (program: Program) => void;
  onArchiveProgram?: (program: Program) => void;
  onDeleteProgram?: (program: Program) => void;
}

export function ProgramsCardView({
  programs,
  onProgramClick,
  onEditProgram,
  onArchiveProgram,
  onDeleteProgram,
}: ProgramsCardViewProps) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
      <AnimatePresence mode='popLayout'>
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
              className='group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1'
              onClick={() => onProgramClick(program.name)}
            >
              <div className='p-5'>
                {/* Header with title and menu */}
                <div className='flex items-start justify-between mb-3'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      <h3 className='text-lg font-bold text-neutral-900 truncate group-hover:text-primary transition-colors'>
                        {program.name}
                      </h3>
                    </div>
                  </div>

                  {/* Actions dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant='ghost'
                        size='sm'
                        className='opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1'
                      >
                        <MoreVertical className='w-4 h-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          // Trigger Edit
                          if (onEditProgram) onEditProgram(program);
                        }}
                      >
                        <Edit className='w-4 h-4 mr-2' />
                        Edit Program
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          // Trigger Archive
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
                          // Trigger Delete
                          if (onDeleteProgram) onDeleteProgram(program);
                        }}
                      >
                        <Trash2 className='w-4 h-4 mr-2' />
                        Delete Program
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Counts and Stats */}
                <div className='flex items-center gap-4 mt-1'>
                  <div className='flex items-center gap-1.5 text-sm text-neutral-600 bg-neutral-100 px-2 py-1 rounded-md'>
                    <div className='w-1.5 h-1.5 rounded-full bg-blue-500' />
                    <span className='font-medium'>{program.sectionCount ?? 0}</span>
                    <span className='text-neutral-500'>Sections</span>
                  </div>
                  <div className='flex items-center gap-1.5 text-sm text-neutral-600 bg-neutral-100 px-2 py-1 rounded-md'>
                    <div className='w-1.5 h-1.5 rounded-full bg-green-500' />
                    <span className='font-medium'>{program.studentCount ?? 0}</span>
                    <span className='text-neutral-500'>Students</span>
                  </div>
                </div>

                {/* Drill-down hint */}
                <div className='flex items-center justify-end gap-1 mt-4 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity'>
                  <span>View sections</span>
                  <ArrowRight className='w-4 h-4' />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
