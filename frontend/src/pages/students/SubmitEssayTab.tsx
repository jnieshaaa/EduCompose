import { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import Badge from '../../components/ui/Badge';
import { Upload, FileText, Save, Send, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export function SubmitEssayTab() {
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-neutral-900">Submit Essay</h1>
        <p className="text-sm text-neutral-500 mt-1">Upload your essay and get AI-powered feedback</p>
      </div>

      {/* Instructions Card */}
      <Card className="p-6 bg-info-default/5 border-info-default/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="text-neutral-900 mb-2">Before you submit:</h3>
            <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
              <li>Make sure your essay meets the minimum word count requirement</li>
              <li>Check that you've included proper citations if required</li>
              <li>Review your work for obvious errors before submission</li>
              <li>Supported formats: DOCX, PDF, TXT (or use the text editor)</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Essay Details */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Essay Details</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="essay-title">Essay Title *</Label>
            <Input 
              id="essay-title" 
              placeholder="e.g., The Impact of Climate Change on Coastal Communities" 
              className="mt-1" 
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="program">Program *</Label>
              <select id="program" className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd">
                <option value="">Select Program</option>
                <option>Computer Science 101</option>
                <option>Data Structures</option>
                <option>Web Development</option>
                <option>Machine Learning</option>
                <option>Database Systems</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="section">Section *</Label>
              <select id="section" className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd">
                <option value="">Select Section</option>
                <option>Section A</option>
                <option>Section B</option>
                <option>Section C</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="assignment">Assignment / Topic</Label>
            <Input 
              id="assignment" 
              placeholder="e.g., Week 5 Essay Assignment" 
              className="mt-1" 
            />
          </div>
        </div>
      </Card>

      {/* Upload Options */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Upload Your Essay</h2>
        
        <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'file' | 'text')}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="file">
              <Upload className="w-4 h-4 mr-2" />
              File Upload
            </TabsTrigger>
            <TabsTrigger value="text">
              <FileText className="w-4 h-4 mr-2" />
              Text Editor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            {!selectedFile ? (
              <div className="border-2 border-dashed border-neutral-300 rounded-rd p-12 text-center hover:border-primary transition-colors cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-neutral-900 mb-1">Drop your file here or click to browse</p>
                    <p className="text-sm text-neutral-500">Supported formats: DOCX, PDF, TXT (Max 10MB)</p>
                  </div>
                  <Button className="mt-2 bg-primary hover:bg-primary-300">
                    Choose File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border border-success-default/30 bg-success-default/5 rounded-rd p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-success-default/10 rounded-rd flex items-center justify-center">
                      <FileText className="w-5 h-5 text-success-default" />
                    </div>
                    <div>
                      <p className="text-neutral-900">{selectedFile}</p>
                      <p className="text-sm text-neutral-500">2.4 MB • Ready to submit</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-rd">
              <input type="checkbox" id="resubmit-allowed" className="rounded" />
              <Label htmlFor="resubmit-allowed" className="text-sm text-neutral-600 cursor-pointer">
                Allow me to revise and resubmit this essay after feedback
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div>
              <Label htmlFor="essay-content">Essay Content</Label>
              <Textarea 
                id="essay-content"
                placeholder="Paste or type your essay here..."
                className="mt-1 min-h-[400px] font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-neutral-500">Word count: 0</p>
                <p className="text-sm text-neutral-500">Character count: 0</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-rd">
              <input type="checkbox" id="resubmit-allowed-text" className="rounded" />
              <Label htmlFor="resubmit-allowed-text" className="text-sm text-neutral-600 cursor-pointer">
                Allow me to revise and resubmit this essay after feedback
              </Label>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Submission Options */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Submission Options</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-rd">
            <input type="checkbox" id="ai-evaluate" className="rounded" defaultChecked />
            <Label htmlFor="ai-evaluate" className="text-sm text-neutral-600 cursor-pointer">
              Request AI evaluation immediately after submission
            </Label>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-rd">
            <input type="checkbox" id="notify-completion" className="rounded" defaultChecked />
            <Label htmlFor="notify-completion" className="text-sm text-neutral-600 cursor-pointer">
              Notify me when AI evaluation is complete
            </Label>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pb-6">
        <Button variant="outline" className="flex-1 sm:flex-none">
          <Save className="w-4 h-4 mr-2" />
          Save as Draft
        </Button>
        <Button className="flex-1 bg-primary hover:bg-primary-300">
          <Send className="w-4 h-4 mr-2" />
          Submit Essay for Evaluation
        </Button>
      </div>

      {/* Status Indicators Info */}
      <Card className="p-6 bg-neutral-50">
        <h3 className="text-neutral-900 mb-3">Submission Status Guide</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-info-default text-white">Submitted</Badge>
            <span className="text-sm text-neutral-600">Received by system</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-warning-default text-white">Evaluating</Badge>
            <span className="text-sm text-neutral-600">AI is analyzing</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-success-default text-white">Reviewed</Badge>
            <span className="text-sm text-neutral-600">Feedback ready</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
