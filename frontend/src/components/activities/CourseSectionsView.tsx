import { useState, useEffect } from "react";
import { Calendar, AlertTriangle } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import type { EssayActivity, CourseSection } from "../../types/activityTypes";
import { getCoursesLabel, getBlocksLabel } from "../../utils/activityUtils";
import {
  fetchCourseSectionCounts,
  fetchDuplicateEssays,
  type DuplicateEssayGroup,
} from "../../services/activityService";

interface CourseSectionsViewProps {
  activity: EssayActivity;
  courseSections: CourseSection[];
  onSectionClick: (section: CourseSection) => void;
  courses: { id: string; name: string }[];
  sections: { id: string; name: string; courseId: string }[];
}

export function CourseSectionsView({
  activity,
  courseSections,
  onSectionClick,
  courses,
  sections,
}: CourseSectionsViewProps) {
  const [sectionsWithCounts, setSectionsWithCounts] =
    useState<CourseSection[]>(courseSections);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateEssayGroup[]>(
    [],
  );

  useEffect(() => {
    const loadCounts = async () => {
      setIsLoadingCounts(true);
      try {
        // Fetch counts for all sections in parallel
        const countsPromises = courseSections.map((section: CourseSection) =>
          fetchCourseSectionCounts(
            section.courseId,
            section.sectionId,
            activity.id,
          ).then(
            (counts: { studentCount: number; submissionCount: number }) => ({
              ...section,
              studentCount: counts.studentCount,
              submissionCount: counts.submissionCount,
            }),
          ),
        );

        const sectionsWithCounts = await Promise.all(countsPromises);
        setSectionsWithCounts(sectionsWithCounts);
      } catch (error) {
        console.error("Error loading counts:", error);
        // Keep original sections if fetch fails
        setSectionsWithCounts(courseSections);
      } finally {
        setIsLoadingCounts(false);
      }
    };

    if (courseSections.length > 0) {
      loadCounts();
    } else {
      setSectionsWithCounts(courseSections);
      setIsLoadingCounts(false);
    }
  }, [courseSections, activity.id]);

  // Load duplicate essays
  useEffect(() => {
    const loadDuplicates = async () => {
      try {
        const duplicates = await fetchDuplicateEssays(activity.id);
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
            {getCoursesLabel(
              activity.courseIds,
              courses.map((p) => ({ id: p.id, name: p.name })),
            )}
          </Badge>
          <Badge className="bg-support/90 text-neutral-900/70 border-primary/90 font-light">
            {getBlocksLabel(
              activity.blockIds,
              sections.map((s) => ({
                id: s.id,
                name: s.name,
                courseId: s.courseId,
              })),
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

      {/* Course-Blocks Table and Duplicate Essays Warning - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course-Blocks Table - Takes 2/3 width on large screens */}
        <Card className="lg:col-span-2">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-neutral-900">Blocks</h2>
            <p className="text-sm text-neutral-500">
              Click on a block to view students
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Block</TableHead>
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
        <Card
          className={`lg:col-span-1 ${
            duplicateGroups.length > 0
              ? "border-warning-default/30 bg-warning-default/5"
              : "border-neutral-200 bg-neutral-50"
          }`}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  duplicateGroups.length > 0
                    ? "text-warning-default"
                    : "text-neutral-400"
                }`}
              />
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900 mb-2 text-sm">
                  Duplicate Essays Detected
                </h3>
                <p className="text-xs text-neutral-600 mb-3">
                  {duplicateGroups.length > 0
                    ? "Same content submitted by students from different courses."
                    : "No duplicate essays detected. All submissions appear to be unique."}
                </p>
                {duplicateGroups.length > 0 ? (
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
                                essayIndex: number,
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
                              ),
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500 italic text-center py-4">
                    All essays are unique. No duplicates found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
