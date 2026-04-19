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
  X
} from "lucide-react";
import { UnifiedStudentBatchUploadDialog } from "../../components/students/UnifiedStudentBatchUploadDialog";
import { supabase } from "../../lib/supabaseClient";
import { useAlert } from "../../hooks/useAlert";
import { useAcademicContext } from "../../hooks/useAcademicContext";
import { motion, AnimatePresence } from "framer-motion";
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

      const { data: dbUser } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", userData.user.id)
        .single();

      if (!dbUser) return;

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

      const { data: pLoads, error } = await supabase
        .from("teacher_program_loads")
        .select(`
          id,
          course_load_id,
          program_id,
          programs_lookup (id, name, abbr)
        `)
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
        .select(`
          id,
          name,
          year,
          program_load_id,
          block_students (count)
        `)
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

      const { data: blocks } = await supabase
        .from("blocks")
        .select("year, name, teacher_program_loads!fk_block_program_load!inner(program_id)")
        .eq("teacher_program_loads.program_id", selectedProgramLoad.program_id);
      
      if (blocks) {
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

  useEffect(() => {
    if (urlProgramLoadId) {
      if (programLoads.length > 0) {
        const found = programLoads.find((l) => l.id === urlProgramLoadId);
        if (found) {
          setSelectedProgramLoad(prev => prev?.id === found.id ? prev : found);
        }
      }
    } else {
      setSelectedProgramLoad(null);
    }
  }, [urlProgramLoadId, programLoads]);

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

      showSuccess(`Block created successfully! ${enrollmentCount > 0 ? `${enrollmentCount} students auto-enrolled.` : "No matching students found."}`);
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
      "Delete this block? Student enrollments will be removed.",
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
      `Remove ${load.programs_lookup?.abbr}? This will also remove all blocks for this program.`,
      {
        onConfirm: async () => {
          try {
            const { error } = await supabase
              .from("teacher_program_loads")
              .delete()
              .eq("id", load.id);

            if (error) throw error;
            showSuccess("Program removed.");
            fetchProgramLoads();
          } catch (err: any) {
            showError(err.message || "Failed to remove.");
          }
        },
      },
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={selectedProgramLoad ? handleBackToPrograms : onBack}
            className="w-9 h-9 flex items-center justify-center bg-white border border-neutral-100 hover:bg-neutral-50 text-neutral-400 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-neutral-900 leading-tight truncate">
              {selectedProgramLoad
                ? `${selectedProgramLoad.programs_lookup?.abbr}`
                : course.course_title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest truncate">
                {selectedProgramLoad ? selectedProgramLoad.programs_lookup?.name : (course.course_code)}
              </span>
              {!selectedProgramLoad && (
                 <>
                  <span className="text-neutral-200">/</span>
                  <span className="text-[11px] font-bold text-primary uppercase bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
                    {course.departments?.code || "GENERAL"}
                  </span>
                 </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!selectedProgramLoad ? (
            <button
              onClick={() => setIsAddProgramOpen(true)}
              className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus size={14} /> Add Program
            </button>
          ) : (
            <button
              onClick={() => setIsAddBlockOpen(true)}
              className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus size={14} /> Add Block
            </button>
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
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-neutral-50 shadow-sm">
          <Loader2 className="animate-spin text-primary/30 w-8 h-8 mb-4" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Synchronizing loads...</p>
        </div>
      ) : !selectedProgramLoad ? (
        // PROGRAM SELECTION VIEW
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {programLoads.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-neutral-50 shadow-sm">
              <Folder className="w-12 h-12 text-neutral-100 mx-auto mb-4" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                Course Catalog Empty
              </p>
              <p className="text-xs text-neutral-400 mt-2">Start by adding a target program.</p>
            </div>
          ) : (
            programLoads.map((load) => (
              <div
                key={load.id}
                onClick={() => handleProgramClick(load)}
                className="p-5 cursor-pointer rounded-2xl border border-neutral-100 bg-white hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all group relative"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-neutral-50 rounded-xl flex items-center justify-center text-neutral-400 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                    <Folder size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-neutral-800 line-clamp-1">
                      {load.programs_lookup?.abbr}
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider truncate">
                      {load.programs_lookup?.name?.split(' ')[0]} ...
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveProgramLoad(load);
                  }}
                  className="absolute top-3 right-3 p-1.5 text-neutral-200 hover:text-error-default hover:bg-error-default/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        // BLOCKS VIEW
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
          {blocks.length === 0 ? (
            <div className="p-20 text-center">
              <Users className="w-12 h-12 text-neutral-100 mx-auto mb-4" />
               <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                No active blocks
              </p>
              <button
                onClick={() => setIsAddBlockOpen(true)}
                 className="mt-6 text-xs font-bold uppercase tracking-widest text-primary border border-primary/20 px-6 py-2 rounded-full hover:bg-primary/5 transition-all"
              >
                Create Section
              </button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50/50">
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] w-1/2">Section Block</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] text-center">Enrollment</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {blocks.map((block) => (
                  <tr
                    key={block.id}
                    className="hover:bg-neutral-50/30 transition-colors cursor-pointer group"
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
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-primary/20">
                          {block.year}{block.name}
                        </div>
                        <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Year {block.year} • Section {block.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[11px] font-bold px-2.5 py-1 bg-white border border-neutral-100 rounded-lg text-neutral-500 shadow-sm">
                        {block.students_estimated} Students
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBlock(block.id);
                        }}
                        className="p-2 text-neutral-300 hover:text-error-default hover:bg-error-default/5 rounded-xl transition-all"
                      >
                        <Trash2 size={15} />
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
      <AnimatePresence>
        {isAddProgramOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddProgramOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-neutral-50 flex justify-between items-center bg-neutral-50/30">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Add Program</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Link a degree program to this course</p>
                </div>
                <button
                  onClick={() => setIsAddProgramOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {!course.program_id && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.15em] ml-1">
                      {course.department_id ? "Fixed Department" : "Organization Dept"}
                    </label>
                    <select
                      disabled={!!course.department_id}
                      className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-primary/30 transition-all"
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                    >
                      {!course.department_id && <option value="">Select Department...</option>}
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.15em] ml-1">Academic Tracks</label>
                  <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1 pb-2">
                    {(() => {
                      const alreadyAddedIds = new Set(programLoads.map((p) => p.program_id));
                      const filtered = availablePrograms.filter((p) => {
                        if (course.program_id) return p.id === course.program_id;
                        if (course.department_id) return p.department_id === course.department_id;
                        return !selectedDept || p.department_id === selectedDept;
                      });

                      if (filtered.length === 0) return <p className="text-[10px] text-neutral-300 text-center py-4">No tracks found</p>;

                      return filtered.map((p) => {
                        const isAlready = alreadyAddedIds.has(p.id);
                        const isSelected = selectedProgramIds.includes(p.id);

                        return (
                          <button
                            key={p.id}
                            onClick={() => !isAlready && toggleProgramSelection(p.id)}
                            disabled={isAlready}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                              isAlready ? 'bg-neutral-50 border-neutral-50 opacity-40' :
                              isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-neutral-100 hover:border-primary/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'bg-white border-neutral-200'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold leading-none ${isSelected ? 'text-primary' : 'text-neutral-700'}`}>{p.abbr}</p>
                                <p className="text-[9px] text-neutral-400 truncate mt-1">{p.name}</p>
                              </div>
                            </div>
                            {isAlready && <span className="text-[8px] font-bold text-success-default uppercase tracking-tighter">Existing</span>}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-50 flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">
                  {selectedProgramIds.length} Picked
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setIsAddProgramOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-600 transition-colors">Discard</button>
                  <button
                    onClick={handleAddProgramsBatch}
                    disabled={isCreating || selectedProgramIds.length === 0}
                    className="bg-primary text-white px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                     {isCreating ? <Loader2 size={16} className="animate-spin" /> : "Link Program"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Block Modal */}
      <AnimatePresence>
        {isAddBlockOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddBlockOpen(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-neutral-50 flex justify-between items-center bg-neutral-50/30">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">New Block</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Creating section for {selectedProgramLoad?.programs_lookup?.abbr}</p>
                </div>
                <button
                  onClick={() => setIsAddBlockOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.15em] ml-1">Year Level</label>
                    <select
                      className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-primary/30 transition-all font-bold"
                      value={newBlock.year}
                      onChange={(e) => setNewBlock({ ...newBlock, year: parseInt(e.target.value) })}
                    >
                       {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.15em] ml-1">Block Name</label>
                    <input
                      type="text"
                      placeholder="e.g. A"
                      className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-primary/30 transition-all uppercase font-bold"
                      value={newBlock.name}
                      onChange={(e) => setNewBlock({ ...newBlock, name: e.target.value })}
                    />
                  </div>
                </div>

                {selectedProgramLoad && programWideBlocks.length > 0 && (
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-3">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Inherit Existing</span>
                    <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {programWideBlocks.sort((a,b) => a.year - b.year || a.name.localeCompare(b.name)).map((b, idx) => {
                        const active = newBlock.year === b.year && newBlock.name === b.name;
                        return (
                          <button
                            key={idx}
                            onClick={() => setNewBlock({ ...newBlock, year: b.year, name: b.name })}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              active ? 'bg-white border-primary shadow-sm' : 'bg-white/50 border-neutral-100 hover:border-primary/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                               <div className={`w-3 h-3 rounded-full border transition-all ${active ? 'bg-primary border-primary' : 'bg-neutral-200 border-neutral-200'}`} />
                               <span className={`text-[11px] font-bold uppercase ${active ? 'text-primary' : 'text-neutral-500'}`}>{b.year}{b.name}</span>
                            </div>
                            <span className="text-[9px] font-bold text-neutral-300 uppercase">{b.student_count} Students</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-50 flex justify-end gap-2">
                 <button onClick={() => setIsAddBlockOpen(false)} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-600 transition-colors">Abort</button>
                 <button
                    onClick={handleCreateBlock}
                     className="bg-primary text-white px-5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                 >
                    {isCreating ? <Loader2 size={16} className="animate-spin" /> : "Seal & Create"}
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AlertComponent />
    </div>
  );
}
