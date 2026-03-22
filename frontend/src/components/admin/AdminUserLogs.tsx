import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Search, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi } from "../../api";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Activity Logs</h1>
            <p className="text-neutral-600 mt-1">
              Tracking actions for <span className="font-semibold text-primary-600">{item.first_name || ""} {item.last_name || ""}</span> {item.email ? `(${item.email})` : item.student_code ? `(${item.student_code})` : ""}
            </p>
          </div>
        </div>
      </div>

      <Card className="p-4 bg-white/80 backdrop-blur-md border border-white/20 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search actions or descriptions..."
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
            <span className="text-neutral-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
          <div className="flex justify-end gap-2">
             <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setStartDate("");
                setEndDate("");
                setPage(1);
             }}>
                Clear Filters
             </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border border-neutral-200/50 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50/50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-widest">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white/50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-neutral-500">
                    No activity logs found for this period.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                        {log.action_type.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700 font-medium">
                      {log.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-200 flex items-center justify-between">
            <p className="text-sm text-neutral-500 italic">
              Showing <span className="font-semibold">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-semibold">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-semibold">{total}</span> logs
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`px-3 py-1 text-sm rounded-md transition-all ${
                      page === i + 1
                        ? "bg-primary text-white shadow-md scale-110"
                        : "text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
