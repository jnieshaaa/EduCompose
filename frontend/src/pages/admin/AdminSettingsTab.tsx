import { useState, useEffect } from "react";
import { 
  Save, 
  Download, 
  Upload, 
  ArrowRight, 
  Database, 
  Calendar, 
  Archive, 
  Loader2, 
  Lock, 
  ChevronRight, 
  RefreshCw,
  Clock,
  CheckCircle2,
  Settings,
  Bell,
  Terminal,
  User,
  BookOpen
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { useNotification } from "../../contexts/NotificationContext";
import { fetchAcademicSettings, updateAcademicSettings, createAcademicSettings } from "../../services/academicService";
import type { AcademicSettings } from "../../services/academicService";

export function AdminSettingsTab() {
  const [settings, setSettings] = useState({
    platformName: "EduCompose",
    emailNotifications: true,
    autoBackup: true,
    maintenanceMode: false,
  });
  
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings | null>(null);
  const [loadingAcademic, setLoadingAcademic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    loadAcademicSettings();
  }, []);

  const loadAcademicSettings = async () => {
    setLoadingAcademic(true);
    const data = await fetchAcademicSettings();
    if (data) setAcademicSettings(data);
    setLoadingAcademic(false);
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showNotification('success', "Settings updated successfully.");
    }, 800);
  };

  const handleSaveAcademic = async () => {
    if (!academicSettings) return;
    setSavingAcademic(true);
    const result = await updateAcademicSettings(academicSettings.id, academicSettings);
    if (result.success) {
      showNotification('success', "Academic calendar updated.");
    } else {
      showNotification('error', result.error || "Failed to update calendar.");
    }
    setSavingAcademic(false);
  };

  const handleInitializeAcademic = async () => {
    setSavingAcademic(true);
    const defaults: Partial<AcademicSettings> = {
      ay_start: new Date().getFullYear(),
      ay_end: new Date().getFullYear() + 1,
      current_semester: "1st Semester",
      first_sem_start_month: "August",
      first_sem_end_month: "December",
      second_sem_start_month: "January",
      second_sem_end_month: "May",
      summer_start_month: "June",
      summer_end_month: "July"
    };
    
    const result = await createAcademicSettings(defaults);
    if (result.success) {
      setAcademicSettings(result.data as AcademicSettings);
      showNotification('success', "Academic system initialized.");
    } else {
      showNotification('error', "Initialization failed: " + result.error);
    }
    setSavingAcademic(false);
  };

  return (
    <div className="space-y-10 pb-32">
      {/* Premium Integrated Header */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-8">
        <div>
          <h1 className="text-3xl font-medium text-neutral-900 tracking-tight">System Settings</h1>
          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mt-1 flex items-center gap-2">
            <Settings size={14} className="text-primary/50" />
            Manage system and academic setup
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
             variant="outline" 
             onClick={loadAcademicSettings}
             className="rounded-xl bg-white shadow-sm border border-neutral-200 hover:bg-neutral-50 px-4 h-10 flex items-center gap-2"
           >
             <RefreshCw size={14} className={`text-neutral-400 ${loadingAcademic ? 'animate-spin' : ''}`} />
             <span className="text-[9px] font-medium uppercase tracking-widest text-neutral-600">Full Sync</span>
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Academic Temporal Control */}
          <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-10 py-8 border-b border-neutral-50 bg-neutral-50/20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <Calendar size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-neutral-900 tracking-tight">Academic Calendar</h2>
                  <p className="text-[9px] font-medium text-neutral-400 uppercase tracking-widest mt-0.5">Set the current school year and active semester</p>
                </div>
              </div>
              <span className="text-[9px] font-medium text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10 tracking-widest uppercase">System Status</span>
            </div>
            
            <div className="p-10 space-y-10">
              {loadingAcademic ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-primary/20 mb-4" />
                  <p className="text-[9px] font-medium uppercase tracking-widest text-neutral-300">Updating calendar...</p>
                </div>
              ) : academicSettings ? (
                <div className="space-y-10 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">School Year (A.Y.)</label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 relative group">
                           <input
                            type="number"
                            value={academicSettings.ay_start}
                            onChange={(e) => setAcademicSettings({...academicSettings, ay_start: parseInt(e.target.value)})}
                            className="w-full h-12 px-5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none"
                           />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-medium text-neutral-300 uppercase tracking-widest">Start</span>
                        </div>
                        <div className="text-neutral-200 font-medium">/</div>
                        <div className="flex-1 relative group">
                           <input
                            type="number"
                            value={academicSettings.ay_end}
                            onChange={(e) => setAcademicSettings({...academicSettings, ay_end: parseInt(e.target.value)})}
                            className="w-full h-12 px-5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none"
                           />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-medium text-neutral-300 uppercase tracking-widest">End</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Current Semester</label>
                      <div className="relative group">
                         <select
                          value={academicSettings.current_semester}
                          onChange={(e) => setAcademicSettings({...academicSettings, current_semester: e.target.value})}
                          className="w-full h-12 px-5 bg-neutral-50 border border-neutral-100 rounded-2xl text-[11px] font-medium uppercase tracking-widest appearance-none cursor-pointer focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none"
                         >
                          <option value="1st Semester">1st Semester</option>
                          <option value="2nd Semester">2nd Semester</option>
                          <option value="Summer">Summer Term</option>
                         </select>
                         <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-primary/[0.02] border border-primary/5 rounded-[2rem] space-y-4">
                     <div className="flex items-center gap-3">
                        <Archive size={16} className="text-primary opacity-40" />
                        <h3 className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Important Note on Transitions</h3>
                     </div>
                     <p className="text-[11px] font-medium text-neutral-500 leading-relaxed tracking-tight">
                        Note: Changing the active semester will move current teacher assignments to the archive. All teacher schedules will be reset for the new semester.
                     </p>
                     <button 
                        onClick={() => navigate("/Admin/Archive")}
                        className="text-[10px] font-medium text-primary uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform"
                     >
                        View Archive <ArrowRight size={12} />
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { title: "Primary Session", startKey: "first_sem_start_month", endKey: "first_sem_end_month" },
                      { title: "Secondary Session", startKey: "second_sem_start_month", endKey: "second_sem_end_month" },
                      { title: "Extended Summer", startKey: "summer_start_month", endKey: "summer_end_month" }
                    ].map((session, i) => (
                      <div key={i} className="space-y-4 p-6 bg-neutral-50/50 border border-neutral-100 rounded-3xl group hover:border-primary/20 transition-all">
                        <h4 className="text-[10px] font-medium text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                           <Clock size={12} className="text-neutral-300" />
                           {session.title}
                        </h4>
                        <div className="space-y-3">
                          <div className="space-y-1">
                             <span className="text-[8px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Start Month</span>
                             <select
                              value={(academicSettings as any)[session.startKey]}
                              onChange={(e) => setAcademicSettings({...academicSettings, [session.startKey]: e.target.value} as any)}
                              className="w-full h-10 px-3 bg-white border border-neutral-100 rounded-xl text-[10px] font-medium uppercase tracking-tighter outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                             >
                              {months.map(m => <option key={m} value={m}>{m}</option>)}
                             </select>
                          </div>
                          <div className="space-y-1">
                             <span className="text-[8px] font-medium text-neutral-400 uppercase tracking-widest ml-1">End Month</span>
                             <select
                              value={(academicSettings as any)[session.endKey]}
                              onChange={(e) => setAcademicSettings({...academicSettings, [session.endKey]: e.target.value} as any)}
                              className="w-full h-10 px-3 bg-white border border-neutral-100 rounded-xl text-[10px] font-medium uppercase tracking-tighter outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                             >
                              {months.map(m => <option key={m} value={m}>{m}</option>)}
                             </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 flex items-center justify-between border-t border-neutral-100">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Calendar Sync</h4>
                      <p className="text-[9px] text-neutral-400 italic">Sync academic structure with current faculty loads.</p>
                    </div>
                    <Button 
                      onClick={handleSaveAcademic} 
                      disabled={savingAcademic}
                      className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all px-8 h-10 flex items-center gap-2 border-none"
                    >
                      {savingAcademic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                      <span className="text-[10px] font-bold uppercase tracking-widest">Save Changes</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
                   <div className="w-20 h-20 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center mb-6 border border-neutral-100 shadow-inner group">
                     <Calendar className="w-10 h-10 text-neutral-200 group-hover:text-primary transition-colors duration-500" />
                   </div>
                   <h3 className="text-xl font-medium text-neutral-900 tracking-tight">No Calendar Configured</h3>
                   <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] mt-3 max-w-xs mx-auto text-center leading-relaxed">
                     The academic calendar hasn't been initialized yet.
                   </p>
                   <Button 
                     onClick={handleInitializeAcademic}
                     disabled={savingAcademic}
                     className="mt-8 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all px-10 h-12 flex items-center gap-3 border-none"
                   >
                     {savingAcademic ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw size={18} />}
                     <span className="text-[11px] font-bold uppercase tracking-widest">Initialize System</span>
                   </Button>
                </div>
              )}
            </div>
          </div>

          {/* Infrastructure Control */}
          <div className="bg-white rounded-[3rem] border border-neutral-100 shadow-sm overflow-hidden border-t-4 border-t-primary">
             <div className="px-10 py-8 border-b border-neutral-50 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <Terminal size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-neutral-900 tracking-tight">System Settings</h2>
                  <p className="text-[9px] font-medium text-neutral-400 uppercase tracking-widest mt-0.5">Manage the platform's basic information and features</p>
                </div>
             </div>
             <div className="p-10 space-y-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest ml-1">Platform Name</label>
                   <input
                     type="text"
                     value={settings.platformName}
                     onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                     placeholder="EduCompose"
                     className="w-full h-12 px-5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none"
                   />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {[
                     { id: 'emailNotifications', label: 'Email Notifications', desc: 'Send system alerts and reports via email', icon: Bell, checked: settings.emailNotifications },
                     { id: 'autoBackup', label: 'Automatic Backups', desc: 'Keep a backup of all system data', icon: Database, checked: settings.autoBackup },
                     { id: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Prevent users from logging in during updates', icon: Lock, checked: settings.maintenanceMode }
                   ].map((item, i) => (
                     <div key={i} className="flex items-start gap-5 p-6 bg-neutral-50/50 border border-neutral-100 rounded-[2rem] group hover:border-primary/20 transition-all flex-1">
                        <div className={`p-4 rounded-xl bg-white border border-neutral-100 shadow-sm group-hover:scale-110 transition-transform ${item.checked ? 'text-primary' : 'text-neutral-300'}`}>
                           <item.icon size={20} />
                        </div>
                        <div className="flex-1 space-y-2">
                           <div className="flex justify-between items-center">
                              <span className="text-[11px] font-medium text-neutral-800 uppercase tracking-widest">{item.label}</span>
                              <div 
                                onClick={() => setSettings({ ...settings, [item.id]: !item.checked } as any)}
                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors duration-300 ${item.checked ? 'bg-primary' : 'bg-neutral-200'}`}
                              >
                                 <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${item.checked ? 'left-6' : 'left-1'}`} />
                              </div>
                           </div>
                           <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest leading-relaxed">{item.desc}</p>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="pt-4 border-t border-neutral-50">
                  <Button 
                    onClick={handleSaveGeneral} 
                    disabled={saving}
                    className="rounded-xl bg-neutral-50 text-neutral-600 hover:bg-primary hover:text-white transition-all px-8 h-10 flex items-center gap-2 border border-neutral-100 outline-none"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                    <span className="text-[10px] font-medium uppercase tracking-widest">Save Changes</span>
                  </Button>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar Communication & Data Hub */}
        <div className="space-y-10">

           {/* Backup & Restore */}
           <div className="bg-primary/95 rounded-[2.5rem] border border-white/5 shadow-2xl p-8 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="flex items-center gap-4 relative z-10">
                 <div className="w-12 h-12 bg-white/5 text-white rounded-2xl flex items-center justify-center border border-white/5">
                   <Database size={22} />
                 </div>
                 <h2 className="text-xl font-medium text-white tracking-tight leading-none">Backup & Restore</h2>
              </div>
              <div className="space-y-6 relative z-10">
                 <p className="text-[11px] font-medium text-white/40 leading-relaxed tracking-tight uppercase">
                    Backup your data or upload record files to the system.
                 </p>
                 <div className="grid grid-cols-1 gap-4">
                    <button className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl group/btn hover:bg-white/10 hover:border-white/10 transition-all">
                       <div className="flex items-center gap-4">
                          <Download size={18} className="text-white/20 group-hover/btn:text-primary transition-colors" />
                          <span className="text-[10px] font-medium text-white uppercase tracking-widest">Download Backup</span>
                       </div>
                       <ChevronRight size={14} className="text-white/20 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    <button className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl group/btn hover:bg-white/10 hover:border-white/10 transition-all">
                       <div className="flex items-center gap-4">
                          <Upload size={18} className="text-white/20 group-hover/btn:text-primary transition-colors" />
                          <span className="text-[10px] font-medium text-white uppercase tracking-widest">Upload Records</span>
                       </div>
                       <ChevronRight size={14} className="text-white/20 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                 </div>
                 <div className="pt-6 border-t border-white/5">
                   <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-medium text-white/20 uppercase tracking-widest">System Status</span>
                      <span className="flex items-center gap-2 text-[10px] font-medium text-success-default uppercase tracking-widest">
                         <CheckCircle2 size={12} /> Optimized
                      </span>
                   </div>
                 </div>
              </div>
           </div>

           {/* System Archives */}
           <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm p-8 space-y-8">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-neutral-50 text-neutral-400 rounded-2xl flex items-center justify-center border border-neutral-100">
                   <Archive size={22} />
                 </div>
                 <h2 className="text-xl font-medium text-neutral-900 tracking-tight leading-none">System Archives</h2>
              </div>
              <div className="space-y-4">
                 <p className="text-[11px] font-medium text-neutral-400 leading-relaxed tracking-tight uppercase">
                    Access historical data and archived member records.
                 </p>
                 <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => navigate("/Admin/Archive?type=academic")}
                      className="flex items-center justify-between p-5 bg-neutral-50 border border-neutral-100 rounded-2xl group hover:bg-primary/5 hover:border-primary/20 transition-all"
                    >
                       <div className="flex items-center gap-4">
                          <BookOpen size={18} className="text-neutral-300 group-hover:text-primary transition-colors" />
                          <div className="text-left">
                            <span className="block text-[10px] font-bold text-neutral-700 uppercase tracking-widest">Academic Archive</span>
                            <span className="text-[9px] text-neutral-400 uppercase">Teacher Loads & Schedules</span>
                          </div>
                       </div>
                       <ChevronRight size={14} className="text-neutral-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => navigate("/Admin/Archive?type=users")}
                      className="flex items-center justify-between p-5 bg-neutral-50 border border-neutral-100 rounded-2xl group hover:bg-secondary/5 hover:border-secondary/20 transition-all"
                    >
                       <div className="flex items-center gap-4">
                          <User size={18} className="text-neutral-300 group-hover:text-secondary transition-colors" />
                          <div className="text-left">
                            <span className="block text-[10px] font-bold text-neutral-700 uppercase tracking-widest">User Archive</span>
                            <span className="text-[9px] text-neutral-400 uppercase">Graduated & Resigned Members</span>
                          </div>
                       </div>
                       <ChevronRight size={14} className="text-neutral-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
