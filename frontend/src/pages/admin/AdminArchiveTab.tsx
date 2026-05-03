import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Loader2, 
  Calendar, 
  User, 
  BookOpen, 
  Layers, 
  Filter, 
  Printer, 
  Download, 
  Trash2, 
  ChevronDown,
  Activity,
  History,
  Archive,
  BarChart3,
  UserX,
  GraduationCap,
  Briefcase,
  ArrowLeft,
  RotateCcw
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { useNotification } from "../../contexts/NotificationContext";
import { fetchAllTeacherLoads, fetchAcademicSettings, deleteTeacherCourseLoad } from "../../services/academicService";
import type { AcademicSettings } from "../../services/academicService";
import { supabase } from "../../lib/supabaseClient";
import { adminApi } from "../../api";
import { motion, AnimatePresence } from "framer-motion";
import { generateAcademicReportHTML } from "../../templates/academicReportTemplate";
import { generateUserArchiveReportHTML } from "../../templates/userArchiveReportTemplate";



type ArchiveType = "academic" | "users";

export function AdminArchiveTab() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = (searchParams.get("type") as ArchiveType) || "academic";
  
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings | null>(null);
  const [loads, setLoads] = useState<any[]>([]);
  const [archivedUsers, setArchivedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [ayFilter, setAyFilter] = useState("");
  const [termFilter, setTermFilter] = useState("all");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loadToDelete, setLoadToDelete] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadInitialData();
  }, [type]);

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);

  const loadInitialData = async () => {
    setIsLoading(true);
    
    // Fetch unique years and terms for filters
    const { data: filterData } = await supabase
      .from("teacher_course_loads")
      .select("academic_year, term");
    
    if (filterData) {
      const years = [...new Set(filterData.map(d => d.academic_year).filter(Boolean))].sort().reverse();
      const terms = [...new Set(filterData.map(d => d.term).filter(Boolean))].sort();
      setAvailableYears(years);
      setAvailableTerms(terms);
    }

    if (type === "academic") {
      const settings = await fetchAcademicSettings();
      if (settings) {
        setAcademicSettings(settings);
        const currentYear = `${settings.ay_start}-${settings.ay_end}`;
        setAyFilter(currentYear);
        setTermFilter(settings.current_semester);
        
        const allLoads = await fetchAllTeacherLoads(currentYear, settings.current_semester);
        setLoads(allLoads);
      }
    } else {
      await loadArchivedUsers();
    }
    setIsLoading(false);
  };

  const loadArchivedUsers = async () => {
    // We fetch users and join their student profiles to check enrollment status
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        student_profiles ( student_code, enrollment_status )
      `)
      .order("last_name", { ascending: true });
    
    if (error) {
      showNotification('error', "Failed to load archived users.");
    } else {
      // Filter in JS to find archived users:
      // 1. Inactive users (any role)
      // 2. Students who are dropped or graduated
      const filtered = (data || []).filter(u => {
        const sp = Array.isArray(u.student_profiles) ? u.student_profiles[0] : u.student_profiles;
        return !u.is_active || (u.role === 'student' && (sp?.enrollment_status === 'dropped' || sp?.enrollment_status === 'graduated'));
      }).map(u => {
        const sp = Array.isArray(u.student_profiles) ? u.student_profiles[0] : u.student_profiles;
        return {
          ...u,
          student_code: sp?.student_code,
          enrollment_status: sp?.enrollment_status
        };
      });
      
      setArchivedUsers(filtered);
    }
  };

  const handleRestoreUser = async (user: any) => {
    if (!window.confirm(`Restore access for ${user.first_name} ${user.last_name}?`)) return;
    
    try {
      setIsLoading(true);

      // 1. Restore access in users table
      await adminApi.updateUser(user.id, {
        is_active: true,
      });

      // 2. If student, explicitly update enrollment_status in student_profiles
      if (user.role === 'student') {
        const { error: profileError } = await supabase
          .from('student_profiles')
          .update({ enrollment_status: 'active' })
          .eq('user_id', user.id);

        if (profileError) throw profileError;
      }
        
      showNotification('success', `${user.first_name}'s account has been restored.`);
      await loadArchivedUsers();
    } catch (err: any) {
      showNotification('error', "Failed to restore user: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async () => {
    if (type === "academic") {
      if (!ayFilter || !termFilter) return;
      setIsLoading(true);
      const allLoads = await fetchAllTeacherLoads(
        ayFilter === "all" ? undefined : ayFilter,
        termFilter === "all" ? undefined : termFilter
      );
      setLoads(allLoads || []);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (type === "academic" && academicSettings) {
        handleFilterChange();
    }
  }, [ayFilter, termFilter, type]);

  const filteredLoads = useMemo(() => {
    return loads.filter((load) => {
        const teacherName = `${load.users?.first_name || ""} ${load.users?.last_name || ""}`.toLowerCase();
        const courseTitle = (load.courses?.course_title || "").toLowerCase();
        const courseCode = (load.courses?.course_code || "").toLowerCase();
        const query = searchTerm.toLowerCase();

        return teacherName.includes(query) || courseTitle.includes(query) || courseCode.includes(query);
    });
  }, [loads, searchTerm]);

  const filteredUsers = useMemo(() => {
    return archivedUsers.filter((user) => {
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();
      const email = (user.email || "").toLowerCase();
      const code = (user.student_code || user.code || "").toLowerCase();
      const query = searchTerm.toLowerCase();

      return fullName.includes(query) || email.includes(query) || code.includes(query);
    });
  }, [archivedUsers, searchTerm]);

  const groupedLoads = useMemo(() => {
    const groups: Record<string, any> = {};
    filteredLoads.forEach(load => {
        const teacherId = load.teacher_id;
        if (!groups[teacherId]) {
            groups[teacherId] = {
                teacher: load.users,
                courses: []
            };
        }
        groups[teacherId].courses.push(load);
    });
    return Object.values(groups);
  }, [filteredLoads]);

  const confirmDelete = async () => {
    if (!loadToDelete || !deleteReason.trim()) return;
    setIsDeleting(true);
    
    const result = await deleteTeacherCourseLoad(
      loadToDelete.id,
      loadToDelete.users?.id,
      loadToDelete.courses?.course_title || "Unknown Course",
      deleteReason
    );
    
    if (result.success) {
      setDeleteModalOpen(false);
      setDeleteReason("");
      setLoadToDelete(null);
      handleFilterChange();
      showNotification('success', "Historical assignment decommissioned.");
    } else {
      showNotification('error', "Decommission failure: " + result.error);
    }
    
    setIsDeleting(false);
  };

  const handlePrintReport = async () => {
    setIsPrinting(true);
    try {
      if (type === "academic") {
        const ay = ayFilter !== 'all'
          ? ayFilter
          : (academicSettings ? `${academicSettings.ay_start}-${academicSettings.ay_end}` : 'All Years');
        const term = termFilter !== 'all'
          ? termFilter
          : (academicSettings?.current_semester || 'All Terms');

        const totalCourses = filteredLoads.length;
        const totalUnits = filteredLoads.reduce((sum: number, l: any) => sum + (l.courses?.units || 0), 0);

        // Fetch students grouped by block
        const { data: blockStudents } = await supabase
          .from('blocks')
          .select(`
            id, name, year,
            block_students!block_id (
              student_id,
              users!student_id ( first_name, last_name, is_active )
            )
          `);

        // Fetch teachers for active/inactive count
        const { data: allTeacherUsers } = await supabase
          .from('users')
          .select('id, is_active')
          .eq('role', 'teacher');

        const teacherIdsInLoad = [...new Set(filteredLoads.map((l: any) => l.teacher_id))];
        const activeTeacherCount = (allTeacherUsers || []).filter(
          (u: any) => u.is_active && teacherIdsInLoad.includes(u.id)
        ).length;
        const inactiveTeacherCount = teacherIdsInLoad.length - activeTeacherCount;

        const html = generateAcademicReportHTML({
          ay,
          term,
          totalCourses,
          totalUnits,
          activeTeacherCount,
          inactiveTeacherCount,
          groupedTeachers: groupedLoads,
          blockStudents: (blockStudents || []) as any,
        });

        const win = window.open('', '_blank', 'width=960,height=750');
        if (win) {
          win.document.write(html);
          win.document.close();
          win.onload = () => { win.focus(); win.print(); };
        }
      } else {
        // Users Archive Print
        const studentRecords = filteredUsers.filter(u => u.role === "student").length;
        const teacherRecords = filteredUsers.length - studentRecords;

        const html = generateUserArchiveReportHTML({
          totalRecords: filteredUsers.length,
          studentRecords,
          teacherRecords,
          archivedUsers: filteredUsers
        });

        const win = window.open('', '_blank', 'width=960,height=750');
        if (win) {
          win.document.write(html);
          win.document.close();
          win.onload = () => { win.focus(); win.print(); };
        }
      }
    } catch (err: any) {
      console.error('Print error:', err);
      showNotification('error', 'Failed to generate report.');
    } finally {
      setIsPrinting(false);
    }
  };


  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      let headers: string[] = [];
      let rows: any[] = [];
      let filename = "archive-export.csv";

      if (type === "academic") {
        const ay = ayFilter !== 'all' ? ayFilter : 'All';
        const term = termFilter !== 'all' ? termFilter : 'All';
        headers = ['Teacher Name', 'Email', 'Course Code', 'Course Title', 'Units', 'Academic Year', 'Term'];
        rows = filteredLoads.map((load: any) => [
          `${load.users?.first_name || ''} ${load.users?.last_name || ''}`.trim(),
          load.users?.email || '',
          load.courses?.course_code || '',
          load.courses?.course_title || '',
          load.courses?.units ?? '',
          load.academic_year || ay,
          load.term || term,
        ]);
        filename = `academic-records-${ay}-${term.replace(/\\s/g, '-')}.csv`;
      } else {
        headers = ['ID / Code', 'First Name', 'Last Name', 'Email', 'Role', 'Status'];
        rows = filteredUsers.map((user: any) => {
          let statusText = "Deactivated";
          if (user.role === "student" && user.enrollment_status) {
            statusText = user.enrollment_status;
          }
          return [
            user.student_code || '',
            user.first_name || '',
            user.last_name || '',
            user.email || '',
            user.role || '',
            statusText,
          ];
        });
        const dateStr = new Date().toISOString().split('T')[0];
        filename = `user-archive-${dateStr}.csv`;
      }

      const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('success', 'CSV exported successfully.');
    } catch (err: any) {
      showNotification('error', 'Failed to export CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Premium Integrated Header */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate("/Admin/Settings")}
            className="w-12 h-12 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center text-neutral-400 hover:text-primary hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-medium text-neutral-900 tracking-tight">
              {type === "academic" ? "Academic Records" : "User Records Archive"}
            </h1>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <Archive size={14} className="text-primary/50" />
            {type === "academic" 
              ? "Archive of teacher course assignments" 
              : "Archived records"}
          </p>
        </div>
      </div>
      <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrintReport}
            disabled={isPrinting}
            className="rounded-xl bg-white shadow-sm border border-neutral-200 hover:bg-neutral-50 px-4 h-10 flex items-center gap-2 group disabled:opacity-50"
          >
            {isPrinting ? <Loader2 size={16} className="text-neutral-400 animate-spin" /> : <Printer size={16} className="text-neutral-400" />}
            <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-600">{isPrinting ? 'Generating...' : 'Print Report'}</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="rounded-xl bg-white shadow-sm border border-neutral-200 hover:bg-neutral-50 px-4 h-10 flex items-center gap-2 group disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="text-neutral-400 animate-spin" /> : <Download size={16} className="text-neutral-400" />}
            <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-600">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <Filter size={16} className="text-neutral-400" />
          <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Search and Filter</h3>
        </div>
        <div className={type === "academic" ? "grid grid-cols-1 md:grid-cols-4 gap-6" : "grid grid-cols-1 gap-6"}>
          <div className={type === "academic" ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
            <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Search Records</label>
            <div className="relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/search:text-primary transition-colors" size={18} />
              <input
                placeholder={type === "academic" ? "Search teacher or course..." : "Search name, email, or code..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
              />
            </div>
          </div>
          
          {type === "academic" && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Academic Year</label>
                <div className="relative group/ay">
                  <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/ay:text-primary transition-colors" />
                  <select
                    value={ayFilter}
                    onChange={(e) => setAyFilter(e.target.value)}
                    className="w-full h-12 pl-12 pr-10 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-[11px] font-medium uppercase tracking-widest appearance-none cursor-pointer focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
                  >
                    <option value="all">All Years</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>AY {year}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Term Filter</label>
                <div className="relative group/term">
                  <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/term:text-primary transition-colors" />
                  <select
                    value={termFilter}
                    onChange={(e) => setTermFilter(e.target.value)}
                    className="w-full h-12 pl-12 pr-10 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-[11px] font-medium uppercase tracking-widest appearance-none cursor-pointer focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
                  >
                    <option value="all">All Semesters</option>
                    {availableTerms.map(term => (
                      <option key={term} value={term}>{term.toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 pointer-events-none" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-5 group hover:border-primary/20 transition-all">
          <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            {type === "academic" ? <User size={24} /> : <GraduationCap size={24} />}
          </div>
          <div>
            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">
              {type === "academic" ? "Active Teachers" : "Archived Students"}
            </p>
            <p className="text-2xl font-medium text-neutral-900 mt-0.5">
              {type === "academic" ? groupedLoads.length : archivedUsers.filter(u => u.role === 'student').length}
            </p>
          </div>
        </div>
        <div className="p-6 bg-white rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-5 group hover:border-secondary/20 transition-all">
          <div className="w-14 h-14 bg-secondary/5 rounded-2xl flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
            {type === "academic" ? <BookOpen size={24} /> : <Briefcase size={24} />}
          </div>
          <div>
            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">
              {type === "academic" ? "Course Count" : "Archived Faculty"}
            </p>
            <p className="text-2xl font-medium text-neutral-900 mt-0.5">
              {type === "academic" ? filteredLoads.length : archivedUsers.filter(u => u.role === 'teacher').length}
            </p>
          </div>
        </div>
        <div className="p-6 bg-white rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-5 group hover:border-accent/20 transition-all">
          <div className="w-14 h-14 bg-accent/5 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
            {type === "academic" ? <BarChart3 size={24} /> : <UserX size={24} />}
          </div>
          <div>
            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">
              {type === "academic" ? "Total Units" : "Inactive Admins"}
            </p>
            <p className="text-2xl font-medium text-neutral-900 mt-0.5">
              {type === "academic" 
                ? filteredLoads.reduce((acc, load) => acc + (load.courses?.units || 0), 0)
                : archivedUsers.filter(u => u.role === 'admin').length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Record Hub */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[3rem] border border-neutral-100 shadow-sm">
          <Loader2 className="animate-spin text-primary/30 w-12 h-12 mb-6" />
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">Searching records...</p>
        </div>
      ) : (type === "academic" ? groupedLoads.length : archivedUsers.length) === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border border-neutral-100 text-center flex flex-col items-center shadow-sm">
          <div className="w-20 h-20 bg-neutral-50 rounded-[2rem] flex items-center justify-center mb-6 border border-neutral-100">
            <History className="w-10 h-10 text-neutral-200" />
          </div>
          <h3 className="text-xl font-medium text-neutral-900 tracking-tight">No records found</h3>
          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mt-2 max-w-sm mx-auto leading-relaxed">
            Try adjusting your search filters to find what you're looking for.
          </p>
        </div>
      ) : type === "academic" ? (
        <div className="space-y-8">
            <div className="flex items-center gap-3 px-1">
               <Activity size={14} className="text-primary" />
               <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Teacher Assignments</h3>
            </div>
            {groupedLoads.map((group, idx) => (
                <div key={idx} className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden group/card hover:border-primary/20 transition-all duration-500">
                    <div className="bg-neutral-50/50 px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-neutral-100">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-medium text-xs shadow-xl group-hover/card:scale-110 transition-transform">
                                {group.teacher.first_name?.[0]}{group.teacher.last_name?.[0]}
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-neutral-900 tracking-tight">{group.teacher.first_name} {group.teacher.last_name}</h3>
                                <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mt-0.5">{group.teacher.email}</p>
                                {(group.teacher.title || group.teacher.nickname) && (
                                    <p className="text-[9px] font-medium text-primary uppercase tracking-widest mt-1">
                                        {group.teacher.title ? `${group.teacher.title} ` : ''}{group.teacher.nickname || ''}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                           <span className="px-5 py-2 bg-white border border-neutral-100 rounded-xl text-[10px] font-medium text-neutral-600 uppercase tracking-widest flex items-center shadow-sm">
                               <Layers size={14} className="mr-2 text-primary" />
                               {group.courses.length} Assigned Courses
                           </span>
                           <span className="text-[8px] font-medium text-neutral-300 uppercase tracking-widest mr-1">Teacher Load View</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/50">
                                    <th className="px-8 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Course Code</th>
                                    <th className="px-6 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Course Title</th>
                                    <th className="px-6 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-widest text-center">Units</th>
                                    <th className="px-6 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-widest text-right">Period</th>
                                    <th className="px-8 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {group.courses.map((load: any, cidx: number) => (
                                    <tr key={cidx} className="hover:bg-neutral-50/30 transition-all duration-300 group/row">
                                        <td className="px-8 py-4">
                                            <span className="font-mono text-xs font-medium text-neutral-400 bg-neutral-100 px-3 py-1 rounded-lg uppercase tracking-tight">
                                                {load.courses?.course_code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-neutral-700 tracking-tight leading-tight">
                                                {load.courses?.course_title}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-medium text-neutral-500">{load.courses?.units}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                               <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">
                                                  {ayFilter !== 'all' ? ayFilter : academicSettings?.ay_start + '-' + academicSettings?.ay_end}
                                               </span>
                                               <span className="text-[9px] font-medium text-neutral-300 uppercase mt-0.5">
                                                  {termFilter !== 'all' ? termFilter : academicSettings?.current_semester}
                                               </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button 
                                              onClick={() => {
                                                setLoadToDelete(load);
                                                setDeleteReason("");
                                                setDeleteModalOpen(true);
                                              }}
                                              className="p-2.5 text-neutral-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                                              title="Decommission Assignment"
                                            >
                                              <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Member Info</th>
                  <th className="px-6 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Role</th>
                  <th className="px-6 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Identification</th>
                  <th className="px-6 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Archive Reason</th>
                  <th className="px-6 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Join Date</th>
                  <th className="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredUsers.map((user, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/30 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] shadow-sm ${
                          user.role === 'student' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                        }`}>
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900 leading-tight">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${
                        user.role === 'student' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-mono font-medium text-neutral-500 bg-neutral-100 px-3 py-1 rounded-lg">
                        {user.student_code || user.code || "---"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${
                        user.enrollment_status === 'graduated' ? 'bg-emerald-50 text-emerald-600' : 
                        user.enrollment_status === 'dropped' ? 'bg-rose-50 text-rose-600' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {user.enrollment_status || (!user.is_active ? "Resigned/Inactive" : "Unknown")}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">
                        {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button 
                         onClick={() => handleRestoreUser(user)}
                         className="p-2 h-9 w-9 flex items-center justify-center bg-white border border-neutral-100 text-neutral-400 hover:text-primary hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 rounded-lg transition-all"
                         title="Restore User Access"
                       >
                         <RotateCcw size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modernized Decommission Portal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/5 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)} />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-neutral-100 p-10 space-y-8"
             >
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-2">
                    <Trash2 size={32} />
                  </div>
                  <h2 className="text-2xl font-medium text-neutral-900 tracking-tight">Remove Assignment</h2>
                  <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest opacity-80">This will remove the assignment from the records.</p>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium text-neutral-600 leading-relaxed tracking-tight">
                    Are you sure you want to remove <span className="text-primary font-medium uppercase">{loadToDelete?.courses?.course_title}</span> from <span className="text-primary font-medium uppercase">{loadToDelete?.users?.first_name} {loadToDelete?.users?.last_name}</span>? The teacher will be notified of this change.
                  </p>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">
                      Reason for deletion <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Specify reason (e.g., Error in entry, Class cancelled)..."
                      className="w-full h-32 px-5 py-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-red-500/5 focus:bg-white focus:border-red-500/20 transition-all outline-none resize-none shadow-sm"
                      required
                    ></textarea>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={isDeleting}
                    className="flex-1 rounded-xl h-10 text-[10px] font-medium uppercase tracking-widest border-neutral-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmDelete}
                    disabled={isDeleting || deleteReason.trim().length === 0}
                    className="flex-1 rounded-xl h-10 bg-red-500 text-white shadow-lg shadow-red-500/20 text-[10px] font-medium uppercase tracking-widest hover:bg-red-600 transition-all"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Delete"}
                  </Button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
