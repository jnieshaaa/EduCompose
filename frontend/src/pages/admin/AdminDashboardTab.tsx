import { useState, useEffect } from "react";
import { 
  Users, 
  Shield, 
  ClipboardCheck, 
  FileText, 
  Layers, 
  ArrowRight, 
  Activity, 
  ChevronRight, 
  Globe, 
  Lock, 
  Cpu, 
  Database, 
  Terminal,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  History as HistoryIcon,
  ShieldCheck,
  BookOpen,
  Power,
  ShieldAlert,
  Construction
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { adminApi } from "../../api";
import CreateUserModal from "../../components/admin/CreateUserModal";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../components/ui/Button";

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

  const [maintSettings, setMaintSettings] = useState<any>(null);

  useEffect(() => {
    loadStats();
    fetchMaintSettings();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getSystemStats();
      setStats(data);
    } catch (err) {
      console.error("Connection failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintSettings = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').single();
    if (data) setMaintSettings(data.value);
  };

  const toggleMaintenance = async (role: string) => {
    if (!maintSettings) return;
    const newSettings = { ...maintSettings, [role]: !maintSettings[role] };
    const { error } = await supabase.from('system_settings').update({ value: newSettings }).eq('key', 'maintenance_mode');
    if (!error) setMaintSettings(newSettings);
  };

  const statCards = stats ? [
    { label: "Total Users", value: stats.total_users, sub: `${stats.total_admins} Admins`, icon: Globe, color: "text-primary", bg: "bg-primary/5 border-primary/10", trend: "+12% Growth" },
    { label: "Programs & Sections", value: stats.total_programs, sub: `${stats.total_sections} Sections`, icon: Layers, color: "text-secondary", bg: "bg-secondary/5 border-secondary/10", trend: "Balanced" },
    { label: "Activities & Essays", value: stats.total_activities, sub: `${stats.total_essays} Submissions`, icon: Activity, color: "text-accent", bg: "bg-accent/5 border-accent/10", trend: "High Volume" },
    { label: "Grading Rubrics", value: stats.total_rubrics, sub: `${stats.platform_rubrics} Global`, icon: Lock, color: "text-tertiary", bg: "bg-tertiary/5 border-tertiary/10", trend: "Standardized" },
  ] : [];

  return (
    <div className="space-y-10 pb-20">
      {/* Premium Integrated Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full border border-primary/10 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">System Online</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
             Manage and monitor your system status
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-40 bg-white rounded-[3rem] border border-neutral-100 shadow-sm"
          >
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-primary/10 rounded-full" />
              <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
              <Terminal className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary w-8 h-8 opacity-20" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 animate-pulse">Loading system data...</p>
          </motion.div>
        ) : stats ? (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {/* High-Density Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative p-8 bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all outline-none overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${card.bg}`} />
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3 ${card.bg} ${card.color}`}>
                        <card.icon size={26} />
                      </div>
                      <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">{card.trend}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-1">{card.label}</p>
                      <p className="text-4xl font-bold text-primary tracking-tighter">{stats ? card.value.toLocaleString() : "..."}</p>
                      <div className="h-1 w-full bg-neutral-50 rounded-full mt-4 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "60%" }}
                          transition={{ delay: 1 + i*0.1, duration: 2 }}
                          className={`h-full opacity-30 ${card.color.replace('text', 'bg')}`}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-neutral-400 mt-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-200" />
                        {card.sub}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Intelligent Operational Hub */}
              <div className="lg:col-span-2 space-y-10">
                <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden">
                  <div className="px-10 py-8 border-b border-neutral-50 bg-neutral-50/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Terminal size={18} className="text-primary" />
                      <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Quick Actions</h2>
                    </div>
                    <span className="text-[9px] font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10 tracking-widest uppercase">Ready to manage</span>
                  </div>
                  <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Users", desc: "Manage students and teachers", icon: Users, link: "/Admin/Users", color: "text-primary", bg: "bg-primary/5" },
                      { label: "Rubrics", desc: "Standard grading criteria", icon: ClipboardCheck, link: "/Admin/Rubrics", color: "text-amber-500", bg: "bg-amber-50/50" },
                      { label: "Archive", desc: "View past course records", icon: HistoryIcon, link: "/Admin/Archive", color: "text-emerald-500", bg: "bg-emerald-50/50" },
                      { label: "Settings", desc: "System rules and setup", icon: Shield, link: "/Admin/Settings", color: "text-neutral-500", bg: "bg-neutral-50/50" },
                    ].map((action, i) => (
                      <button
                        key={i}
                        onClick={() => window.location.href = action.link}
                        className="group flex items-center gap-5 p-6 rounded-[2rem] border border-neutral-100/50 hover:bg-neutral-50 hover:border-primary/20 transition-all text-left relative overflow-hidden active:scale-[0.98]"
                      >
                        <div className={`p-4 rounded-2xl ${action.bg} ${action.color} group-hover:scale-110 transition-all shadow-sm`}>
                          <action.icon size={22} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-neutral-800 tracking-tight mb-0.5">{action.label}</p>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{action.desc}</p>
                        </div>
                        <ArrowRight size={18} className="text-neutral-200 group-hover:translate-x-1 group-hover:text-primary transition-all opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Analytical Visualizer */}
                <div className="bg-primary rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden p-10 relative group">
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] group-hover:scale-150 transition-transform duration-1000" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row gap-16">
                     <div className="flex-1 space-y-8">
                        <div className="space-y-2">
                          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest opacity-40">User Distribution</h3>
                          <p className="text-2xl font-bold text-white tracking-tight">Active Users</p>
                        </div>
                        <div className="space-y-6">
                          {[
                            { label: "Teachers", value: stats.total_teachers, total: stats.total_users, color: "bg-white" },
                            { label: "Students", value: stats.total_students, total: stats.total_users, color: "bg-white/80" },
                            { label: "Admins", value: stats.total_admins, total: stats.total_users, color: "bg-white/60" }
                          ].map((item, i) => (
                            <div key={i} className="space-y-3">
                               <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                  <span className="text-white/60">{item.label}</span>
                                  <span className="text-white">{item.value.toLocaleString()} <span className="text-white/20 mx-1">/</span> {item.total.toLocaleString()}</span>
                               </div>
                               <div className="h-2 w-full bg-black/10 rounded-full overflow-hidden border border-white/10">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(item.value / item.total) * 100}%` }}
                                    transition={{ duration: 1.5, delay: 0.8 + (i * 0.1), ease: "easeOut" }}
                                    className={`h-full ${item.color} rounded-full shadow-[0_0_15px_-2px_rgba(0,0,0,0.1)]`} 
                                  />
                               </div>
                            </div>
                          ))}
                        </div>
                     </div>

                     <div className="w-[1px] bg-white/10 hidden md:block" />

                     <div className="space-y-8 md:w-64">
                        <div className="space-y-2">
                          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest opacity-40">Resources</h3>
                          <p className="text-2xl font-bold text-white tracking-tight">Files & Data</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                           {[
                             { label: "Programs", val: stats.total_programs, icon: BookOpen },
                             { label: "Sections", val: stats.total_sections, icon: Layers },
                             { label: "Activities", val: stats.total_activities, icon: Activity },
                             { label: "Essays", val: stats.total_essays, icon: FileText }
                           ].map((node, i) => (
                             <motion.div 
                               key={i} 
                               initial={{ opacity: 0, x: 20 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: 1.2 + i*0.1 }}
                               className="p-4 bg-white/10 rounded-[1.5rem] border border-white/5 flex items-center gap-4 group/box hover:bg-white/[0.2] transition-all"
                             >
                                <div className="p-2.5 bg-white/10 rounded-xl text-white/40 group-hover/box:text-white transition-colors">
                                   <node.icon size={18} />
                                </div>
                                <div className="flex flex-col">
                                   <p className="text-xl font-bold text-white leading-none tracking-tight">{node.val.toLocaleString()}</p>
                                   <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1.5">{node.label}</p>
                                </div>
                             </motion.div>
                           ))}
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="space-y-8">
                 <div className="bg-primary/10 rounded-[2.5rem] border border-primary/20 p-8 relative overflow-hidden group shadow-xl shadow-primary/5">
                    <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                    <h3 className="text-sm font-bold text-neutral-900 tracking-tight mb-3 flex items-center gap-3">
                       <Shield size={18} className="text-primary" />
                       System Status
                    </h3>
                    <p className="text-xs font-bold text-neutral-500 leading-relaxed mb-8 uppercase tracking-wide opacity-80">
                       All systems are running smoothly. Database and AI engine are active.
                    </p>
                    <div className="space-y-3">
                       <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-xl shadow-primary/5 group-hover:scale-[1.02] transition-transform">
                          <div className="flex items-center gap-3">
                             <Database size={14} className="text-neutral-300" />
                             <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Database</span>
                          </div>
                          <span className="flex items-center gap-1.5 text-[9px] font-bold text-success-default uppercase px-3 py-1 bg-success-default/10 rounded-lg">
                             <CheckCircle2 size={10} /> Active
                          </span>
                       </div>
                       <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-xl shadow-primary/5 group-hover:scale-[1.02] transition-transform">
                          <div className="flex items-center gap-3">
                             <Cpu size={14} className="text-neutral-300" />
                             <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">AI Engine</span>
                          </div>
                          <span className="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase px-3 py-1 bg-primary/10 rounded-lg">
                             <ShieldCheck size={10} /> Secure
                          </span>
                       </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-primary/10">
                       <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">Last Update</span>
                          <span className="text-[10px] font-bold text-neutral-900">{new Date().toLocaleTimeString()}</span>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm p-8 space-y-6">
                    <div className="flex items-center gap-3">
                       <BarChart3 size={16} className="text-amber-500" />
                       <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Platform Data</h3>
                    </div>
                    <div className="space-y-6">
                       <div className="flex items-center gap-4 group/item">
                          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-100 group-hover/item:scale-110 transition-transform">
                             <ClipboardCheck size={20} />
                          </div>
                          <div className="flex-1">
                             <p className="text-sm font-bold text-neutral-800 tracking-tight">{stats.platform_rubrics} Global Rubrics</p>
                             <div className="flex justify-between items-center mt-1">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Platform Templates</p>
                                <span className="text-[10px] font-bold text-amber-600">Global</span>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-4 group/item">
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center border border-indigo-100 group-hover/item:scale-110 transition-transform">
                             <FileText size={20} />
                          </div>
                          <div className="flex-1">
                             <p className="text-sm font-bold text-neutral-800 tracking-tight">{stats.total_essays.toLocaleString()} Submissions</p>
                             <div className="flex justify-between items-center mt-1">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Total essays submitted</p>
                                <ChevronRight size={12} className="text-neutral-200" />
                             </div>
                          </div>
                       </div>
                    </div>
                    
                    <button className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-300 hover:text-primary transition-colors border-t border-neutral-50 mt-4 outline-none">
                       Full Report
                    </button>
                 </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40">
             <AlertCircle size={48} className="text-red-100 mb-4" />
             <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Could not load data</p>
             <Button variant="outline" onClick={loadStats} className="mt-6 rounded-xl border-neutral-100 text-[10px] font-bold uppercase tracking-widest">Retry</Button>
          </div>
        )}
      </AnimatePresence>

      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={loadStats}
      />

      {/* System Status & Control */}
      {!loading && maintSettings && (
        <section className="space-y-6 mt-20">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-neutral-900 flex items-center justify-center text-white">
               <ShieldCheck size={20} />
             </div>
             <div>
               <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest leading-none mb-1">System Controls</h3>
               <p className="text-[10px] font-bold text-neutral-400">Manage user access and maintenance status</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MaintenanceToggle 
              label="Global Lock" 
              isActive={maintSettings.global} 
              onToggle={() => toggleMaintenance('global')}
              isDangerous
            />
            <MaintenanceToggle 
              label="Teacher Portal" 
              isActive={maintSettings.teacher} 
              onToggle={() => toggleMaintenance('teacher')}
            />
            <MaintenanceToggle 
              label="Student Portal" 
              isActive={maintSettings.student} 
              onToggle={() => toggleMaintenance('student')}
            />
            <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 flex flex-col justify-between overflow-hidden relative group">
              <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Admin Access</p>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-default" />
                  <p className="text-xs font-bold text-neutral-900">Always Bypassed</p>
                </div>
              </div>
              <ShieldAlert className="absolute -bottom-4 -right-4 w-16 h-16 text-neutral-200 opacity-20" />
            </div>
          </div>
        </section>
      )}

      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={loadStats}
      />
    </div>
  );
}

const MaintenanceToggle = ({ label, isActive, onToggle, isDangerous = false }: any) => (
  <button
    onClick={onToggle}
    className={`p-6 rounded-[2rem] border transition-all text-left flex flex-col justify-between gap-4 group ${
      isActive 
        ? isDangerous ? "bg-error-default/5 border-error-default/20 text-error-default" : "bg-amber-500/5 border-amber-500/20 text-amber-600"
        : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200"
    }`}
  >
    <div className="flex items-center justify-between w-full">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? "bg-white/50" : "bg-neutral-50"}`}>
        {isActive ? <Power size={14} /> : <Construction size={14} />}
      </div>
      <div className={`w-10 h-5 rounded-full relative transition-all ${isActive ? (isDangerous ? "bg-error-default" : "bg-amber-500") : "bg-neutral-200"}`}>
        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isActive ? "left-6" : "left-1"}`} />
      </div>
    </div>
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Mode</p>
      <p className={`text-sm font-bold transition-colors ${isActive ? "text-neutral-900" : "text-neutral-400"}`}>{label}</p>
    </div>
  </button>
);


