import { useState, useEffect, useMemo } from "react";
import { Calendar, Plus, Loader2, Users, FileCheck, LayoutGrid, Save } from "lucide-react";
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
import { useNotification } from "../../contexts/NotificationContext";

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
  const { showNotification } = useNotification();
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
          course_id: uniqueCourseIds?.[0] || null,
          block_id: selectedSectionIds?.[0] || null,
          program_id: Array.from(uniqueProgramIds)
        })
        .eq("id", activity.id);

      if (error) throw error;

      setIsAddModalOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Error updating activity sections:", error);
      showNotification('error', "Failed to update sections. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Compute totals for summary
  const totalStudents = sectionsWithCounts.reduce((sum, s) => sum + (s.studentCount || 0), 0);
  const totalSubmissions = sectionsWithCounts.reduce((sum, s) => sum + (s.submissionCount || 0), 0);

  return (
    <div className="space-y-5">
      {/* ─── Activity Header ─── */}
      <div className="bg-white border border-neutral-100 rounded-xl p-5 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 leading-tight">
            {activity.title}
          </h1>
          {activity.description && (
            <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{activity.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/15 text-[11px] font-semibold">
            {getCoursesLabel(
              activity.courseIds,
              courses.map((p) => ({ id: p.id, name: p.name })),
            )}
          </Badge>
          <Badge className="bg-secondary/10 text-secondary-500 border-secondary/15 text-[11px] font-semibold">
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
            <Badge className="bg-warning-light/20 text-warning-dark border-warning-light/30 text-[11px] font-semibold">
              <Calendar className="w-3 h-3 mr-1" />
              Due {new Date(activity.dueDate).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </div>

      {/* ─── Blocks Table ─── */}
      <div className="bg-white border border-neutral-100 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-800">Assigned Classes</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Click a class to see students and essays
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1.5 text-xs"
            onClick={() => {
              setSelectedSectionIds(activity.blockIds || []);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Manage
          </Button>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50/50">
              <TableHead className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-5">Class</TableHead>
              <TableHead className="text-center text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Students</TableHead>
              <TableHead className="text-center text-[10px] font-bold text-neutral-400 uppercase tracking-wider pr-5">Submissions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingCounts ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-xs text-neutral-400">Loading data…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : sectionsWithCounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10">
                  <p className="text-xs text-neutral-400">No blocks assigned yet</p>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {sectionsWithCounts.map((section) => (
                  <TableRow
                    key={section.id}
                    className="cursor-pointer hover:bg-primary/[0.03] transition-colors group"
                    onClick={() => onSectionClick(section)}
                  >
                    <TableCell className="pl-5">
                      <span className="text-sm font-semibold text-neutral-800 group-hover:text-primary transition-colors">
                        {section.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
                        <Users className="w-3 h-3 text-neutral-400" />
                        {section.studentCount ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center pr-5">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md ${
                        (section.submissionCount ?? 0) > 0
                          ? "text-success-dark bg-success-default/10"
                          : "text-neutral-400 bg-neutral-50"
                      }`}>
                        <FileCheck className="w-3 h-3" />
                        {section.submissionCount ?? 0}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals Row */}
                <TableRow className="bg-neutral-50/80 border-t border-neutral-100">
                  <TableCell className="pl-5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs font-bold text-neutral-700">{totalStudents}</span>
                  </TableCell>
                  <TableCell className="text-center pr-5">
                    <span className="text-xs font-bold text-neutral-700">{totalSubmissions}</span>
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ─── Manage Blocks Modal ─── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Manage Classes"
        size="lg"
      >
        <div className="space-y-5">
          <p className="text-xs text-neutral-500">
            Add this activity to other courses and classes.
          </p>

          {/* Targeting Grid */}
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em]">
                Select Classes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Course */}
              <div>
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">
                  Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                >
                  <option value="">Select…</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Programs */}
              <div>
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">
                  Programs
                </label>
                <div className="border border-neutral-200 rounded-lg bg-white overflow-y-auto h-40 p-1.5">
                  {filteredPrograms.length === 0 ? (
                    <p className="text-[11px] text-neutral-300 p-3 text-center italic">
                      {selectedCourseId ? "No programs" : "Select a course first"}
                    </p>
                  ) : (
                    filteredPrograms.map((p) => (
                      <label key={p.id} className={`flex items-center gap-2 text-xs cursor-pointer px-2 py-1.5 rounded-md transition-colors ${
                        selectedProgramLoadIds.includes(p.id) 
                          ? "bg-primary/5 text-primary font-medium" 
                          : "text-neutral-700 hover:bg-primary/[0.03]"
                      }`}>
                        <input
                          type="checkbox"
                          checked={selectedProgramLoadIds.includes(p.id)}
                          onChange={() => handleProgramToggle(p.id)}
                          className="w-3.5 h-3.5 text-primary border-neutral-300 rounded focus:ring-primary accent-primary"
                        />
                        <span>{p.program_name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Sections */}
              <div>
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">
                  Classes
                </label>
                <div className="border border-neutral-200 rounded-lg bg-white overflow-y-auto h-40 p-1.5">
                  {filteredSections.length === 0 ? (
                    <p className="text-[11px] text-neutral-300 p-3 text-center italic">
                      {selectedProgramLoadIds.length > 0 ? "No classes" : "Select programs first"}
                    </p>
                  ) : (
                    filteredSections.map((s) => (
                      <label key={s.id} className={`flex items-center gap-2 text-xs cursor-pointer px-2 py-1.5 rounded-md transition-colors ${
                        selectedSectionIds.includes(s.id) 
                          ? "bg-primary/5 text-primary font-medium" 
                          : "text-neutral-700 hover:bg-primary/[0.03]"
                      }`}>
                        <input
                          type="checkbox"
                          checked={selectedSectionIds.includes(s.id)}
                          onChange={() => handleToggleSection(s.id)}
                          className="w-3.5 h-3.5 text-primary border-neutral-300 rounded focus:ring-primary accent-primary"
                        />
                        <span>{s.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <span className="text-[11px] text-neutral-400">
              <span className="font-bold text-neutral-600">{selectedSectionIds.length}</span> class{selectedSectionIds.length !== 1 ? "es" : ""} assigned
            </span>

            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isUpdating}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-10 px-5 shadow-md shadow-primary/15"
                onClick={handleUpdateSections}
                disabled={isUpdating || selectedSectionIds.length === 0}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
