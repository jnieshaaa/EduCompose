import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, AlertTriangle } from "lucide-react";
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
import {
  fetchProgramSectionCounts,
  fetchDuplicateEssays,
  type DuplicateEssayGroup,
} from "../../services/activityService";

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
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateEssayGroup[]>(
    []
  );

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

  // Load duplicate essays
  useEffect(() => {
    const loadDuplicates = async () => {
      try {
        console.log(
          `[ProgramSectionsView] Loading duplicates for activity ${activity.id}`
        );
        const duplicates = await fetchDuplicateEssays(activity.id);
        console.log(
          `[ProgramSectionsView] Found ${duplicates.length} duplicate groups`
        );
        setDuplicateGroups(duplicates);
      } catch (error) {
        console.error("Error loading duplicate essays:", error);
        setDuplicateGroups([]);
      }
    };

    loadDuplicates();
  }, [activity.id]);

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
          Back to Activities
        </Button>
      </div>

      {/* Activity Header */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          {activity.title}
        </h1>
        {activity.description && (
          <p className="text-neutral-600 mb-4">{activity.description}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-support/90 text-neutral-900/70 border-primary/90 font-light">
            {getProgramLabel(
              activity.programId,
              programs.map((p) => ({ id: p.id, name: p.name }))
            )}
          </Badge>
          <Badge className="bg-support/90 text-neutral-900/70 border-primary/90 font-light">
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
            <Badge className="bg-info-default/10 text-info-default border-info-default/20">
              <Calendar className="w-3 h-3 mr-1" />
              Due: {new Date(activity.dueDate).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </Card>

      {/* Program-Sections Table and Duplicate Essays Warning - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program-Sections Table - Takes 2/3 width on large screens */}
        <Card className="lg:col-span-2">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-neutral-900">
              Program - Sections
            </h2>
            <p className="text-sm text-neutral-500">
              Click on a section to view students
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program - Section</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Submissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingCounts ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-8 text-neutral-500"
                  >
                    Loading counts...
                  </TableCell>
                </TableRow>
              ) : (
                sectionsWithCounts.map((section) => (
                  <TableRow
                    key={section.id}
                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => onSectionClick(section)}
                  >
                    <TableCell className="font-medium">
                      {section.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {section.studentCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
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

        {/* Duplicate Essays Warning - Takes 1/3 width on large screens */}
        {duplicateGroups.length > 0 && (
          <Card className="border-warning-default/30 bg-warning-default/5 lg:col-span-1">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning-default flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 mb-2 text-sm">
                    Duplicate Essays Detected
                  </h3>
                  <p className="text-xs text-neutral-600 mb-3">
                    Same content submitted by students from different programs.
                  </p>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {duplicateGroups.map((group, index) => {
                      return (
                        <div
                          key={index}
                          className="bg-white rounded-lg border border-warning-default/20 p-2.5"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="text-xs font-medium text-neutral-900">
                              Group #{index + 1}
                            </div>
                            <Badge className="bg-warning-default/70 text-warning-default border-warning-default/20 text-xs px-1.5 py-0.5">
                              {group.essays.length} essays
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {group.essays.map(
                              (
                                essay: DuplicateEssayGroup["essays"][0],
                                essayIndex: number
                              ) => (
                                <div
                                  key={essayIndex}
                                  className="text-xs text-neutral-600"
                                >
                                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                    <Badge className="bg-warning-default/90 text-warning-default border-warning-default/20 text-xs px-1 py-0">
                                      {essay.programName} - {essay.sectionName}
                                    </Badge>
                                  </div>
                                  <div className="font-medium text-neutral-900 text-xs">
                                    {essay.studentName}
                                  </div>
                                  <div
                                    className="text-neutral-500 italic text-xs truncate"
                                    title={essay.title}
                                  >
                                    "{essay.title}"
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
