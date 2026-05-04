import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Edit2,
  Trash2,
  MoreVertical,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  User,
  Mail,
  Zap,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  History,
  Layers,
  ChevronDown,
  UserCircle
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import EditStudentModal from "../../components/admin/EditStudentModal";
import EnrollStudentModal from "../../components/admin/EnrollStudentModal.tsx";
import AdminUserLogs from "../../components/admin/AdminUserLogs";
import { sendStudentWelcomeEmail } from "../../services/emailService";
import { authApi, adminApi } from "../../api";
import AlertModal from "../../components/ui/AlertModal";
import { AdminPendingStudentsTab } from "./AdminPendingStudentsTab";
import { useNotification } from "../../contexts/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../components/ui/Button";

interface Student {
  id: string;
  student_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  email: string;
  year: number;
  block_name: string;
  program_id: string;
  birthday?: string;
  is_active: boolean;
  enrollment_status: "active" | "dropped" | "graduated";
  programs_lookup?: {
    id: string;
    name: string;
    abbr: string;
    departments?: {
      id: string;
      name: string;
      code: string;
    };
  };
  onboarding_completed?: boolean;
}

export const AdminStudentsTab: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedStudentForLogs, setSelectedStudentForLogs] = useState<Student | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [departments, setDepartments] = useState<any[]>([]);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [deptFilter, setDeptFilter] = useState("");
  const [progFilter, setProgFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [availableBlocks, setAvailableBlocks] = useState<string[]>([]);

  const [confirmingAction, setConfirmingAction] = useState<{
    type: "delete" | "resend" | "provision" | "bulk_delete" | "bulk_provision" | "bulk_resend";
    student?: Student;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"enrolled" | "pending">("enrolled");
  const { showNotification } = useNotification();

  const logStudentId = searchParams.get("logs");

  useEffect(() => {
    if (logStudentId && !selectedStudentForLogs && students.length > 0) {
      const s = students.find(std => std.id === logStudentId);
      if (s) setSelectedStudentForLogs(s);
    }
  }, [logStudentId, students, selectedStudentForLogs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const calculateDropdownPosition = useCallback(
    (triggerEl: HTMLElement, menuHeight: number = 280) => {
      const rect = triggerEl.getBoundingClientRect();
      const viewportPadding = 8;
      const menuWidth = Math.min(220, window.innerWidth - viewportPadding * 2);

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;

      const unclampedTop = shouldOpenAbove
        ? rect.top - menuHeight - 4
        : rect.bottom + 4;
      const maxTop = Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding);
      const top = Math.max(viewportPadding, Math.min(unclampedTop, maxTop));

      const rawLeft = rect.right - menuWidth;
      const left = Math.max(
        viewportPadding,
        Math.min(rawLeft, window.innerWidth - menuWidth - viewportPadding),
      );

      setDropdownPos({ top, left });
    },
    [],
  );

  useEffect(() => {
    if (!openDropdown) return;

    const updatePosition = () => {
      const triggerEl = document.querySelector<HTMLElement>(
        `[data-student-action-trigger="${openDropdown}"]`,
      );
      if (!triggerEl) return;
      const measuredHeight = dropdownRef.current?.offsetHeight || 280;
      calculateDropdownPosition(triggerEl, measuredHeight);
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [openDropdown, calculateDropdownPosition]);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("users")
        .select(`
          *,
          student_profiles!inner (
            *,
            programs_lookup (
              id,
              name,
              abbr,
              departments(
                id,
                name,
                code
              )
            )
          )
        `, { count: "exact" })
        .eq("role", "student")
        .not('student_profiles.enrollment_status', 'in', '("dropped", "graduated")');

      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,student_profiles.student_code.ilike.%${searchTerm}%`);
      }

      if (progFilter) {
        query = query.eq("student_profiles.program_id", progFilter);
      }

      if (blockFilter) {
        query = query.eq("student_profiles.block_name", blockFilter);
      }

      // Handle Department Filter
      if (deptFilter && !progFilter) {
        // Get all program IDs for this department first to filter students
        const { data: deptProgs } = await supabase
          .from("programs_lookup")
          .select("id")
          .eq("department_id", deptFilter);
        
        if (deptProgs && deptProgs.length > 0) {
          query = query.in("student_profiles.program_id", deptProgs.map(p => p.id));
        }
      }

      const { data, error: fetchError, count } = await query
        .order("last_name", { ascending: true })
        .range(from, to);

      if (fetchError) throw fetchError;
      
      console.log('DEBUG: Raw Students Data from Supabase:', data);

      const flattenedData = (data || []).map((user: any) => {
        const profiles = user.student_profiles;
        const sp = Array.isArray(profiles) ? profiles[0] : profiles;

        if (!sp) {
          console.warn(`DEBUG: No student_profile found for user ${user.email} (ID: ${user.id})`);
        } else {
          console.log(`DEBUG: Spreading Profile for ${user.email}:`, sp);
        }

        return {
          ...user,
          ...(sp || {}),
          id: user.id, // Explicitly keep the user ID as the primary ID
          profile_id: sp?.id, // Keep profile ID separately if needed
          programs_lookup: sp?.programs_lookup
        };
      });

      setStudents(flattenedData);
      setTotalStudentsCount(count || 0);
    } catch (err: any) {
      showNotification('error', err instanceof Error ? err.message : "Failed to connect to database.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, deptFilter, progFilter, blockFilter, showNotification]);

  const fetchFiltersData = useCallback(async () => {
    try {
      const [deptsRes, progsRes, blocksRes] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("programs_lookup").select("*").order("name"),
        supabase.from("student_profiles").select("block_name")
      ]);
      setDepartments(deptsRes.data || []);
      setAllPrograms(progsRes.data || []);
      
      const uniqueBlocks = Array.from(new Set(
        (blocksRes.data || []).map(s => s.block_name).filter(Boolean)
      )).sort();
      setAvailableBlocks(uniqueBlocks);
    } catch (err) {
      console.error("Error fetching filter data:", err);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    fetchFiltersData();
  }, [loadStudents, fetchFiltersData]);



  const handleResendPassword = async (student: Student) => {
    if (!student.email) return;
    setConfirmingAction({ type: "resend", student });
  };

  const executeResend = async () => {
    const student = confirmingAction?.student;
    if (!student) return;
    
    try {
      setLoading(true);
      setConfirmingAction(null);
      const newPassword = `Edu${Math.floor(100000 + Math.random() * 900000)}`;

      const { data: ok, error: rpcError } = await supabase.rpc(
        "admin_reset_student_password",
        { p_email: student.email, p_new_password: newPassword }
      );

      if (rpcError) throw new Error(rpcError.message);
      if (!ok) throw new Error("This student doesn't have a login account yet. Please click 'Provision Account' first.");

      await sendStudentWelcomeEmail({
        to_name: `${student.first_name} ${student.last_name}`.trim(),
        to_email: student.email,
        student_code: student.student_code,
        temp_password: newPassword,
      });

      showNotification('success', "Password reset and email sent.");
      setOpenDropdown(null);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to sync account.");
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionAuthAccount = async (student: Student) => {
    if (!student.email) {
      showNotification('warning', "Email address is missing.");
      return;
    }
    setConfirmingAction({ type: "provision", student });
  };

  const executeProvision = async () => {
    const student = confirmingAction?.student;
    if (!student) return;

    try {
      setLoading(true);
      setConfirmingAction(null);
      const tempPassword = student.birthday || `Edu${Math.floor(100000 + Math.random() * 900000)}`;

      await authApi.provisionStudentAccount({
        email: student.email,
        student_code: student.student_code,
        first_name: student.first_name,
        last_name: student.last_name,
        middle_name: student.middle_name,
        password: tempPassword
      });

      // No need to update auth_user_id mapping separately anymore

      await sendStudentWelcomeEmail({
        to_name: `${student.first_name} ${student.last_name}`.trim(),
        to_email: student.email,
        student_code: student.student_code,
        temp_password: tempPassword,
      });

      await loadStudents();
      setOpenDropdown(null);
      showNotification('success', "Student account created successfully.");
    } catch (err: any) {
      showNotification('error', err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    setConfirmingAction({ type: "delete", student });
  };

  const executeDelete = async () => {
    const student = confirmingAction?.student;
    if (!student) return;

    try {
      setLoading(true);
      setConfirmingAction(null);
      await adminApi.deleteUser(student.id);
      await loadStudents();
      setOpenDropdown(null);
      showNotification('success', "Student record deleted.");
    } catch (err: any) {
      showNotification('error', err.message || "Failed to delete student.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(currentItems.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    setConfirmingAction({ type: "bulk_delete" });
  };

  const executeBulkDelete = async () => {
    setIsBulkProcessing(true);
    setConfirmingAction(null);
    setBulkProgress({ current: 0, total: selectedIds.size });
    
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await adminApi.deleteUser(id);
      }
      
      showNotification('success', `${ids.length} records deleted from system.`);
      setSelectedIds(new Set());
      await loadStudents();
    } catch (err: any) {
      showNotification('error', "Failed to delete multiple records: " + err.message);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkProvision = async () => {
    // In the unified system, all students in the users table are already provisioned.
    showNotification('info', "All selected students already have active accounts.");
  };

  const executeBulkProvision = async () => {
    // This is now obsolete as admin_enroll_student_v1 handles provisioning atomically.
    showNotification('info', "Accounts are now automatically provisioned during enrollment.");
  };

  const handleBulkResendWelcome = async () => {
    setConfirmingAction({ type: "bulk_resend" });
  };

  const executeBulkResend = async () => {
    const selectedStudents = students.filter(s => selectedIds.has(s.id));
    setIsBulkProcessing(true);
    setConfirmingAction(null);
    setBulkProgress({ current: 0, total: selectedStudents.length });

    let successCount = 0;
    let failCount = 0;

    for (const student of selectedStudents) {
      try {
        const newPassword = `Edu${Math.floor(100000 + Math.random() * 900000)}`;
        let emailForAuthReset = student.email;
        
        if (student.id) {
          const { data: linkedUser } = await supabase
            .from("users")
            .select("email")
            .eq("id", student.id)
            .maybeSingle();
          if (linkedUser?.email) emailForAuthReset = linkedUser.email;
        }

        const { data: ok } = await supabase.rpc(
          "admin_reset_student_password",
          { p_email: emailForAuthReset, p_new_password: newPassword }
        );

        if (!ok) throw new Error("Auth account not found");

        await sendStudentWelcomeEmail({
          to_name: `${student.first_name} ${student.last_name}`.trim(),
          to_email: student.email,
          student_code: student.student_code,
          temp_password: newPassword,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed:`, err);
        failCount++;
      }
      setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    showNotification('success', `Bulk dispatch complete. Success: ${successCount}, Failed: ${failCount}`);
    setSelectedIds(new Set());
    setIsBulkProcessing(false);
  };

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, deptFilter, progFilter, blockFilter]);

  const totalPages = Math.ceil(totalStudentsCount / itemsPerPage);
  const currentItems = students;

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

  if (selectedStudentForLogs) {
    return (
      <AdminUserLogs 
        item={selectedStudentForLogs as any} 
        type="student" 
        onBack={() => {
          setSelectedStudentForLogs(null);
          searchParams.delete("logs");
          setSearchParams(searchParams);
        }} 
      />
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Students</h1>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mt-1">Manage enrolled students</p>
        </div>
        <div className="flex gap-3">
                   <Button 
            variant="outline"
            onClick={loadStudents}
            className="rounded-xl bg-white shadow-sm border border-neutral-200 hover:bg-neutral-50 px-4 h-10 flex items-center gap-2 group"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 group-hover:rotate-180 transition-all duration-700 ${loading ? "animate-spin" : ""}`} />
            <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-600">Refresh</span>
          </Button>
          <Button 
            onClick={() => setIsEnrollModalOpen(true)}
            className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all px-5 h-10 flex items-center gap-2"
          >
            <UserPlus size={16} />
            <span className="text-[10px] font-medium uppercase tracking-widest">Add Student</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-neutral-100/50 p-1.5 rounded-[1.25rem] w-fit border border-neutral-100">
        <button
          onClick={() => setActiveTab("enrolled")}
          className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-medium transition-all tracking-[0.15em] uppercase ${
            activeTab === "enrolled"
              ? "bg-white text-primary shadow-sm border border-neutral-200"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          <ShieldCheck size={14} />
          Active Students
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-medium transition-all tracking-[0.15em] uppercase relative ${
            activeTab === "pending"
              ? "bg-white text-primary shadow-sm border border-neutral-200"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          <History size={14} />
          New Requests
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "pending" ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AdminPendingStudentsTab />
          </motion.div>
        ) : (
          <motion.div
            key="enrolled"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Search & Filters */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <Search size={16} className="text-neutral-400" />
                <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em]">Filters</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Search</label>
                  <div className="relative group/search">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within/search:text-primary transition-colors" />
                    <input
                      placeholder="Name, ID, or Email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Department</label>
                  <div className="relative group/dept">
                    <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within/dept:text-primary transition-colors" />
                    <select
                      value={deptFilter}
                      onChange={(e) => {
                        setDeptFilter(e.target.value);
                        setProgFilter("");
                        setBlockFilter("");
                      }}
                      className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium appearance-none cursor-pointer focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none"
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Program</label>
                  <div className="relative group/prog">
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within/prog:text-primary transition-colors" />
                    <select
                      value={progFilter}
                      disabled={!deptFilter}
                      onChange={(e) => {
                        setProgFilter(e.target.value);
                        setBlockFilter("");
                      }}
                      className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium appearance-none cursor-pointer focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none disabled:opacity-30"
                    >
                      <option value="">Broad View</option>
                      {allPrograms
                        .filter(p => !deptFilter || p.department_id === departments.find(d => d.code === deptFilter)?.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.abbr}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Block</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 group/block">
                      <select
                        value={blockFilter}
                        disabled={!progFilter && !deptFilter}
                        onChange={(e) => setBlockFilter(e.target.value)}
                        className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium appearance-none cursor-pointer focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none disabled:opacity-30"
                      >
                        <option value="">All Blocks</option>
                        {availableBlocks.map((b) => (
                          <option key={b} value={b}>
                            Block {b}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 pointer-events-none" />
                    </div>
                    {(searchTerm || deptFilter || progFilter || blockFilter) && (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setDeptFilter("");
                          setProgFilter("");
                          setBlockFilter("");
                        }}
                        className="w-11 h-11 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm border border-red-100"
                        title="Reset Filters"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bulk Actions Panel */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="sticky top-6 z-[60] py-4 px-7 bg-primary/95 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col md:flex-row items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex flex-col items-center justify-center border border-white/10">
                      <span className="text-lg font-medium text-white leading-none">{selectedIds.size}</span>
                      <span className="text-[8px] font-medium uppercase tracking-wider text-white/50 mt-0.5">Units</span>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-white tracking-widest uppercase">Bulk Operations</p>
                      <p className="text-[10px] font-medium text-white/60 tracking-wide">
                        Managing {selectedIds.size} selected student records
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {isBulkProcessing ? (
                      <div className="flex items-center gap-6 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest mb-1.5">Processing Accounts...</span>
                            <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                className="h-full bg-primary"
                              />
                            </div>
                         </div>
                         <div className="text-xs font-medium text-white">
                           {bulkProgress.current} <span className="text-white/30 mx-1">/</span> {bulkProgress.total}
                         </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={handleBulkProvision}
                          className="rounded-xl bg-white text-primary text-[10px] font-medium uppercase tracking-widest px-6 h-10 hover:bg-neutral-100 shadow-lg shadow-black/10 transition-all"
                        >
                          Provision Access
                        </Button>
                        <Button 
                          onClick={handleBulkResendWelcome}
                          className="rounded-xl bg-white/20 text-white text-[10px] font-medium uppercase tracking-widest px-5 h-10 hover:bg-white/30 transition-all border border-white/20"
                        >
                          Dispatch Credentials
                        </Button>
                        <Button 
                          onClick={handleBulkDelete}
                          className="rounded-xl bg-red-500/20 text-red-100 text-[10px] font-medium uppercase tracking-widest px-5 h-10 hover:bg-red-500/40 transition-all border border-red-500/30"
                        >
                          Bulk Delete
                        </Button>
                        <button onClick={() => setSelectedIds(new Set())} className="p-2 text-white/30 hover:text-white transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden min-h-[400px]">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/50">
                      <th className="pl-6 py-5 w-10">
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.size === currentItems.length && currentItems.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary"
                          />
                        </div>
                      </th>
                      <th className="px-4 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em]">Identification</th>
                      <th className="px-6 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em]">Placement</th>
                      <th className="px-6 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] text-center">Status</th>
                      <th className="px-6 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-32 text-center">
                          <div className="flex flex-col items-center justify-center gap-6">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.3em]">Loading Student Data...</p>
                          </div>
                        </td>
                      </tr>
                    ) : currentItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-32 text-center">
                          <div className="flex flex-col items-center justify-center opacity-40">
                            <UserCircle size={48} className="text-neutral-300 mb-4" />
                            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em]">No results found for your search</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((student) => (
                        <tr key={student.id} className="group hover:bg-neutral-50/50 transition-all duration-300">
                          <td className="pl-6 py-5">
                            <div className="flex items-center">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.has(student.id)}
                                onChange={() => handleToggleSelect(student.id)}
                                className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary transition-all group-hover:scale-110"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                <User size={20} />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-neutral-900 tracking-tight">
                                  {student.last_name}, {student.first_name} {student.suffix || ""}
                                </div>
                                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mt-0.5">{student.student_code} • {student.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                                <Layers size={14} />
                              </div>
                              <div>
                                <div className="text-xs font-medium text-neutral-900 tracking-tight">
                                  {student.programs_lookup?.abbr} {student.year}-{student.block_name}
                                </div>
                                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">
                                  {student.programs_lookup?.departments?.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col items-center gap-2">
                               <div className="flex items-center gap-1.5">
                                 <span className={`w-1.5 h-1.5 rounded-full ${student.is_active ? 'bg-green-500 animate-pulse' : 'bg-neutral-300'}`} />
                                 <span className={`text-[10px] font-medium uppercase tracking-wider ${student.is_active ? 'text-green-600' : 'text-neutral-400'}`}>
                                   {student.enrollment_status}
                                 </span>
                               </div>
                               {false ? (
                                 <span className="text-[9px] font-medium bg-red-50 text-red-500 px-2 py-0.5 rounded-md uppercase tracking-tighter">No Account</span>
                               ) : student.onboarding_completed ? (
                                 <span className="text-[9px] font-medium bg-green-50 text-green-500 px-2 py-0.5 rounded-md uppercase tracking-tighter flex items-center gap-1">
                                   <ShieldCheck size={10} /> Active Account
                                 </span>
                               ) : (
                                 <span className="text-[9px] font-medium bg-amber-50 text-amber-500 px-2 py-0.5 rounded-md uppercase tracking-tighter">Pending Setup</span>
                               )}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="relative inline-block text-left">
                              <button
                                data-student-action-trigger={student.id}
                                onClick={() => setOpenDropdown(student.id)}
                                className="p-2.5 text-neutral-300 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all"
                              >
                                <MoreVertical size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* High-Density Pagination Console */}
              {!loading && totalStudentsCount > 0 && (
                <div className="px-8 py-8 bg-white border-t border-neutral-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em]">Showing rows</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalStudentsCount)} <span className="text-neutral-300 mx-1">/</span> {totalStudentsCount.toLocaleString()}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reusable Modals */}
      {isEnrollModalOpen && (
        <EnrollStudentModal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          onSuccess={() => {
            setIsEnrollModalOpen(false);
            loadStudents();
          }}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={() => {
            setEditingStudent(null);
            loadStudents();
          }}
        />
      )}

      {/* Central Action Console (Portaled Dropdown) */}
      {openDropdown && dropdownPos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 9999,
              width: "min(220px, calc(100vw - 16px))",
              maxWidth: "calc(100vw - 16px)",
              maxHeight: "calc(100vh - 16px)",
              overflowY: "auto",
              overflowX: "hidden",
            }}
            className="bg-white rounded-3xl shadow-2xl border border-neutral-100 py-3 animate-in fade-in zoom-in duration-150 overflow-hidden"
          >
            {(() => {
              const s = currentItems.find((x) => x.id === openDropdown);
              if (!s) return null;
              return (
                <div className="flex flex-col focus:outline-none">
                  <div className="px-5 py-3 border-b border-neutral-50 mb-1">
                    <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.15em] mb-0.5">Student Details</p>
                    <p className="text-xs font-medium text-neutral-900 truncate">{s.first_name} {s.last_name}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setEditingStudent(s); setOpenDropdown(null); }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-[10px] font-medium text-neutral-600 uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                    >
                      <Edit2 size={14} className="text-neutral-400" />
                      Edit Student
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStudentForLogs(s);
                        searchParams.set("logs", s.id);
                        setSearchParams(searchParams);
                        setOpenDropdown(null);
                      }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-[10px] font-medium text-neutral-600 uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                    >
                      <Activity size={14} className="text-neutral-400" />
                      Activity Logs
                    </button>
                  </div>

                  <div className="py-1 border-t border-neutral-50">
                    <p className="px-5 py-2 text-[8px] font-medium text-neutral-300 uppercase tracking-[0.2em]">Account Management</p>
                    <button
                      onClick={() => { handleResendPassword(s); setOpenDropdown(null); }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-[10px] font-medium text-primary uppercase tracking-widest hover:bg-primary/5 transition-colors"
                    >
                      <Mail size={14} />
                      Resend Email
                    </button>
                    
                    <button
                      onClick={() => { handleProvisionAuthAccount(s); setOpenDropdown(null); }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-[10px] font-medium text-amber-600 uppercase tracking-widest hover:bg-amber-50 transition-colors"
                    >
                      <Zap size={14} />
                      {"Repair / Provision"}
                    </button>
                  </div>

                  <div className="py-1 border-t border-neutral-50">
                    <button
                      onClick={() => { handleDeleteStudent(s); setOpenDropdown(null); }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-[10px] font-medium text-red-500 uppercase tracking-widest hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete Student
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>,
          document.body,
        )}

      {/* Confirm Execution Console */}
      {confirmingAction && (
        <AlertModal
          isOpen={!!confirmingAction}
          onClose={() => setConfirmingAction(null)}
          type={["delete", "bulk_delete"].includes(confirmingAction.type) ? "error" : "warning"}
          title={
            confirmingAction.type === "delete" ? "Delete Student" :
            confirmingAction.type === "bulk_delete" ? "Batch Delete" :
            confirmingAction.type === "resend" ? "Send Password" :
            confirmingAction.type === "bulk_resend" ? "Send Passwords" :
            confirmingAction.type === "provision" ? "Create Account" : "Create Accounts"
          }
          message={
            confirmingAction.type === "delete" ? `Are you sure you want to delete student ${confirmingAction.student?.student_code}? All data will be lost.` :
            confirmingAction.type === "bulk_delete" ? `Are you sure you want to delete ${selectedIds.size} student records? This cannot be undone.` :
            confirmingAction.type === "resend" || confirmingAction.type === "provision" ? `Sending login credentials to ${confirmingAction.student?.email}.` :
            `Creating accounts for ${selectedIds.size} students.`
          }
          showCancel
          confirmText="Yes, Continue"
          cancelText="Cancel"
          onConfirm={
            confirmingAction.type === "delete" ? executeDelete :
            confirmingAction.type === "resend" ? executeResend :
            confirmingAction.type === "provision" ? executeProvision :
            confirmingAction.type === "bulk_delete" ? executeBulkDelete :
            confirmingAction.type === "bulk_provision" ? executeBulkProvision : executeBulkResend
          }
        />
      )}
    </div>
  );
};
