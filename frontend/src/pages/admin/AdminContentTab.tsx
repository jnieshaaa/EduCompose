import React, { useState, useEffect } from "react";
import { 
  Search, 
  Loader2, 
  ChevronRight,
  ChevronDown,
  Activity,
  Calendar,
  Users,
  BookOpen,
  Layout
} from "lucide-react";
import { adminApi } from "../../api";
import { motion, AnimatePresence } from "framer-motion";

export function AdminContentTab() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllActivities();
      setActivities(data);
    } catch (err) {
      console.error("Error loading activities:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter((activity) =>
    activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Class Activities</h1>
          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <Layout size={14} className="text-primary/50" />
            Centralized monitoring of all academic activities
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="w-full sm:w-80 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={18} />
          <input
            placeholder="Search activities or teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-white border border-neutral-200 rounded-2xl text-sm font-medium placeholder:text-neutral-300 focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-200/20 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="animate-spin text-primary/30 w-12 h-12 mb-6" />
            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400 animate-pulse">Synchronizing activities...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="py-32 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center mb-6">
              <Activity className="w-8 h-8 text-neutral-200" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">No activities found</h3>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest font-medium">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Activity Name</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Instructor</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Date Created</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredActivities.map((activity) => (
                  <React.Fragment key={activity.id}>
                    <tr 
                      onClick={() => toggleExpand(activity.id)}
                      className={`group cursor-pointer transition-all ${expandedId === activity.id ? "bg-primary/[0.02]" : "hover:bg-neutral-50/50"}`}
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${expandedId === activity.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-neutral-50 text-neutral-400 group-hover:bg-white group-hover:text-primary group-hover:shadow-sm"}`}>
                            <Activity size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900 leading-tight group-hover:text-primary transition-colors">{activity.title}</p>
                            <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest mt-1">ID: {activity.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 font-black text-[10px]">
                            {activity.teacher_name?.charAt(0)}
                          </div>
                          <span className="text-[13px] font-semibold text-neutral-700">{activity.teacher_name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-neutral-500">
                          <Calendar size={14} className="text-neutral-300" />
                          <span className="text-xs font-medium">{new Date(activity.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {expandedId === activity.id ? (
                          <ChevronDown size={18} className="text-primary" />
                        ) : (
                          <ChevronRight size={18} className="text-neutral-300 group-hover:text-neutral-600 transition-colors" />
                        )}
                      </td>
                    </tr>
                    
                    {/* Expandable Content */}
                    <AnimatePresence>
                      {expandedId === activity.id && (
                        <tr>
                          <td colSpan={4} className="p-0 border-none bg-neutral-50/30">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-20 py-8">
                                <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                                  <div className="px-6 py-4 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                                      <BookOpen size={14} className="text-primary" />
                                      Deployment Details
                                    </p>
                                    <span className="text-[10px] font-bold text-neutral-400">{activity.student_count} Total Students</span>
                                  </div>
                                  <table className="w-full text-left">
                                     <thead>
                                       <tr className="bg-white">
                                         <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-50">Program(s)</th>
                                         <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-50">Class/Block</th>
                                         <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-50 text-right">Capacity</th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                       {(activity.deployments || []).map((deployment: any) => (
                                         <tr key={deployment.id} className="hover:bg-neutral-50/30 transition-colors border-b border-neutral-50 last:border-0">
                                           <td className="px-6 py-4">
                                             <div className="flex flex-wrap gap-1.5">
                                               {activity.programs_lookup && (Array.isArray(activity.programs_lookup) ? activity.programs_lookup : [activity.programs_lookup]).map((p: any) => (
                                                 <span key={p.id} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-bold uppercase tracking-tighter">
                                                   {p.abbr || p.name}
                                                 </span>
                                               ))}
                                               {!activity.programs_lookup && <span className="text-neutral-400 text-xs">—</span>}
                                             </div>
                                           </td>
                                           <td className="px-6 py-4">
                                             <span className="text-xs font-bold text-neutral-700">Section {deployment.name || "N/A"}</span>
                                             <span className="block text-[10px] text-neutral-400 font-medium uppercase mt-0.5">{deployment.year || "1st"} Year</span>
                                           </td>
                                           <td className="px-6 py-4 text-right">
                                             <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary rounded-lg">
                                               <Users size={12} />
                                               <span className="text-xs font-black">{deployment.student_count || 0}</span>
                                             </div>
                                           </td>
                                         </tr>
                                       ))}
                                       {(!activity.deployments || activity.deployments.length === 0) && (
                                         <tr>
                                           <td colSpan={3} className="px-6 py-10 text-center text-xs text-neutral-400 italic font-medium uppercase tracking-widest">
                                             No deployments found for this activity
                                           </td>
                                         </tr>
                                       )}
                                     </tbody>
                                   </table>
                                  {activity.instructions && (
                                    <div className="px-6 py-5 bg-neutral-50/20 border-t border-neutral-100">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Instructions</p>
                                      <p className="text-xs text-neutral-600 leading-relaxed italic">"{activity.instructions}"</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
