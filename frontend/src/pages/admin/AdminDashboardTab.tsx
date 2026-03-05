import { useState, useEffect } from "react";
import { Users, UserPlus, Shield, ClipboardCheck, FileText, Layers } from "lucide-react";
import { adminApi } from "../../api";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import CreateUserModal from "../../components/admin/CreateUserModal";

interface SystemStats {
  total_users: number;
  total_teachers: number;
  total_students: number;
  total_admins: number;
  total_programs: number;
  total_sections: number;
  total_activities: number;
  total_essays: number;
  total_rubrics: number;
  platform_rubrics: number;
}

export function AdminDashboardTab() {
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await adminApi.getSystemStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Admin Dashboard</h1>
          <p className="text-neutral-600 mt-1">Manage users, platform rubrics, and system settings</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateUserModal(true)}
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Create User Account
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-neutral-600 mt-4">Loading statistics...</p>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Total Users</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">{stats.total_users}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {stats.total_admins} admin, {stats.total_teachers} teachers, {stats.total_students} students
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Programs</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">{stats.total_programs}</p>
                  <p className="text-xs text-neutral-500 mt-1">{stats.total_sections} sections</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Layers className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Activities</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">{stats.total_activities}</p>
                  <p className="text-xs text-neutral-500 mt-1">{stats.total_essays} essays</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600">Rubrics</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">{stats.total_rubrics}</p>
                  <p className="text-xs text-neutral-500 mt-1">{stats.platform_rubrics} platform</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <ClipboardCheck className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => {
                  window.location.href = "/Admin/Users";
                }}
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => {
                  window.location.href = "/Admin/Rubrics";
                }}
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Manage Platform Rubrics
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => {
                  window.location.href = "/Admin/Settings";
                }}
              >
                <Shield className="w-4 h-4 mr-2" />
                System Settings
              </Button>
            </div>
          </Card>

          {/* System Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">User Distribution</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Admins</span>
                  <span className="font-semibold text-neutral-900">{stats.total_admins}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Teachers</span>
                  <span className="font-semibold text-neutral-900">{stats.total_teachers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Students</span>
                  <span className="font-semibold text-neutral-900">{stats.total_students}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Content Overview</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Programs</span>
                  <span className="font-semibold text-neutral-900">{stats.total_programs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Sections</span>
                  <span className="font-semibold text-neutral-900">{stats.total_sections}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Activities</span>
                  <span className="font-semibold text-neutral-900">{stats.total_activities}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Essays</span>
                  <span className="font-semibold text-neutral-900">{stats.total_essays}</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : null}

      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => {
          setShowCreateUserModal(false);
          loadStats();
        }}
      />
    </div>
  );
}
