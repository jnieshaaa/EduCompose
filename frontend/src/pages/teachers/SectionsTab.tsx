import { useEffect } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Plus, Users, Edit2, Trash2, Loader2, Calendar } from "lucide-react";
import { useSections } from "../../hooks/useSections";
import { useAcademicContext } from "../../hooks/useAcademicContext";

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
    AlertComponent,
  } = useSections();

  // Set default term when opening dialog
  useEffect(() => {
    if (isAddDialogOpen && currentSemester && !newSection.term) {
      setNewSection(prev => ({ ...prev, term: currentSemester }));
    }
  }, [isAddDialogOpen, currentSemester]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-semibold">Blocks / Sections</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage class sections and blocks for your courses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-primary hover:bg-primary-300"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Block
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="Search blocks..."
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
          <h3 className="text-lg font-medium text-neutral-700 mb-2">No sections found</h3>
          <p className="text-sm text-neutral-500 mb-4">You don't have any blocks for the current academic term.</p>
          <Button
            className="bg-primary hover:bg-primary-300"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Block
          </Button>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Block Name</th>
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
                    <span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">
                      {section.courses?.course_code}
                    </span>
                    <span className="ml-2">{section.courses?.course_title}</span>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{section.term}</span>
                        <span className="text-xs text-neutral-400">A.Y. {section.academic_year}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">{section.students_estimated}</td>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold">Add New Block</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase">Block Name</label>
                <input
                    placeholder="e.g. BSCS-1A"
                    value={newSection.name}
                    onChange={(e) => setNewSection({...newSection, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg mt-1"
                />
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
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase">Term</label>
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
                {isCreatingSection ? "Creating..." : "Save Block"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditDialogOpen && editingSection && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold">Edit Block</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase">Block Name</label>
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
                Update Block
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertComponent />
    </div>
  );
}

