import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Users, Folder, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { useAlert } from '../../hooks/useAlert';
import type { Course, Section } from '../../types/academic';

interface CourseSectionsViewProps {
  course: Course;
  onBack: () => void;
}

interface DepartmentLookup {
  id: string;
  name: string;
  code: string;
}

interface ProgramLookup {
  id: string;
  department_id: string;
  name: string;
  abbr: string;
}

export function CourseSectionsView({ course, onBack }: CourseSectionsViewProps) {
  const { showSuccess, showError, showWarning, AlertComponent } = useAlert();
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  const [departments, setDepartments] = useState<DepartmentLookup[]>([]);
  const [schoolPrograms, setSchoolPrograms] = useState<ProgramLookup[]>([]);

  // Modal states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [newSection, setNewSection] = useState<{
    selectedDepartmentId: string;
    selectedProgramAbbrs: string[];
    blockPart: string;
    term: string;
    students: string;
  }>({
    selectedDepartmentId: '',
    selectedProgramAbbrs: [],
    blockPart: '',
    term: '1st Semester',
    students: '0'
  });
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  useEffect(() => {
    fetchSections();
    fetchSchoolCatalogs();
  }, [course.id]);

  const fetchSchoolCatalogs = async () => {
    try {
      if (!course.school_id) return;
      
      const { data: deptData } = await supabase
        .from('departments')
        .select('*')
        .eq('school_id', course.school_id);

      setDepartments(deptData || []);

      if (deptData && deptData.length > 0) {
        const { data: progData } = await supabase
          .from('programs_lookup')
          .select('*')
          .in('department_id', deptData.map(d => d.id));
        setSchoolPrograms(progData || []);
      }
    } catch (err) {
      console.error("Error fetching school catalogs:", err);
    }
  };

  const fetchSections = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('course_id', course.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSections(data || []);
    } catch (err: any) {
      console.error(err);
      showError('Failed to load blocks.');
    } finally {
      setIsLoading(false);
    }
  };

  // Derive programs from section names
  const programs = useMemo(() => {
    const progSet = new Set<string>();
    sections.forEach(s => {
      let prog = s.name.trim();

      // If it's something like "BSIT-BA 4B" (separated by space)
      const spaceIdx = prog.indexOf(' ');
      if (spaceIdx > 0) {
        prog = prog.substring(0, spaceIdx);
      } else {
        // Legacy support: "BSCS-1A" (separated by dash)
        // If the section name has a dash, but isn't explicitly defined as a full program in school catalogs
        const dashIdx = prog.indexOf('-');
        if (dashIdx > 0 && !schoolPrograms.some(p => p.abbr === prog)) {
          prog = prog.substring(0, dashIdx);
        }
      }

      progSet.add(prog || "Other Programs");
    });
    return Array.from(progSet).sort();
  }, [sections, schoolPrograms]);

  // If a program is selected, filter sections
  const filteredSections = useMemo(() => {
    if (!selectedProgram) return [];
    return sections.filter(s => {
      // Hide the program folder placeholder itself from the blocks list
      if (s.name === selectedProgram) return false;
      
      if (selectedProgram === "Other Programs") {
        return !s.name.includes('-') && !s.name.includes(' ');
      }
      return s.name.startsWith(selectedProgram + ' ') || s.name.startsWith(selectedProgram + '-');
    });
  }, [sections, selectedProgram]);

  const handleCreateSection = async () => {
    const isAddingProgramLevel = !selectedProgram || selectedProgram === "Other Programs";

    if (!isAddingProgramLevel && !newSection.blockPart) {
      showError("Please enter a block name.");
      return;
    }

    if (isAddingProgramLevel && newSection.selectedProgramAbbrs.length === 0) {
      showError("Please select at least one program.");
      return;
    }
    
    setIsCreating(true);
    try {
      const inserts = [];
      if (isAddingProgramLevel) {
        for (const abbr of newSection.selectedProgramAbbrs) {
          inserts.push({
            course_id: course.id,
            name: abbr, // Just the program abbreviation
            term: "1st Semester",
            students_estimated: 0,
          });
        }
      } else {
        inserts.push({
          course_id: course.id,
          name: `${selectedProgram} ${newSection.blockPart.toUpperCase()}`,
          term: newSection.term,
          students_estimated: parseInt(newSection.students, 10) || 0,
        });
      }

      const { data, error } = await supabase
        .from('sections')
        .insert(inserts)
        .select('*');
        
      if (error) {
        if (error.code === '23505') showError("A block with this name and term already exists.");
        else throw error;
      } else if (data) {
        setSections(prev => [...data, ...prev]);
        showSuccess(isAddingProgramLevel ? "Programs/Blocks created successfully!" : "Block created successfully!");
        setIsAddDialogOpen(false);
        setNewSection({ selectedDepartmentId: '', selectedProgramAbbrs: [], blockPart: '', term: '1st Semester', students: '0' });
      }
    } catch (err: any) {
      console.error(err);
      showError("Unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateSection = async () => {
    if (!editingSection) return;
    try {
      const { error } = await supabase
        .from('sections')
        .update({
          name: editingSection.name,
          term: editingSection.term,
          students_estimated: editingSection.students_estimated,
        })
        .eq('id', editingSection.id);
        
      if (error) throw error;
      
      setSections(prev => prev.map(s => s.id === editingSection.id ? { ...s, ...editingSection } : s));
      setIsEditDialogOpen(false);
      showSuccess("Block updated!");
    } catch (err) {
       console.error(err);
       showError("Failed to update block.");
    }
  };

  const handleDeleteSection = (id: number) => {
    showWarning("Are you sure you want to delete this block?", {
      title: "Delete Block",
      showCancel: true,
      onConfirm: async () => {
        const { error } = await supabase.from('sections').delete().eq('id', id);
        if (!error) {
           setSections(prev => prev.filter(s => s.id !== id));
           showSuccess("Block deleted.");
        } else {
           showError("Failed to delete block.");
        }
      }
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
             <h1 className="text-2xl font-bold text-neutral-900 leading-none">{course.course_title}</h1>
          </div>
          <p className="text-neutral-500 text-sm mt-1.5 flex items-center gap-1.5">
            {selectedProgram ? (
              <>
                <span onClick={() => setSelectedProgram(null)} className="cursor-pointer hover:underline hover:text-primary">Programs</span>
                <span>/</span>
                <span className="font-semibold text-neutral-700">{selectedProgram} Blocks</span>
              </>
            ) : "Select a Program"}
          </p>
        </div>
        {selectedProgram && (
           <Button
             onClick={() => {
               setNewSection(prev => ({ ...prev, name: '' }));
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
                <h3 className="text-lg font-bold text-neutral-700 mb-1">No Programs Found</h3>
                <p className="text-neutral-500 text-sm mb-6">Create the first program to start adding class blocks to this course.</p>
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary text-white mx-auto">
                   <Plus size={16} className="mr-2 inline" /> Add Program
                </Button>
             </Card>
           ) : (
             <>
               <div className="flex justify-between items-center">
                 <h2 className="text-lg font-bold text-neutral-800">Programs Enrolled in {course.course_code}</h2>
                 <Button onClick={() => setIsAddDialogOpen(true)} className="bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs px-3 py-1.5">
                    <Plus size={14} className="mr-1 inline" /> Add Program
                 </Button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                 {programs.map(prog => {
                   const count = sections.filter(s => prog === "Other Programs" ? !s.name.includes('-') : s.name.startsWith(prog + '-')).length;
                   return (
                     <Card 
                       key={prog} 
                       onClick={() => setSelectedProgram(prog)}
                       className="p-5 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group bg-white relative overflow-hidden"
                     >
                       <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                         <Folder size={100} />
                       </div>
                       <div className="flex items-center gap-3 mb-3">
                         <div className="p-2.5 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                           <Folder size={20} />
                         </div>
                         <h3 className="font-bold text-lg text-neutral-900">{prog}</h3>
                       </div>
                       <p className="text-sm text-neutral-500 flex items-center gap-1.5">
                         <Users size={14} /> {count} Block{count !== 1 ? 's' : ''}
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
                <p className="text-neutral-500">No blocks found in this program.</p>
             </div>
          ) : (
             <table className="w-full text-left">
               <thead className="bg-neutral-50/80 text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-200">
                 <tr>
                   <th className="px-6 py-4 font-bold">Block Name</th>
                   <th className="px-6 py-4 font-bold">Term</th>
                   <th className="px-6 py-4 font-bold text-center">Est. Students</th>
                   <th className="px-6 py-4 font-bold text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-neutral-100">
                 {filteredSections.map(section => (
                   <tr key={section.id} className="hover:bg-neutral-50/50 transition-colors group">
                     <td className="px-6 py-4">
                       <span className="font-bold text-neutral-800 text-sm">{section.name}</span>
                     </td>
                     <td className="px-6 py-4">
                       <span className="inline-block px-2.5 py-1 bg-neutral-100 text-neutral-600 text-xs rounded font-medium">
                         {section.term}
                       </span>
                     </td>
                     <td className="px-6 py-4 text-center">
                       <span className="text-sm text-neutral-600 font-medium">{section.students_estimated}</span>
                     </td>
                     <td className="px-6 py-4">
                       <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => { setEditingSection(section); setIsEditDialogOpen(true); }}
                           className="p-2 text-neutral-400 hover:text-primary bg-white hover:bg-primary/5 rounded-lg transition-all"
                         >
                           <Edit2 size={16} />
                         </button>
                         <button 
                           onClick={() => handleDeleteSection(section.id)}
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <h2 className="text-lg font-bold text-neutral-900">
                {!selectedProgram ? "Add New Program" : "Add New Block"}
              </h2>
              {selectedProgram && selectedProgram !== "Other Programs" && (
                <p className="text-xs text-neutral-500 mt-1">For program: <span className="font-bold text-primary">{selectedProgram}</span></p>
              )}
            </div>
            <div className="p-6 space-y-4">
              {!selectedProgram ? (
                <div className="max-h-80 overflow-y-auto space-y-3">
                  {departments.map(dept => {
                    const deptPrograms = schoolPrograms.filter(p => p.department_id === dept.id);
                    if (deptPrograms.length === 0) return null;
                    return (
                      <div key={dept.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                        <details className="group">
                          <summary className="flex items-center justify-between p-3 bg-neutral-50 cursor-pointer user-select-none font-medium text-sm text-neutral-800 hover:bg-neutral-100 transition-colors">
                            {dept.code} - {dept.name}
                            <span className="text-neutral-400 group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="p-2 bg-white border-t border-neutral-200">
                            {deptPrograms.map(prog => {
                              const alreadyAdded = programs.includes(prog.abbr);
                              return (
                                <label 
                                  key={prog.id} 
                                  className={`flex items-center gap-2 p-2 rounded ${alreadyAdded ? 'opacity-60 cursor-not-allowed bg-neutral-50' : 'hover:bg-neutral-50 cursor-pointer'}`}
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={alreadyAdded || newSection.selectedProgramAbbrs.includes(prog.abbr)}
                                    disabled={alreadyAdded}
                                    onChange={(e) => {
                                      if (alreadyAdded) return;
                                      if (e.target.checked) {
                                        setNewSection(prev => ({ ...prev, selectedProgramAbbrs: [...prev.selectedProgramAbbrs, prog.abbr] }));
                                      } else {
                                        setNewSection(prev => ({ ...prev, selectedProgramAbbrs: prev.selectedProgramAbbrs.filter(a => a !== prog.abbr) }));
                                      }
                                    }}
                                    className={`rounded border-neutral-300 text-primary ${alreadyAdded ? '' : 'focus:ring-primary'}`}
                                  />
                                  <span className="text-sm font-bold text-neutral-800">
                                    {prog.abbr} {alreadyAdded && <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm ml-1">Added</span>}
                                  </span>
                                  <span className="text-xs text-neutral-500 truncate">- {prog.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </details>
                      </div>
                    );
                  })}
                  {departments.length === 0 && (
                    <p className="text-sm text-neutral-500 p-4 text-center">No departments loaded.</p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Block</label>
                    <div className="flex items-center">
                      <span className="px-3 py-2.5 bg-neutral-100 border border-neutral-200 border-r-0 rounded-l-lg text-sm text-neutral-500 font-medium border-r-transparent">
                        {selectedProgram}{" "}
                      </span>
                      <input
                        placeholder="e.g. 1A, 3B"
                        value={newSection.blockPart}
                        onChange={(e) => setNewSection({...newSection, blockPart: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-neutral-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all rounded-r-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Term</label>
                    <select
                      value={newSection.term}
                      onChange={(e) => setNewSection({...newSection, term: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary/20 text-sm transition-all outline-none"
                    >
                      <option value="1st Semester">1st Semester</option>
                      <option value="2nd Semester">2nd Semester</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </div>
                </>
              )}
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
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Omitted repetitive boilerplate for brevity) */}
      {isEditDialogOpen && editingSection && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <h2 className="text-lg font-bold text-neutral-900">Edit Block</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Block Name</label>
                <input
                  value={editingSection.name}
                  onChange={(e) => setEditingSection({...editingSection, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Term</label>
                <select
                  value={editingSection.term}
                  onChange={(e) => setEditingSection({...editingSection, term: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm outline-none"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Est. Students</label>
                <input
                  type="number"
                  value={editingSection.students_estimated}
                  onChange={(e) => setEditingSection({...editingSection, students_estimated: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm outline-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-2">
              <button onClick={() => setIsEditDialogOpen(false)} className="px-4 py-2 text-sm text-neutral-500">Cancel</button>
              <Button onClick={handleUpdateSection} className="bg-primary text-white text-sm px-6 font-bold shadow-md shadow-primary/20">Update</Button>
            </div>
          </div>
        </div>
      )}

      <AlertComponent />
    </div>
  );
}
