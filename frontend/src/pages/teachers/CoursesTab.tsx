import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Loader2, BookOpen, Search, Filter } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useCourses } from "../../hooks/useCourses";
import type { Course } from "../../types/academic";
import { CourseSectionsView } from "./CourseSectionsView";

export function CoursesTab() {
  const {
    teacherInfo,
    myCourses,
    departmentCourses,
    schoolCourses,
    myLoadsIds,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedDeptId,
    setSelectedDeptId,
    selectedProgId,
    setSelectedProgId,
    departments,
    programsLookup,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isCreating,
    handleCreateCourse,
    handleDeleteCourse,
    handleToggleLoad,
    AlertComponent
  } = useCourses();

  const [activeTab, setActiveTab] = useState<"my" | "dept" | "school">("my");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Sync department filter with tab
  useEffect(() => {
    if (activeTab === "dept" && teacherInfo?.department_id) {
      setSelectedDeptId(teacherInfo.department_id);
    } else if (activeTab === "my" || activeTab === "school") {
      // Optional: Clear filter or keep? Let's clear if it was forced by dept tab
      // But maybe user wants to keep it. Let's just set it for dept tab.
    }
  }, [activeTab, teacherInfo?.department_id, setSelectedDeptId]);

  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    course_code: "",
    course_title: "",
    units: 3,
    department: ""
  });

  const getActiveCourses = () => {
    switch (activeTab) {
      case "my": return myCourses;
      case "dept": return departmentCourses;
      case "school": return schoolCourses;
      default: return [];
    }
  };

  const schoolCode = teacherInfo?.schools?.code || "SCHOOL";

  if (selectedCourse) {
    return <CourseSectionsView course={selectedCourse} onBack={() => setSelectedCourse(null)} />;
  }

  // Filter programs based on selected department
  const availablePrograms = programsLookup.filter(p => !selectedDeptId || p.department_id === selectedDeptId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Course Management</h1>
          <p className="text-neutral-500 text-sm mt-1">Personal Loads and Institutional Catalogs</p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2 bg-primary text-white shadow-lg shadow-primary/25"
        >
          <Plus size={18} /> Add New Subject
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === "my" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          MY LOADS ({myCourses.length})
        </button>
        <button
          onClick={() => setActiveTab("dept")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === "dept" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          MY DEPARTMENT COURSE ({departmentCourses.length})
        </button>
        <button
          onClick={() => setActiveTab("school")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === "school" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          {schoolCode} COURSES ({schoolCourses.length})
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white shadow-sm border border-neutral-200">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Search by code or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-all ${
                showFilters || selectedDeptId || selectedProgId
                  ? "bg-primary/5 border-primary text-primary font-bold"
                  : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <Filter size={16} /> 
              Filters {(selectedDeptId || selectedProgId) ? "(Active)" : ""}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Department</label>
                <select
                  value={selectedDeptId}
                  disabled={activeTab === "dept"}
                  onChange={(e) => {
                    setSelectedDeptId(e.target.value);
                    setSelectedProgId(""); // Reset program when department changes
                  }}
                  className={`w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none ${
                    activeTab === "dept" ? "bg-neutral-50 text-neutral-500 cursor-not-allowed" : "bg-white"
                  }`}
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Program</label>
                <select
                  value={selectedProgId}
                  onChange={(e) => setSelectedProgId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">All Programs</option>
                  {availablePrograms.map((prog) => (
                    <option key={prog.id} value={prog.id}>{prog.name}</option>
                  ))}
                </select>
              </div>
              {(selectedDeptId || selectedProgId) && (
                <div className="md:col-span-2 flex justify-end">
                  <button 
                    onClick={() => {
                      setSelectedDeptId("");
                      setSelectedProgId("");
                    }}
                    className="text-xs text-neutral-400 hover:text-red-500 font-medium transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Course List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-neutral-200">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-neutral-500 animate-pulse">Loading academic courses...</p>
        </div>
      ) : getActiveCourses().length === 0 ? (
        <Card className="p-20 text-center bg-white border border-neutral-200">
          <BookOpen className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-neutral-700 mb-2">No Courses Found</h3>
          <p className="text-neutral-500 max-w-sm mx-auto mb-6">
            {activeTab === "my" 
              ? "You haven't added any courses to your load yet. Browse the department or school catalogs."
              : "No subjects found in this category."}
          </p>
          {activeTab === "my" && (
            <Button onClick={() => setActiveTab("dept")} className="bg-primary text-white font-bold">
              Browse Department Courses
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getActiveCourses().map((course: Course) => {
            const isMyCourse = course.user_id === teacherInfo?.auth_user_id;
            const isAdded = myLoadsIds.has(course.id);

            return (
              <Card 
                key={course.id} 
                onClick={() => activeTab === 'my' && setSelectedCourse(course)}
                className={`group hover:shadow-md transition-all border border-neutral-200 overflow-hidden bg-white ${
                  activeTab === 'my' ? 'cursor-pointer hover:border-primary/50' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary font-mono font-bold text-sm">
                      {course.course_code}
                    </div>
                    <div className="flex gap-1">
                      {isMyCourse ? (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); /* handle edit */ }} 
                            className="p-2 text-neutral-400 hover:text-primary transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                            className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleLoad(course.id, isAdded); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                            isAdded 
                              ? "bg-neutral-100 text-neutral-500 hover:bg-red-50 hover:text-red-500 hover:shadow-red-100" 
                              : "bg-primary text-white hover:bg-primary-300 shadow-primary/20"
                          }`}
                        >
                          {isAdded ? "Added" : "Add to Load"}
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1 leading-tight">{course.course_title}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-sm text-neutral-500">{course.department || course.departments?.name || "General Course"}</p>
                    {isAdded && activeTab !== "my" && (
                        <span className="text-[10px] font-bold text-success-default uppercase bg-success-default/10 px-2 py-0.5 rounded-full">
                            In My Loads
                        </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{course.units} Units</span>
                    {!isMyCourse && (
                      <span className="text-[10px] font-bold text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        Institutional
                      </span>
                    )}
                    {isMyCourse && (
                      <span className="text-[10px] font-bold text-purple-500 uppercase bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                        My Creation
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Course Modal */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <h2 className="text-xl font-bold text-neutral-900">Add New Personal Load</h2>
              <button 
                onClick={() => setIsAddDialogOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1.5 ml-1">Subject Code</label>
                <input
                  type="text"
                  placeholder="e.g. CS101"
                  value={newCourse.course_code}
                  onChange={(e) => setNewCourse({ ...newCourse, course_code: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1.5 ml-1">Subject Title</label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to Programming"
                  value={newCourse.course_title}
                  onChange={(e) => setNewCourse({ ...newCourse, course_title: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1.5 ml-1">Units</label>
                  <input
                    type="number"
                    placeholder="3"
                    value={newCourse.units}
                    onChange={(e) => setNewCourse({ ...newCourse, units: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1.5 ml-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. CCS"
                    value={newCourse.department}
                    onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
              <p className="text-[10px] text-neutral-400 italic px-1">
                Note: Creating a new course will automatically add it to your loads. Institutional courses should be added from the catalog tabs.
              </p>
            </div>

            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
              <button
                onClick={() => setIsAddDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={() => handleCreateCourse(newCourse)}
                disabled={isCreating || !newCourse.course_code || !newCourse.course_title}
                className="bg-primary text-white px-6 font-bold shadow-lg shadow-primary/30"
              >
                {isCreating ? <Loader2 size={18} className="animate-spin" /> : "Save Load"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertComponent />
    </div>
  );
}
