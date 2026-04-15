import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Edit2,
  Trash2,
  UserX,
  Users,
  UserCheck,
  MoreVertical,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Mail,
  CheckSquare,
  Square,
  Zap,
} from "lucide-react";
import { supabase, supabaseAdmin } from "../../lib/supabaseClient";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import EditStudentModal from "../../components/admin/EditStudentModal";
import AdminUserLogs from "../../components/admin/AdminUserLogs";
import { sendStudentWelcomeEmail } from "../../services/emailService";
import { authApi } from "../../api";
import AlertModal from "../../components/ui/AlertModal";
import { AdminPendingStudentsTab } from "./AdminPendingStudentsTab";
import { useNotification } from "../../context/NotificationContext";

interface Student {
  id: string;
  auth_user_id?: string | null;
  student_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  year: number;
  block_name: string;
  program_id: string;
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
  users?: {
    is_active: boolean;
    onboarding_completed: boolean;
  };
}

export const AdminStudentsTab: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
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
  const [deptFilter, setDeptFilter] = useState("");
  const [progFilter, setProgFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");

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
      const menuWidth = Math.min(208, window.innerWidth - viewportPadding * 2); // w-52 but capped to viewport

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

  // Keep portal dropdown aligned with its trigger while scrolling/resizing.
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
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("students")
        .select(
          `
          *,
          programs_lookup(
            id,
            name,
            abbr,
            departments(
              id,
              name,
              code
            )
          )
        `,
        )
        .order("last_name", { ascending: true });

      if (fetchError) throw fetchError;
      setStudents(data || []);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFiltersData = useCallback(async () => {
    try {
      const [deptsRes, progsRes] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("programs_lookup").select("*").order("name")
      ]);
      setDepartments(deptsRes.data || []);
      setAllPrograms(progsRes.data || []);
    } catch (err) {
      console.error("Error fetching filter data:", err);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    fetchFiltersData();
  }, [loadStudents, fetchFiltersData]);

  const handleToggleActive = async (student: Student) => {
    try {
      const newStatus =
        student.enrollment_status === "active" ? "dropped" : "active";
      const { error: updateError } = await supabase
        .from("students")
        .update({
          enrollment_status: newStatus,
          is_active: newStatus === "active",
        })
        .eq("id", student.id);

      if (updateError) throw updateError;
      await loadStudents();
      setOpenDropdown(null);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to update student status");
    }
  };

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

      // Prefer the auth-linked email (from users table) when available.
      // This avoids failures when students.email was changed and became desynced from auth.
      let emailForAuthReset = student.email;
      if (student.auth_user_id) {
        const { data: linkedUser, error: linkedUserError } = await supabase
          .from("users")
          .select("email")
          .eq("auth_user_id", student.auth_user_id)
          .maybeSingle();

        if (!linkedUserError && linkedUser?.email) {
          emailForAuthReset = linkedUser.email;
        }
      }

      // Call Supabase RPC (SECURITY DEFINER — no backend/service-role key needed)
      const { data: ok, error: rpcError } = await supabase.rpc(
        "admin_reset_student_password",
        { p_email: emailForAuthReset, p_new_password: newPassword }
      );

      if (rpcError) throw new Error(rpcError.message);
      if (!ok) throw new Error("Student email not found in auth system. Has their account been provisioned?");

      // Send the new password to the student via EmailJS
      await sendStudentWelcomeEmail({
        to_name: `${student.first_name} ${student.last_name}`.trim(),
        to_email: student.email,
        student_code: student.student_code,
        temp_password: newPassword,
      });

      if (emailForAuthReset !== student.email) {
        showNotification('warning', `Password was reset using linked auth email (${emailForAuthReset}). The welcome email was sent to ${student.email}. Please align student email with auth email to avoid future login issues.`);
      } else {
        showNotification('success', "New password generated and sent to the student's email successfully.");
      }
      setOpenDropdown(null);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to resend password.");
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionAuthAccount = async (student: Student) => {
    if (!student.email) {
      showNotification('warning', "Student email is required before provisioning an auth account.");
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
      const tempPassword = `Edu${Math.floor(100000 + Math.random() * 900000)}`;

      const provisionResult = await authApi.provisionStudentAccount({
        email: student.email,
        student_code: student.student_code,
        first_name: student.first_name,
        last_name: student.last_name,
        middle_name: student.middle_name,
        password: tempPassword
      });

      const authId = provisionResult.auth_id;
      if (authId) {
        // Link student record
        await supabase.from("students").update({ auth_user_id: authId }).eq("id", student.id);
      }

      // 4. Send Email
      await sendStudentWelcomeEmail({
        to_name: `${student.first_name} ${student.last_name}`.trim(),
        to_email: student.email,
        student_code: student.student_code,
        temp_password: tempPassword,
      });

      await loadStudents();
      setOpenDropdown(null);
      showNotification('success', "Account provisioned and welcome email sent successfully via Supabase RPC.");
    } catch (err: any) {
      showNotification('error', "Error: " + (err.message || "Failed to provision account."));
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
      const { error: deleteError } = await supabase
        .from("students")
        .delete()
        .eq("id", student.id);

      if (deleteError) throw deleteError;
      await loadStudents();
      setOpenDropdown(null);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to delete student");
    } finally {
      setLoading(false);
    }
  };

  // --- BULK ACTION HANDLERS ---

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
      const { error } = await supabase
        .from("students")
        .delete()
        .in("id", ids);
        
      if (error) throw error;
      
      showNotification('success', `Successfully archived ${ids.length} students.`);
      setSelectedIds(new Set());
      await loadStudents();
    } catch (err: any) {
      showNotification('error', "Error during bulk delete: " + err.message);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkProvision = async () => {
    const selectedStudents = students.filter(s => selectedIds.has(s.id));
    const needProvision = selectedStudents.filter(s => !s.auth_user_id);
    
    if (needProvision.length === 0) {
      showNotification('info', "All selected students already have auth accounts.");
      return;
    }

    setConfirmingAction({ type: "bulk_provision" });
  };

  const executeBulkProvision = async () => {
    const selectedStudents = students.filter(s => selectedIds.has(s.id));
    const needProvision = selectedStudents.filter(s => !s.auth_user_id);
    
    setIsBulkProcessing(true);
    setConfirmingAction(null);
    setBulkProgress({ current: 0, total: needProvision.length });

    let successCount = 0;
    let failCount = 0;

    for (const student of needProvision) {
      try {
        const tempPassword = `Edu${Math.floor(100000 + Math.random() * 900000)}`;
        const normalizedEmail = student.email.trim().toLowerCase();

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            role: "student",
            student_code: student.student_code,
            first_name: student.first_name,
            last_name: student.last_name,
            full_name: `${student.first_name} ${student.last_name}`.trim(),
          }
        });

        let authId = authData?.user?.id;

        if (authError?.message.includes("already registered")) {
           const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
           const existing = userList.users.find(u => u.email === normalizedEmail);
           if (existing) {
             authId = existing.id;
             await supabaseAdmin.auth.admin.updateUserById(authId, { password: tempPassword });
           }
        }

        if (authId) {
          await supabase.from("users").upsert({
            auth_user_id: authId,
            email: normalizedEmail,
            first_name: student.first_name,
            last_name: student.last_name,
            full_name: `${student.first_name} ${student.last_name}`.trim(),
            role: "student",
            is_active: true
          }, { onConflict: "auth_user_id" });

          await supabase.from("students").update({ auth_user_id: authId }).eq("id", student.id);
        }

        await sendStudentWelcomeEmail({
          to_name: `${student.first_name} ${student.last_name}`.trim(),
          to_email: student.email,
          student_code: student.student_code,
          temp_password: tempPassword,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to provision student ${student.student_code}:`, err);
        failCount++;
      }
      setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    showNotification('success', `Bulk Provisioning Complete:\n- Success: ${successCount}\n- Failed: ${failCount}`);
    setSelectedIds(new Set());
    await loadStudents();
    setIsBulkProcessing(false);
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
        
        if (student.auth_user_id) {
          const { data: linkedUser } = await supabase
            .from("users")
            .select("email")
            .eq("auth_user_id", student.auth_user_id)
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
        console.error(`Failed to reset student ${student.student_code}:`, err);
        failCount++;
      }
      setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    showNotification('success', `Bulk Reset Complete:\n- Sent: ${successCount}\n- Failed: ${failCount}`);
    setSelectedIds(new Set());
    setIsBulkProcessing(false);
  };

  const filteredStudents = students.filter((s) => {
    const fullSearch =
      `${s.first_name || ""} ${s.last_name || ""} ${s.student_code || ""} ${s.email || ""}`.toLowerCase();
    
    if (searchTerm && !fullSearch.includes(searchTerm.toLowerCase())) return false;
    
    if (deptFilter) {
      const deptCode = s.programs_lookup?.departments?.code;
      const deptId = s.programs_lookup?.departments?.id;
      if (deptCode !== deptFilter && deptId !== deptFilter) return false;
    }
    
    if (progFilter && s.program_id !== progFilter) return false;
    if (blockFilter && s.block_name !== blockFilter) return false;

    return true;
  });

  // Get unique blocks for the current selection
  const availableBlocks = Array.from(new Set(
    students
      .filter(s => {
        if (deptFilter) {
          const deptCode = s.programs_lookup?.departments?.code;
          const deptId = s.programs_lookup?.departments?.id;
          if (deptCode !== deptFilter && deptId !== deptFilter) return false;
        }
        if (progFilter && s.program_id !== progFilter) return false;
        return true;
      })
      .map(s => s.block_name)
      .filter(Boolean)
  )).sort();

  // Reset pagination when searching or filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, progFilter, blockFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Students</h1>
          <p className="text-neutral-600 mt-1">
            View and manage student records
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "enrolled" && (
            <Button variant="outline" onClick={loadStudents}>
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("enrolled")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "enrolled"
              ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
              : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Enrolled Students
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all relative ${
            activeTab === "pending"
              ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
              : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50"
          }`}
        >
          <Users className="w-4 h-4" />
          Pending Approvals
          {/* We could add a badge here if we fetch pending count */}
        </button>
      </div>

      {activeTab === "pending" ? (
         <AdminPendingStudentsTab />
      ) : (
        <>
          {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search by ID, name, or email..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="pl-9 h-10 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setProgFilter("");
                setBlockFilter("");
              }}
              className="w-full h-10 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={progFilter}
              disabled={!deptFilter}
              onChange={(e) => {
                setProgFilter(e.target.value);
                setBlockFilter("");
              }}
              className="w-full h-10 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              <option value="">All Programs</option>
              {allPrograms
                .filter(p => !deptFilter || p.department_id === departments.find(d => d.code === deptFilter)?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.abbr})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={blockFilter}
              disabled={!progFilter && !deptFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              <option value="">All Blocks</option>
              {availableBlocks.map((b) => (
                <option key={b} value={b}>
                  Block {b}
                </option>
              ))}
            </select>
            {(searchTerm || deptFilter || progFilter || blockFilter) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setDeptFilter("");
                  setProgFilter("");
                  setBlockFilter("");
                }}
                className="p-2 text-neutral-400 hover:text-neutral-600 shrink-0"
                title="Clear all filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20 sticky top-0 z-30 shadow-lg animate-in slide-in-from-top-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">
                {selectedIds.size}
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Students Selected</p>
                <p className="text-[10px] text-primary/60">Choose an action to perform on all selected records</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isBulkProcessing ? (
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-primary/10">
                   <div className="text-sm font-bold text-primary animate-pulse">
                     Processing {bulkProgress.current} / {bulkProgress.total}...
                   </div>
                   <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-primary transition-all duration-300"
                       style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                     />
                   </div>
                </div>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Archive All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleBulkResendWelcome}
                  >
                    <Mail className="w-3.5 h-3.5 mr-2" />
                    Resend Auth
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-primary text-white"
                    onClick={handleBulkProvision}
                  >
                    <Zap className="w-3.5 h-3.5 mr-2" />
                    Provision All
                  </Button>
                  <button 
                    onClick={() => setSelectedIds(new Set())}
                    className="ml-2 p-2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-neutral-600 mt-4">Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-neutral-600 mb-4">No students found.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr className="text-left">
                  <th className="px-6 py-3">
                    <button 
                      onClick={() => handleSelectAll(selectedIds.size < currentItems.length)}
                      className="flex items-center justify-center p-1 hover:bg-neutral-100 rounded transition-colors text-primary"
                    >
                      {selectedIds.size === currentItems.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Dept
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Year/Block
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {currentItems.map((s) => (
                  <tr
                    key={s.id}
                    className={`hover:bg-neutral-50/50 transition-colors group ${selectedIds.has(s.id) ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleToggleSelect(s.id)}
                        className={`flex items-center justify-center p-1 rounded transition-colors ${selectedIds.has(s.id) ? "text-primary" : "text-neutral-300 group-hover:text-neutral-400"}`}
                      >
                        {selectedIds.has(s.id) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-600">
                      {s.student_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-neutral-900">{`${s.first_name || ""} ${s.last_name || ""}`}</span>
                        <span className="text-xs text-neutral-400">
                          {s.email || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded text-[10px] font-bold uppercase">
                        {s.programs_lookup?.departments?.code || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-primary/5 text-primary rounded text-[10px] font-bold uppercase">
                        {s.programs_lookup?.abbr || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {s.year || "-"}
                      {s.block_name ? ` • ${s.block_name}` : ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-[10px] font-bold rounded uppercase ${
                          s.enrollment_status === "active"
                            ? "bg-green-100 text-green-700"
                            : s.enrollment_status === "dropped"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {s.enrollment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="relative inline-block text-left">
                         <button
                           data-student-action-trigger={s.id}
                           onClick={(e) => {
                             if (openDropdown === s.id) {
                               setOpenDropdown(null);
                             } else {
                               calculateDropdownPosition(
                                 e.currentTarget,
                                 dropdownRef.current?.offsetHeight || 280,
                               );
                               setOpenDropdown(s.id);
                             }
                           }}
                           className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all"
                         >
                           <MoreVertical size={16} />
                         </button>
                       </div>
                    </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && filteredStudents.length > 0 && (
            <div className="px-6 py-8 bg-neutral-50/50 border-t border-neutral-200 space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Range Indicator */}
                <div className="order-2 md:order-1 flex flex-col">
                  <div className="text-sm font-medium text-neutral-400">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredStudents.length)} of {filteredStudents.length.toLocaleString()}
                  </div>
                </div>

                {/* Pagination Controls */}
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

                {/* Items Per Page */}
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
      )}
    </>
  )}

      {editingStudent && (
        <EditStudentModal
          isOpen={!!editingStudent}
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={loadStudents}
        />
      )}

      {selectedIds.size > 0 && isBulkProcessing && (
        <div className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          {/* Silent progress indicator for bulk */}
        </div>
      )}

      <AlertModal
        isOpen={confirmingAction?.type === "delete"}
        onClose={() => setConfirmingAction(null)}
        type="error"
        title="Archive Student"
        message={`Are you sure you want to archive ${confirmingAction?.student?.first_name} ${confirmingAction?.student?.last_name}? This will remove them from the active list.`}
        showCancel
        confirmText="Confirm Archive"
        onConfirm={executeDelete}
      />

      <AlertModal
        isOpen={confirmingAction?.type === "resend"}
        onClose={() => setConfirmingAction(null)}
        type="warning"
        title="Reset Password"
        message={`Generate a new temporary password for ${confirmingAction?.student?.first_name}? A welcome email will be sent immediately.`}
        showCancel
        confirmText="Generate & Send"
        onConfirm={executeResend}
      />

      <AlertModal
        isOpen={confirmingAction?.type === "provision"}
        onClose={() => setConfirmingAction(null)}
        type="info"
        title="Provision Account"
        message={`Create a new auth account for ${confirmingAction?.student?.first_name}? They will receive their login credentials via email.`}
        showCancel
        confirmText="Provision Now"
        onConfirm={executeProvision}
      />

      <AlertModal
        isOpen={confirmingAction?.type === "bulk_delete"}
        onClose={() => setConfirmingAction(null)}
        type="error"
        title="Bulk Archive"
        message={`Are you sure you want to archive ${selectedIds.size} selected students? This will remove them from the active roster.`}
        showCancel
        confirmText="Archive Selected"
        onConfirm={executeBulkDelete}
      />

      <AlertModal
        isOpen={confirmingAction?.type === "bulk_provision"}
        onClose={() => setConfirmingAction(null)}
        type="info"
        title="Bulk Provision"
        message={`Provision auth accounts for ${selectedIds.size} students? This may take a moment and will send emails to each student.`}
        showCancel
        confirmText="Start Provisioning"
        onConfirm={executeBulkProvision}
      />

      <AlertModal
        isOpen={confirmingAction?.type === "bulk_resend"}
        onClose={() => setConfirmingAction(null)}
        type="warning"
        title="Bulk Resend"
        message={`Reset passwords and resend credentials to ${selectedIds.size} students? Existing passwords will be invalidated.`}
        showCancel
        confirmText="Reset & Resend"
        onConfirm={executeBulkResend}
      />

      {/* Portal dropdown — renders above the overflow-x-auto table */}
      {openDropdown && dropdownPos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 9999,
              width: "min(208px, calc(100vw - 16px))",
              maxWidth: "calc(100vw - 16px)",
              maxHeight: "calc(100vh - 16px)",
              overflowY: "auto",
              overflowX: "hidden",
            }}
            className="bg-white rounded-xl shadow-2xl border border-neutral-100 py-2 animate-in fade-in zoom-in duration-150"
          >
            {(() => {
              const s = currentItems.find((x) => x.id === openDropdown);
              if (!s) return null;
              return (
                <>
                  <button
                    onClick={() => {
                      setEditingStudent(s);
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <Edit2 size={14} className="text-blue-500" />
                    Edit Profile
                  </button>
                  <button
                    onClick={() => handleToggleActive(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    {s.enrollment_status === "active" ? (
                      <>
                        <UserX size={14} className="text-amber-500" />
                        Deactivate (Drop)
                      </>
                    ) : (
                      <>
                        <UserCheck size={14} className="text-green-500" />
                        Re-activate
                      </>
                    )}
                  </button>
                  <div className="my-1 border-t border-neutral-100" />
                  <button
                    onClick={() => handleDeleteStudent(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    <Trash2 size={14} />
                    Archive Student
                  </button>
                  <div className="my-1 border-t border-neutral-100" />
                  <button
                    onClick={() => handleResendPassword(s)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <Mail size={14} className="text-blue-500" />
                    Resend Password
                  </button>
                  <button
                    onClick={() => handleProvisionAuthAccount(s)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <UserCheck size={14} className="text-emerald-600" />
                    {s.auth_user_id ? "Re-provision Auth Account" : "Provision Auth Account"}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStudentForLogs(s);
                      setOpenDropdown(null);
                      searchParams.set("logs", s.id);
                      setSearchParams(searchParams);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <Search size={14} className="text-primary" />
                    View Activity Logs
                  </button>
                </>
              );
            })()}
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminStudentsTab;
