import React, { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Loader2, Edit2, School as SchoolIcon, Layers, X, Hash, GraduationCap, Building2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import type { School, Department, Program } from "../../types/academic";
import { useNotification } from "../../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../components/ui/Button";

export const AdminSchoolsTab: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showNotification } = useNotification();

  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");

  const [schoolForm, setSchoolForm] = useState({
    name: "",
    code: "",
    departments: [] as Department[],
  });
  const [deptForm, setDeptForm] = useState({
    name: "",
    code: "",
    programs: [] as Program[],
  });
  const [programForm, setProgramForm] = useState({ name: "", abbr: "" });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setIsLoading(true);
    try {
      const { data: schoolsData, error: schoolsError } = await supabase
        .from("schools")
        .select(`
          *,
          departments:departments(
            *,
            programs:programs_lookup(*)
          )
        `)
        .order("name");

      if (schoolsError) throw schoolsError;
      setSchools(schoolsData || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSchool = (id: string) => {
    const newExpanded = new Set(expandedSchools);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSchools(newExpanded);
  };

  const toggleDept = (key: string) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDepts(newExpanded);
  };

  const addSchool = async () => {
    if (!schoolForm.name || !schoolForm.code) return;

    try {
      if (editingSchool) {
        const { error } = await supabase
          .from("schools")
          .update({ name: schoolForm.name, code: schoolForm.code })
          .eq("id", editingSchool.id);
        if (error) throw error;
      } else {
        const { data: school, error: schoolError } = await supabase
          .from("schools")
          .insert({ name: schoolForm.name, code: schoolForm.code })
          .select()
          .single();

        if (schoolError) throw schoolError;

        for (const dept of schoolForm.departments) {
          const { data: department, error: deptError } = await supabase
            .from("departments")
            .insert({
              school_id: school.id,
              name: dept.name,
              code: dept.code,
            })
            .select()
            .single();

          if (deptError) throw deptError;

          if (dept.programs && dept.programs.length > 0) {
            const programsToInsert = dept.programs.map((p) => ({
              department_id: department.id,
              name: p.name,
              abbr: p.abbr,
            }));

            const { error: progError } = await supabase
              .from("programs_lookup")
              .insert(programsToInsert);

            if (progError) throw progError;
          }
        }
      }

      await fetchSchools();
      setSchoolForm({ name: "", code: "", departments: [] });
      setEditingSchool(null);
      setShowSchoolModal(false);
      showNotification('success', editingSchool ? "Academic unit synchronized." : "Institutional record established.");
    } catch (error) {
      console.error("Error saving school:", error);
      showNotification('error', "Error saving school. Unique ID conflict or database timeout.");
    }
  };

  const addDepartmentToSchoolForm = () => {
    if (!deptForm.name || !deptForm.code) return;
    setSchoolForm({
      ...schoolForm,
      departments: [
        ...schoolForm.departments,
        {
          name: deptForm.name,
          code: deptForm.code,
          programs: deptForm.programs,
        },
      ],
    });
    setDeptForm({ name: "", code: "", programs: [] });
  };

  const addDepartment = async () => {
    if (!deptForm.name || !deptForm.code || !selectedSchool) return;

    try {
      if (editingDept) {
        const { error } = await supabase
          .from("departments")
          .update({ name: deptForm.name, code: deptForm.code })
          .eq("id", editingDept.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departments").insert({
          school_id: selectedSchool,
          name: deptForm.name,
          code: deptForm.code,
        });
        if (error) throw error;
      }

      await fetchSchools();
      setDeptForm({ name: "", code: "", programs: [] });
      setEditingDept(null);
      setShowDeptModal(false);
    } catch (error) {
      console.error("Error saving department:", error);
    }
  };

  const addProgram = async () => {
    if (!programForm.name || !selectedDept) return;

    try {
      if (editingProgram) {
        const { error } = await supabase
          .from("programs_lookup")
          .update({ name: programForm.name, abbr: programForm.abbr })
          .eq("id", editingProgram.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("programs_lookup").insert({
          department_id: selectedDept,
          name: programForm.name,
          abbr: programForm.abbr,
        });
        if (error) throw error;
      }

      await fetchSchools();
      setProgramForm({ name: "", abbr: "" });
      setEditingProgram(null);
      setShowProgramModal(false);
    } catch (error) {
      console.error("Error saving program:", error);
    }
  };

  const deleteSchool = async (id: string) => {
    if (confirm("Terminate institutional record and cascading dependencies?")) {
      try {
        const { error } = await supabase.from("schools").delete().eq("id", id);
        if (error) throw error;
        await fetchSchools();
      } catch (error) {
        console.error("Error deleting school:", error);
      }
    }
  };

  const deleteDepartment = async (id: string) => {
    if (confirm("Decommission department and associated curriculum?")) {
      try {
        const { error } = await supabase
          .from("departments")
          .delete()
          .eq("id", id);
        if (error) throw error;
        await fetchSchools();
      } catch (error) {
        console.error("Error deleting department:", error);
      }
    }
  };

  const deleteProgram = async (id: string) => {
    if (confirm("Purge program registry?")) {
      try {
        const { error } = await supabase
          .from("programs_lookup")
          .delete()
          .eq("id", id);
        if (error) throw error;
        await fetchSchools();
      } catch (error) {
        console.error("Error deleting program:", error);
      }
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Schools</h1>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mt-1">Manage schools, departments, and programs</p>
        </div>
                <Button
          onClick={() => setShowSchoolModal(true)}
          className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all px-5 h-10 flex items-center gap-2"
        >
          <Plus size={18} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Add School</span>
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
            </div>
            <p className="mt-6 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Loading Data...</p>
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-neutral-200 text-neutral-400">
             <SchoolIcon size={48} className="mx-auto mb-4 opacity-20" />
             <p className="text-[10px] font-bold uppercase tracking-widest">No schools found</p>
          </div>
        ) : (
          <AnimatePresence>
            {schools.map((school, index) => (
              <motion.div
                key={school.id || school.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className={`flex items-center justify-between p-6 ${expandedSchools.has(school.id!) ? 'bg-neutral-50/80 border-b border-neutral-100' : 'bg-white'}`}>
                  <div className="flex items-center gap-5 flex-1 cursor-pointer select-none" onClick={() => toggleSchool(school.id!)}>
                    <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <SchoolIcon size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900 tracking-tight">{school.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">{school.code}</span>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{school.departments.length} Departments</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <button
                      onClick={() => {
                        setEditingSchool(school);
                        setSchoolForm({ name: school.name, code: school.code, departments: [] });
                        setShowSchoolModal(true);
                      }}
                      className="p-2.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSchool(school.id!);
                        setShowDeptModal(true);
                      }}
                      className="p-2.5 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    >
                      <Plus size={20} />
                    </button>
                    <button
                      onClick={() => deleteSchool(school.id!)}
                      className="p-2.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="w-px h-6 bg-neutral-100 mx-2" />
                    <button 
                      onClick={() => toggleSchool(school.id!)} 
                      className={`p-2.5 rounded-xl transition-colors ${expandedSchools.has(school.id!) ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-neutral-50 text-neutral-400 hover:bg-neutral-100'}`}
                    >
                      <ChevronDown size={20} className={`translate-all duration-300 ${expandedSchools.has(school.id!) ? 'rotate-180' : 'rotate-0'}`} />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedSchools.has(school.id!) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-8 space-y-6 bg-neutral-50/30">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Departments</h4>
                        </div>
                        
                        {school.departments.length === 0 ? (
                           <div className="py-12 bg-white rounded-3xl border-2 border-dashed border-neutral-100 text-center">
                              <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">No departments found</p>
                           </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {school.departments.map((dept) => {
                              const deptKey = `${school.code}-${dept.code}`;
                              const isExpanded = expandedDepts.has(deptKey);
                              return (
                                <div key={dept.id || dept.code} className={`group bg-white rounded-[2rem] border transition-all duration-300 ${isExpanded ? 'border-primary/20 shadow-xl' : 'border-neutral-100 shadow-sm hover:border-neutral-200'}`}>
                                  <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                      <div className="w-10 h-10 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-600 group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Layers size={18} />
                                      </div>
                                      <div className="flex gap-1 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => {
                                            setEditingDept(dept);
                                            setDeptForm({ name: dept.name, code: dept.code, programs: [] });
                                            setSelectedSchool(school.id!);
                                            setShowDeptModal(true);
                                          }}
                                          className="p-1.5 text-neutral-400 hover:text-blue-600 transition-colors"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedSchool(school.id!);
                                            setSelectedDept(dept.id!);
                                            setShowProgramModal(true);
                                          }}
                                          className="p-1.5 text-neutral-400 hover:text-primary transition-colors"
                                        >
                                          <Plus size={16} />
                                        </button>
                                        <button
                                          onClick={() => deleteDepartment(dept.id!)}
                                          className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    
                                    <h5 className="font-bold text-neutral-900 tracking-tight leading-tight mb-1">{dept.name}</h5>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">{dept.code}</p>
                                    
                                    <button 
                                      onClick={() => toggleDept(deptKey)}
                                      className="w-full flex items-center justify-between p-3 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-colors text-xs font-bold text-neutral-500"
                                    >
                                      <span>{dept.programs?.length || 0} Programs</span>
                                      <ChevronRight size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'rotate-0'}`} />
                                    </button>
                                  </div>

                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-neutral-50"
                                      >
                                        <div className="p-4 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                          {(dept.programs && dept.programs.length > 0) ? (
                                            dept.programs.map((program) => (
                                              <div key={program.id || program.name} className="flex items-center justify-between p-3 bg-neutral-50/50 rounded-xl hover:bg-neutral-50 transition-colors group/prog">
                                                <div>
                                                  <p className="text-xs font-bold text-neutral-700 leading-none mb-1">{program.name}</p>
                                                  {program.abbr && <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{program.abbr}</p>}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover/prog:opacity-100 transition-opacity">
                                                  <button
                                                    onClick={() => {
                                                      setEditingProgram(program);
                                                      setProgramForm({ name: program.name, abbr: program.abbr });
                                                      setSelectedDept(dept.id!);
                                                      setShowProgramModal(true);
                                                    }}
                                                    className="p-1 text-neutral-400 hover:text-blue-600"
                                                  >
                                                    <Edit2 size={12} />
                                                  </button>
                                                  <button
                                                    onClick={() => deleteProgram(program.id!)}
                                                    className="p-1 text-neutral-400 hover:text-red-600"
                                                  >
                                                    <Trash2 size={12} />
                                                  </button>
                                                </div>
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest text-center py-4 italic">No Programs</p>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add School Modal */}
      <AnimatePresence>
        {showSchoolModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-neutral-100"
            >
              <div className="px-8 py-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary rounded-2xl text-white shadow-lg">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight">{editingSchool ? "Update School" : "Add School"}</h2>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">School Information</p>
                  </div>
                </div>
                <button onClick={() => setShowSchoolModal(false)} className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Institutional Name</label>
                    <input
                      type="text"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                      className="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                      placeholder="e.g. University of Perpetual Growth"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Acronym / Code</label>
                    <div className="relative group">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={14} />
                      <input
                        type="text"
                        value={schoolForm.code}
                        onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value })}
                        className="w-full h-12 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all uppercase"
                        placeholder="UPG"
                      />
                    </div>
                  </div>
                </div>

                {!editingSchool && (
                  <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-6">
                    <div>
                      <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Bootstrapping</h3>
                      <p className="text-xs text-neutral-500">Initialize with foundational departmental units.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={deptForm.name}
                        onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                        className="h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-bold transition-all shadow-sm"
                        placeholder="Segment Name"
                      />
                      <input
                        type="text"
                        value={deptForm.code}
                        onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                        className="h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-bold transition-all shadow-sm uppercase"
                        placeholder="ID"
                      />
                    </div>
                    <Button
                      onClick={addDepartmentToSchoolForm}
                      variant="outline"
                      className="w-full h-10 rounded-xl bg-white border-neutral-200 hover:border-primary hover:text-primary transition-all text-[10px] font-bold uppercase tracking-widest"
                    >
                      <Plus size={16} className="mr-2" /> Add Department To Queue
                    </Button>

                    {schoolForm.departments.length > 0 && (
                      <div className="space-y-2">
                        {schoolForm.departments.map((d, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-white border border-neutral-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-500 font-bold text-[10px]">{d.code}</div>
                              <span className="text-xs font-bold text-neutral-700">{d.name}</span>
                            </div>
                            <button
                              onClick={() => setSchoolForm({ ...schoolForm, departments: schoolForm.departments.filter((_, idx) => idx !== i) })}
                              className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-8 py-6 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSchoolModal(false);
                    setSchoolForm({ name: "", code: "", departments: [] });
                    setEditingSchool(null);
                  }}
                  className="rounded-2xl border-neutral-200 px-6"
                >
                  Discard
                </Button>
                <Button 
                  onClick={addSchool} 
                  className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20 px-8 h-10 min-w-[140px]"
                >
                  {editingSchool ? "Save Changes" : "Save School"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dept Modal */}
      <AnimatePresence>
        {showDeptModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-neutral-100"
            >
              <div className="px-8 py-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
                    <Layers size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight">{editingDept ? "Modify Segment" : "New Department"}</h2>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Academic Subdivision</p>
                  </div>
                </div>
                <button onClick={() => setShowDeptModal(false)} className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Official Segment Name</label>
                  <input
                    type="text"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    className="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                    placeholder="e.g. College of Applied Science"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Internal Reference ID</label>
                  <input
                    type="text"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    className="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all uppercase"
                    placeholder="CAS"
                  />
                </div>
              </div>

              <div className="px-8 py-6 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeptModal(false);
                    setEditingDept(null);
                    setDeptForm({ name: "", code: "", programs: [] });
                  }}
                  className="rounded-2xl border-neutral-200 px-6"
                >
                  Abort
                </Button>
                <Button 
                  onClick={addDepartment} 
                  className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20 px-8 h-10 min-w-[120px]"
                >
                  {editingDept ? "Synchronize" : "Establish Unit"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Program Modal */}
      <AnimatePresence>
        {showProgramModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-neutral-100"
            >
              <div className="px-8 py-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight">{editingProgram ? "Refine Program" : "Curriculum Registry"}</h2>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Degree Specification</p>
                  </div>
                </div>
                <button onClick={() => setShowProgramModal(false)} className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Official Program Title</label>
                  <input
                    type="text"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                    className="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all"
                    placeholder="e.g. Bachelor of Science in Artificial Intelligence"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Abbreviation / Hash</label>
                  <input
                    type="text"
                    value={programForm.abbr}
                    onChange={(e) => setProgramForm({ ...programForm, abbr: e.target.value })}
                    className="w-full h-12 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-bold transition-all uppercase"
                    placeholder="BSAI"
                  />
                </div>
              </div>

              <div className="px-8 py-6 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProgramModal(false);
                    setEditingProgram(null);
                    setProgramForm({ name: "", abbr: "" });
                  }}
                  className="rounded-2xl border-neutral-200 px-6"
                >
                  Discard
                </Button>
                <Button 
                  onClick={addProgram} 
                  className="rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200 px-8 h-10 min-w-[120px]"
                >
                  {editingProgram ? "Update Record" : "Integrate Program"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
