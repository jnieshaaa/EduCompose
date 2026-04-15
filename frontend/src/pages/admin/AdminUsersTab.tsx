import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Key,
  Filter,
  X,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNotification } from "../../context/NotificationContext";
import { adminApi } from "../../api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import CreateUserModal from "../../components/admin/CreateUserModal";
import EditUserModal from "../../components/admin/EditUserModal";
import ResetPasswordModal from "../../components/admin/ResetPasswordModal";
import AdminUserLogs from "../../components/admin/AdminUserLogs";
import AlertModal from "../../components/ui/AlertModal";

interface User {
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] =
    useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const { showNotification } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<{id: string, email: string} | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Initialize selectedUserForLogs from search param if present
  const logUserId = searchParams.get("logs");
  const [selectedUserForLogs, setSelectedUserForLogs] = useState<User | null>(null);

  useEffect(() => {
    if (logUserId && !selectedUserForLogs && users.length > 0) {
      const u = users.find(user => user.id === logUserId);
      if (u) setSelectedUserForLogs(u);
    }
  }, [logUserId, users, selectedUserForLogs]);

  const dropdownRef = useRef<HTMLDivElement>(null);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


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

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, searchTerm]);

  const handleDeleteUser = async (userId: string, email: string) => {
    setDeletingUser({ id: userId, email });
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    
    try {
      setLoading(true);
      await adminApi.deleteUser(deletingUser.id);
      await loadUsers();
      showNotification('success', `Successfully deleted user ${deletingUser.email}`);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to delete user");
    } finally {
      setDeletingUser(null);
      setLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await adminApi.updateUser(user.id, {
        is_active: !user.is_active,
      });
      await loadUsers();
      showNotification('success', `User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to update user");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700";
      case "teacher":
        return "bg-blue-100 text-blue-700";
      case "student":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Calculate pagination
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            User Management
          </h1>
          <p className="text-neutral-600 mt-1">
            Create, edit, and manage user accounts
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateUserModal(true)}>
          <UserPlus className="w-5 h-5 mr-2" />
          Create User
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-neutral-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Roles</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
            {roleFilter !== "all" && (
              <button
                onClick={() => setRoleFilter("all")}
                className="p-2 text-neutral-600 hover:text-neutral-900"
                title="Clear filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </Card>


      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-neutral-600 mt-4">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-neutral-600 mb-4">No users found.</p>
          <Button
            variant="primary"
            onClick={() => setShowCreateUserModal(true)}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Create First User
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {currentItems.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-neutral-900">
                          {user.title || user.nickname || user.last_name || user.first_name ? (
                            <>
                              {user.title && `${user.title} `}
                              {user.nickname || user.last_name || user.first_name || "User"}
                            </>
                          ) : (
                            "No name provided"
                          )}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                          user.role,
                        )}`}
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                        {user.email_verified && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                            Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div
                        className="relative"
                        ref={openDropdown === user.id ? dropdownRef : null}
                      >
                        <button
                          onClick={() =>
                            setOpenDropdown(
                              openDropdown === user.id ? null : user.id,
                            )
                          }
                          className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openDropdown === user.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-10">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setOpenDropdown(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit User
                            </button>
                            <button
                              onClick={() => {
                                setResettingPasswordUser(user);
                                setOpenDropdown(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <Key className="w-4 h-4" />
                              Reset Password
                            </button>
                            <button
                              onClick={() => {
                                handleToggleActive(user);
                                setOpenDropdown(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserForLogs(user);
                                setOpenDropdown(null);
                                searchParams.set("logs", user.id);
                                setSearchParams(searchParams);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              <Search className="w-4 h-4" />
                              View Activity Logs
                            </button>
                            <div className="border-t border-neutral-200 my-1"></div>
                            <button
                              onClick={() => {
                                handleDeleteUser(user.id, user.email);
                                setOpenDropdown(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete User
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && users.length > 0 && (
            <div className="px-6 py-8 bg-neutral-50/50 border-t border-neutral-200 space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Range Indicator */}
                <div className="order-2 md:order-1 flex flex-col">
                  <div className="text-sm font-medium text-neutral-400">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, users.length)} of {users.length.toLocaleString()}
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

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => {
          setShowCreateUserModal(false);
          loadUsers();
        }}
      />

      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => {
            setEditingUser(null);
            loadUsers();
          }}
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
          message={`Are you sure you want to delete user ${deletingUser.email}? This action cannot be undone and will remove all associated data.`}
          showCancel
          confirmText="Delete User"
          cancelText="Keep User"
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
