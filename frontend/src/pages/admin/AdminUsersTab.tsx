import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Key,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Activity,
  ShieldCheck,
  UserCircle,
  RefreshCw
} from "lucide-react";
import { useNotification } from "../../contexts/NotificationContext";
import { adminApi } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import CreateUserModal from "../../components/admin/CreateUserModal";
import EditUserModal from "../../components/admin/EditUserModal";
import ResetPasswordModal from "../../components/admin/ResetPasswordModal";
import AdminUserLogs from "../../components/admin/AdminUserLogs";
import AlertModal from "../../components/ui/AlertModal";
import { motion } from "framer-motion";
import Button from "../../components/ui/Button";

interface UserRecord {
  id: string;
  email: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  title?: string;
  nickname?: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

export function AdminUsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] =
    useState<UserRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter] = useState<string>("admin"); // Forced to admin
  const { showNotification } = useNotification();
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<{id: string, email: string} | null>(null);

  // Super Admin Check (Environment-based)
  const isSuperAdmin = currentUser?.id === import.meta.env.VITE_SUPER_ADMIN_ID;

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  
  const logUserId = searchParams.get("logs");
  const [selectedUserForLogs, setSelectedUserForLogs] = useState<UserRecord | null>(null);

  useEffect(() => {
    if (logUserId && !selectedUserForLogs && users.length > 0) {
      const u = users.find(user => user.id === logUserId);
      if (u) setSelectedUserForLogs(u);
    }
  }, [logUserId, users, selectedUserForLogs]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        `[data-user-action-trigger="${openDropdown}"]`,
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

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers({
        limit: 1000,
        role: roleFilter !== "all" ? roleFilter : undefined,
        search: searchTerm || undefined,
      });
      setUsers(data);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchTerm, showNotification]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDeleteUser = async (userId: string, email: string) => {
    setDeletingUser({ id: userId, email });
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    try {
      setLoading(true);
      await adminApi.deleteUser(deletingUser.id);
      await loadUsers();
      showNotification('success', `User deleted: ${deletingUser.email}`);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to delete user");
    } finally {
      setDeletingUser(null);
      setLoading(false);
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active });
      await loadUsers();
      showNotification('success', `User status updated: ${user.is_active ? 'Deactivated' : 'Activated'}`);
    } catch (err: any) {
      showNotification('error', "Failed to update user status");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = users.slice(indexOfFirstItem, indexOfLastItem);

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

  if (selectedUserForLogs) {
    return (
      <AdminUserLogs 
        item={selectedUserForLogs} 
        type="user" 
        onBack={() => {
          setSelectedUserForLogs(null);
          searchParams.delete("logs");
          setSearchParams(searchParams);
        }} 
      />
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Premium Integrated Header */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Administrators</h1>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mt-1">Manage system governance and access</p>
        </div>
        {isSuperAdmin && (
          <Button
            onClick={() => setShowCreateUserModal(true)}
            className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all px-5 h-10 flex items-center gap-2"
          >
            <UserPlus size={16} />
            <span className="text-[10px] font-medium uppercase tracking-widest">Add Admin</span>
          </Button>
        )}
      </div>

      {/* Modern Filter Hub */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Search Admins</label>
          <div className="relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/search:text-primary transition-colors" size={18} />
            <input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-sm font-medium placeholder:text-neutral-300 focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* High-Resolution Data Table */}
      <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-40">
            <RefreshCw className={`w-8 h-8 text-neutral-400 mb-6 ${loading ? "animate-spin" : ""}`} />
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">Loading User Data</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-40">
            <UserCircle size={64} className="text-neutral-100 mb-6" />
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">No users found in search results</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-100">
                    <th className="px-8 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em]">User</th>
                    <th className="px-6 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] text-center">Role</th>
                    <th className="px-6 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] text-center">Status</th>
                    <th className="px-6 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] text-center">Created Date</th>
                    <th className="px-8 py-5 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {currentItems.map((user) => (
                    <motion.tr 
                      key={user.id} 
                      className="group transition-all duration-300 hover:bg-neutral-50/50"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium text-[10px] shadow-lg transition-transform group-hover:scale-110 ${
                            user.role === 'admin' ? 'bg-primary' : 
                            user.role === 'teacher' ? 'bg-secondary' : 'bg-accent'
                          }`}>
                            {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-neutral-900 leading-tight tracking-tight">
                              {user.title || user.nickname || user.last_name || user.first_name ? (
                                <>{user.title && `${user.title} `}{user.nickname || `${user.first_name} ${user.last_name}` || "User"}</>
                              ) : "Unknown User"}
                            </span>
                            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mt-0.5">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex px-3 py-1 text-[9px] font-medium uppercase tracking-widest rounded-lg border shadow-sm ${
                          user.role === 'admin' ? 'bg-primary/5 border-primary/20 text-primary' :
                          user.role === 'teacher' ? 'bg-secondary/5 border-secondary/20 text-secondary' :
                          'bg-accent/5 border-accent/20 text-accent'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-success-default animate-pulse' : 'bg-neutral-300'}`} />
                          <span className={`text-[10px] font-medium uppercase tracking-widest ${user.is_active ? 'text-neutral-700' : 'text-neutral-300'}`}>
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                          {user.email_verified && <ShieldCheck size={12} className="text-secondary/40 ml-1" />}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">
                           {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "—"}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            data-user-action-trigger={user.id}
                            onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                            className="p-2.5 text-neutral-300 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all"
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Premium Pagination Terminal */}
            <div className="px-8 py-8 bg-white border-t border-neutral-100 flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em]">Active Data Operations</span>
                  <span className="text-sm font-medium text-neutral-900">
                    Page {currentPage} <span className="text-neutral-300 mx-1">/</span> {totalPages}
                  </span>
               </div>

               <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-3 text-neutral-400 hover:text-neutral-900 disabled:opacity-20 transition-all font-medium text-[10px] uppercase flex items-center gap-2"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center gap-1.5">
                     {getPageNumbers().map((p, i) => p === "..." ? <span key={i} className="px-2 font-medium text-neutral-300">•••</span> : (
                       <button
                         key={i}
                         onClick={() => setCurrentPage(Number(p))}
                         className={`min-w-[42px] h-[42px] rounded-2xl text-xs font-medium transition-all ${currentPage === p ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-neutral-50 text-neutral-400 hover:bg-neutral-100'}`}
                       >
                         {p}
                       </button>
                     ))}
                  </div>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-3 text-neutral-400 hover:text-neutral-900 disabled:opacity-20 transition-all font-medium text-[10px] uppercase flex items-center gap-2"
                  >
                     <ChevronRight size={20} />
                  </button>
               </div>

               <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Density</span>
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="h-10 px-4 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-medium text-neutral-900 outline-none focus:ring-4 focus:ring-primary/5 cursor-pointer"
                  >
                     {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
               </div>
            </div>
          </>
        )}
      </div>

      {/* Portaled Dropdown */}
      {openDropdown && dropdownPos &&
        createPortal(
          <div 
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 9999,
              width: "min(280px, calc(100vw - 16px))",
            }}
            className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-neutral-100 py-4 animate-in fade-in zoom-in duration-150 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const user = users.find(u => u.id === openDropdown);
              if (!user) return null;
              return (
                <div className="flex flex-col">
                  <div className="px-6 py-4 border-b border-neutral-50 mb-2">
                     <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mb-1">User Details</p>
                     <p className="text-sm font-medium text-neutral-900 truncate">
                       {user.first_name} {user.last_name}
                     </p>
                     <p className="text-[9px] font-medium text-neutral-400 lowercase">{user.email}</p>
                  </div>
                  {[
                    // Only show Edit and Deactivate for Super Admin (ID 69) or if user is editing themselves? 
                    // Per request: only ID 69 has special access.
                    ...(isSuperAdmin ? [
                      { icon: Edit2, label: "Edit User", onClick: () => setEditingUser(user) },
                      { icon: Activity, label: user.is_active ? 'Deactivate' : 'Activate', onClick: () => handleToggleActive(user) }
                    ] : []),
                    { icon: Key, label: "Reset Password", onClick: () => setResettingPasswordUser(user) },
                    { icon: Search, label: "Activity Logs", onClick: () => {
                        setSelectedUserForLogs(user);
                        searchParams.set("logs", user.id);
                        setSearchParams(searchParams);
                    }},
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={() => { action.onClick(); setOpenDropdown(null); }}
                      className="w-full flex items-center gap-4 px-6 py-3.5 text-[10px] font-medium uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 transition-all active:scale-[0.98]"
                    >
                      <action.icon size={14} className="text-neutral-400" />
                      {action.label}
                    </button>
                  ))}
                  
                  {isSuperAdmin && (
                    <div className="mt-2 pt-2 border-t border-neutral-50">
                      <button
                        onClick={() => { handleDeleteUser(user.id, user.email); setOpenDropdown(null); }}
                        className="w-full flex items-center gap-4 px-6 py-3.5 text-[10px] font-medium uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={14} />
                        Delete User
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>,
          document.body
        )}

      {/* Global Modals */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        restrictedRole="admin"
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={() => {
          // Delayed reload to ensure trigger completes
          setTimeout(loadUsers, 500);
        }}
      />

      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => { setEditingUser(null); loadUsers(); }}
        />
      )}

      {resettingPasswordUser && (
        <ResetPasswordModal
          user={resettingPasswordUser}
          isOpen={!!resettingPasswordUser}
          onClose={() => setResettingPasswordUser(null)}
        />
      )}

      {deletingUser && (
        <AlertModal
          isOpen={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          type="error"
          title="Delete User"
          message={`Are you sure you want to delete user ${deletingUser.email}? All records and activity logs will be permanently removed.`}
          showCancel
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
