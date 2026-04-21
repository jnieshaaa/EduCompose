import React, { useEffect, useState, useCallback } from "react";
import { 
  Search, 
  UserPlus, 
  Mail, 
  Hash, 
  Trash2, 
  Edit2, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserX,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useNotification } from "../../contexts/NotificationContext";
import Button from "../../components/ui/Button";
import EnrollTeacherModal from "../../components/admin/EnrollTeacherModal";
import EditTeacherModal from "../../components/admin/EditTeacherModal";

interface TeacherRecord {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  title?: string;
  nickname?: string;
  school_id?: string;
  department_id?: string;
  role: string;
  code?: string;
  birthday?: string;
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string;
}

export const AdminTeachersTab: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const { showNotification } = useNotification();

  const loadTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, auth_user_id, email, first_name, middle_name, last_name, suffix, title, nickname, school_id, department_id, role, code, birthday, is_active, onboarding_completed, created_at")
        .eq("role", "teacher")
        .order("last_name", { ascending: true });

      if (error) throw error;
      setTeachers(data || []);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const filteredTeachers = teachers.filter(t => 
    `${t.first_name || ""} ${t.last_name || ""}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this teacher? This will NOT delete their auth account but will remove them from the list.")) return;
    try {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
      showNotification('success', "Teacher record removed.");
      loadTeachers();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Faculty Members</h1>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mt-1">Manage academic staff and educators</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={loadTeachers}
            className="rounded-xl bg-white shadow-sm border border-neutral-200 hover:bg-neutral-50 px-4 h-10 flex items-center gap-2 group"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 group-hover:rotate-180 transition-all duration-700 ${loading ? "animate-spin" : ""}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Refresh</span>
          </Button>
          <Button 
            onClick={() => setShowEnrollModal(true)}
            className="rounded-xl bg-secondary text-white shadow-lg shadow-secondary/20 hover:scale-[1.02] transition-all px-5 h-10 flex items-center gap-2"
          >
            <UserPlus size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Enroll Faculty</span>
          </Button>
        </div>
      </div>

      {/* Modern Filter Hub */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Search Faculty</label>
          <div className="relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/search:text-secondary transition-colors" size={18} />
            <input
              placeholder="Search by name, email, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-sm font-bold placeholder:text-neutral-300 focus:ring-4 focus:ring-secondary/5 focus:bg-white focus:border-secondary transition-all outline-none shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="px-8 py-5 text-left text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Faculty Info</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Contact</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Teacher Code</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-10">
                      <div className="h-4 bg-neutral-100 rounded-full w-full opacity-50" />
                    </td>
                  </tr>
                ))
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center">
                        <UserX className="text-neutral-300" size={32} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-500">No faculty members found</p>
                        <p className="text-xs text-neutral-300 mt-1 uppercase tracking-widest">Enroll your first educator to get started</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="group hover:bg-neutral-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center font-black text-xs text-secondary shadow-sm">
                          {teacher.first_name?.[0]?.toUpperCase() || ""}{teacher.last_name?.[0]?.toUpperCase() || (teacher.first_name?.[0] ? "" : "?")}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900 leading-tight">
                            {teacher.first_name} {teacher.middle_name ? `${teacher.middle_name} ` : ""}{teacher.last_name} {teacher.suffix || ""}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest mt-1">Instructor</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5">
                        <Mail size={14} className="text-neutral-300" />
                        <span className="text-[13px] font-medium text-neutral-600">{teacher.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5">
                        <Hash size={14} className="text-secondary" />
                        <span className="text-xs font-bold text-neutral-900 tracking-wider">
                          {teacher.code || "---"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2">
                        <div className={`w-fit px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                          teacher.is_active 
                            ? "bg-green-50 text-green-600 border border-green-100" 
                            : "bg-red-50 text-red-600 border border-red-100"
                        }`}>
                          <div className={`w-1 h-1 rounded-full ${teacher.is_active ? "bg-green-600" : "bg-red-600"}`} />
                          {teacher.is_active ? "Active" : "Disabled"}
                        </div>
                        {teacher.onboarding_completed && (
                          <div className="w-fit px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1.5">
                            <ShieldCheck size={10} />
                            Verified
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingTeacher(teacher)}
                          className="p-2 h-9 w-9 flex items-center justify-center bg-white border border-neutral-100 text-neutral-400 hover:text-secondary hover:border-secondary/20 hover:shadow-lg hover:shadow-secondary/5 rounded-lg transition-all"
                          title="Edit Faculty"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(teacher.id)}
                          className="p-2 h-9 w-9 flex items-center justify-center bg-white border border-neutral-100 text-neutral-400 hover:text-red-500 hover:border-red-100 hover:shadow-lg hover:shadow-red-500/5 rounded-lg transition-all"
                          title="Delete Faculty"
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
        
        {/* Pagination placeholder */}
        {!loading && filteredTeachers.length > 0 && (
          <div className="px-8 py-5 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              Showing {filteredTeachers.length} educators
            </p>
            <div className="flex items-center gap-2">
              <button disabled className="p-2 rounded-lg border border-neutral-200 text-neutral-300 disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <button disabled className="p-2 rounded-lg border border-neutral-200 text-neutral-300 disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <EnrollTeacherModal 
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        onSuccess={() => {
          showNotification('success', "Faculty member enrolled successfully.");
          setTimeout(loadTeachers, 500);
        }}
      />

      {editingTeacher && (
        <EditTeacherModal 
          teacher={editingTeacher}
          isOpen={!!editingTeacher}
          onClose={() => setEditingTeacher(null)}
          onSuccess={() => {
            loadTeachers();
            showNotification('success', "Teacher profile synchronized.");
          }}
        />
      )}
    </div>
  );
};
