import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Save, Download } from 'lucide-react';

export function StudentSettingsTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profile Information */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-white text-2xl">
              E
            </div>
            <Button variant="outline" size="sm">Change Avatar</Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first-name">First Name</Label>
              <Input id="first-name" defaultValue="Emma" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="last-name">Last Name</Label>
              <Input id="last-name" defaultValue="Wilson" className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="student-id">Student ID</Label>
            <Input id="student-id" defaultValue="STU001" className="mt-1" disabled />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" defaultValue="emma.wilson@example.com" className="mt-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="program">Current Program</Label>
              <Input id="program" defaultValue="Computer Science 101" className="mt-1" disabled />
            </div>
            <div>
              <Label htmlFor="section">Section</Label>
              <Input id="section" defaultValue="Section A" className="mt-1" disabled />
            </div>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="notify-evaluation">Essay Evaluated</Label>
              <p className="text-sm text-neutral-500 mt-1">Notify me when AI evaluation is complete</p>
            </div>
            <Switch id="notify-evaluation" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="notify-feedback">Teacher Feedback</Label>
              <p className="text-sm text-neutral-500 mt-1">Notify me when teacher adds feedback</p>
            </div>
            <Switch id="notify-feedback" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="notify-revision">Revision Requested</Label>
              <p className="text-sm text-neutral-500 mt-1">Notify me when revision is requested</p>
            </div>
            <Switch id="notify-revision" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="notify-deadline">Deadline Reminders</Label>
              <p className="text-sm text-neutral-500 mt-1">Send reminders for upcoming deadlines</p>
            </div>
            <Switch id="notify-deadline" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="notify-email">Email Notifications</Label>
              <p className="text-sm text-neutral-500 mt-1">Also send notifications to my email</p>
            </div>
            <Switch id="notify-email" />
          </div>
        </div>
      </Card>

      {/* Submission Preferences */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Submission Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="auto-ai-eval">Auto AI Evaluation</Label>
              <p className="text-sm text-neutral-500 mt-1">Automatically request AI evaluation on submission</p>
            </div>
            <Switch id="auto-ai-eval" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="allow-resubmit">Allow Resubmission</Label>
              <p className="text-sm text-neutral-500 mt-1">Enable revision and resubmission by default</p>
            </div>
            <Switch id="allow-resubmit" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="save-drafts">Auto-Save Drafts</Label>
              <p className="text-sm text-neutral-500 mt-1">Automatically save essay drafts while writing</p>
            </div>
            <Switch id="save-drafts" defaultChecked />
          </div>

          <div>
            <Label htmlFor="default-format">Default Submission Format</Label>
            <select id="default-format" className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd">
              <option>DOCX (Microsoft Word)</option>
              <option>PDF</option>
              <option>TXT (Plain Text)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Display Preferences */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Display Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="show-scores">Show Scores Immediately</Label>
              <p className="text-sm text-neutral-500 mt-1">Display AI scores as soon as evaluation completes</p>
            </div>
            <Switch id="show-scores" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="detailed-feedback">Detailed Feedback View</Label>
              <p className="text-sm text-neutral-500 mt-1">Show detailed breakdown by default</p>
            </div>
            <Switch id="detailed-feedback" defaultChecked />
          </div>

          <div>
            <Label htmlFor="dashboard-view">Default Dashboard View</Label>
            <select id="dashboard-view" className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd">
              <option>Overview</option>
              <option>Recent Activity</option>
              <option>Progress Charts</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Download Options */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Download AI Feedback</h2>
        <p className="text-sm text-neutral-500 mb-4">Export your AI feedback and progress reports</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download Latest Feedback (PDF)
          </Button>
          <Button variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download Progress Report (PDF)
          </Button>
          <Button variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download All Essays (ZIP)
          </Button>
        </div>
      </Card>

      {/* Privacy & Security */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Privacy & Security</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="current-password">Change Password</Label>
            <Input id="current-password" type="password" placeholder="Current password" className="mt-1" />
            <Input type="password" placeholder="New password" className="mt-2" />
            <Input type="password" placeholder="Confirm new password" className="mt-2" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="data-sharing">Share Progress with Teacher</Label>
              <p className="text-sm text-neutral-500 mt-1">Allow teachers to view your progress analytics</p>
            </div>
            <Switch id="data-sharing" defaultChecked />
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pb-6">
        <Button variant="outline" className="flex-1 sm:flex-none">
          Reset to Defaults
        </Button>
        <Button className="flex-1 bg-primary hover:bg-primary-300">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>

      {/* Account Actions */}
      <Card className="p-6 border-error-default/20">
        <h2 className="text-xl text-neutral-900 mb-3">Account Actions</h2>
        <div className="space-y-3">
          <Button variant="outline" className="w-full sm:w-auto text-error-default hover:text-error-default border-error-default/30">
            Request Account Data Export
          </Button>
        </div>
      </Card>
    </div>
  );
}
