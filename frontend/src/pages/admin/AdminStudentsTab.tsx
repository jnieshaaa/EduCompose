import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Search,
  Edit2,
  Trash2,
  UserX,
  UserCheck,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import EditStudentModal from "../../components/admin/EditStudentModal";

interface Student {
  id: string;
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
    name: string;
    abbr: string;
    departments?: {
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
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
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
            name,
            abbr,
            departments(
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
      alert(err.message || "Failed to update student status");
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (
      !confirm(
        `Are you sure you want to delete/archive student ${student.first_name} ${student.last_name}?`,
      )
    )
      return;

    try {
      const { error: deleteError } = await supabase
        .from("students")
        .delete()
        .eq("id", student.id);

      if (deleteError) throw deleteError;
      await loadStudents();
      setOpenDropdown(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete student");
    }
  };

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = students.filter((s) => {
    const fullSearch =
      `${s.first_name} ${s.last_name} ${s.student_code} ${s.email}`.toLowerCase();
    return fullSearch.includes(searchTerm.toLowerCase());
  });

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
          <Button variant="outline" onClick={loadStudents}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Filter */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search by student code, name, or email..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="pl-10"
          />
        </div>
      </Card>

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
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-neutral-50/50 transition-colors group"
                  >
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
                      <div
                        className="relative inline-block text-left"
                        ref={openDropdown === s.id ? dropdownRef : null}
                      >
                        <button
                          onClick={() =>
                            setOpenDropdown(openDropdown === s.id ? null : s.id)
                          }
                          className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openDropdown === s.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-neutral-100 py-2 z-50 animate-in fade-in zoom-in duration-200">
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
                                  <UserCheck
                                    size={14}
                                    className="text-green-500"
                                  />
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

      {editingStudent && (
        <EditStudentModal
          isOpen={!!editingStudent}
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={loadStudents}
        />
      )}
    </div>
  );
};

export default AdminStudentsTab;
