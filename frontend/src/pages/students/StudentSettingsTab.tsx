import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Download, Loader2, Check } from 'lucide-react';
import { useNotification } from "../../context/NotificationContext";

export function StudentSettingsTab() {
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showNotification } = useNotification();

  // Settings States
  const [preferences, setPreferences] = useState({
    notifyEvaluation: true,
    notifyFeedback: true,
    notifyRevision: true,
    notifyDeadline: true,
    notifyEmail: false,
    autoAiEval: true,
    allowResubmit: true,
    saveDrafts: true,
    defaultFormat: "PDF",
    showScores: true,
    detailedFeedback: true,
    dashboardView: "Overview",
    dataSharing: true
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;

        const { data, error } = await supabase
          .from("students")
          .select(`
            *,
            programs_lookup (name, abbr)
          `)
          .eq("auth_user_id", authData.user.id)
          .single();

        if (error) throw error;
        setStudentData(data);

        // Load preferences from localStorage if they exist
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

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    if (!studentData) return;
    
    setIsSaving(true);
    try {
      // Simulate API call for saving preferences
      // In a real app, you would: await supabase.from('students').update({ preferences }).eq('id', studentData.id)
      
      // Save to LocalStorage for now to demonstrate persistence
      localStorage.setItem(`student_prefs_${studentData.id}`, JSON.stringify(preferences));
      
      await new Promise(resolve => setTimeout(resolve, 800)); // Visual feedback
      showNotification('success', "Settings saved successfully!");
    } catch (err) {
      showNotification('error', "Failed to save settings. Please try again.");
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
      autoAiEval: true,
      allowResubmit: true,
      saveDrafts: true,
      defaultFormat: "PDF",
      showScores: true,
      detailedFeedback: true,
      dashboardView: "Overview",
      dataSharing: true
    };
    setPreferences(defaults);
    showNotification('info', "Settings reset to defaults.");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
      {/* Profile Information */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-neutral-900 mb-6">Profile Information</h2>
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-3xl font-extrabold uppercase shadow-sm">
              {studentData?.first_name?.[0] || "?"}
            </div>
            <div>
              <h3 className="font-bold text-neutral-900">{studentData?.first_name} {studentData?.last_name}</h3>
              <p className="text-sm text-neutral-500 mb-3">{studentData?.student_code}</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled>Change Photo</Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="first-name" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">First Name</Label>
              <Input id="first-name" value={studentData?.first_name || ""} className="bg-neutral-50 font-medium" readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last-name" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Last Name</Label>
              <Input id="last-name" value={studentData?.last_name || ""} className="bg-neutral-50 font-medium" readOnly />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="student-id" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Student ID</Label>
              <Input id="student-id" value={studentData?.student_code || ""} className="bg-neutral-50 font-medium" readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Email Address</Label>
              <Input id="email" type="email" value={studentData?.email || ""} className="bg-neutral-50 font-medium" readOnly />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="program" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Current Program</Label>
              <Input id="program" value={studentData?.programs_lookup?.name || studentData?.programs_lookup?.abbr || "N/A"} className="bg-neutral-50 font-medium" readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="section" className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Year & Block</Label>
              <Input id="section" value={studentData?.year && studentData?.block_name ? `${studentData.year} - ${studentData.block_name}` : studentData?.block_name || "N/A"} className="bg-neutral-50 font-medium" readOnly />
            </div>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-neutral-900 mb-6">Notification Preferences</h2>
        <div className="space-y-5">
          {[
            { id: 'notifyEvaluation', label: 'Essay Evaluated', sub: 'Notify me when AI evaluation is complete', key: 'notifyEvaluation' },
            { id: 'notifyFeedback', label: 'Teacher Feedback', sub: 'Notify me when teacher adds feedback', key: 'notifyFeedback' },
            { id: 'notifyRevision', label: 'Revision Requested', sub: 'Notify me when revision is requested', key: 'notifyRevision' },
            { id: 'notifyDeadline', label: 'Deadline Reminders', sub: 'Send reminders for upcoming deadlines', key: 'notifyDeadline' },
            { id: 'notifyEmail', label: 'Email Notifications', sub: 'Also send notifications to my email', key: 'notifyEmail' },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-50 transition-colors">
              <div className="flex-1">
                <Label htmlFor={item.id} className="font-bold text-neutral-800 cursor-pointer">{item.label}</Label>
                <p className="text-xs text-neutral-500 mt-0.5">{item.sub}</p>
              </div>
              <Switch 
                id={item.id} 
                checked={(preferences as any)[item.key]} 
                onCheckedChange={(val) => handlePreferenceChange(item.key, val)}
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Submission Preferences */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">Submission</h2>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="auto-ai-eval" className="font-bold text-neutral-800">Auto AI Evaluation</Label>
                <p className="text-xs text-neutral-500 mt-0.5">Auto request AI feedback</p>
              </div>
              <Switch 
                id="auto-ai-eval" 
                checked={preferences.autoAiEval} 
                onCheckedChange={(val) => handlePreferenceChange('autoAiEval', val)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="allow-resubmit" className="font-bold text-neutral-800">Resubmissions</Label>
                <p className="text-xs text-neutral-500 mt-0.5">Allow revising by default</p>
              </div>
              <Switch 
                id="allow-resubmit" 
                checked={preferences.allowResubmit} 
                onCheckedChange={(val) => handlePreferenceChange('allowResubmit', val)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-format" className="text-xs font-bold text-neutral-500 uppercase">Default Format</Label>
              <select 
                id="default-format" 
                value={preferences.defaultFormat}
                onChange={(e) => handlePreferenceChange('defaultFormat', e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="PDF">PDF Document</option>
                <option value="DOCX">Microsoft Word</option>
                <option value="TXT">Plain Text</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Display Preferences */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">Display</h2>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="show-scores" className="font-bold text-neutral-800">Show Scores</Label>
                <p className="text-xs text-neutral-500 mt-0.5">Show AI scores immediately</p>
              </div>
              <Switch 
                id="show-scores" 
                checked={preferences.showScores} 
                onCheckedChange={(val) => handlePreferenceChange('showScores', val)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="detailed-feedback" className="font-bold text-neutral-800">Detailed View</Label>
                <p className="text-xs text-neutral-500 mt-0.5">Show full breakdown</p>
              </div>
              <Switch 
                id="detailed-feedback" 
                checked={preferences.detailedFeedback} 
                onCheckedChange={(val) => handlePreferenceChange('detailedFeedback', val)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dashboard-view" className="text-xs font-bold text-neutral-500 uppercase">Default View</Label>
              <select 
                id="dashboard-view" 
                value={preferences.dashboardView}
                onChange={(e) => handlePreferenceChange('dashboardView', e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="Overview">Overview</option>
                <option value="Recent Activity">Recent Activity</option>
                <option value="Progress Charts">Progress Charts</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Privacy & Security */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-neutral-900 mb-6">Privacy & Security</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100">
            <div className="flex-1">
              <Label htmlFor="data-sharing" className="font-bold text-neutral-800 cursor-pointer">Share Progress with Teacher</Label>
              <p className="text-xs text-neutral-500 mt-0.5">Allow teachers to view your progress analytics</p>
            </div>
            <Switch 
              id="data-sharing" 
              checked={preferences.dataSharing} 
              onCheckedChange={(val) => handlePreferenceChange('dataSharing', val)}
            />
          </div>

          <div className="pt-4 border-t border-neutral-100">
            <h3 className="text-sm font-bold text-neutral-800 mb-4">Export Data</h3>
            <Button variant="outline" className="text-neutral-600 border-neutral-200">
              <Download className="w-4 h-4 mr-2" />
              Request Account Data Export (JSON)
            </Button>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="sticky bottom-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 z-30">
        <Button 
          variant="outline" 
          onClick={resetToDefaults}
          disabled={isSaving}
          className="bg-white/80 backdrop-blur-md border-neutral-200 font-bold"
        >
          Reset to Defaults
        </Button>
        <Button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-primary hover:bg-primary-600 text-white font-bold px-8 shadow-lg shadow-primary/20"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

