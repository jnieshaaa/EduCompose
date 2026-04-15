import { useState, useEffect } from "react";
import { Save, Download, Upload, Shield, Mail, Database, Calendar, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useNotification } from "../../context/NotificationContext";
import { fetchAcademicSettings, updateAcademicSettings } from "../../services/academicService";
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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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
    if (data) {
      setAcademicSettings(data);
    }
    setLoadingAcademic(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    // Simulate save - in real implementation, this would call an API
    setTimeout(() => {
      setSaving(false);
      setMessage({ type: "success", text: "General settings saved successfully!" });
    }, 1000);
  };

  const handleSaveAcademic = async () => {
    if (!academicSettings) return;
    setSavingAcademic(true);
    setMessage(null);
    
    const result = await updateAcademicSettings(academicSettings.id, academicSettings);
    
    if (result.success) {
      setMessage({ type: "success", text: "Academic term settings updated successfully! Teachers' views will now sync with this term." });
    } else {
      setMessage({ type: "error", text: result.error || "Failed to update academic settings." });
    }
    
    setSavingAcademic(false);
  };

  const handleExportData = () => {
    showNotification('info', "Data export functionality will be implemented here");
  };
  
  const handleImportData = () => {
    showNotification('info', "Data import functionality will be implemented here");
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">System Settings</h1>
          <p className="text-neutral-600 mt-1">Manage system-wide settings and configurations</p>
        </div>
        {message && (
          <div
            className={`px-4 py-2 rounded-lg text-sm animate-in fade-in slide-in-from-top-2 ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Academic Term Settings */}
      <Card className="p-6 border-primary/20 shadow-md">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-neutral-900">Academic Year & Semester</h2>
        </div>
        
        {loadingAcademic ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : academicSettings ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1.5 ml-1">
                  Attending Year (A.Y.)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={academicSettings.ay_start}
                    onChange={(e) => setAcademicSettings({...academicSettings, ay_start: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="2025"
                  />
                  <span className="text-neutral-400">to</span>
                  <input
                    type="number"
                    value={academicSettings.ay_end}
                    onChange={(e) => setAcademicSettings({...academicSettings, ay_end: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="2026"
                  />
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1.5 ml-1">
                  Active Term (Current Semester)
                </label>
                <select
                  value={academicSettings.current_semester}
                  onChange={(e) => setAcademicSettings({...academicSettings, current_semester: e.target.value})}
                  className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer">Summer</option>
                </select>
                <p className="text-[10px] text-primary italic mt-1 font-medium">
                  Note: Changing the active term will automatically move previous content to teachers' archives.
                </p>
                <div className="mt-3">
                    <button 
                        onClick={() => navigate("/Admin/Archive")}
                        className="text-xs text-neutral-500 hover:text-primary flex items-center gap-1 transition-colors"
                    >
                        <Archive size={12} />
                        View Archive Records Summary
                    </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-neutral-100">
              {/* 1st Semester Months */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-neutral-700">1st Semester Period</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Start Month</span>
                    <select
                      value={academicSettings.first_sem_start_month}
                      onChange={(e) => setAcademicSettings({...academicSettings, first_sem_start_month: e.target.value})}
                      className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm"
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase ml-1">End Month</span>
                    <select
                      value={academicSettings.first_sem_end_month}
                      onChange={(e) => setAcademicSettings({...academicSettings, first_sem_end_month: e.target.value})}
                      className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm"
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2nd Semester Months */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-neutral-700">2nd Semester Period</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Start Month</span>
                    <select
                      value={academicSettings.second_sem_start_month}
                      onChange={(e) => setAcademicSettings({...academicSettings, second_sem_start_month: e.target.value})}
                      className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm"
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase ml-1">End Month</span>
                    <select
                      value={academicSettings.second_sem_end_month}
                      onChange={(e) => setAcademicSettings({...academicSettings, second_sem_end_month: e.target.value})}
                      className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm"
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Summer Months */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-neutral-700">Summer Period</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Start Month</span>
                    <select
                      value={academicSettings.summer_start_month}
                      onChange={(e) => setAcademicSettings({...academicSettings, summer_start_month: e.target.value})}
                      className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm"
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase ml-1">End Month</span>
                    <select
                      value={academicSettings.summer_end_month}
                      onChange={(e) => setAcademicSettings({...academicSettings, summer_end_month: e.target.value})}
                      className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm"
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button 
                variant="primary" 
                onClick={handleSaveAcademic} 
                disabled={savingAcademic}
                className="bg-primary text-white font-bold shadow-lg shadow-primary/20"
              >
                <Save className="w-4 h-4 mr-2" />
                {savingAcademic ? "Updating Term..." : "Update Academic Term"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-neutral-500">Failed to load academic settings.</p>
            <Button variant="secondary" onClick={loadAcademicSettings} className="mt-4">
              Retry Load
            </Button>
          </div>
        )}
      </Card>

      {/* General Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-neutral-600" />
          <h2 className="text-xl font-semibold text-neutral-900">General Settings</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Platform Name
            </label>
            <Input
              type="text"
              value={settings.platformName}
              onChange={(val) => setSettings({ ...settings, platformName: val })}
              placeholder="EduCompose"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="emailNotifications"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="emailNotifications" className="text-sm font-medium text-neutral-700">
              Enable email notifications
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoBackup"
              checked={settings.autoBackup}
              onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="autoBackup" className="text-sm font-medium text-neutral-700">
              Enable automatic backups
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="maintenanceMode" className="text-sm font-medium text-neutral-700">
              Maintenance mode (restricts access to admins only)
            </label>
          </div>
          <div className="pt-4">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save General Settings"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Email Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-neutral-600" />
          <h2 className="text-xl font-semibold text-neutral-900">Email Configuration</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              SMTP Server
            </label>
            <Input type="text" placeholder="smtp.example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              SMTP Port
            </label>
            <Input type="number" placeholder="587" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              From Email
            </label>
            <Input type="email" placeholder="noreply@educompose.com" />
          </div>
          <div className="pt-4">
            <Button variant="secondary">
              <Save className="w-4 h-4 mr-2" />
              Save Email Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-neutral-600" />
          <h2 className="text-xl font-semibold text-neutral-900">Data Management</h2>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Export or import system data for backup and migration purposes.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button variant="secondary" onClick={handleImportData}>
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
