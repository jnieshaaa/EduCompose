import { useEffect } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Plus, Users, Edit2, Trash2, Loader2, Calendar } from "lucide-react";
import { useSections } from "../../hooks/useSections";
import { useAcademicContext } from "../../hooks/useAcademicContext";
import { UnifiedStudentBatchUploadDialog } from "../../components/students/UnifiedStudentBatchUploadDialog";

export function SectionsTab() {
  const { currentSemester } = useAcademicContext();
  const {
    sections,
    isLoading,
    searchQuery,
    setSearchQuery,
    courseFilter,
    setCourseFilter,
    termFilter,
    setTermFilter,
    isAddDialogOpen,
    setIsAddDialogOpen,
    newSection,
    setNewSection,
    isCreatingSection,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingSection,
    setEditingSection,
    availableCourses,
    handleCreateSection,
    handleDeleteSection,
    handleUpdateSection,
    allPrograms,
    programWideBlocks,
    fetchProgramWideBlocks,
    AlertComponent,
  } = useSections();

  // Set default term when opening dialog
  useEffect(() => {
    if (isAddDialogOpen && currentSemester && !newSection.term) {
      setNewSection(prev => ({ ...prev, term: currentSemester }));
    }
  }, [isAddDialogOpen, currentSemester]);

  useEffect(() => {
    if (newSection.program_id) {
      fetchProgramWideBlocks(newSection.program_id, newSection.course_id);
    }
  }, [newSection.program_id, newSection.course_id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-bold">Classes</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage your classes and student groups</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-primary hover:bg-primary-300"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Class
          </Button>
          <UnifiedStudentBatchUploadDialog 
            courseId={courseFilter !== "All Courses" ? courseFilter : null} 
            onComplete={fetchProgramWideBlocks ? () => fetchProgramWideBlocks(newSection.program_id, newSection.course_id) : undefined} 
          />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="All Courses">All Courses</option>
          {availableCourses.map(c => (
            <option key={c.id} value={c.id}>{c.course_code}</option>
          ))}
        </select>
        <select
          value={termFilter}
          onChange={(e) => setTermFilter(e.target.value)}
          className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="All Terms">All Terms</option>
          <option value="1st Semester">1st Semester</option>
          <option value="2nd Semester">2nd Semester</option>
          <option value="Summer">Summer</option>
        </select>
      </div>

      {/* Sections Display */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : sections.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-700 mb-2">No classes found</h3>
          <p className="text-sm text-neutral-500 mb-4">You don't have any classes for the current academic term.</p>
          <Button
            className="bg-primary hover:bg-primary-300"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Class
          </Button>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 font-semibold">Class Name</th>
                <th className="px-6 py-4 font-semibold">Year/Level</th>
                <th className="px-6 py-4 font-semibold">Course</th>
                <th className="px-6 py-4 font-semibold">Academic Term</th>
                <th className="px-6 py-4 font-semibold">Students</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sections.map((section) => (
                <tr key={section.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-900">{section.name}</td>
                  <td className="px-6 py-4 text-neutral-600">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-semibold">
                      Year {section.year}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    <span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">
                      {(section as any).courses?.course_code}
                    </span>
                    <span className="ml-2">{(section as any).courses?.course_title}</span>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {section.students_estimated}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setEditingSection(section); setIsEditDialogOpen(true); }}
                        className="p-1 text-neutral-400 hover:text-primary transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSection(section)}
                        className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-xl font-bold">Add New Class</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Create New Class (Optional)</label>
                <div className="flex gap-2">
                  <input
                      placeholder="e.g. A"
                      value={newSection.name}
                      onChange={(e) => setNewSection({...newSection, name: e.target.value.toUpperCase()})}
                      className="w-full px-4 py-2 border rounded-lg mt-1 block uppercase"
                  />
                  <select
                      value={newSection.year}
                      onChange={(e) => setNewSection({...newSection, year: parseInt(e.target.value)})}
                      className="px-4 py-2 border rounded-lg mt-1 bg-white"
                  >
                      {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Y{y}</option>)}
                  </select>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Use this if the class doesn't exist below yet.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase">Course</label>
                <select
                    value={newSection.course_id}
                    onChange={(e) => setNewSection({...newSection, course_id: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg mt-1"
                >
                    <option value="">Select Course</option>
                    {availableCourses.map(c => <option key={c.id} value={c.id}>{c.course_code} - {c.course_title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Program</label>
                  <select
                      value={newSection.program_id}
                      onChange={(e) => setNewSection({...newSection, program_id: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg mt-1"
                  >
                      <option value="">Select Program</option>
                      {allPrograms.map((p: any) => <option key={p.id} value={p.id}>{p.abbr || p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Year Level</label>
                  <select
                      value={newSection.year}
                      onChange={(e) => setNewSection({...newSection, year: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 border rounded-lg mt-1"
                  >
                      {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
              </div>

              {newSection.program_id && programWideBlocks.length > 0 && (
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">
                    Select Existing Classes
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {programWideBlocks.sort((a,b) => a.year - b.year || a.name.localeCompare(b.name)).map((b, idx) => {
                      const isSelected = newSection.selectedExistingBlocks.some(
                        sel => sel.year === b.year && sel.name === b.name
                      );
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setNewSection(prev => {
                              const alreadySelected = prev.selectedExistingBlocks.some(
                                sel => sel.year === b.year && sel.name === b.name
                              );
                              if (alreadySelected) {
                                return {
                                  ...prev,
                                  selectedExistingBlocks: prev.selectedExistingBlocks.filter(
                                    sel => !(sel.year === b.year && sel.name === b.name)
                                  )
                                };
                              } else {
                                return {
                                  ...prev,
                                  selectedExistingBlocks: [...prev.selectedExistingBlocks, { year: b.year, name: b.name }]
                                };
                              }
                            });
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg transition-all ${
                            isSelected
                              ? "bg-primary/10 border-primary text-primary shadow-sm"
                              : "bg-white border-neutral-200 text-neutral-600 hover:border-primary/50 hover:bg-primary/5"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-neutral-300'}`}>
                              {isSelected && <Plus className="w-2.5 h-2.5 text-white transform rotate-45 scale-125" style={{ transform: 'none' }} />}
                              {isSelected && <div className="w-2 h-0.5 bg-white transform rotate-0" />}
                              {!isSelected && <div className="w-2 h-2 rounded-sm" />}
                              {isSelected && <span className="text-white text-[10px]">✓</span>}
                            </div>
                            <span className="text-xs font-bold uppercase">{b.year}{b.name}</span>
                          </div>
                          <span className={`${isSelected ? 'text-primary/70' : 'text-neutral-400'} text-[10px] font-medium`}>
                            {b.student_count} Students
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Term</label>
                <select
                    value={newSection.term}
                    onChange={(e) => setNewSection({...newSection, term: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg mt-1"
                >
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="Summer">Summer</option>
                </select>
                <p className="text-xxs text-neutral-400 mt-1 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Automatically associated with current Academic Year
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase">Est. Students</label>
                <input
                    type="number"
                    placeholder="0"
                    value={newSection.students}
                    onChange={(e) => setNewSection({...newSection, students: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button 
                onClick={() => setIsAddDialogOpen(false)} 
                className="px-4 py-2 text-neutral-500 hover:text-neutral-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <Button 
                onClick={handleCreateSection} 
                disabled={isCreatingSection} 
                className="bg-primary text-white shadow-md hover:shadow-lg transition-all"
              >
                {isCreatingSection ? "Creating..." : "Save Class"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditDialogOpen && editingSection && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold">Edit Class</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Class Name</label>
                <input
                    placeholder="Block Name"
                    value={editingSection.name}
                    onChange={(e) => setEditingSection({...editingSection, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase">Est. Students</label>
                <input
                    type="number"
                    placeholder="Est. Students"
                    value={editingSection.students_estimated}
                    onChange={(e) => setEditingSection({...editingSection, students_estimated: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border rounded-lg mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button 
                onClick={() => setIsEditDialogOpen(false)} 
                className="px-4 py-2 text-neutral-500 hover:text-neutral-700 font-medium transition-colors"
                >
                    Cancel
                </button>
              <Button onClick={handleUpdateSection} className="bg-primary text-white shadow-md hover:shadow-lg transition-all">
                Update Class
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertComponent />
    </div>
  );
}

