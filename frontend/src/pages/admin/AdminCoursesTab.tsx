import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Loader2, Search, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";


import { supabase } from "../../lib/supabaseClient";
import type { School, Course } from "../../types/academic";
import Card from "../../components/ui/Card";

export const AdminCoursesTab: React.FC = () => {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
    user_id: "",
    year_level: "",
    semester: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);



  useEffect(() => {
    fetchInitialData();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);


  const fetchInitialData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchSchools(),
      fetchUsers(),
      fetchCourses()
    ]);
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("auth_user_id, first_name, last_name")
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
          departments(name),
          programs_lookup(id, name),
          users:user_id(first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllCourses(data || []);
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

  const addCourse = async () => {
    if (!courseForm.course_code || !courseForm.course_title || !selectedSchool) return;

    try {
      const courseData = {
        school_id: selectedSchool,
        department_id: selectedDept || null,
        program_id: selectedProg || null,
        user_id: courseForm.user_id || null,
        course_code: courseForm.course_code.toUpperCase(),
        course_title: courseForm.course_title,
        units: courseForm.units,
        year_level: courseForm.year_level || null,
        semester: courseForm.semester || null,
      };

      if (editingCourse) {
        const { error } = await supabase
          .from("courses")
          .update(courseData)
          .eq("id", editingCourse.id);
        if (error) throw error;
      } else {
        // For new courses, default user_id if not set (could use current user session here if needed)
        const { data: userData } = await supabase.auth.getUser();
        const finalData = { ...courseData, user_id: userData.user?.id || null };
        const { error } = await supabase.from("courses").insert(finalData);
        if (error) throw error;
      }

      await fetchCourses();
      resetForm();
      setShowCourseModal(false);
    } catch (error) {
      console.error("Error saving course:", error);
    }
  };

  const deleteCourse = async (id: string) => {
    if (confirm("Delete this course?")) {
      try {
        const { error } = await supabase.from("courses").delete().eq("id", id);
        if (error) throw error;
        await fetchCourses();
      } catch (error) {
        console.error("Error deleting course:", error);
      }
    }
  };

  const resetForm = () => {
    setCourseForm({ 
      course_code: "", 
      course_title: "", 
      units: 0,
      user_id: "",
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
    if (filters.user && c.user_id !== filters.user) return false;
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


  // Sorting logic
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
            aValue = a.users ? `${a.users.first_name} ${a.users.last_name}`.toLowerCase() : "";
            bValue = b.users ? `${b.users.first_name} ${b.users.last_name}`.toLowerCase() : "";
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

  // Calculate pagination
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Course Management</h1>
          <p className="text-neutral-500 text-sm mt-1">Manage institutional courses and assignments</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCourseModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
        >
          <Plus size={18} /> Add Course
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white shadow-sm border border-neutral-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
              <input 
                type="text"
                placeholder="Code or title..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">User</label>
            <select 
              value={filters.user} 
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u.auth_user_id} value={u.auth_user_id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">School</label>
            <select 
              value={filters.school} 
              onChange={(e) => setFilters({ ...filters, school: e.target.value, dept: "", prog: "" })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Schools</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">Department</label>
            <select 
              value={filters.dept} 
              disabled={!filters.school}
              onChange={(e) => setFilters({ ...filters, dept: e.target.value, prog: "" })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              <option value="">All Departments</option>
              {filters.school && schools.find(s => s.id === filters.school)?.departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">Program</label>
            <select 
              value={filters.prog} 
              disabled={!filters.dept}
              onChange={(e) => setFilters({ ...filters, prog: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              <option value="">All Programs</option>
              {filters.dept && schools.find(s => s.id === filters.school)?.departments.find(d => d.id === filters.dept)?.programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden bg-white shadow-sm border border-neutral-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th 
                  className="px-4 py-3 font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => requestSort('course')}
                >
                  <div className="flex items-center gap-1">
                    Course {sortConfig?.key === 'course' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} className="text-neutral-300" />}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => requestSort('units')}
                >
                  <div className="flex items-center gap-1">
                    Units {sortConfig?.key === 'units' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} className="text-neutral-300" />}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => requestSort('year_sem')}
                >
                  <div className="flex items-center gap-1">
                    Year & Semester {sortConfig?.key === 'year_sem' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} className="text-neutral-300" />}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => requestSort('added_by')}
                >
                  <div className="flex items-center gap-1">
                    Added By {sortConfig?.key === 'added_by' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} className="text-neutral-300" />}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => requestSort('affiliation')}
                >
                  <div className="flex items-center gap-1">
                    Affiliation {sortConfig?.key === 'affiliation' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} className="text-neutral-300" />}
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold text-neutral-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-neutral-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="animate-pulse">Fetching academic data...</p>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-neutral-500 italic">
                    No courses found matching your criteria.
                  </td>
                </tr>
              ) : (
                currentItems.map((course) => (
                  <tr key={course.id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="font-bold text-neutral-900">{course.course_code}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">{course.course_title}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded-md text-[10px] font-bold">
                        {course.units} UNITS
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-neutral-600 font-medium">
                        {course.year_level || "No Year"}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {course.semester || "No Semester"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-neutral-600">
                      {course.users ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {course.users.first_name[0]}{course.users.last_name[0]}
                          </div>
                          <span>{course.users.first_name} {course.users.last_name}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-300 italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-neutral-600 font-medium">{course.schools?.name}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                        {course.departments?.name} 
                        {course.programs_lookup?.name && ` • ${course.programs_lookup.name}`}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingCourse(course);
                            setCourseForm({ 
                              course_code: course.course_code, 
                              course_title: course.course_title, 
                              units: course.units,
                              user_id: course.user_id || "",
                              year_level: course.year_level || "",
                              semester: course.semester || ""
                            });
                            setSelectedSchool(course.school_id || "");
                            setSelectedDept(course.department_id || "");
                            setSelectedProg(course.program_id || "");
                            setShowCourseModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteCourse(course.id!)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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

        {/* Pagination Controls */}
        {!isLoading && sortedCourses.length > 0 && (
          <div className="px-4 py-8 bg-white border-t border-neutral-100 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Range Indicator (Bottom Left in image, but here we place it in layout) */}
              <div className="order-2 md:order-1 flex flex-col">
                <div className="text-sm font-medium text-neutral-400">
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, sortedCourses.length)} of {sortedCourses.length.toLocaleString()}
                </div>
              </div>

              {/* Pagination Controls (Middle) */}
              <div className="order-1 md:order-2 flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                
                <div className="flex items-center gap-1.5">
                  {getPageNumbers().map((page, i) => (
                    page === "..." ? (
                      <span key={`dots-${i}`} className="px-2 text-neutral-400">...</span>
                    ) : (
                      <button
                        key={`page-${page}`}
                        onClick={() => setCurrentPage(Number(page))}
                        className={`min-w-[36px] h-9 flex items-center justify-center text-sm font-bold rounded-lg transition-all border ${
                          currentPage === page
                            ? "bg-neutral-900 border-neutral-900 text-white shadow-lg"
                            : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400"
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
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>

              {/* Items Per Page (Right) */}
              <div className="order-3 flex items-center gap-3">
                <span className="text-sm font-medium text-neutral-500 whitespace-nowrap">Result per page</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[70px]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        )}

      </Card>

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <h2 className="text-xl font-bold text-neutral-900">{editingCourse ? "Edit Course" : "Add New Course"}</h2>
              <button onClick={() => setShowCourseModal(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Organization Selection */}
              <div className="space-y-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Affiliation Details</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Target School</label>
                  <select
                    value={selectedSchool}
                    onChange={(e) => {
                      setSelectedSchool(e.target.value);
                      setSelectedDept("");
                      setSelectedProg("");
                    }}
                    className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">Choose a school...</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Department</label>
                    <select
                      value={selectedDept}
                      disabled={!selectedSchool}
                      onChange={(e) => {
                        setSelectedDept(e.target.value);
                        setSelectedProg("");
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    >
                      <option value="">All Departments</option>
                      {selectedSchool && schools.find(s => s.id === selectedSchool)?.departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Program</label>
                    <select
                      value={selectedProg}
                      disabled={!selectedDept}
                      onChange={(e) => setSelectedProg(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    >
                      <option value="">All Programs</option>
                      {selectedDept && schools.find(s => s.id === selectedSchool)?.departments.find(d => d.id === selectedDept)?.programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                  {editingCourse && (
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Added By</label>
                      <div className="w-full px-3 py-2.5 bg-neutral-100 border border-neutral-200 rounded-lg text-sm text-neutral-600 italic">
                        {editingCourse.users ? `${editingCourse.users.first_name} ${editingCourse.users.last_name}` : "System / Unknown"}
                      </div>
                    </div>
                  )}
                </div>

              {/* Course Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">Identity & Values</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Course Code</label>
                    <input
                      type="text"
                      value={courseForm.course_code}
                      onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })}
                      className="w-full px-3 py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none uppercase font-mono"
                      placeholder="CS101"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Course Title</label>
                    <input
                      type="text"
                      value={courseForm.course_title}
                      onChange={(e) => setCourseForm({ ...courseForm, course_title: e.target.value })}
                      className="w-full px-3 py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="Intro to Computing"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Year Level</label>
                    <select
                      value={courseForm.year_level}
                      onChange={(e) => setCourseForm({ ...courseForm, year_level: e.target.value })}
                      className="w-full px-3 py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="">Select Year Level</option>
                      <option value="First Year">First Year</option>
                      <option value="Second Year">Second Year</option>
                      <option value="Third Year">Third Year</option>
                      <option value="Fourth Year">Fourth Year</option>
                      <option value="Fifth Year">Fifth Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Semester</label>
                    <select
                      value={courseForm.semester}
                      onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                      className="w-full px-3 py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="">Select Semester</option>
                      <option value="First">First</option>
                      <option value="Second">Second</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Credit Units</label>
                  <input
                    type="number"
                    value={courseForm.units}
                    onChange={(e) => setCourseForm({ ...courseForm, units: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    min="0"
                    placeholder="3"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
              <button
                onClick={() => setShowCourseModal(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addCourse}
                disabled={!courseForm.course_code || !courseForm.course_title || !selectedSchool}
                className="px-6 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingCourse ? "Update Course" : "Create Course"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
