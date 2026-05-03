import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Search, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, BookOpen, School as SchoolIcon, Hash, Type, Calculator, UserCircle } from "lucide-react";
import { useNotification } from "../../contexts/NotificationContext";
import { supabase } from "../../lib/supabaseClient";
import type { School, Course } from "../../types/academic";
import Button from "../../components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";

export const AdminCoursesTab: React.FC = () => {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showNotification } = useNotification();
  
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedProg, setSelectedProg] = useState<string>("");

  const [filters, setFilters] = useState({
    user: "",
    school: "",
    dept: "",
    prog: "",
    search: ""
  });

  const [courseForm, setCourseForm] = useState({ 
    course_code: "", 
    course_title: "", 
    units: 0,
    teacher_id: "",
    year_level: "",
    semester: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchSchools(),
      fetchUsers()
    ]);
    // Fetch courses after users to ensure manual join has user data
    await fetchCourses();
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .eq("role", "teacher")
        .order("last_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          schools(name),
          departments(name, code),
          programs_lookup(id, name, abbr)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Manual join in memory
      const coursesWithUsers = (data || []).map(course => {
        const teacher = users.find(u => u.id === course.teacher_id);
        return {
          ...course,
          users: teacher ? { first_name: teacher.first_name, last_name: teacher.last_name } : null
        };
      });

      setAllCourses(coursesWithUsers);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select(`
          *,
          departments:departments(
            *,
            programs:programs_lookup(*)
          )
        `)
        .order("name");
      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  const addCourse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!courseForm.course_code || !courseForm.course_title || !selectedSchool) return;

    try {
      if (editingCourse) {
        const courseData = {
          school_id: selectedSchool,
          department_id: selectedDept || null,
          program_id: selectedProg || null,
          teacher_id: courseForm.teacher_id || null,
          course_code: courseForm.course_code.toUpperCase(),
          course_title: courseForm.course_title,
          units: courseForm.units,
          year_level: courseForm.year_level || null,
          semester: courseForm.semester || null,
        };

        const { error } = await supabase
          .from("courses")
          .update(courseData)
          .eq("id", editingCourse.id);
        if (error) throw error;
      } else {
        console.log("[AdminCoursesTab] Creating course via RPC:", courseForm.course_code);
        const { error } = await supabase.rpc('api_create_course_v1', {
          p_school_id: selectedSchool,
          p_course_code: courseForm.course_code.toUpperCase(),
          p_course_title: courseForm.course_title,
          p_units: courseForm.units,
          p_department_id: selectedDept || null,
          p_program_id: selectedProg || null,
          p_year_level: courseForm.year_level || null,
          p_semester: courseForm.semester || null
        });
        if (error) throw error;
      }

      await fetchCourses();
      showNotification('success', editingCourse ? "Course updated successfully." : "Course added successfully.");
      resetForm();
      setShowCourseModal(false);
    } catch (error: any) {
      console.error("Error saving course:", error);
      showNotification('error', error.message || "Failed to save course.");
    }
  };

  const deleteCourse = async (id: string) => {
    if (confirm("Are you sure you want to delete this course?")) {
      try {
        const { error } = await supabase.from("courses").delete().eq("id", id);
        if (error) throw error;
        await fetchCourses();
        showNotification('success', "Course deleted successfully.");
      } catch (error: any) {
        console.error("Error deleting course:", error);
        showNotification('error', error.message || "Failed to delete course.");
      }
    }
  };

  const resetForm = () => {
    setCourseForm({ 
      course_code: "", 
      course_title: "", 
      units: 0,
      teacher_id: "",
      year_level: "",
      semester: ""
    });
    setEditingCourse(null);
    setSelectedSchool("");
    setSelectedDept("");
    setSelectedProg("");
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredCourses = allCourses.filter(c => {
    if (filters.user && c.teacher_id !== filters.user) return false;
    if (filters.school && c.school_id !== filters.school) return false;
    if (filters.dept && c.department_id !== filters.dept) return false;
    if (filters.prog && c.program_id !== filters.prog) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        c.course_code.toLowerCase().includes(search) ||
        c.course_title.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const sortedCourses = React.useMemo(() => {
    let sortableCourses = [...filteredCourses];
    if (sortConfig !== null) {
      sortableCourses.sort((a, b) => {
        let aValue: any = "";
        let bValue: any = "";

        switch (sortConfig.key) {
          case 'course':
            aValue = a.course_code.toLowerCase();
            bValue = b.course_code.toLowerCase();
            break;
          case 'units':
            aValue = a.units;
            bValue = b.units;
            break;
          case 'year_sem':
            aValue = `${a.year_level || ''} ${a.semester || ''}`.toLowerCase();
            bValue = `${b.year_level || ''} ${b.semester || ''}`.toLowerCase();
            break;
          case 'added_by':
            aValue = a.users ? `${(a.users as any).first_name} ${(a.users as any).last_name}`.toLowerCase() : "";
            bValue = b.users ? `${(b.users as any).first_name} ${(b.users as any).last_name}`.toLowerCase() : "";
            break;
          case 'affiliation':
            aValue = a.schools?.name.toLowerCase() || "";
            bValue = b.schools?.name.toLowerCase() || "";
            break;
          default:
            break;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableCourses;
  }, [filteredCourses, sortConfig]);

  const totalPages = Math.ceil(sortedCourses.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedCourses.slice(indexOfFirstItem, indexOfLastItem);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 8) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 6; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 5; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-medium text-neutral-900 tracking-tight">Courses</h1>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mt-1">Manage all courses and curriculum</p>
        </div>
               <Button
          onClick={() => {
            resetForm();
            setShowCourseModal(true);
          }}
          className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all px-5 h-10 flex items-center gap-2"
        >
          <Plus size={18} />
          <span className="text-[10px] font-medium uppercase tracking-widest">Add Course</span>
        </Button>
      </div>

      {/* Filters Hub */}
      <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Search size={16} className="text-neutral-400" />
          <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Search Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Search</label>
            <div className="relative group/search">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/search:text-primary transition-colors" size={14} />
              <input 
                placeholder="Code or title..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Contributor</label>
            <select 
              value={filters.user} 
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all appearance-none cursor-pointer"
            >
              <option value="">All Contributors</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">School</label>
            <select 
              value={filters.school} 
              onChange={(e) => setFilters({ ...filters, school: e.target.value, dept: "", prog: "" })}
              className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all appearance-none cursor-pointer"
            >
              <option value="">All Schools</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Department</label>
            <select 
              value={filters.dept} 
              disabled={!filters.school}
              onChange={(e) => setFilters({ ...filters, dept: e.target.value, prog: "" })}
              className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all appearance-none cursor-pointer disabled:opacity-30"
            >
              <option value="">All Departments</option>
              {filters.school && schools.find(s => s.id === filters.school)?.departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Program</label>
            <select 
              value={filters.prog} 
              disabled={!filters.dept}
              onChange={(e) => setFilters({ ...filters, prog: e.target.value })}
              className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all appearance-none cursor-pointer disabled:opacity-30"
            >
              <option value="">All Programs</option>
              {filters.dept && schools.find(s => s.id === filters.school)?.departments.find(d => d.id === filters.dept)?.programs?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50">
                <th className="px-8 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] cursor-pointer hover:text-neutral-900 transition-colors" onClick={() => requestSort('course')}>
                  <div className="flex items-center gap-2">
                    Course {sortConfig?.key === 'course' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th className="px-8 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] cursor-pointer hover:text-neutral-900 transition-colors" onClick={() => requestSort('units')}>
                  <div className="flex items-center gap-2">
                    Units {sortConfig?.key === 'units' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th className="px-8 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] cursor-pointer hover:text-neutral-900 transition-colors" onClick={() => requestSort('year_sem')}>
                  <div className="flex items-center gap-2">
                    Year & Semester {sortConfig?.key === 'year_sem' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th className="px-8 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] cursor-pointer hover:text-neutral-900 transition-colors" onClick={() => requestSort('affiliation')}>
                  <div className="flex items-center gap-2">
                    Affiliation {sortConfig?.key === 'affiliation' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                <th className="px-8 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center overflow-hidden">
                    <div className="flex flex-col items-center justify-center relative">
                      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <p className="mt-6 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.3em]">Loading Courses...</p>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center text-neutral-400">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em]">No courses found</p>
                  </td>
                </tr>
              ) : (
                currentItems.map((course) => (
                  <tr key={course.id} className="group hover:bg-neutral-50/50 transition-all duration-300">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-medium text-xs shadow-lg group-hover:scale-110 transition-transform">
                          {course.course_code.substring(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900 tracking-tight">{course.course_code}</div>
                          <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mt-0.5">{course.course_title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-medium rounded-lg uppercase tracking-widest">
                          {course.units} Units
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div>
                        <div className="text-xs font-medium text-neutral-700 uppercase tracking-tight">{course.year_level || "No Assignment"}</div>
                        <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">{course.semester || "--"} Semester</div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                           <SchoolIcon size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-medium text-neutral-900 tracking-tight">{course.schools?.name}</div>
                          <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest max-w-[180px] overflow-hidden truncate">
                            {course.departments?.code || "GEN"} • {course.programs_lookup?.abbr || "Core"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                        <button
                          onClick={() => {
                            setEditingCourse(course);
                            setCourseForm({ 
                              course_code: course.course_code, 
                              course_title: course.course_title, 
                              units: course.units,
                              teacher_id: course.teacher_id || "",
                              year_level: course.year_level || "",
                              semester: course.semester || ""
                            });
                            setSelectedSchool(course.school_id || "");
                            setSelectedDept(course.department_id || "");
                            setSelectedProg(course.program_id || "");
                            setShowCourseModal(true);
                          }}
                          className="p-2.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteCourse(course.id!)}
                          className="p-2.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Global Pagination Hub */}
        {!isLoading && sortedCourses.length > 0 && (
          <div className="px-8 py-8 bg-white border-t border-neutral-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em]">Showing rows</span>
              <span className="text-sm font-medium text-neutral-900">
                {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, sortedCourses.length)} <span className="text-neutral-300 mx-1">/</span> {sortedCourses.length.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-3 text-neutral-400 hover:text-neutral-900 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1.5">
                {getPageNumbers().map((page, i) => (
                  page === "..." ? (
                    <span key={`dots-${i}`} className="px-2 text-neutral-300 font-medium">•••</span>
                  ) : (
                    <button
                      key={`page-${page}`}
                      onClick={() => setCurrentPage(Number(page))}
                      className={`min-w-[42px] h-[42px] flex items-center justify-center text-xs font-medium rounded-2xl transition-all ${
                        currentPage === page
                          ? "bg-primary text-white shadow-xl shadow-primary/20"
                          : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100"
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-3 text-neutral-400 hover:text-neutral-900 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Rows</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-10 px-4 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-medium text-neutral-900 outline-none focus:ring-4 focus:ring-primary/5 cursor-pointer"
              >
                {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Course Modern Modal */}
      <AnimatePresence>
        {showCourseModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-neutral-100"
            >
              <div className="px-8 py-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/10">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-neutral-900 tracking-tight leading-tight">{editingCourse ? "Edit Course" : "Add Course"}</h2>
                    <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mt-0.5">Course Info</p>
                  </div>
                </div>
                <button onClick={() => setShowCourseModal(false)} className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form id="course-governance-form" onSubmit={addCourse} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 space-y-6">
                   <div className="flex items-center gap-3 mb-2">
                     <SchoolIcon size={14} className="text-primary" />
                      <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Basics</h3>
                   </div>
                   
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">School</label>
                    <select
                      required
                      value={selectedSchool}
                      onChange={(e) => {
                        setSelectedSchool(e.target.value);
                        setSelectedDept("");
                        setSelectedProg("");
                      }}
                      className="w-full h-12 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select School...</option>
                      {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Department</label>
                      <select
                        value={selectedDept}
                        disabled={!selectedSchool}
                        onChange={(e) => {
                          setSelectedDept(e.target.value);
                          setSelectedProg("");
                        }}
                        className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all appearance-none disabled:bg-neutral-100 disabled:opacity-50"
                      >
                        <option value="">All Departments</option>
                        {selectedSchool && schools.find(s => s.id === selectedSchool)?.departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Program</label>
                      <select
                        value={selectedProg}
                        disabled={!selectedDept}
                        onChange={(e) => setSelectedProg(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-neutral-200 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-sm font-medium transition-all appearance-none disabled:bg-neutral-100 disabled:opacity-50"
                      >
                        <option value="">All Programs</option>
                        {selectedDept && schools.find(s => s.id === selectedSchool)?.departments.find(d => d.id === selectedDept)?.programs?.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 px-1">
                    <Type size={14} className="text-primary" />
                    <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-1.5">
                      <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Course Code</label>
                      <div className="relative group/code">
                        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/code:text-primary transition-colors" size={14} />
                        <input
                          required
                          value={courseForm.course_code}
                          onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })}
                          className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all uppercase font-mono"
                          placeholder="CS101"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Course Name</label>
                      <input
                        required
                        value={courseForm.course_title}
                        onChange={(e) => setCourseForm({ ...courseForm, course_title: e.target.value })}
                        className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
                        placeholder="e.g. Introduction to Computational Logic"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Year Level</label>
                      <select
                        value={courseForm.year_level}
                        onChange={(e) => setCourseForm({ ...courseForm, year_level: e.target.value })}
                        className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all appearance-none"
                      >
                        <option value="">Unassigned</option>
                        {["First", "Second", "Third", "Fourth", "Fifth"].map(y => <option key={y} value={`${y} Year`}>{y} Year</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Semester</label>
                      <select
                        value={courseForm.semester}
                        onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                        className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all appearance-none"
                      >
                        <option value="">Broad</option>
                        {["First", "Second", "Summer"].map(s => <option key={s} value={s}>{s} Semester</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Units</label>
                      <div className="relative group/units">
                        <Calculator className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/units:text-primary transition-colors" size={14} />
                        <input
                          type="number"
                          value={courseForm.units || ""}
                          onChange={(e) => setCourseForm({ ...courseForm, units: parseInt(e.target.value) || 0 })}
                          className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary text-sm font-medium transition-all"
                          placeholder="3"
                        />
                      </div>
                    </div>
                  </div>

                  {editingCourse && (
                    <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-100 opacity-60">
                      <UserCircle size={14} className="text-neutral-400" />
                      <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest text-left">
                        Created By: <span className="text-neutral-600 ml-1">{editingCourse.users ? `${editingCourse.users.first_name} ${editingCourse.users.last_name}` : "System"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </form>

              <div className="px-8 py-6 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCourseModal(false)} className="rounded-2xl border-neutral-200 px-6">
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  form="course-governance-form"
                  disabled={!courseForm.course_code || !courseForm.course_title || !selectedSchool}
                  className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20 px-8 h-10 min-w-[140px]"
                >
                  {editingCourse ? "Save Changes" : "Save Course"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

