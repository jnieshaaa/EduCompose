import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Label } from '../../components/ui/label';
// import { Switch } from '../../components/ui/switch';
import { Loader2, Check, User, ShieldCheck, RotateCcw } from 'lucide-react';
import { useNotification } from "../../contexts/NotificationContext";
import { motion } from "framer-motion";
import { ChangePassword } from "../../components/settings/ChangePassword";
import { useAuth } from "../../contexts/AuthContext";

export function StudentSettingsTab() {
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showNotification } = useNotification();
  const { checkAuth } = useAuth();
  
  const [profile, setProfile] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [preferences, setPreferences] = useState({
    notifyEvaluation: true,
    notifyFeedback: true,
    notifyRevision: true,
    notifyDeadline: true,
    notifyEmail: false,
    saveDrafts: true,
    dashboardView: "Overview"
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;

        const { data, error } = await supabase
          .from("users")
          .select(`
            *,
            student_profiles!user_id (
              *,
              programs_lookup (
                name, 
                abbr,
                departments (
                  name,
                  schools (
                    name
                  )
                )
              )
            )
          `)
          .eq("id", authData.user.id)
          .eq("role", "student")
          .single();

        if (error) throw error;
        setStudentData(data);
        setProfile({
          firstName: data.first_name || "",
          middleName: data.middle_name || "",
          lastName: data.last_name || "",
          suffix: data.suffix || ""
        });

        const savedPrefs = localStorage.getItem(`student_prefs_${data.id}`);
        if (savedPrefs) {
          setPreferences(JSON.parse(savedPrefs));
        }
      } catch (err) {
        console.error("Error loading student settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // const handlePreferenceChange = (key: string, value: any) => {
  //   setPreferences(prev => ({ ...prev, [key]: value }));
  // };

  const sanitizeName = (value: string) => {
    let clean = value.replace(/[^A-Za-z]/g, "");
    if (clean.length > 0) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    }
    return clean;
  };

  const validateNames = () => {
    const newErrors: Record<string, string> = {};
    if (!profile.firstName || profile.firstName.length < 3) {
      newErrors.firstName = "Min 3 letters";
    }
    if (!profile.lastName || profile.lastName.length < 3) {
      newErrors.lastName = "Min 3 letters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveSettings = async () => {
    if (!studentData) return;
    if (!validateNames()) {
      showNotification('error', "Please fix profile errors first.");
      return;
    }
    
    setIsSaving(true);
    try {
      localStorage.setItem(`student_prefs_${studentData.id}`, JSON.stringify(preferences));
      
      const { error } = await supabase
        .from("users")
        .update({
          first_name: profile.firstName,
          middle_name: profile.middleName,
          last_name: profile.lastName,
          suffix: profile.suffix
        })
        .eq("id", studentData.id);

      if (error) throw error;
      
      // Sync auth user meta too
      await supabase.auth.updateUser({
        data: {
          first_name: profile.firstName,
          middle_name: profile.middleName,
          last_name: profile.lastName,
          suffix: profile.suffix
        }
      });

      await checkAuth(); // Refresh header
        
      showNotification('success', "All settings saved!");
    } catch (err) {
      showNotification('error', "Couldn't save settings. Try again!");
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    const defaults = {
      notifyEvaluation: true,
      notifyFeedback: true,
      notifyRevision: true,
      notifyDeadline: true,
      notifyEmail: false,
      saveDrafts: true,
      dashboardView: "Overview"
    };
    setPreferences(defaults);
    showNotification('info', "Settings started over.");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">Opening your profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto w-full pb-20 px-1">
      {/* Header section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">My Profile</h1>
        <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <User size={14} className="text-primary/50" />
            Manage your info and settings
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto w-full space-y-8">
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-900/5 space-y-8"
          >
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-4xl font-black shadow-lg relative group overflow-hidden">
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                {studentData?.first_name?.[0] || "?"}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">{studentData?.first_name} {studentData?.last_name}</h3>
                <p className="text-sm font-bold text-primary flex items-center gap-2">
                   <ShieldCheck size={14} />
                   Verified Account
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 flex justify-between">
                  <span>First Name</span>
                  {errors.firstName && <span className="text-red-500 normal-case tracking-normal">{errors.firstName}</span>}
                </Label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => {
                    setProfile(prev => ({ ...prev, firstName: sanitizeName(e.target.value) }));
                    if (errors.firstName) setErrors(prev => ({ ...prev, firstName: '' }));
                  }}
                  className={`w-full px-5 py-4 bg-neutral-50 rounded-2xl border text-sm font-bold text-neutral-600 outline-none focus:ring-2 focus:ring-primary/20 ${errors.firstName ? 'border-red-500' : 'border-neutral-50'}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Middle Name</Label>
                <input
                  type="text"
                  value={profile.middleName}
                  placeholder="Optional"
                  onChange={(e) => setProfile(prev => ({ ...prev, middleName: sanitizeName(e.target.value) }))}
                  className="w-full px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-50 text-sm font-bold text-neutral-600 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 flex justify-between">
                  <span>Last Name</span>
                  {errors.lastName && <span className="text-red-500 normal-case tracking-normal">{errors.lastName}</span>}
                </Label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => {
                    setProfile(prev => ({ ...prev, lastName: sanitizeName(e.target.value) }));
                    if (errors.lastName) setErrors(prev => ({ ...prev, lastName: '' }));
                  }}
                  className={`w-full px-5 py-4 bg-neutral-50 rounded-2xl border text-sm font-bold text-neutral-600 outline-none focus:ring-2 focus:ring-primary/20 ${errors.lastName ? 'border-red-500' : 'border-neutral-50'}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Suffix</Label>
                <input
                  type="text"
                  value={profile.suffix}
                  placeholder="Jr., III, etc. (Optional)"
                  onChange={(e) => setProfile(prev => ({ ...prev, suffix: e.target.value }))}
                  className="w-full px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-50 text-sm font-bold text-neutral-600 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest ml-1">School ID</Label>
                <div className="px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-50 text-sm font-bold text-neutral-400 cursor-not-allowed">
                  {(studentData?.student_profiles?.student_code || studentData?.student_profiles?.[0]?.student_code) || "---"}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest ml-1">Email</Label>
                <div className="px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-50 text-sm font-bold text-neutral-400 truncate cursor-not-allowed">
                  {studentData?.email || "---"}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest ml-1">School</Label>
                <div className="px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-50 text-sm font-bold text-neutral-400 cursor-not-allowed">
                  {(studentData?.student_profiles?.programs_lookup || studentData?.student_profiles?.[0]?.programs_lookup)?.departments?.schools?.name || "N/A"}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest ml-1">Department</Label>
                <div className="px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-50 text-sm font-bold text-neutral-400 cursor-not-allowed">
                  {(studentData?.student_profiles?.programs_lookup || studentData?.student_profiles?.[0]?.programs_lookup)?.departments?.name || "N/A"}
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest ml-1">Program</Label>
                <div className="px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-50 text-sm font-bold text-neutral-400 cursor-not-allowed">
                  {(studentData?.student_profiles?.programs_lookup || studentData?.student_profiles?.[0]?.programs_lookup)?.name || "N/A"}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest ml-1">Year Level</Label>
                <div className="px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-50 text-sm font-bold text-neutral-400 cursor-not-allowed">
                  {studentData?.student_profiles?.year || studentData?.student_profiles?.[0]?.year || "N/A"}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest ml-1">Block</Label>
                <div className="px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-50 text-sm font-bold text-neutral-400 cursor-not-allowed">
                  {studentData?.student_profiles?.block_name || studentData?.student_profiles?.[0]?.block_name || "N/A"}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Preferences Form */}
          {/* <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-900/5 space-y-8"
          >
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <Bell size={20} />
               </div>
               <div>
                  <h2 className="text-xl font-bold text-neutral-900 tracking-tight">When to tell me</h2>
                  <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Notification Settings</p>
               </div>
            </div>

            <div className="space-y-3">
              {[
                { id: 'notifyEvaluation', label: 'My work is scored', sub: 'Tell me when AI evaluation is done', key: 'notifyEvaluation' },
                { id: 'notifyFeedback', label: 'Teacher gives tips', sub: 'Tell me when my teacher adds comments', key: 'notifyFeedback' },
                { id: 'notifyRevision', label: 'I need to fix something', sub: 'Tell me if I need to revise my essay', key: 'notifyRevision' },
                { id: 'notifyDeadline', label: 'Deadlines are coming', sub: 'Send me reminders for due dates', key: 'notifyDeadline' },
                { id: 'notifyEmail', label: 'Send to my email too', sub: 'Also send updates to my mailbox', key: 'notifyEmail' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-5 rounded-3xl hover:bg-neutral-50 transition-all border border-transparent hover:border-neutral-100 group">
                  <div className="flex-1 pr-4">
                    <Label htmlFor={item.id} className="text-sm font-bold text-neutral-800 cursor-pointer group-hover:text-primary transition-colors">{item.label}</Label>
                    <p className="text-[11px] font-medium text-neutral-400 mt-0.5">{item.sub}</p>
                  </div>
                  <Switch 
                    id={item.id} 
                    checked={(preferences as any)[item.key]} 
                    onCheckedChange={(val) => handlePreferenceChange(item.key, val)}
                  />
                </div>
              ))}
            </div>
          </motion.div> */}

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-900/5"
          >
            <div className="p-2">
              <ChangePassword id="student-password" />
            </div>
          </motion.div>

      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-neutral-100">
        <button 
          onClick={resetToDefaults}
          className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:text-red-500 transition-colors"
        >
          <RotateCcw size={14} />
          Start Over
        </button>

        <button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-12 py-5 bg-neutral-900 text-white font-bold text-[11px] uppercase tracking-widest rounded-2xl shadow-2xl shadow-neutral-900/20 hover:bg-primary transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check size={16} />
              Save Everything
            </>
          )}
        </button>
      </div>
    </div>
  );
}
