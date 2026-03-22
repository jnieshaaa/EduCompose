import { useState, useEffect, useMemo } from "react";
import { Calendar, Plus, Loader2 } from "lucide-react";
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
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { supabase } from "../../lib/supabaseClient";
import type { EssayActivity, CourseSection } from "../../types/activityTypes";
import { getCoursesLabel, getBlocksLabel } from "../../utils/activityUtils";
import { fetchCourseSectionCounts } from "../../services/activityService";

interface CourseSectionsViewProps {
  activity: EssayActivity;
  courseSections: CourseSection[];
  onSectionClick: (section: CourseSection) => void;
  courses: { id: string; name: string }[];
  programLoads: {
    id: string;
    program_id: string;
    program_name: string;
    course_id: string;
  }[];
  sections: { id: string; name: string; courseId: string; programLoadId: string }[];
}

export function CourseSectionsView({
  activity,
  courseSections,
  onSectionClick,
  courses,
  programLoads,
  sections,
}: CourseSectionsViewProps) {
  const [sectionsWithCounts, setSectionsWithCounts] =
    useState<CourseSection[]>(courseSections);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Selection state for modal
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedProgramLoadIds, setSelectedProgramLoadIds] = useState<string[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>(
    activity.blockIds || []
  );

  useEffect(() => {
    const loadCounts = async () => {
      setIsLoadingCounts(true);
      try {
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

  const filteredPrograms = useMemo(() => {
    if (!selectedCourseId) return [];
    return programLoads.filter((p) => p.course_id === selectedCourseId);
  }, [selectedCourseId, programLoads]);

  const filteredSections = useMemo(() => {
    if (selectedProgramLoadIds.length === 0) return [];
    return sections.filter((s) => selectedProgramLoadIds.includes(s.programLoadId));
  }, [selectedProgramLoadIds, sections]);

  const handleCourseChange = (id: string) => {
    setSelectedCourseId(id);
    setSelectedProgramLoadIds([]);
  };

  const handleProgramToggle = (id: string) => {
    setSelectedProgramLoadIds((prev) => 
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleToggleSection = (sectionId: string) => {
    setSelectedSectionIds(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleUpdateSections = async () => {
    try {
      setIsUpdating(true);
      
      const selectedSections = sections.filter(s => selectedSectionIds.includes(s.id));
      const uniqueCourseIds = Array.from(new Set(selectedSections.map(s => s.courseId)));
      const uniqueProgramIds = new Set<string>();

      const { data: blocksData } = await supabase
        .from("blocks")
        .select("teacher_program_loads(program_id)")
        .in("id", selectedSectionIds);

      if (blocksData) {
        blocksData.forEach((b: any) => {
          const tpl = Array.isArray(b.teacher_program_loads)
            ? b.teacher_program_loads[0]
            : b.teacher_program_loads;
          if (tpl?.program_id) uniqueProgramIds.add(String(tpl.program_id));
        });
      }

      const { error } = await supabase
        .from("essay_activities")
        .update({
          course_id: uniqueCourseIds,
          block_id: selectedSectionIds,
          program_id: Array.from(uniqueProgramIds)
        })
        .eq("id", activity.id);

      if (error) throw error;

      setIsAddModalOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Error updating activity sections:", error);
      alert("Failed to update sections. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

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

      {/* Course-Blocks Table */}
      <Card className="w-full">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Blocks</h2>
            <p className="text-sm text-neutral-500">
              Click on a block to view students
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => {
              setSelectedSectionIds(activity.blockIds || []);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Add Block
          </Button>
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

      {/* Add Sections Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Manage Activity Blocks"
        size="lg"
      >
        <div className="space-y-6">
          <p className="text-sm text-neutral-600 mb-6">
            Assign this activity to additional courses, programs, and blocks.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Courses Selection */}
            <div>
              <label className="block text-sm font-semibold text-neutral-900 mb-3">
                1. Select Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              >
                <option value="">Choose a course...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Programs Selection */}
            <div>
              <label className="block text-sm font-semibold text-neutral-900 mb-3">
                2. Select Programs
              </label>
              <div className="w-full border border-neutral-200 rounded-lg bg-white overflow-y-auto h-[250px] p-2 space-y-1 shadow-inner ring-1 ring-black/5">
                {filteredPrograms.length === 0 ? (
                  <div className="text-xs text-neutral-400 p-4 text-center italic">
                    {selectedCourseId ? "No programs found for this course" : "Select a course first"}
                  </div>
                ) : (
                  filteredPrograms.map((p) => (
                    <label key={p.id} className={`flex items-center gap-3 text-sm cursor-pointer p-2.5 hover:bg-neutral-50 rounded-md transition-colors ${selectedProgramLoadIds.includes(p.id) ? 'bg-primary/5 text-primary font-medium' : 'text-neutral-700'}`}>
                      <input
                        type="checkbox"
                        checked={selectedProgramLoadIds.includes(p.id)}
                        onChange={() => handleProgramToggle(p.id)}
                        className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary transition-all"
                      />
                      <span>{p.program_name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Sections Selection */}
            <div>
              <label className="block text-sm font-semibold text-neutral-900 mb-3">
                3. Select Blocks
              </label>
              <div className="w-full border border-neutral-200 rounded-lg bg-white overflow-y-auto h-[250px] p-2 space-y-1 shadow-inner ring-1 ring-black/5">
                {filteredSections.length === 0 ? (
                  <div className="text-xs text-neutral-400 p-4 text-center italic">
                    {selectedProgramLoadIds.length === 0 ? "Select at least one program" : "No blocks found"}
                  </div>
                ) : (
                  filteredSections.map((s) => (
                    <label key={s.id} className={`flex items-center gap-3 text-sm cursor-pointer p-2.5 hover:bg-neutral-50 rounded-md transition-colors ${selectedSectionIds.includes(s.id) ? 'bg-primary/5 text-primary font-medium' : 'text-neutral-700'}`}>
                      <input
                        type="checkbox"
                        checked={selectedSectionIds.includes(s.id)}
                        onChange={() => handleToggleSection(s.id)}
                        className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary transition-all"
                      />
                      <span>{s.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200 mt-4 flex items-center justify-between">
            <span className="text-xs text-neutral-600">
              Total assigned blocks: <span className="font-bold text-neutral-900">{selectedSectionIds.length}</span>
            </span>
            <span className="text-xs text-neutral-500 italic">
              Selections are kept even when switching courses.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isUpdating}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateSections}
              disabled={isUpdating || selectedSectionIds.length === 0}
              className="px-8 shadow-md"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
