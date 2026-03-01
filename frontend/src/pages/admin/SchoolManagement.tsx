import React, { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Loader2, Edit2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

interface Program {
  id?: string;
  department_id?: string;
  name: string;
  abbr: string;
}

interface Department {
  id?: string;
  school_id?: string;
  code: string;
  name: string;
  programs: Program[];
}

interface School {
  id?: string;
  name: string;
  code: string;
  departments: Department[];
}

const SchoolManagement: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(
    new Set(),
  );
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
        // Update existing school
        const { error } = await supabase
          .from("schools")
          .update({ name: schoolForm.name, code: schoolForm.code })
          .eq("id", editingSchool.id);
        if (error) throw error;
      } else {
        // Insert new school
        const { data: school, error: schoolError } = await supabase
          .from("schools")
          .insert({ name: schoolForm.name, code: schoolForm.code })
          .select()
          .single();

        if (schoolError) throw schoolError;

        // Insert Departments and their Programs if any
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

          if (dept.programs.length > 0) {
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
    } catch (error) {
      console.error("Error saving school:", error);
      alert("Error saving school. Please check if the code is unique.");
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

  const addProgramToDeptForm = () => {
    if (!programForm.name || !programForm.abbr) return;
    setDeptForm({
      ...deptForm,
      programs: [
        ...deptForm.programs,
        { name: programForm.name, abbr: programForm.abbr },
      ],
    });
    setProgramForm({ name: "", abbr: "" });
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
    if (confirm("Delete this school and all its departments?")) {
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
    if (confirm("Delete this department and all its programs?")) {
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
    if (confirm("Delete this program?")) {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-900">
          School Management
        </h1>
        <button
          onClick={() => setShowSchoolModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus size={18} /> Add School
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
            <p>Loading school data...</p>
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed border-neutral-300 text-neutral-500">
            <p>No schools found. Add your first school to get started.</p>
          </div>
        ) : (
          schools.map((school) => (
            <div
              key={school.id || school.code}
              className="bg-white rounded-lg border border-neutral-200 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 bg-neutral-50">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => toggleSchool(school.id!)}
                    className="text-neutral-600 hover:text-neutral-900"
                  >
                    {expandedSchools.has(school.id!) ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>
                  <div>
                    <h3 className="font-semibold text-neutral-900">
                      {school.name}
                    </h3>
                    <p className="text-sm text-neutral-500">
                      Code: {school.code}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingSchool(school);
                      setSchoolForm({ name: school.name, code: school.code, departments: [] });
                      setShowSchoolModal(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSchool(school.id!);
                      setShowDeptModal(true);
                    }}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    onClick={() => deleteSchool(school.id!)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {expandedSchools.has(school.id!) && (
                <div className="p-4 space-y-3">
                  {school.departments.length === 0 ? (
                    <p className="text-sm text-neutral-500 italic">
                      No departments yet
                    </p>
                  ) : (
                    school.departments.map((dept) => {
                      const deptKey = `${school.code}-${dept.code}`;
                      return (
                        <div
                          key={dept.id || dept.code}
                          className="border border-neutral-200 rounded-lg overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-3 bg-neutral-50">
                            <div className="flex items-center gap-2 flex-1">
                              <button
                                onClick={() => toggleDept(deptKey)}
                                className="text-neutral-600 hover:text-neutral-900"
                              >
                                {expandedDepts.has(deptKey) ? (
                                  <ChevronDown size={18} />
                                ) : (
                                  <ChevronRight size={18} />
                                )}
                              </button>
                              <div>
                                <h4 className="font-medium text-neutral-900">
                                  {dept.name}
                                </h4>
                                <p className="text-xs text-neutral-500">
                                  Code: {dept.code}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingDept(dept);
                                  setDeptForm({ name: dept.name, code: dept.code, programs: [] });
                                  setSelectedSchool(school.id!);
                                  setShowDeptModal(true);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedSchool(school.id!);
                                  setSelectedDept(dept.id!);
                                  setShowProgramModal(true);
                                }}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                              >
                                <Plus size={16} />
                              </button>
                              <button
                                onClick={() => deleteDepartment(dept.id!)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {expandedDepts.has(deptKey) && (
                            <div className="p-3 bg-white space-y-2">
                              {dept.programs.length === 0 ? (
                                <p className="text-xs text-neutral-500 italic">
                                  No programs yet
                                </p>
                              ) : (
                                dept.programs.map((program) => (
                                  <div
                                    key={program.id || program.name}
                                    className="flex items-center justify-between p-2 bg-neutral-50 rounded"
                                  >
                                    <span className="text-sm text-neutral-700">
                                      {program.name}{" "}
                                      {program.abbr && `(${program.abbr})`}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingProgram(program);
                                          setProgramForm({ name: program.name, abbr: program.abbr });
                                          setSelectedDept(dept.id!);
                                          setShowProgramModal(true);
                                        }}
                                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        onClick={() => deleteProgram(program.id!)}
                                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add School Modal */}
      {showSchoolModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingSchool ? "Edit School" : "Add School"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  School Name
                </label>
                <input
                  type="text"
                  value={schoolForm.name}
                  onChange={(e) =>
                    setSchoolForm({ ...schoolForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Laguna University"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  School Code
                </label>
                <input
                  type="text"
                  value={schoolForm.code}
                  onChange={(e) =>
                    setSchoolForm({ ...schoolForm, code: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., LU"
                />
              </div>

              {/* Departments Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-neutral-900">
                    Departments
                  </h3>
                </div>

                {schoolForm.departments.map((dept, idx) => (
                  <div key={idx} className="mb-3 p-3 bg-neutral-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {dept.name} ({dept.code})
                        </p>
                        {dept.programs.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {dept.programs.map((prog, pIdx) => (
                              <p
                                key={pIdx}
                                className="text-xs text-neutral-600 ml-4"
                              >
                                • {prog.name}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setSchoolForm({
                            ...schoolForm,
                            departments: schoolForm.departments.filter(
                              (_, i) => i !== idx,
                            ),
                          })
                        }
                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Department Form */}
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Department Name
                    </label>
                    <input
                      type="text"
                      value={deptForm.name}
                      onChange={(e) =>
                        setDeptForm({ ...deptForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., College of Computing Studies"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Department Code
                    </label>
                    <input
                      type="text"
                      value={deptForm.code}
                      onChange={(e) =>
                        setDeptForm({ ...deptForm, code: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., CSS"
                    />
                  </div>

                  {/* Programs in Department */}
                  {deptForm.programs.length > 0 && (
                    <div className="space-y-1">
                      {deptForm.programs.map((prog, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-2 bg-white rounded"
                        >
                          <span className="text-xs">{prog.name}</span>
                          <button
                            onClick={() =>
                              setDeptForm({
                                ...deptForm,
                                programs: deptForm.programs.filter(
                                  (_, i) => i !== idx,
                                ),
                              })
                            }
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Program to Department */}
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={programForm.name}
                      onChange={(e) =>
                        setProgramForm({ ...programForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Program name (e.g., Bachelor of Science in Computer Science)"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={programForm.abbr}
                        onChange={(e) =>
                          setProgramForm({
                            ...programForm,
                            abbr: e.target.value,
                          })
                        }
                        className="w-32 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Abbr (e.g., BSCS)"
                      />
                      <button
                        onClick={addProgramToDeptForm}
                        className="flex-1 px-3 py-2 text-sm bg-white border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus size={14} /> Add Program
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={addDepartmentToSchoolForm}
                    className="w-full px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> Add Department
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t pt-4">
                <button
                  onClick={() => {
                    setShowSchoolModal(false);
                    setSchoolForm({ name: "", code: "", departments: [] });
                    setDeptForm({ name: "", code: "", programs: [] });
                    setProgramForm({ name: "", abbr: "" });
                    setEditingSchool(null);
                  }}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addSchool}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  {editingSchool ? "Update School" : "Add School"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingDept ? "Edit Department" : "Add Department"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  value={deptForm.name}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., College of Computing Studies"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Department Code
                </label>
                <input
                  type="text"
                  value={deptForm.code}
                  onChange={(e) =>
                    setDeptForm({ ...deptForm, code: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., CSS"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowDeptModal(false);
                    setEditingDept(null);
                    setDeptForm({ name: "", code: "", programs: [] });
                  }}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addDepartment}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  {editingDept ? "Update Department" : "Add Department"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Program Modal */}
      {showProgramModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingProgram ? "Edit Program" : "Add Program"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Program Name
                </label>
                <input
                  type="text"
                  value={programForm.name}
                  onChange={(e) =>
                    setProgramForm({ ...programForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Bachelor of Science in Computer Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Abbreviation
                </label>
                <input
                  type="text"
                  value={programForm.abbr}
                  onChange={(e) =>
                    setProgramForm({ ...programForm, abbr: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., BSCS"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowProgramModal(false);
                    setEditingProgram(null);
                    setProgramForm({ name: "", abbr: "" });
                  }}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addProgram}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  {editingProgram ? "Update Program" : "Add Program"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolManagement;
