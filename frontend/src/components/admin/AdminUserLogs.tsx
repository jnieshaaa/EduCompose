import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Search, ChevronLeft, ChevronRight, Activity, FileText, User, X } from "lucide-react";
import { adminApi } from "../../api";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { motion, AnimatePresence } from "framer-motion";

interface AdminUserLogsProps {
  item: {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    student_code?: string;
  };
  type: "user" | "student";
  onBack: () => void;
}

export default function AdminUserLogs({ item, type, onBack }: AdminUserLogsProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        search: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit,
        offset: (page - 1) * limit
      };

      if (type === "user") params.userId = item.id;
      else params.studentId = item.id;

      const { logs: data, total: count } = await adminApi.getActivityLogs(params);
      setLogs(data);
      setTotal(count);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoading(false);
    }
  }, [item.id, type, searchTerm, startDate, endDate, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-3 bg-white rounded-2xl shadow-sm border border-neutral-100 text-neutral-500 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="p-1 px-2 rounded-md bg-primary-100 text-primary uppercase text-[9px] font-bold tracking-widest">Audit Logs</div>
               <div className="w-1 h-1 rounded-full bg-neutral-300" />
               <span className="text-[10px] font-bold text-neutral-400 tracking-wider">LIVE UPDATES</span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">User Activity Logs</h1>
            <div className="flex items-center gap-2 mt-0.5 text-neutral-500 text-xs">
              <User size={12} className="text-neutral-400" />
              <span>Records for</span>
              <span className="font-bold text-neutral-800">{item.first_name} {item.last_name}</span>
              <span className="text-neutral-300">•</span>
              <span className="font-mono text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                {item.email || item.student_code}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="rounded-3xl border border-neutral-100 bg-white shadow-xl shadow-neutral-100/50 p-6">
        <div className="flex flex-col lg:flex-row items-end gap-4">
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Search Logs</label>
            <div className="relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within/search:text-primary transition-colors" />
              <input
                placeholder="Search by action or description..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary outline-none text-sm font-medium transition-all"
              />
            </div>
          </div>
          
          <div className="w-full lg:w-auto space-y-1.5">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Date Range</label>
            <div className="flex items-center gap-2 p-1 bg-neutral-50 border border-neutral-100 rounded-2xl">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-4 pr-3 py-2 bg-transparent outline-none text-sm font-bold cursor-pointer"
                />
              </div>
              <div className="w-px h-6 bg-neutral-200" />
              <div className="relative flex-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-4 pr-3 py-2 bg-transparent outline-none text-sm font-bold cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
             <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
                className="rounded-2xl border-neutral-200 text-neutral-500 hover:bg-neutral-100 h-[52px] px-6"
             >
                <X size={16} className="mr-2" />
                Reset
             </Button>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="rounded-[2rem] overflow-hidden border border-neutral-100 bg-white shadow-2xl shadow-neutral-100/30">
        <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="px-8 py-5 text-left text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Date & Time</th>
                <th className="px-6 py-5 text-left text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Action</th>
                <th className="px-8 py-5 text-left text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                       <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Loading logs...</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                       <Activity size={48} className="text-neutral-300" />
                       <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest italic">No logs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {logs.map((log, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      key={log.id} 
                      className="hover:bg-neutral-50/50 transition-colors group"
                    >
                      <td className="px-8 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-neutral-900 tracking-tight">
                              {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                           </span>
                           <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                              {new Date(log.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-white shadow-sm ring-4 ring-neutral-900/5">
                          {log.action_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-start gap-3">
                           <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/30 group-hover:bg-primary transition-colors shrink-0" />
                           <p className="text-[13px] font-medium text-neutral-600 line-clamp-2 leading-relaxed group-hover:text-neutral-900 transition-colors">
                            {log.description}
                           </p>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className="px-8 py-5 bg-neutral-50/50 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-white border border-neutral-100 flex items-center justify-center shadow-sm">
                  <FileText size={14} className="text-primary" />
               </div>
               <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                ENTRIES <span className="text-neutral-900">{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</span> OF <span className="text-neutral-900">{total}</span>
               </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-primary hover:border-primary/20 disabled:opacity-30 disabled:hover:text-neutral-600 transition-all shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex gap-1.5 px-2">
                {[...Array(totalPages)].map((_, i) => {
                  const pNum = i + 1;
                  // Only show current, first, last, and neighbors
                  if (totalPages > 5 && pNum !== 1 && pNum !== totalPages && Math.abs(pNum - page) > 1) {
                    if (Math.abs(pNum - page) === 2) return <span key={i} className="px-1 text-neutral-300">...</span>;
                    return null;
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setPage(pNum)}
                      className={`min-w-[40px] h-10 px-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                        page === pNum
                          ? "bg-primary text-white shadow-primary/20 scale-105"
                          : "bg-white text-neutral-400 border border-neutral-100 hover:border-primary/20 hover:text-primary"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-primary hover:border-primary/20 disabled:opacity-30 disabled:hover:text-neutral-600 transition-all shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
