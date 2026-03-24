import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Edit2,
  Trash2,
  UserX,
  UserCheck,
  MoreVertical,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import EditStudentModal from "../../components/admin/EditStudentModal";
import AdminUserLogs from "../../components/admin/AdminUserLogs";

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
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedStudentForLogs, setSelectedStudentForLogs] = useState<Student | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [departments, setDepartments] = useState<any[]>([]);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState("");
  const [progFilter, setProgFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");

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
          <Button variant="outline" onClick={loadStudents}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

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
                {currentItems.map((s) => (
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
                            <div className="my-1 border-t border-neutral-100" />
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
