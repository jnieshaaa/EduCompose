import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { readSecureParams } from "../../utils/secureUrl";
import { Plus, Trash2, Edit2, Loader2, BookOpen, Search, Filter, X } from "lucide-react";
import { useCourses } from "../../hooks/useCourses";
import type { Course } from "../../types/academic";
import { CourseSectionsView } from "./CourseSectionsView";
import { motion, AnimatePresence } from "framer-motion";

export function CoursesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse secure parameters from the 'ref' query parameter if it exists
  const secureParams = readSecureParams(window.location.search);
  const deepCourseId = secureParams?.courseId || searchParams.get("courseId");

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
      setSelectedProgId("");
    } else if (activeTab === "school") {
      // Typically we'd want to see everything in the school catalog unless explicitly filtered
      setSelectedDeptId("");
      setSelectedProgId("");
    }
  }, [activeTab, teacherInfo?.department_id, setSelectedDeptId, setSelectedProgId]);

  // Handle deep-link to course
  useEffect(() => {
    if (deepCourseId && !selectedCourse && myCourses.length > 0) {
      const course = myCourses.find(c => String(c.id) === String(deepCourseId));
      if (course) setSelectedCourse(course);
    }
  }, [deepCourseId, myCourses, selectedCourse]);

  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    course_code: "",
    course_title: "",
    units: 3,
    department_id: ""
  });

  const getActiveCourses = () => {
    switch (activeTab) {
      case "my": return myCourses;
      case "dept": return departmentCourses;
      case "school": return schoolCourses;
      default: return [];
    }
  };

  const handleCourseClick = (course: Course) => {
    setSearchParams({ courseId: String(course.id), courseCode: course.course_code });
    setSelectedCourse(course);
  };

  const handleBack = () => {
    setSearchParams({});
    setSelectedCourse(null);
  };

  const schoolCode = teacherInfo?.schools?.code || "SCHOOL";

  if (selectedCourse) {
    return <CourseSectionsView course={selectedCourse} onBack={handleBack} />;
  }

  // Filter programs based on selected department
  const availablePrograms = programsLookup.filter(p => !selectedDeptId || p.department_id === selectedDeptId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Course Management</h1>
          <p className="text-neutral-500 text-xs mt-0.5">Personal loads and institutional catalogs for {schoolCode}</p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2 bg-primary text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={16} /> Add New Subject
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-100 overflow-x-auto scrollbar-hide">
        {(['my', 'dept', 'school'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab 
              ? "border-primary text-primary" 
              : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {tab === 'my' && `My Loads (${myCourses.length})`}
            {tab === 'dept' && `Department catalog (${departmentCourses.length})`}
            {tab === 'school' && `${schoolCode} catalog (${schoolCourses.length})`}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-2xl border border-neutral-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300" size={14} />
            <input
              type="text"
              placeholder="Search by code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-50/50 border border-neutral-100 rounded-xl text-xs placeholder:text-neutral-300 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
              showFilters || selectedDeptId || selectedProgId
                ? "bg-primary/5 border-primary/20 text-primary"
                : "bg-white border-neutral-100 text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            <Filter size={14} /> 
            Filters {(selectedDeptId || selectedProgId) ? "•" : ""}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] ml-1">Department Scope</label>
                  <select
                    value={selectedDeptId}
                    disabled={activeTab === "dept"}
                    onChange={(e) => {
                      setSelectedDeptId(e.target.value);
                      setSelectedProgId(""); 
                    }}
                    className={`w-full px-3 py-2 border border-neutral-100 rounded-xl text-xs outline-none focus:border-primary/30 transition-all ${
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
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] ml-1">Program Track</label>
                  <select
                    value={selectedProgId}
                    onChange={(e) => setSelectedProgId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-100 rounded-xl text-xs outline-none focus:border-primary/30 transition-all"
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
                      className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 hover:text-error-default transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Course List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-neutral-50 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary/30 mb-4" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Synchronizing Catalog...</p>
        </div>
      ) : getActiveCourses().length === 0 ? (
        <div className="p-20 text-center bg-white rounded-3xl border border-neutral-50 shadow-sm">
          <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-neutral-200" />
          </div>
          <h3 className="text-sm font-bold text-neutral-800 mb-2">No Courses Found</h3>
          <p className="text-xs text-neutral-400 max-w-[240px] mx-auto mb-6 leading-relaxed">
            {activeTab === "my" 
              ? "Your load list is empty. Start by adding courses from the catalog tabs."
              : "We couldn't find any subjects matching your selection."}
          </p>
          {activeTab === "my" && (
            <button 
              onClick={() => setActiveTab("dept")} 
              className="text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 px-6 py-2 rounded-full transition-all border border-primary/20"
            >
              Browse Department
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {getActiveCourses().map((course: Course) => {
            const isMyCourse = course.user_id === teacherInfo?.auth_user_id;
            const isAdded = myLoadsIds.has(course.id);

            return (
              <div 
                key={course.id} 
                onClick={() => activeTab === 'my' && handleCourseClick(course)}
                className={`group transition-all border rounded-2xl p-5 bg-white relative overflow-hidden ${
                  activeTab === 'my' 
                  ? 'cursor-pointer border-neutral-100 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5' 
                  : 'border-neutral-100 shadow-sm'
                }`}
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 left-0 w-1 h-full transition-transform ${isAdded ? 'bg-primary scale-y-100' : 'bg-neutral-100 scale-y-0'}`} />

                <div className="flex justify-between items-start mb-4">
                  <div className="px-2 py-1 bg-neutral-50 rounded-lg text-neutral-500 font-mono font-bold text-[11px] border border-neutral-100 tracking-tight">
                    {course.course_code}
                  </div>
                  <div className="flex gap-1">
                    {isMyCourse ? (
                      <div className="flex gap-0.5 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); }} 
                          className="p-1.5 text-neutral-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                          className="p-1.5 text-neutral-400 hover:text-error-default hover:bg-error-default/5 rounded-lg transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleLoad(course.id, isAdded); }}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all shadow-sm ${
                          isAdded 
                            ? "bg-neutral-50 text-neutral-400 hover:bg-error-default/5 hover:text-error-default" 
                            : "bg-primary text-white hover:shadow-lg hover:shadow-primary/20"
                        }`}
                      >
                        {isAdded ? "Remove" : "Add to Load"}
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-neutral-800 mb-1 leading-tight group-hover:text-primary transition-colors pr-8">
                  {course.course_title}
                </h3>
                
                <div className="flex items-center gap-2 mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">
                    {course.departments?.code || course.department || course.departments?.name?.split(' ')[0] || "General"}
                  </p>
                  {isAdded && activeTab !== "my" && (
                      <span className="text-[9px] font-bold text-success-default uppercase px-1.5 py-0.5 rounded-md border border-success-default/10">
                          Enrolled
                      </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{course.units} Units</span>
                  {isMyCourse ? (
                    <span className="text-[9px] font-bold text-purple-600 uppercase bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                      Private Load
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      Standard
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Course Modal */}
      <AnimatePresence>
        {isAddDialogOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddDialogOpen(false)}
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
                  <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">New Personal Load</h2>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Define a subject code and title</p>
                </div>
                <button 
                  onClick={() => setIsAddDialogOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] ml-1">Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CS101"
                    value={newCourse.course_code}
                    onChange={(e) => setNewCourse({ ...newCourse, course_code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-mono text-xs uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] ml-1">Subject Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Introduction to AI"
                    value={newCourse.course_title}
                    onChange={(e) => setNewCourse({ ...newCourse, course_title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] ml-1">Units</label>
                    <input
                      type="number"
                      value={newCourse.units}
                      onChange={(e) => setNewCourse({ ...newCourse, units: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.15em] ml-1">Dept</label>
                    <select
                      value={newCourse.department_id}
                      onChange={(e) => setNewCourse({ ...newCourse, department_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all text-xs"
                    >
                      <option value="">General</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-50 flex justify-end gap-2">
                <button
                  onClick={() => setIsAddDialogOpen(false)}
                  className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={() => handleCreateCourse(newCourse)}
                  disabled={isCreating || !newCourse.course_code || !newCourse.course_title}
                  className="bg-primary text-white px-5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {isCreating ? <Loader2 size={16} className="animate-spin" /> : "Verify & Save"}
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
