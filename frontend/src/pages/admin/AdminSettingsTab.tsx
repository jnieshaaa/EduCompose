import { useState } from "react";
import { Save, Download, Upload, Shield, Mail, Database } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export function AdminSettingsTab() {
  const [settings, setSettings] = useState({
    platformName: "EduCompose",
    emailNotifications: true,
    autoBackup: true,
    maintenanceMode: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    // Simulate save - in real implementation, this would call an API
    setTimeout(() => {
      setSaving(false);
      setMessage({ type: "success", text: "Settings saved successfully!" });
    }, 1000);
  };

  const handleExportData = () => {
    // Export functionality would be implemented here
    alert("Data export functionality will be implemented here");
  };

  const handleImportData = () => {
    // Import functionality would be implemented here
    alert("Data import functionality will be implemented here");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">System Settings</h1>
        <p className="text-neutral-600 mt-1">Manage system-wide settings and configurations</p>
      </div>

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
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
          {message && (
            <div
              className={`p-3 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}
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
