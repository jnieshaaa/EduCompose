import { useState, useEffect, useMemo } from "react";
import { Search, Loader2, Calendar, User, BookOpen, Layers, Filter, Printer, Download, Trash } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useNotification } from "../../context/NotificationContext";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { fetchAllTeacherLoads, fetchAcademicSettings, deleteTeacherCourseLoad } from "../../services/academicService";
import type { AcademicSettings } from "../../services/academicService";

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

  // Group by teacher for better view
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
        groups[teacherId].courses.push(load); // Pushing the whole load object so we have IDs
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
    } else {
      showNotification('error', "Failed to delete course load: " + result.error);
    }
    
    setIsDeleting(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Academic Records</h1>
          <p className="text-neutral-600 mt-1">Review teacher course loads and historical assignments</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer size={16} className="mr-2" />
                Print Report
            </Button>
            <Button variant="outline" size="sm">
                <Download size={16} className="mr-2" />
                Export CSV
            </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-5 border-primary/10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <Input
              placeholder="Search teacher or course..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-neutral-400" />
            <select
              value={ayFilter}
              onChange={(e) => setAyFilter(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="all">All Academic Years</option>
              {/* Dynamic AYs - in real app would come from a unique query */}
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-neutral-400" />
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="all">All Terms</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4 bg-primary-50 border-primary/10 flex items-center space-x-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <User size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">Active Teachers</p>
                <p className="text-2xl font-bold text-primary">{groupedLoads.length}</p>
            </div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-100 flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-xl text-green-600">
                <BookOpen size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-green-600/60 uppercase tracking-widest">Total Courses Held</p>
                <p className="text-2xl font-bold text-green-600">{filteredLoads.length}</p>
            </div>
        </Card>
        <Card className="p-4 bg-amber-50 border-amber-100 flex items-center space-x-4">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                <Layers size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-amber-600/60 uppercase tracking-widest">Term Units</p>
                <p className="text-2xl font-bold text-amber-600">
                    {filteredLoads.reduce((acc, load) => acc + (load.courses?.units || 0), 0)}
                </p>
            </div>
        </Card>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-neutral-100 shadow-sm">
          <Loader2 className="animate-spin text-primary w-10 h-10 mb-4" />
          <p className="text-neutral-500 font-medium">Fetching historical records...</p>
        </div>
      ) : groupedLoads.length === 0 ? (
        <Card className="p-20 text-center flex flex-col items-center">
            <div className="p-4 bg-neutral-50 rounded-full mb-4">
                <Layers className="w-12 h-12 text-neutral-200" />
            </div>
            <h3 className="text-lg font-bold text-neutral-800">No records found</h3>
            <p className="text-neutral-500 max-w-xs mx-auto mt-1">
                There are no course assignments matching your current filter. Try selecting a different term or year.
            </p>
        </Card>
      ) : (
        <div className="space-y-6">
            {groupedLoads.map((group, idx) => (
                <Card key={idx} className="overflow-hidden border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-neutral-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                {group.teacher.first_name?.[0]}{group.teacher.last_name?.[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-neutral-900">{group.teacher.first_name} {group.teacher.last_name}</h3>
                                <p className="text-xs text-neutral-500">{group.teacher.email}</p>
                                {(group.teacher.title || group.teacher.nickname) && (
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                        {group.teacher.title ? `${group.teacher.title} ` : ''}{group.teacher.nickname || ''}
                                    </p>
                                )}
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-white border border-neutral-200 rounded-full text-[10px] font-bold text-neutral-500 uppercase flex items-center">
                            <Layers size={12} className="mr-1" />
                            {group.courses.length} Courses Assigned
                        </span>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-left">
                            <thead className="bg-white text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                                <tr>
                                    <th className="px-6 py-3">Course Code</th>
                                    <th className="px-6 py-3">Course Title</th>
                                    <th className="px-6 py-3 text-center">Units</th>
                                    <th className="px-6 py-3 text-right">Term Info</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {group.courses.map((load: any, cidx: number) => (
                                    <tr key={cidx} className="hover:bg-neutral-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm bg-neutral-100 px-2 py-0.5 rounded text-neutral-700">
                                                {load.courses?.course_code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-neutral-700">
                                            {load.courses?.course_title}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-neutral-500 text-center">
                                            {load.courses?.units}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[10px] font-medium text-neutral-400">
                                                {ayFilter !== 'all' ? ayFilter : academicSettings?.ay_start + '-' + academicSettings?.ay_end} | {termFilter !== 'all' ? termFilter : academicSettings?.current_semester}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                              onClick={() => {
                                                setLoadToDelete(load);
                                                setDeleteReason("");
                                                setDeleteModalOpen(true);
                                              }}
                                              className="p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors"
                                              title="Remove Student Assignment"
                                            >
                                              <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ))}
        </div>
      )}

      {/* Delete Course Load Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Remove Course Assignment"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            You are about to remove <strong>{loadToDelete?.courses?.course_title}</strong> from <strong>{loadToDelete?.users?.first_name} {loadToDelete?.users?.last_name}</strong>'s load. A notification will be sent to the teacher explaining why.
          </p>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Reason for Removal <span className="text-red-500">*</span>
            </label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="E.g., Section dissolved, Mistaken assignment"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/50 text-sm h-24"
              required
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmDelete}
              disabled={isDeleting || deleteReason.trim().length === 0}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash className="w-4 h-4 mr-2" />}
              {isDeleting ? "Removing..." : "Remove Assignment"}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
