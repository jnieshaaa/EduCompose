import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { buildSecureUrl, readSecureParams } from "../../utils/secureUrl";
import {
  ArrowLeft,
  Users,
  Folder,
  Plus,
  Trash2,
  Loader2,
  Layers,
} from "lucide-react";
import { UnifiedStudentBatchUploadDialog } from "../../components/students/UnifiedStudentBatchUploadDialog";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useAlert } from "../../hooks/useAlert";
import { useAcademicContext } from "../../hooks/useAcademicContext";
import type {
  Course,
  Section,
  TeacherProgramLoad,
  Program,
  Department,
} from "../../types/academic";

interface CourseSectionsViewProps {
  course: Course;
  onBack: () => void;
}

interface ProgramLookup {
  id: string;
  department_id: string;
  name: string;
  abbr: string;
}

export function CourseSectionsView({
  course,
  onBack,
}: CourseSectionsViewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const secureParams = readSecureParams(window.location.search);
  const urlProgramLoadId = secureParams?.programLoad || searchParams.get("programLoad");
  const { showSuccess, showError, showWarning, AlertComponent } = useAlert();
  const { currentAY, currentSemester } = useAcademicContext();

  const [programLoads, setProgramLoads] = useState<TeacherProgramLoad[]>([]);
  const [blocks, setBlocks] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProgramLoad, setSelectedProgramLoad] = useState<TeacherProgramLoad | null>(null);
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [programWideBlocks, setProgramWideBlocks] = useState<{year: number, name: string, student_count: number}[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availablePrograms, setAvailablePrograms] = useState<ProgramLookup[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>(course.department_id || "");
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [newBlock, setNewBlock] = useState({ year: 1, name: "" });

  const fetchCatalogs = useCallback(async () => {
    try {
      const { data: deptData } = await supabase
        .from("departments")
        .select("id, name, code")
        .eq("school_id", course.school_id);
      setDepartments(deptData || []);

      if (deptData && deptData.length > 0) {
        const { data: progData } = await supabase
          .from("programs_lookup")
          .select("id, name, abbr, department_id")
          .in(
            "department_id",
            deptData.map((d) => d.id),
          );
        setAvailablePrograms(progData || []);
      }
    } catch (err) {
      console.error("Error fetching catalogs:", err);
    }
  }, [course.school_id]);

  const fetchProgramLoads = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // 1. Get the local user ID
      const { data: dbUser } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", userData.user.id)
        .single();

      if (!dbUser) return;

      // 2. Get course load for CURRENT academic year and term
      const { data: loadData } = await supabase
        .from("teacher_course_loads")
        .select("id")
        .eq("teacher_id", userData.user.id)
        .eq("course_id", course.id)
        .eq("academic_year", currentAY)
        .eq("term", currentSemester)
        .maybeSingle();

      if (!loadData?.id) {
        setProgramLoads([]);
        setIsLoading(false);
        return;
      }

      const courseLoadId = loadData.id;

      // 3. Fetch program loads
      const { data: pLoads, error } = await supabase
        .from("teacher_program_loads")
        .select(
          `
          id,
          course_load_id,
          program_id,
          programs_lookup (id, name, abbr)
        `,
        )
        .eq("course_load_id", courseLoadId);

      if (error) throw error;

      type RawProgramLoad = {
        id: string;
        course_load_id: string;
        program_id: string;
        programs_lookup?: Program | Program[];
      };

      const mappedLoads: TeacherProgramLoad[] = (pLoads || []).map(
        (pl: RawProgramLoad) => ({
          id: pl.id,
          course_load_id: pl.course_load_id,
          program_id: pl.program_id,
          programs_lookup: Array.isArray(pl.programs_lookup)
            ? pl.programs_lookup[0]
            : pl.programs_lookup,
        }),
      );

      setProgramLoads(mappedLoads);

      // Handle URL deep link
      if (urlProgramLoadId) {
        const found = mappedLoads.find((l) => l.id === urlProgramLoadId);
        if (found) setSelectedProgramLoad(found);
      }
    } catch (err) {
      console.error(err);
      showError("Failed to load programs.");
    } finally {
      setIsLoading(false);
    }
  }, [course.id, urlProgramLoadId, showError, currentAY, currentSemester]);

  const fetchBlocks = useCallback(async () => {
    if (!selectedProgramLoad) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("blocks")
        .select(
          `
          id,
          name,
          year,
          program_load_id,
          block_students (count)
        `,
        )
        .eq("program_load_id", selectedProgramLoad.id);

      if (error) throw error;

      const mapped: Section[] = (data || []).map((b) => ({
        id: b.id,
        course_id: course.id,
        block_id: b.id,
        name: b.name,
        year: b.year,
        program_load_id: b.program_load_id,
        students_estimated: b.block_students?.[0]?.count || 0,
        essays_estimated: 0,
        created_at: "",
      }));

      setBlocks(mapped);

      // Also fetch ALL blocks for this program regardless of course/teacher
      // to show in the "Existing Blocks" list in the modal
      const { data: blocks } = await supabase
        .from("blocks")
        .select("year, name, teacher_program_loads!fk_block_program_load!inner(program_id)")
        .eq("teacher_program_loads.program_id", selectedProgramLoad.program_id);
      
      if (blocks) {
        // Unique names and years
        const uniqueBlocks = blocks.reduce((acc: any[], current: any) => {
          const exists = acc.find(item => item.name === current.name && item.year === current.year);
          if (!exists) acc.push({ name: current.name, year: current.year });
          return acc;
        }, []);

        const results = await Promise.all(uniqueBlocks.map(async (b) => {
          const { count } = await supabase
            .from("students")
            .select("*", { count: 'exact', head: true })
            .eq("program_id", selectedProgramLoad.program_id)
            .eq("year", b.year)
            .eq("block_name", b.name);
          return { ...b, student_count: count || 0 };
        }));

        setProgramWideBlocks(results);
      }
    } catch (err) {
      console.error(err);
      showError("Failed to load blocks.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedProgramLoad, course.id, showError]);


  useEffect(() => {
    fetchProgramLoads();
    fetchCatalogs();
  }, [fetchProgramLoads, fetchCatalogs]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const handleProgramClick = (load: TeacherProgramLoad) => {
    setSelectedProgramLoad(load);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("programLoad", load.id);
    if (load.programs_lookup?.abbr) {
      newParams.set("programAbbr", load.programs_lookup.abbr);
    }
    setSearchParams(newParams);
  };

  const handleBackToPrograms = () => {
    setSelectedProgramLoad(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("programLoad");
    newParams.delete("programAbbr");
    setSearchParams(newParams);
  };

  const handleAddProgramsBatch = async () => {
    if (selectedProgramIds.length === 0) return;
    setIsCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // 1. Get/Create course load for CURRENT term
      let courseLoadId: string;
      const { data: existingLoad } = await supabase
        .from("teacher_course_loads")
        .select("id")
        .eq("teacher_id", userData.user.id)
        .eq("course_id", course.id)
        .eq("academic_year", currentAY)
        .eq("term", currentSemester)
        .maybeSingle();

      if (existingLoad?.id) {
        courseLoadId = existingLoad.id;
      } else {
        const { data: newLoad, error: loadErr } = await supabase
          .from("teacher_course_loads")
          .insert({
            teacher_id: userData.user.id,
            course_id: course.id,
            academic_year: currentAY,
            term: currentSemester,
          })
          .select()
          .single();
        if (loadErr) throw loadErr;
        if (!newLoad) throw new Error("Failed to create course load.");
        courseLoadId = newLoad.id;
      }

      // 2. Bulk Create program loads
      const insertData = selectedProgramIds.map((pid) => ({
        course_load_id: courseLoadId,
        program_id: pid,
      }));

      const { error: plErr } = await supabase
        .from("teacher_program_loads")
        .insert(insertData);

      if (plErr) throw plErr;

      showSuccess(`${selectedProgramIds.length} programs added successfully!`);
      setSelectedProgramIds([]);
      setIsAddProgramOpen(false);
      fetchProgramLoads();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showError(msg || "Failed to add programs.");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleProgramSelection = (programId: string) => {
    setSelectedProgramIds((prev) =>
      prev.includes(programId)
        ? prev.filter((id) => id !== programId)
        : [...prev, programId],
    );
  };

  const handleCreateBlock = async () => {
    if (!selectedProgramLoad || !newBlock.name) return;
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Create the block
      const { data: block, error } = await supabase
        .from("blocks")
        .insert({
          program_load_id: selectedProgramLoad.id,
          year: newBlock.year,
          name: newBlock.name.toUpperCase(),
          teacher_id: user.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505")
          throw new Error("A block with this year and name already exists.");
        throw error;
      }

      let enrollmentCount = 0;
      // 2. Automatically link existing students
      if (block) {
        const { data: matchingStudents } = await supabase
          .from("students")
          .select("id")
          .eq("program_id", selectedProgramLoad.program_id)
          .eq("year", newBlock.year)
          .eq("block_name", newBlock.name.toUpperCase());

        if (matchingStudents && matchingStudents.length > 0) {
          enrollmentCount = matchingStudents.length;
          const enrollments = matchingStudents.map(s => ({
            block_id: block.id,
            student_id: s.id
          }));
          
          const { error: enrollError } = await supabase
            .from("block_students")
            .insert(enrollments);
            
          if (enrollError) console.error("Auto-enroll error:", enrollError);
        }
      }

      showSuccess(`Block created successfully! ${enrollmentCount > 0 ? `${enrollmentCount} students auto-enrolled.` : "No matching students found for auto-enroll."}`);
      setIsAddBlockOpen(false);
      setNewBlock({ year: 1, name: "" });
      fetchBlocks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showError(msg || "Failed to create block.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBlock = (id: string) => {
    showWarning(
      "Delete this block? All student enrollments for this block will be removed.",
      {
        onConfirm: async () => {
          const { error } = await supabase.from("blocks").delete().eq("id", id);
          if (!error) {
            showSuccess("Block deleted.");
            fetchBlocks();
          } else {
            showError("Failed to delete block.");
          }
        },
      },
    );
  };

  const handleRemoveProgramLoad = (load: TeacherProgramLoad) => {
    showWarning(
      `Remove ${load.programs_lookup?.abbr} from this course? This will also delete all created blocks/sections for this program.`,
      {
        onConfirm: async () => {
          try {
            const { error } = await supabase
              .from("teacher_program_loads")
              .delete()
              .eq("id", load.id);

            if (error) throw error;
            showSuccess("Program removed successfully.");
            fetchProgramLoads();
          } catch (err: any) {
            showError(err.message || "Failed to remove program.");
          }
        },
      },
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header & Breadcrumbs */}
      {/* Header - Simplified as main Breadcrumbs handle the path */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={selectedProgramLoad ? handleBackToPrograms : onBack}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg transition-colors shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 leading-tight">
              {selectedProgramLoad
                ? `${selectedProgramLoad.programs_lookup?.abbr}`
                : course.course_title}
            </h1>
            {selectedProgramLoad && (
              <p className="text-xs text-neutral-500 mt-1 font-medium">
                {selectedProgramLoad.programs_lookup?.name}
              </p>
            )}
            {!selectedProgramLoad && (
              <div className="flex gap-2 items-center mt-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                  {course.departments?.name ||
                    course.department ||
                    "General Subject"}
                </span>
                {course.programs_lookup?.name && (
                  <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    {course.programs_lookup.name}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!selectedProgramLoad ? (
            <Button
              onClick={() => setIsAddProgramOpen(true)}
              className="bg-primary text-white flex items-center gap-2"
            >
              <Plus size={18} /> Add Program
            </Button>
          ) : (
            <Button
              onClick={() => setIsAddBlockOpen(true)}
              className="bg-primary text-white flex items-center gap-2"
            >
              <Plus size={18} /> Add Block
            </Button>
          )}
          <UnifiedStudentBatchUploadDialog 
            courseId={course.id} 
            onComplete={() => {
              fetchProgramLoads();
              if (selectedProgramLoad) fetchBlocks();
            }} 
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary w-8 h-8" />
        </div>
      ) : !selectedProgramLoad ? (
        // PROGRAM SELECTION VIEW
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {programLoads.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <Folder className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
              <p className="text-neutral-500">
                No programs added to this course yet.
              </p>
            </div>
          ) : (
            programLoads.map((load) => (
              <Card
                key={load.id}
                onClick={() => handleProgramClick(load)}
                className="p-6 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group bg-white border-neutral-200 relative"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/5 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Folder size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900">
                      {load.programs_lookup?.abbr}
                    </h3>
                    <p className="text-xs text-neutral-500 truncate max-w-[150px]">
                      {load.programs_lookup?.name}
                    </p>
                  </div>
                </div>
                
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveProgramLoad(load);
                  }}
                  className="absolute top-2 right-2 p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </Card>
            ))
          )}
        </div>
      ) : (
        // BLOCKS VIEW
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          {blocks.length === 0 ? (
            <div className="p-20 text-center">
              <Users className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
              <p className="text-neutral-500">
                No blocks found in this program.
              </p>
              <Button
                onClick={() => setIsAddBlockOpen(true)}
                variant="outline"
                className="mt-4"
              >
                Create First Block
              </Button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-neutral-50 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4">BLOCK</th>
                  <th className="px-6 py-4 text-center">STUDENTS</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {blocks.map((block) => (
                  <tr
                    key={block.id}
                    className="hover:bg-neutral-50/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      navigate(
                        buildSecureUrl('/Teacher/Students', {
                          courseId: course.id,
                          courseCode: course.course_code,
                          programLoad: selectedProgramLoad.id,
                          programAbbr: selectedProgramLoad.programs_lookup?.abbr || '',
                          block: block.id,
                          blockName: `${block.year}${block.name}`,
                        }),
                      );
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {block.year}
                          {block.name}
                        </div>
                        {/* <span className="text-sm font-medium text-neutral-600">{block.year}{block.name}</span> */}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs px-2 py-1 bg-neutral-100 rounded-full font-bold text-neutral-600">
                        {block.students_estimated}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBlock(block.id);
                        }}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Program Modal */}
      {isAddProgramOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Program to Course</h2>
              <button
                onClick={() => setIsAddProgramOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Department Selection - Only shown/enabled if course doesn't have a fixed program or department */}
              {!course.program_id && (
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mb-1.5 ml-1">
                    {course.department_id
                      ? "Department (Fixed)"
                      : "Filter by Department"}
                  </label>
                  {departments.length > 0 ? (
                    <select
                      disabled={!!course.department_id}
                      className={`w-full border rounded-xl p-3 text-sm outline-none transition-all ${
                        course.department_id
                          ? "bg-neutral-50 text-neutral-500 border-neutral-200"
                          : "bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary border-neutral-200"
                      }`}
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                    >
                      {!course.department_id && (
                        <option value="">All Departments</option>
                      )}
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs flex items-center gap-2">
                      <Layers size={14} />
                      No departments available in this school.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mb-1.5 ml-1">
                  {course.program_id ? "Target Program" : "Available Programs"}
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {(() => {
                    const alreadyAddedIds = new Set(
                      programLoads.map((p) => p.program_id),
                    );

                    const filtered = availablePrograms.filter((p) => {
                      if (course.program_id) return p.id === course.program_id;
                      return !selectedDept || p.department_id === selectedDept;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="py-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                          <p className="text-xs text-neutral-400 px-4">
                            No programs found for this selection.
                          </p>
                        </div>
                      );
                    }

                    return filtered.map((p) => {
                      const isAlreadyAdded = alreadyAddedIds.has(p.id);
                      const isSelected = selectedProgramIds.includes(p.id);

                      return (
                        <button
                          key={p.id}
                          onClick={() =>
                            !isAlreadyAdded && toggleProgramSelection(p.id)
                          }
                          disabled={isCreating || isAlreadyAdded}
                          className={`text-left p-4 border rounded-xl transition-all flex items-center justify-between group shadow-sm active:scale-[0.98] ${
                            isAlreadyAdded
                              ? "bg-neutral-50 border-neutral-100 opacity-60 cursor-not-allowed"
                              : isSelected
                                ? "bg-primary/5 border-primary ring-1 ring-primary"
                                : "bg-white border-neutral-200 hover:bg-primary/5 hover:border-primary/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                isAlreadyAdded
                                  ? "bg-success-default border-success-default"
                                  : isSelected
                                    ? "bg-primary border-primary"
                                    : "bg-white border-neutral-300 group-hover:border-primary"
                              }`}
                            >
                              {(isAlreadyAdded || isSelected) && (
                                <svg
                                  className="w-3.5 h-3.5 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p
                                className={`text-sm font-bold transition-colors ${
                                  isAlreadyAdded
                                    ? "text-success-default"
                                    : isSelected
                                      ? "text-primary"
                                      : "text-neutral-900"
                                }`}
                              >
                                {p.abbr}
                              </p>
                              <p className="text-[10px] text-neutral-500 font-medium">
                                {p.name}
                              </p>
                            </div>
                          </div>
                          {isAlreadyAdded && (
                            <span className="text-[9px] font-bold text-success-default uppercase bg-success-default/10 px-2 py-0.5 rounded-full">
                              Already Added
                            </span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {course.program_id && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-[10px] font-medium leading-relaxed">
                  This is a Major Course of specific program. Only that program
                  is allowed to be added.
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3 items-center">
              {selectedProgramIds.length > 0 && (
                <span className="text-xs font-bold text-primary mr-auto">
                  {selectedProgramIds.length} programs selected
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedProgramIds([]);
                  setIsAddProgramOpen(false);
                }}
                className="px-4 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={handleAddProgramsBatch}
                disabled={isCreating || selectedProgramIds.length === 0}
                className="bg-primary text-white px-6 font-bold shadow-lg shadow-primary/20"
              >
                {isCreating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Save Selected"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Block Modal */}
      {isAddBlockOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <h2 className="text-lg font-bold">Create New Block</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Adding block to {selectedProgramLoad?.programs_lookup?.abbr}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                  Year Level
                </label>
                <select
                  className="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={newBlock.year}
                  onChange={(e) =>
                    setNewBlock({ ...newBlock, year: parseInt(e.target.value) })
                  }
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                  Block Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. A, B, C"
                  className="w-full border rounded-lg p-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-primary/20"
                  value={newBlock.name}
                  onChange={(e) =>
                    setNewBlock({ ...newBlock, name: e.target.value })
                  }
                />
              </div>

              {selectedProgramLoad && programWideBlocks.length > 0 && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">
                    Select Existing Block
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {programWideBlocks.sort((a,b) => a.year - b.year || a.name.localeCompare(b.name)).map((b, idx) => {
                      const isActive = newBlock.year === b.year && newBlock.name === b.name;
                      return (
                        <button
                          key={idx}
                          onClick={() => setNewBlock({ ...newBlock, year: b.year, name: b.name })}
                          className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg transition-all ${
                            isActive
                              ? "bg-primary/10 border-primary text-primary shadow-sm"
                              : "bg-white border-neutral-200 text-neutral-600 hover:border-primary/50 hover:bg-primary/5"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isActive ? 'border-primary bg-primary' : 'border-neutral-300'}`}>
                              {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span className="text-xs font-bold uppercase">{b.year}{b.name}</span>
                          </div>
                          <span className={`${isActive ? 'text-primary/70' : 'text-neutral-400'} text-[10px] font-medium`}>
                            {b.student_count} Students
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-neutral-50 flex justify-end gap-2">
              <Button onClick={() => setIsAddBlockOpen(false)} variant="ghost">
                Cancel
              </Button>
              <Button
                onClick={handleCreateBlock}
                disabled={isCreating}
                className="bg-primary text-white"
              >
                {isCreating ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  "Create Block"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertComponent />
    </div>
  );
}
