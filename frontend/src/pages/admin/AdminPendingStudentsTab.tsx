import React, { useEffect, useState, useCallback } from "react";
import { 
  UserCheck, 
  MoreVertical, 
  ArrowLeft, 
  Loader2,
  Search,
  RefreshCw,
  Trash2,
  UserCircle,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import { useNotification } from "../../contexts/NotificationContext";
import { authApi } from "../../api";
import { sendStudentWelcomeEmail } from "../../services/emailService";
import { motion } from "framer-motion";

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
  id_key: string; 
  processed: boolean;
  processed_at?: string;
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
  processed: boolean;
  processed_at?: string;
  onboarding_completed?: boolean;
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
          processed,
          processed_at,
          programs_lookup:program_id (abbr),
          users:teacher_id (first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const groups: Record<string, PendingBlock> = {};
      
      data?.forEach((row: any) => {
        const key = `${row.program_id}-${row.year}${row.block_name}-${row.academic_year}-${row.term}-${row.teacher_id}-${row.processed}`;
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
            id_key: key,
            processed: row.processed,
            processed_at: row.processed_at
          };
        }
        groups[key].student_count++;
      });

      setPendingBlocks(Object.values(groups).sort((a, b) => {
        if (a.processed !== b.processed) return a.processed ? 1 : -1;
        return 0;
      }));
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
      const { data: pendingData, error: pendingError } = await supabase
        .from("pending_student_registrations")
        .select("*")
        .eq("program_id", block.program_id)
        .eq("block_name", block.block_name)
        .eq("year", block.year)
        .eq("teacher_id", block.teacher_id)
        .eq("academic_year", block.academic_year)
        .eq("term", block.term)
        .eq("processed", block.processed);

      if (pendingError) throw pendingError;

      if (block.processed && pendingData) {
        const studentCodes = pendingData.map(s => s.student_code);
        const { data: userData } = await supabase
          .from("students")
          .select("student_code, users(onboarding_completed)")
          .in("student_code", studentCodes);
        
        const onboardingMap: Record<string, boolean> = {};
        userData?.forEach((u: any) => {
          onboardingMap[u.student_code] = u.users?.onboarding_completed || false;
        });

        const enriched = pendingData.map(s => ({
          ...s,
          onboarding_completed: onboardingMap[s.student_code] || false
        }));
        setBlockStudents(enriched);
      } else {
        setBlockStudents(pendingData || []);
      }
      
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
          const initialPassword = student.birthday ? String(student.birthday) : `Edu${Math.floor(100000 + Math.random() * 900000)}`;
          
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
            password: initialPassword,
            birthday: student.birthday
          });

          if (result.success) {
            await supabase
              .from("pending_student_registrations")
              .update({ processed: true, processed_at: new Date().toISOString() })
              .eq("id", student.id);
            
            await sendStudentWelcomeEmail({
              to_name: `${student.first_name} ${student.last_name}`.trim(),
              to_email: student.email,
              student_code: student.student_code,
              temp_password: initialPassword,
            });
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          failCount++;
        }
      }

      showNotification('success', `Institutional provisioning complete. Success: ${successCount}.`);
      await loadPendingBlocks();
      setViewDetailBlock(null);
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deletePendingBlock = async (block: PendingBlock) => {
    if (!window.confirm("Initialize list decommissioning?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("pending_student_registrations")
        .delete()
        .eq("processed", false)
        .eq("program_id", block.program_id)
        .eq("block_name", block.block_name)
        .eq("year", block.year)
        .eq("teacher_id", block.teacher_id);
      if (error) throw error;
      showNotification('success', "Pending list decommissioned.");
      await loadPendingBlocks();
    } catch (err: any) {
      showNotification('error', err.message);
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
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
               onClick={() => setViewDetailBlock(null)} 
               className="p-3 bg-white rounded-2xl shadow-sm border border-neutral-100 text-neutral-400 hover:text-primary transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">{viewDetailBlock.program_abbr} <span className="text-neutral-300 mx-1">•</span> {viewDetailBlock.year}{viewDetailBlock.block_name}</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                Added by <span className="text-primary">{viewDetailBlock.teacher_name}</span>
              </p>
            </div>
          </div>
          {!viewDetailBlock.processed ? (
            <Button 
               onClick={() => enrollAllInBlock(viewDetailBlock)} 
               disabled={isProcessing} 
               className="rounded-xl bg-primary text-white shadow-xl shadow-primary/20 px-8 h-10 flex items-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck size={18} />}
              <span className="text-[10px] font-bold uppercase tracking-widest">Approve All</span>
            </Button>
          ) : (
            <div className="px-5 py-3 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
               <CheckCircle2 size={16} />
               Approved on {new Date(viewDetailBlock.processed_at!).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/50">
                  <th className="px-8 py-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Student ID</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Full Name</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Email</th>
                  {viewDetailBlock.processed && <th className="px-6 py-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Status</th>}
                  <th className="px-6 py-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {blockStudents.map((s) => (
                  <tr key={s.id} className="group hover:bg-neutral-50/30 transition-all duration-300">
                    <td className="px-8 py-4">
                       <span className="text-xs font-bold text-neutral-500 font-mono tracking-tighter uppercase">{s.student_code}</span>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-sm font-bold text-neutral-900 tracking-tight">{s.last_name}, {s.first_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className="text-xs font-bold text-neutral-400 lowercase">{s.email}</span>
                    </td>
                    {viewDetailBlock.processed && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          {s.onboarding_completed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-green-100">Registered</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-amber-100">Pending Setup</span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                       <button className="p-2 text-neutral-300 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all"><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="relative w-full sm:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within:text-primary transition-colors" />
          <input 
             placeholder="Search by block or teacher..." 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
             className="w-full h-10 pl-11 pr-4 bg-white border border-neutral-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none shadow-sm"
          />
        </div>
        <Button 
           variant="outline" 
           onClick={loadPendingBlocks} 
           disabled={loading} 
           className="rounded-xl border-neutral-100 bg-white shadow-sm h-10 px-6 flex items-center gap-2 group"
        >
          <RefreshCw className={`w-4 h-4 text-neutral-400 group-hover:rotate-180 transition-all duration-700 ${loading ? "animate-spin" : ""}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Refresh</span>
        </Button>
      </div>

      {loading && pendingBlocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
           <Loader2 className="w-12 h-12 animate-spin mb-6 text-primary/20" />
           <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest animate-pulse">Loading registrations...</p>
        </div>
      ) : filteredBlocks.filter(b => !b.processed).length === 0 ? (
        <div className="bg-white p-20 rounded-[2.5rem] border border-neutral-100 text-center flex flex-col items-center shadow-sm">
          <div className="w-20 h-20 bg-neutral-50 rounded-[2rem] flex items-center justify-center mb-6 border border-neutral-100">
            <ShieldCheck className="w-10 h-10 text-primary opacity-20" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 tracking-tight">No Pending Requests</h3>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-2 max-w-sm mx-auto">
            All student registration requests have been processed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="flex items-center gap-3 px-1">
             <Clock size={14} className="text-primary animate-pulse" />
             <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Pending Approvals</h3>
           </div>
           
           <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden">
             <div className="overflow-x-auto custom-scrollbar">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-neutral-50/50">
                     <th className="px-8 py-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Class / Section</th>
                     <th className="px-6 py-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Students</th>
                     <th className="px-6 py-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Teacher</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-neutral-50">
                   {filteredBlocks.filter(b => !b.processed).map((block) => (
                     <tr 
                       key={block.id_key} 
                       className="group hover:bg-neutral-50/50 transition-all duration-300 cursor-pointer"
                       onClick={() => loadBlockDetail(block)}
                     >
                       <td className="px-8 py-5">
                         <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Layers size={20} />
                            </div>
                            <div>
                               <span className="text-sm font-bold text-neutral-900 block leading-tight tracking-tight">
                                 {block.program_abbr} {block.year}{block.block_name}
                               </span>
                               <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.15em] mt-0.5 block">
                                 {block.academic_year} • {block.term}
                               </span>
                            </div>
                         </div>
                       </td>
                       <td className="px-6 py-5">
                         <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-widest border border-primary/5">
                            {block.student_count} Students
                         </span>
                       </td>
                       <td className="px-6 py-5">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                             <UserCircle size={16} />
                           </div>
                           <div className="flex flex-col">
                             <span className="text-xs font-bold text-neutral-700 tracking-tight">{block.teacher_name}</span>
                             <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Teacher</span>
                           </div>
                         </div>
                       </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Button 
                               onClick={(e) => { e?.stopPropagation(); enrollAllInBlock(block); }} 
                               disabled={isProcessing}
                               className="rounded-xl bg-neutral-50 text-[10px] font-bold uppercase tracking-widest px-4 h-9 hover:bg-primary hover:text-white transition-all border border-neutral-100"
                            >
                              Approve All
                            </Button>
                            <button 
                              onClick={(e) => {
                                 e.stopPropagation();
                                 deletePendingBlock(block);
                              }}
                              className="p-2.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                            <ArrowRight size={14} className="text-neutral-200 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                          </div>
                        </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

const ShieldCheck = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
