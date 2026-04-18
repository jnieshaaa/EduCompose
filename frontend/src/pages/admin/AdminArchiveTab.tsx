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
  Clock,
  ShieldCheck,
  MoreVertical,
  Activity,
  History,
  Archive,
  BarChart3,
  FileText
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useNotification } from "../../context/NotificationContext";
import { fetchAllTeacherLoads, fetchAcademicSettings, deleteTeacherCourseLoad } from "../../services/academicService";
import type { AcademicSettings } from "../../services/academicService";
import { motion, AnimatePresence } from "framer-motion";
import AlertModal from "../../components/ui/AlertModal";

export function AdminArchiveTab() {
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings | null>(null);
  const [loads, setLoads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [ayFilter, setAyFilter] = useState("");
  const [termFilter, setTermFilter] = useState("all");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loadToDelete, setLoadToDelete] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    const settings = await fetchAcademicSettings();
    if (settings) {
      setAcademicSettings(settings);
      setAyFilter(`${settings.ay_start}-${settings.ay_end}`);
      setTermFilter(settings.current_semester);
      
      const allLoads = await fetchAllTeacherLoads(
        `${settings.ay_start}-${settings.ay_end}`, 
        settings.current_semester
      );
      setLoads(allLoads);
    }
    setIsLoading(false);
  };

  const handleFilterChange = async () => {
    if (!ayFilter || !termFilter) return;
    setIsLoading(true);
    const allLoads = await fetchAllTeacherLoads(
      ayFilter === "all" ? undefined : ayFilter,
      termFilter === "all" ? undefined : termFilter
    );
    setLoads(allLoads || []);
    setIsLoading(false);
  };

  useEffect(() => {
    if (academicSettings) {
        handleFilterChange();
    }
  }, [ayFilter, termFilter]);

  const filteredLoads = useMemo(() => {
    return loads.filter((load) => {
        const teacherName = `${load.users?.first_name || ""} ${load.users?.last_name || ""}`.toLowerCase();
        const courseTitle = (load.courses?.course_title || "").toLowerCase();
        const courseCode = (load.courses?.course_code || "").toLowerCase();
        const query = searchTerm.toLowerCase();

        return teacherName.includes(query) || courseTitle.includes(query) || courseCode.includes(query);
    });
  }, [loads, searchTerm]);

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
      loadToDelete.users?.auth_user_id,
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

  return (
    <div className="space-y-8 pb-32">
      {/* Premium Integrated Header */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Academic Records</h1>
          <p className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <Archive size={14} className="text-primary/50" />
            Historical Assignment Repository
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.print()}
            className="rounded-2xl bg-white shadow-sm border border-neutral-100 hover:bg-neutral-50 px-5 h-12 flex items-center gap-2 group"
          >
            <Printer size={16} className="text-neutral-400" />
            <span className="text-xs font-black uppercase tracking-widest text-neutral-600">Print Audit</span>
          </Button>
          <Button 
            variant="outline"
            className="rounded-2xl bg-white shadow-sm border border-neutral-100 hover:bg-neutral-50 px-5 h-12 flex items-center gap-2 group"
          >
            <Download size={16} className="text-neutral-400" />
            <span className="text-xs font-black uppercase tracking-widest text-neutral-600">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Filter Hub */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <Filter size={16} className="text-neutral-400" />
          <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Repository Query Parameters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Identity Search</label>
            <div className="relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/search:text-primary transition-colors" size={18} />
              <input
                placeholder="Query teacher or course context..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Academic Year</label>
            <div className="relative group/ay">
              <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/ay:text-primary transition-colors" />
              <select
                value={ayFilter}
                onChange={(e) => setAyFilter(e.target.value)}
                className="w-full h-12 pl-12 pr-10 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-[11px] font-black uppercase tracking-widest appearance-none cursor-pointer focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
              >
                <option value="all">Historical Span</option>
                <option value="2024-2025">AY 2024-2025</option>
                <option value="2025-2026">AY 2025-2026</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Term Filter</label>
            <div className="relative group/term">
              <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/term:text-primary transition-colors" />
              <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="w-full h-12 pl-12 pr-10 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-[11px] font-black uppercase tracking-widest appearance-none cursor-pointer focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
              >
                <option value="all">Session Range</option>
                <option value="1st Semester">1ST SEMESTER</option>
                <option value="2nd Semester">2ND SEMESTER</option>
                <option value="Summer">SUMMER TERM</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Refined Telemetry Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-5 group hover:border-primary/20 transition-all">
          <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <User size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Active Instructors</p>
            <p className="text-2xl font-black text-neutral-900 mt-0.5">{groupedLoads.length}</p>
          </div>
        </div>
        <div className="p-6 bg-white rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-5 group hover:border-secondary/20 transition-all">
          <div className="w-14 h-14 bg-secondary/5 rounded-2xl flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Course Deployments</p>
            <p className="text-2xl font-black text-neutral-900 mt-0.5">{filteredLoads.length}</p>
          </div>
        </div>
        <div className="p-6 bg-white rounded-[2rem] border border-neutral-100 shadow-sm flex items-center gap-5 group hover:border-accent/20 transition-all">
          <div className="w-14 h-14 bg-accent/5 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total Unit Load</p>
            <p className="text-2xl font-black text-neutral-900 mt-0.5">
              {filteredLoads.reduce((acc, load) => acc + (load.courses?.units || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Record Hub */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[3rem] border border-neutral-100 shadow-sm">
          <Loader2 className="animate-spin text-primary/30 w-12 h-12 mb-6" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Querying Historical Records</p>
        </div>
      ) : groupedLoads.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border border-neutral-100 text-center flex flex-col items-center shadow-sm">
          <div className="w-20 h-20 bg-neutral-50 rounded-[2rem] flex items-center justify-center mb-6 border border-neutral-100">
            <History className="w-10 h-10 text-neutral-200" />
          </div>
          <h3 className="text-xl font-black text-neutral-900 tracking-tight">Zero Records Found</h3>
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-2 max-w-sm mx-auto leading-relaxed">
            There are no course assignments matching the current telemetry parameters. Try adjusting the temporal span or session range.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
            <div className="flex items-center gap-3 px-1">
               <Activity size={14} className="text-primary" />
               <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Instructional Identity Logs</h3>
            </div>
            {groupedLoads.map((group, idx) => (
                <div key={idx} className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden group/card hover:border-primary/20 transition-all duration-500">
                    <div className="bg-neutral-50/50 px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-neutral-100">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xs shadow-xl group-hover/card:scale-110 transition-transform">
                                {group.teacher.first_name?.[0]}{group.teacher.last_name?.[0]}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-neutral-900 tracking-tight">{group.teacher.first_name} {group.teacher.last_name}</h3>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{group.teacher.email}</p>
                                {(group.teacher.title || group.teacher.nickname) && (
                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-1">
                                        {group.teacher.title ? `${group.teacher.title} ` : ''}{group.teacher.nickname || ''}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                           <span className="px-5 py-2 bg-white border border-neutral-100 rounded-xl text-[10px] font-black text-neutral-600 uppercase tracking-widest flex items-center shadow-sm">
                               <Layers size={14} className="mr-2 text-primary" />
                               {group.courses.length} Assignments Detached
                           </span>
                           <span className="text-[8px] font-black text-neutral-300 uppercase tracking-[0.2em] mr-1">Instructor Load Context</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/50">
                                    <th className="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Course Identification</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Contextual Title</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] text-center">Unit Load</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] text-right">Temporal Data</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] text-right">Operational Logic</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {group.courses.map((load: any, cidx: number) => (
                                    <tr key={cidx} className="hover:bg-neutral-50/30 transition-all duration-300 group/row">
                                        <td className="px-8 py-4">
                                            <span className="font-mono text-xs font-black text-neutral-400 bg-neutral-100 px-3 py-1 rounded-lg uppercase tracking-tight">
                                                {load.courses?.course_code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-neutral-700 tracking-tight leading-tight">
                                                {load.courses?.course_title}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-black text-neutral-500">{load.courses?.units}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                               <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                                  {ayFilter !== 'all' ? ayFilter : academicSettings?.ay_start + '-' + academicSettings?.ay_end}
                                               </span>
                                               <span className="text-[9px] font-bold text-neutral-300 uppercase mt-0.5">
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
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Assignment Decommission</h2>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest opacity-80">Historical Record Modification Portal</p>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-black text-neutral-600 leading-relaxed tracking-tight">
                    Confirm detachment of <span className="text-primary font-black uppercase">{loadToDelete?.courses?.course_title}</span> from <span className="text-primary font-black uppercase">{loadToDelete?.users?.first_name} {loadToDelete?.users?.last_name}</span>. A systemic notification will be dispatched to the instructor.
                  </p>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">
                      Reason for Decommission <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Specify rationale (e.g., Section Dissolution, Operational Error)..."
                      className="w-full h-32 px-5 py-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-sm font-black focus:ring-4 focus:ring-red-500/5 focus:bg-white focus:border-red-500/20 transition-all outline-none resize-none shadow-sm"
                      required
                    ></textarea>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={isDeleting}
                    className="flex-1 rounded-2xl h-14 text-xs font-black uppercase tracking-widest border-neutral-100"
                  >
                    Abort Operation
                  </Button>
                  <Button
                    onClick={confirmDelete}
                    disabled={isDeleting || deleteReason.trim().length === 0}
                    className="flex-1 rounded-2xl h-14 bg-red-500 text-white shadow-xl shadow-red-500/20 text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all"
                  >
                    {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Confirm Decommission"}
                  </Button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
