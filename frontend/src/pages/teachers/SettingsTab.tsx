import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Slider } from '../../components/ui/slider';
import { Save, Download, Upload } from 'lucide-react';

export function SettingsTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Configure AI evaluation and system preferences</p>
      </div>

      {/* AI Evaluation Settings */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">AI Evaluation Settings</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="enable-grammar">Enable Grammar Analysis</Label>
              <p className="text-sm text-neutral-500 mt-1">Automatically check grammar and mechanics</p>
            </div>
            <Switch id="enable-grammar" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="enable-coherence">Enable Coherence Analysis</Label>
              <p className="text-sm text-neutral-500 mt-1">Analyze logical flow and organization</p>
            </div>
            <Switch id="enable-coherence" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="enable-plagiarism">Enable Plagiarism Detection</Label>
              <p className="text-sm text-neutral-500 mt-1">Check for originality and proper citations</p>
            </div>
            <Switch id="enable-plagiarism" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="enable-vocabulary">Enable Vocabulary Analysis</Label>
              <p className="text-sm text-neutral-500 mt-1">Assess vocabulary complexity and usage</p>
            </div>
            <Switch id="enable-vocabulary" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="enable-structure">Enable Structure Analysis</Label>
              <p className="text-sm text-neutral-500 mt-1">Evaluate essay organization and structure</p>
            </div>
            <Switch id="enable-structure" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="auto-evaluate">Auto-Evaluate on Submission</Label>
              <p className="text-sm text-neutral-500 mt-1">Run AI evaluation immediately after essay submission</p>
            </div>
            <Switch id="auto-evaluate" />
          </div>
        </div>
      </Card>

      {/* Threshold Settings */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Thresholds for Warnings</h2>
        <div className="space-y-6">
          <div>
            <Label htmlFor="threshold-grammar">Grammar Warning Threshold</Label>
            <p className="text-sm text-neutral-500 mb-3">Show warning if grammar score falls below this percentage</p>
            <div className="flex items-center gap-4">
              <Slider id="threshold-grammar" defaultValue={[70]} max={100} step={5} className="flex-1" />
              <Input type="number" defaultValue="70" className="w-20 text-center" />
            </div>
          </div>

          <div>
            <Label htmlFor="threshold-coherence">Coherence Warning Threshold</Label>
            <p className="text-sm text-neutral-500 mb-3">Show warning if coherence score falls below this percentage</p>
            <div className="flex items-center gap-4">
              <Slider id="threshold-coherence" defaultValue={[65]} max={100} step={5} className="flex-1" />
              <Input type="number" defaultValue="65" className="w-20 text-center" />
            </div>
          </div>

          <div>
            <Label htmlFor="threshold-plagiarism">Plagiarism Risk Threshold</Label>
            <p className="text-sm text-neutral-500 mb-3">Flag essays with plagiarism similarity above this percentage</p>
            <div className="flex items-center gap-4">
              <Slider id="threshold-plagiarism" defaultValue={[15]} max={100} step={5} className="flex-1" />
              <Input type="number" defaultValue="15" className="w-20 text-center" />
            </div>
          </div>

          <div>
            <Label htmlFor="threshold-vocabulary">Minimum Vocabulary Level</Label>
            <p className="text-sm text-neutral-500 mb-3">Show warning if vocabulary complexity is below this level (1-10)</p>
            <div className="flex items-center gap-4">
              <Slider id="threshold-vocabulary" defaultValue={[5]} max={10} step={1} className="flex-1" />
              <Input type="number" defaultValue="5" className="w-20 text-center" />
            </div>
          </div>
        </div>
      </Card>

      {/* Rubric Defaults */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Rubric Defaults</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="default-rubric">Default Rubric Template</Label>
            <select id="default-rubric" className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd">
              <option>Standard Essay Rubric</option>
              <option>Technical Writing Rubric</option>
              <option>Creative Writing Rubric</option>
              <option>None</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="auto-apply">Auto-Apply to New Programs</Label>
              <p className="text-sm text-neutral-500 mt-1">Automatically assign default rubric to new programs</p>
            </div>
            <Switch id="auto-apply" />
          </div>
        </div>
      </Card>

      {/* Batch Upload Formats */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Batch Upload Formats</h2>
        <div className="space-y-4">
          <div>
            <Label>Supported File Formats</Label>
            <div className="flex gap-2 mt-2">
              <span className="px-3 py-1 bg-neutral-100 rounded-rd text-sm text-neutral-600">.csv</span>
              <span className="px-3 py-1 bg-neutral-100 rounded-rd text-sm text-neutral-600">.xlsx</span>
              <span className="px-3 py-1 bg-neutral-100 rounded-rd text-sm text-neutral-600">.xls</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Template (Programs)
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Template (Students)
            </Button>
          </div>
        </div>
      </Card>

      {/* Export Reports */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Export Reports</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="report-type">Report Type</Label>
              <select id="report-type" className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd">
                <option>Student Performance</option>
                <option>AI Metrics Summary</option>
                <option>Program Overview</option>
                <option>Essay Submissions</option>
              </select>
            </div>
            <div>
              <Label htmlFor="report-format">Format</Label>
              <select id="report-format" className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd">
                <option>PDF</option>
                <option>CSV</option>
                <option>Excel (.xlsx)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date-from">Date From</Label>
              <Input id="date-from" type="date" className="mt-1" defaultValue="2025-01-01" />
            </div>
            <div>
              <Label htmlFor="date-to">Date To</Label>
              <Input id="date-to" type="date" className="mt-1" defaultValue="2025-12-13" />
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary-300">
            <Download className="w-4 h-4 mr-2" />
            Generate & Export Report
          </Button>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Notification Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="notify-submission">New Essay Submissions</Label>
              <p className="text-sm text-neutral-500 mt-1">Notify when students submit new essays</p>
            </div>
            <Switch id="notify-submission" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="notify-evaluation">AI Evaluation Completed</Label>
              <p className="text-sm text-neutral-500 mt-1">Notify when AI finishes evaluating an essay</p>
            </div>
            <Switch id="notify-evaluation" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="notify-warnings">Student Performance Warnings</Label>
              <p className="text-sm text-neutral-500 mt-1">Alert when students fall below thresholds</p>
            </div>
            <Switch id="notify-warnings" defaultChecked />
          </div>
        </div>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end gap-2 pb-6">
        <Button variant="outline">Reset to Defaults</Button>
        <Button className="bg-primary hover:bg-primary-300">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
