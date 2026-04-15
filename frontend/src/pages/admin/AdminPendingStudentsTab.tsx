import React, { useEffect, useState, useCallback } from "react";
import { 
  Users, 
  UserCheck, 
  MoreVertical, 
  ArrowLeft, 
  Loader2,
  Search,
  RefreshCw
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useNotification } from "../../context/NotificationContext";
import { authApi } from "../../api";
import { sendStudentWelcomeEmail } from "../../services/emailService";

interface PendingBlock {
  block_name: string;
  year: number;
  program_id: string;
  program_abbr: string;
  academic_year: string;
  term: string;
  student_count: number;
  teacher_id: string;
  teacher_name: string;
  id_key: string; // Composite key for UI
}

interface PendingStudent {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  year: number;
  block_name: string;
  program_id: string;
  course_id: string;
  teacher_id: string;
}

export const AdminPendingStudentsTab: React.FC = () => {
  const [pendingBlocks, setPendingBlocks] = useState<PendingBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDetailBlock, setViewDetailBlock] = useState<PendingBlock | null>(null);
  const [blockStudents, setBlockStudents] = useState<PendingStudent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { showNotification } = useNotification();

  const loadPendingBlocks = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("pending_student_registrations")
        .select(`
          block_name,
          year,
          program_id,
          academic_year,
          term,
          teacher_id,
          programs_lookup:program_id (abbr),
          users:teacher_id (first_name, last_name)
        `)
        .eq("processed", false);

      if (error) throw error;

      // Group by block characteristics
      const groups: Record<string, PendingBlock> = {};
      
      data?.forEach((row: any) => {
        const key = `${row.program_id}-${row.year}${row.block_name}-${row.academic_year}-${row.term}-${row.teacher_id}`;
        if (!groups[key]) {
          groups[key] = {
            block_name: row.block_name,
            year: row.year,
            program_id: row.program_id,
            program_abbr: row.programs_lookup?.abbr || "???",
            academic_year: row.academic_year,
            term: row.term,
            student_count: 0,
            teacher_id: row.teacher_id,
            teacher_name: row.users ? `${row.users.first_name || ''} ${row.users.last_name || ''}`.trim() : "Unknown Teacher",
            id_key: key
          };
        }
        groups[key].student_count++;
      });

      setPendingBlocks(Object.values(groups));
    } catch (err: any) {
      showNotification('error', err.message || "Failed to load pending students");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadPendingBlocks();
  }, [loadPendingBlocks]);

  const loadBlockDetail = async (block: PendingBlock) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pending_student_registrations")
        .select("*")
        .eq("processed", false)
        .eq("program_id", block.program_id)
        .eq("block_name", block.block_name)
        .eq("year", block.year)
        .eq("teacher_id", block.teacher_id)
        .eq("academic_year", block.academic_year)
        .eq("term", block.term);

      if (error) throw error;
      setBlockStudents(data || []);
      setViewDetailBlock(block);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to load block details");
    } finally {
      setLoading(false);
    }
  };

  const enrollAllInBlock = async (block: PendingBlock) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      // 1. Fetch students again to be sure
      const { data: studentsToEnroll, error: fetchError } = await supabase
        .from("pending_student_registrations")
        .select("*")
        .eq("processed", false)
        .eq("program_id", block.program_id)
        .eq("block_name", block.block_name)
        .eq("year", block.year)
        .eq("teacher_id", block.teacher_id)
        .eq("academic_year", block.academic_year)
        .eq("term", block.term);

      if (fetchError || !studentsToEnroll) throw fetchError || new Error("No students found");

      let successCount = 0;
      let failCount = 0;

      for (const student of studentsToEnroll) {
        try {
          const tempPassword = `Edu${Math.floor(100000 + Math.random() * 900000)}`;
          
          // Enroll via existing atomic API (security definer RPC)
          const result = await authApi.enrollStudentAtomic({
            email: student.email,
            student_code: student.student_code,
            first_name: student.first_name,
            last_name: student.last_name,
            middle_name: student.middle_name,
            teacher_id: student.teacher_id,
            program_id: student.program_id,
            year: student.year,
            block_name: student.block_name,
            password: tempPassword
          });

          if (result.success) {
            // Update pending status
            await supabase
              .from("pending_student_registrations")
              .update({ processed: true, processed_at: new Date().toISOString() })
              .eq("id", student.id);
            
            // Send welcome email
            await sendStudentWelcomeEmail({
              to_name: `${student.first_name} ${student.last_name}`.trim(),
              to_email: student.email,
              student_code: student.student_code,
              temp_password: tempPassword,
            });
            
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          console.error("Failed to enroll pending student:", e);
          failCount++;
        }
      }

      showNotification('success', `Successfully enrolled ${successCount} students. ${failCount > 0 ? `${failCount} failed.` : ""}`);
      await loadPendingBlocks();
      setViewDetailBlock(null);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to process enrollment");
    } finally {
      setIsProcessing(false);
    }
  };

  const deletePendingBlock = async (block: PendingBlock) => {
    if (!window.confirm(`Are you sure you want to remove the pending list for ${block.program_abbr} ${block.year}${block.block_name}? This will delete all ${block.student_count} pending registration records.`)) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("pending_student_registrations")
        .delete()
        .eq("processed", false)
        .eq("program_id", block.program_id)
        .eq("block_name", block.block_name)
        .eq("year", block.year)
        .eq("teacher_id", block.teacher_id)
        .eq("academic_year", block.academic_year)
        .eq("term", block.term);

      if (error) throw error;
      
      showNotification('success', "Pending list removed successfully");
      await loadPendingBlocks();
      setViewDetailBlock(null);
    } catch (err: any) {
      showNotification('error', err.message || "Failed to remove pending list");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredBlocks = pendingBlocks.filter(b => 
    b.block_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.program_abbr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (viewDetailBlock) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewDetailBlock(null)}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">
                {viewDetailBlock.program_abbr} - {viewDetailBlock.year}{viewDetailBlock.block_name}
              </h2>
              <p className="text-sm text-neutral-500">
                Pending list added by <span className="font-bold text-primary">{viewDetailBlock.teacher_name}</span>
              </p>
            </div>
          </div>
          <Button 
            onClick={() => enrollAllInBlock(viewDetailBlock)}
            disabled={isProcessing}
            className="bg-primary text-white shadow-lg shadow-primary/20 h-11 px-6 group"
          >
            {isProcessing ? (
               <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
               <UserCheck className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
            )}
            Approve & Enroll All
          </Button>
        </div>

        <Card className="overflow-hidden border-none shadow-sm ring-1 ring-neutral-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50/50 border-b border-neutral-100">
                <tr className="text-left">
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Student ID</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {blockStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-600">{s.student_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-neutral-900">{s.first_name} {s.last_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{s.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       <button className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all">
                          <MoreVertical size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search blocks or teachers..."
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            className="pl-9 h-11 text-sm bg-white border-neutral-200"
          />
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={loadPendingBlocks} disabled={loading} className="h-11">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
           </Button>
        </div>
      </div>

      {loading && pendingBlocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
           <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary/20" />
           <p className="font-medium animate-pulse">Loading pending registrations...</p>
        </div>
      ) : filteredBlocks.length === 0 ? (
        <Card className="p-16 text-center border-none shadow-sm ring-1 ring-neutral-100 flex flex-col items-center">
          <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center mb-4">
            <UserCheck className="w-8 h-8 text-neutral-300" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900">No Pending Approvals</h3>
          <p className="text-neutral-500 max-w-sm mt-1">
            All student list uploads have been processed and enrolled.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border-none shadow-sm ring-1 ring-neutral-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50/50 border-b border-neutral-100">
                <tr className="text-left">
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Block Identification</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Students</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Added By</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 bg-white">
                {filteredBlocks.map((block) => (
                  <tr 
                    key={block.id_key} 
                    className="hover:bg-neutral-50/50 transition-all cursor-pointer group"
                    onClick={() => loadBlockDetail(block)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                           <Users className="w-5 h-5 text-primary" />
                         </div>
                         <div>
                            <span className="text-sm font-bold text-neutral-900 block leading-tight">
                              {block.program_abbr} {block.year}{block.block_name}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                              {block.academic_year} • {block.term}
                            </span>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-bold">
                         {block.student_count} Students
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-neutral-700">{block.teacher_name}</span>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Instructor</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-primary hover:bg-primary/10 font-bold text-xs"
                          onClick={(e) => {
                            e?.stopPropagation();
                            enrollAllInBlock(block);
                          }}
                          disabled={isProcessing}
                        >
                           Enroll All
                        </Button>
                        <button 
                          onClick={(e) => {
                             e.stopPropagation();
                             deletePendingBlock(block);
                          }}
                          className="p-2 text-neutral-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove pending list"
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
        </Card>
      )}
    </div>
  );
};
