import { useState, useEffect } from "react";
import { ArrowLeft, Calendar } from "lucide-react";
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
import type { EssayActivity, ProgramSection } from "../../types/activityTypes";
import { getProgramLabel, getBlockLabel } from "../../data/activityData";
import { fetchProgramSectionCounts } from "../../services/activityService";

interface ProgramSectionsViewProps {
  activity: EssayActivity;
  programSections: ProgramSection[];
  onBack: () => void;
  onSectionClick: (section: ProgramSection) => void;
  programs: { id: string; name: string }[];
  sections: { id: string; name: string; programId: string }[];
}

export function ProgramSectionsView({
  activity,
  programSections,
  onBack,
  onSectionClick,
  programs,
  sections,
}: ProgramSectionsViewProps) {
  const [sectionsWithCounts, setSectionsWithCounts] =
    useState<ProgramSection[]>(programSections);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  useEffect(() => {
    const loadCounts = async () => {
      setIsLoadingCounts(true);
      try {
        // Fetch counts for all sections in parallel
        const countsPromises = programSections.map((section: ProgramSection) =>
          fetchProgramSectionCounts(
            section.programName,
            section.sectionName,
            activity.id
          ).then(
            (counts: { studentCount: number; submissionCount: number }) => ({
              ...section,
              studentCount: counts.studentCount,
              submissionCount: counts.submissionCount,
            })
          )
        );

        const sectionsWithCounts = await Promise.all(countsPromises);
        setSectionsWithCounts(sectionsWithCounts);
      } catch (error) {
        console.error("Error loading counts:", error);
        // Keep original sections if fetch fails
        setSectionsWithCounts(programSections);
      } finally {
        setIsLoadingCounts(false);
      }
    };

    if (programSections.length > 0) {
      loadCounts();
    } else {
      setSectionsWithCounts(programSections);
      setIsLoadingCounts(false);
    }
  }, [programSections, activity.id]);

  return (
    <div className='space-y-6'>
      {/* Header with Back Button */}
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          onClick={onBack}
          className='flex items-center gap-2'
        >
          <ArrowLeft className='w-4 h-4' />
          Back to Activities
        </Button>
      </div>

      {/* Activity Header */}
      <Card className='p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20'>
        <h1 className='text-2xl font-bold text-neutral-900 mb-2'>
          {activity.title}
        </h1>
        {activity.description && (
          <p className='text-neutral-600 mb-4'>{activity.description}</p>
        )}
        <div className='flex flex-wrap gap-2'>
          <Badge className='bg-support/20 text-neutral-900/70 border-primary/90 font-light'>
            {getProgramLabel(
              activity.programId,
              programs.map((p) => ({ id: p.id, name: p.name }))
            )}
          </Badge>
          <Badge className='bg-support/20 text-neutral-900/70 border-primary/90 font-light'>
            {getBlockLabel(
              activity.blockId,
              sections.map((s) => ({
                id: s.id,
                name: s.name,
                programId: s.programId,
              }))
            )}
          </Badge>
          {activity.dueDate && (
            <Badge className='bg-info-default/10 text-info-default border-info-default/20'>
              <Calendar className='w-3 h-3 mr-1' />
              Due: {new Date(activity.dueDate).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </Card>

      {/* Program-Sections Table */}
      <Card>
        <div className='p-4 border-b'>
          <h2 className='text-lg font-semibold text-neutral-900'>
            Program - Sections
          </h2>
          <p className='text-sm text-neutral-500'>
            Click on a section to view students
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program - Section</TableHead>
              <TableHead className='text-center'>Students</TableHead>
              <TableHead className='text-center'>Submissions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingCounts ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className='text-center py-8 text-neutral-500'
                >
                  Loading counts...
                </TableCell>
              </TableRow>
            ) : (
              sectionsWithCounts.map((section) => (
                <TableRow
                  key={section.id}
                  className='cursor-pointer hover:bg-primary/5 transition-colors'
                  onClick={() => onSectionClick(section)}
                >
                  <TableCell className='font-medium'>{section.name}</TableCell>
                  <TableCell className='text-center'>
                    <Badge className='bg-primary/10 text-primary border-primary/20'>
                      {section.studentCount}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      className={
                        section.submissionCount > 0
                          ? "bg-success-default/10 text-success-default border-success-default/20"
                          : "bg-neutral-100 text-neutral-500 border-neutral-200"
                      }
                    >
                      {section.submissionCount}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
