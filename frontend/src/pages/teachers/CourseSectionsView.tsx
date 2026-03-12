import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Folder,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useAlert } from "../../hooks/useAlert";
import { useAcademicContext } from "../../hooks/useAcademicContext";
import type { Course, Section } from "../../types/academic";

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
  const urlProgram = searchParams.get("program");
  const { showSuccess, showError, showWarning, AlertComponent } = useAlert();
  const { currentSemester } = useAcademicContext();
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(
    urlProgram,
  );

  // Sync with URL program param
  useEffect(() => {
    if (urlProgram && urlProgram !== selectedProgram) {
      setSelectedProgram(urlProgram);
    }
  }, [urlProgram, selectedProgram]);

  const handleProgramSelect = (programAbbr: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (programAbbr) {
      newParams.set("program", programAbbr);
    } else {
      newParams.delete("program");
    }
    setSearchParams(newParams);
    setSelectedProgram(programAbbr);
  };

  // Modal states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [schoolPrograms, setSchoolPrograms] = useState<ProgramLookup[]>([]);

  const [newSection, setNewSection] = useState({
    program_id: "",
    year_level: 1,
    name: "",
    term: "",
  });

  // Sync term with global settings
  useEffect(() => {
    if (currentSemester) {
      setNewSection((prev) => ({ ...prev, term: currentSemester }));
    }
  }, [currentSemester]);

  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const fetchSchoolCatalogs = useCallback(async () => {
    try {
      if (!course.school_id) return;

      // Fetch all programs for this school by joining with departments
      // (or directly if school_id is available in programs_lookup, but typically it follows dept)
      const { data: progData } = await supabase
        .from("programs_lookup")
        .select(`
          id,
          name,
          abbr,
          department_id,
          departments!inner (
            school_id
          )
        `)
        .eq("departments.school_id", course.school_id);

      setSchoolPrograms((progData as any) || []);
    } catch (err) {
      console.error("Error fetching school catalogs:", err);
    }
  }, [course.school_id]);

  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Get the teacher's load (which now links to blocks)
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data, error } = await supabase
        .from("teacher_course_loads")
        .select(`
          id,
          academic_year,
          term,
          block_id,
          blocks (
            id,
            name,
            year_level,
            program_id,
            block_students (count)
          )
        `)
        .eq("teacher_id", userData.user.id)
        .eq("course_id", course.id)
        .not("block_id", "is", null);

      if (error) throw error;

      const mapped: Section[] = (data || []).map((load) => {
        const block = Array.isArray(load.blocks) ? load.blocks[0] : load.blocks;
        return {
          id: load.id, // Using load ID for UI consistency
          course_id: course.id,
          block_id: block.id,
          name: block.name,
          program_id: block.program_id,
          year_level: block.year_level,
          term: load.term,
          academic_year: load.academic_year,
          students_estimated: block.block_students?.[0]?.count || 0,
          essays_estimated: 0,
          created_at: "",
        };
      });

      setSections(mapped);
    } catch (err: unknown) {
      console.error(err);
      showError("Failed to load blocks.");
    } finally {
      setIsLoading(false);
    }
  }, [course.id, showError]);

  useEffect(() => {
    fetchSections();
    fetchSchoolCatalogs();
  }, [fetchSections, fetchSchoolCatalogs]);

  // Group sections by Program using program_id
  const programs = useMemo(() => {
    const progSet = new Set<string>();
    sections.forEach((s) => {
      // Find program abbreviation from schoolPrograms lookup
      const prog = schoolPrograms.find(p => p.id === s.program_id);
      if (prog) {
        progSet.add(prog.abbr);
      } else {
        // Fallback to old parsing if program_id missing
        let name = s.name.trim();
        const spaceIdx = name.indexOf(" ");
        if (spaceIdx > 0) {
          name = name.substring(0, spaceIdx);
        }
        progSet.add(name || "Other Programs");
      }
    });
    return Array.from(progSet).sort();
  }, [sections, schoolPrograms]);

  // If a program is selected, filter sections
  const filteredSections = useMemo(() => {
    if (!selectedProgram) return [];
    
    // Find the program ID for the selected abbreviation
    const selectedProgId = schoolPrograms.find(p => p.abbr === selectedProgram)?.id;

    return sections.filter((s) => {
      if (selectedProgId) {
        return s.program_id === selectedProgId;
      }
      
      // Fallback for sections without program_id
      if (selectedProgram === "Other Programs") {
        return !s.program_id && !s.name.includes("-") && !s.name.includes(" ");
      }
      
      return (
        s.name.startsWith(selectedProgram + " ") ||
        s.name.startsWith(selectedProgram + "-")
      );
    });
  }, [sections, selectedProgram, schoolPrograms]);

  const handleCreateSection = async () => {
    if (!newSection.program_id || !newSection.name) {
      showError("Please fill in all required fields.");
      return;
    }

    setIsCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      // 1. Find an UNASSIGNED course load for this course
      const { data: loadData } = await supabase
        .from("teacher_course_loads")
        .select("id")
        .eq("teacher_id", userData.user.id)
        .eq("course_id", course.id)
        .is("block_id", null) 
        .limit(1)
        .maybeSingle();

      if (!loadData) {
        throw new Error("No unassigned course slots found. Please contact admin to add more sections to your load.");
      }

      const fullBlockName = `${newSection.name.toUpperCase()}`;

      // 2. Check if block exists
      let { data: existingBlock } = await supabase
        .from("blocks")
        .select("id")
        .eq("name", fullBlockName)
        .eq("program_id", newSection.program_id)
        .eq("year_level", newSection.year_level)
        .maybeSingle();

      let targetBlockId = existingBlock?.id;

      if (!targetBlockId) {
        const { data: newBlock, error: blockErr } = await supabase
          .from("blocks")
          .insert({
            name: fullBlockName,
            program_id: newSection.program_id,
            year_level: newSection.year_level,
          })
          .select()
          .single();
        if (blockErr) throw blockErr;
        targetBlockId = newBlock.id;
      }

      // 3. Link via block_id in teacher_course_loads
      const { error: assignErr } = await supabase
        .from("teacher_course_loads")
        .update({
          block_id: targetBlockId,
        })
        .eq("id", loadData.id);

      if (assignErr) throw assignErr;

      showSuccess("Block created and assigned successfully!");
      setIsAddDialogOpen(false);
      setNewSection((prev) => ({
        ...prev,
        name: "",
        program_id: "",
        year_level: 1
      }));
      fetchSections(); 
    } catch (err: unknown) {
      console.error(err);
      showError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateSection = async () => {
    if (!editingSection || !editingSection.block_id) return;
    try {
      const { error } = await supabase
        .from("blocks")
        .update({
          name: editingSection.name,
        })
        .eq("id", editingSection.block_id);

      if (error) throw error;

      setSections((prev) =>
        prev.map((s) =>
          s.id === editingSection.id ? { ...s, ...editingSection } : s,
        ),
      );
      setIsEditDialogOpen(false);
      showSuccess("Block updated!");
    } catch (err) {
      console.error(err);
      showError("Failed to update block.");
    }
  };

  const handleRemoveProgram = (prog: string) => {
    showWarning(
      `Are you sure you want to remove the ${prog} program and all its blocks?`,
      {
        title: "Remove Program",
        showCancel: true,
        onConfirm: async () => {
          try {
            const sectionsToDelete = sections.filter((s) => {
              if (prog === "Other Programs") {
                return !s.name.includes("-") && !s.name.includes(" ");
              }
              return (
                s.name === prog ||
                s.name.startsWith(prog + " ") ||
                s.name.startsWith(prog + "-")
              );
            });

            if (sectionsToDelete.length === 0) return;

            const idsToDelete = sectionsToDelete.map((s) => s.id);

            const { error } = await supabase
              .from("teacher_course_loads")
              .update({ block_id: null })
              .in("id", idsToDelete);

            if (error) throw error;

            setSections((prev) =>
              prev.filter((s) => !idsToDelete.includes(s.id)),
            );
            showSuccess(`Program ${prog} and its blocks removed.`);
          } catch (err) {
            console.error(err);
            showError("Failed to remove program.");
          }
        },
      },
    );
  };

  const handleDeleteSection = (id: string) => {
    showWarning("Are you sure you want to unassign this block?", {
      title: "Unassign Block",
      showCancel: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from("teacher_course_loads")
          .update({ block_id: null })
          .eq("id", id);
        if (!error) {
          setSections((prev) => prev.filter((s) => s.id !== id));
          showSuccess("Block unassigned.");
        } else {
          showError("Failed to unassign block.");
        }
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 relative">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-neutral-200 pb-4">
        <button
          onClick={onBack}
          className="p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg transition-colors shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-1 px-2.5 bg-primary/10 text-primary font-mono font-bold text-sm rounded-md">
              {course.course_code}
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 leading-none">
              {course.course_title}
            </h1>
          </div>
          <p className="text-neutral-500 text-sm mt-1.5 flex items-center gap-1.5">
            {selectedProgram ? (
              <>
                <span
                  onClick={() => handleProgramSelect(null)}
                  className="cursor-pointer hover:underline hover:text-primary"
                >
                  Programs
                </span>
                <span>/</span>
                <span className="font-semibold text-neutral-700">
                  {selectedProgram} Blocks
                </span>
              </>
            ) : (
              "Select a Program"
            )}
          </p>
        </div>
        {selectedProgram && (
          <Button
            onClick={() => {
              setNewSection((prev) => ({ ...prev, blockPart: "" }));
              setIsAddDialogOpen(true);
            }}
            className="bg-primary text-white font-medium shadow-md flex items-center gap-2"
          >
            <Plus size={18} />
            Add Block
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary w-8 h-8" />
        </div>
      ) : !selectedProgram ? (
        // --- PROGRAMS VIEW ---
        <div className="space-y-6">
          {programs.length === 0 ? (
            <Card className="p-12 text-center bg-neutral-50 border-neutral-200 shadow-inner">
              <Folder className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-neutral-700 mb-1">
                No Programs Found
              </h3>
              <p className="text-neutral-500 text-sm mb-6">
                Create the first program to start adding class blocks to this
                course.
              </p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-primary text-white mx-auto"
              >
                <Plus size={16} className="mr-2 inline" /> Add Program
              </Button>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-neutral-800">
                  Programs Enrolled in {course.course_code}
                </h2>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  variant="outline"
                  className="text-primary hover:text-primary-600 border-primary/20 hover:border-primary/40 text-xs px-3 py-1.5"
                >
                  <Plus size={14} className="mr-1 inline" /> Add Program
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {programs.map((prog) => {
                  const count = sections.filter((s) => {
                    if (s.name === prog) return false;
                    if (prog === "Other Programs")
                      return !s.name.includes("-") && !s.name.includes(" ");
                    return (
                      s.name.startsWith(prog + " ") ||
                      s.name.startsWith(prog + "-")
                    );
                  }).length;
                  return (
                    <Card
                      key={prog}
                      onClick={() => handleProgramSelect(prog)}
                      className="p-5 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group bg-white relative overflow-hidden"
                    >
                      <div className="absolute top-3 right-3 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveProgram(prog);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove programs
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                        <Folder size={100} />
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <Folder size={20} />
                        </div>
                        <h3 className="font-bold text-lg text-neutral-900">
                          {prog}
                        </h3>
                      </div>
                      <p className="text-sm text-neutral-500 flex items-center gap-1.5">
                        <Users size={14} /> {count} Block
                        {count !== 1 ? "s" : ""}
                      </p>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        // --- BLOCKS VIEW ---
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          {filteredSections.length === 0 ? (
            <div className="p-20 text-center">
              <Users className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
              <p className="text-neutral-500">
                No blocks found in this program.
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-neutral-50/80 text-neutral-500 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4">BLOCK NAME</th>
                  <th className="px-6 py-4 text-center">STUDENTS</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredSections.map((section) => (
                  <tr
                    key={section.id}
                    className="hover:bg-neutral-50/50 transition-colors group cursor-pointer"
                    onClick={() =>
                      navigate(
                        `/Teacher/Students?courseId=${course.id}&courseCode=${course.course_code}&program=${encodeURIComponent(selectedProgram!)}&section=${encodeURIComponent(section.name)}`,
                      )
                    }
                  >
                    <td className="px-6 py-4">
                      <span className="font-bold text-neutral-800 text-sm">
                        {section.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-neutral-600 font-medium">
                        {section.students_estimated || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSection(section);
                            setIsEditDialogOpen(true);
                          }}
                          className="p-2 text-neutral-400 hover:text-primary bg-white hover:bg-primary/5 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSection(section.id);
                          }}
                          className="p-2 text-neutral-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Modal */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <h2 className="text-lg font-bold text-neutral-900">
                Add New Block
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Assign a student block to this course.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">
                  Program
                </label>
                <select
                  value={newSection.program_id}
                  onChange={(e) => setNewSection({ ...newSection, program_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-neutral-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all rounded-lg"
                >
                  <option value="">Select Program</option>
                  {schoolPrograms.map(p => (
                    <option key={p.id} value={p.id}>{p.abbr} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">
                  Year Level
                </label>
                <select
                  value={newSection.year_level}
                  onChange={(e) => setNewSection({ ...newSection, year_level: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-white border border-neutral-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all rounded-lg"
                >
                  {[1, 2, 3, 4, 5].map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">
                  Block Name
                </label>
                <input
                  placeholder="e.g. BSA 1A, BSCS 2B"
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-neutral-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all rounded-lg"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-2">
              <button
                onClick={() => setIsAddDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors rounded-lg"
              >
                Cancel
              </button>
              <Button
                onClick={handleCreateSection}
                disabled={isCreating}
                className="bg-primary text-white text-sm px-6 font-bold shadow-md shadow-primary/20"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Assign Block"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditDialogOpen && editingSection && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <h2 className="text-lg font-bold text-neutral-900">Edit Block</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">
                  Block Name
                </label>
                <input
                  value={editingSection.name}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm outline-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-2">
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="px-4 py-2 text-sm text-neutral-500"
              >
                Cancel
              </button>
              <Button
                onClick={handleUpdateSection}
                className="bg-primary text-white text-sm px-6 font-bold shadow-md shadow-primary/20"
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertComponent />
    </div>
  );
}
