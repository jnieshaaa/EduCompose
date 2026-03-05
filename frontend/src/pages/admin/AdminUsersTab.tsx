import { useState, useEffect, useRef } from "react";
import { UserPlus, Search, Edit2, Trash2, Key, Filter, X, MoreVertical } from "lucide-react";
import { adminApi } from "../../api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import CreateUserModal from "../../components/admin/CreateUserModal";
import EditUserModal from "../../components/admin/EditUserModal";
import ResetPasswordModal from "../../components/admin/ResetPasswordModal";

interface User {
  id: string;
  email: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_sign_in?: string;
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
  const [error, setError] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
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

  useEffect(() => {
    loadUsers();
  }, [roleFilter, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await adminApi.getUsers({
        limit: 1000,
        role: roleFilter !== "all" ? roleFilter : undefined,
        search: searchTerm || undefined,
      });
      // Filter out admin users
      setUsers(data.filter(user => user.role !== 'admin'));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to delete user ${email}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await adminApi.deleteUser(userId);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await adminApi.updateUser(user.id, {
        is_active: !user.is_active,
      });
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user");
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

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Last Sign In
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-neutral-500">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {user.last_sign_in
                        ? new Date(user.last_sign_in).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative" ref={openDropdown === user.id ? dropdownRef : null}>
                        <button
                          onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
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
    </div>
  );
}
