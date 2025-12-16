import React, { useState, useEffect } from 'react';
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Slider } from '../../components/ui/slider';
import { Save, Download, Upload, User, Settings, AlertTriangle, BookOpen, FileText, Bell } from 'lucide-react';

// --- Reusable Scrollable Section Component ---
const ScrollableSection = ({ id, title, icon: Icon, children }: { id: string, title: string, icon: React.ElementType, children: React.ReactNode }) => (
  <Card id={id} className="p-6 scroll-mt-20">
    <h2 className="text-xl text-neutral-900 mb-4 flex items-center border-b pb-2">
      <Icon className="w-5 h-5 mr-2" />
      {title}
    </h2>
    {children}
  </Card>
);


// --- Section Components (No changes needed here) ---

const ProfileInformation = ({ id }: { id: string }) => (
  <ScrollableSection id={id} title="Profile Information" icon={User}>
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first-name">First Name</Label>
          <Input id="first-name" type="text" className="mt-1" defaultValue="Alex" />
        </div>
        <div>
          <Label htmlFor="last-name">Last Name</Label>
          <Input id="last-name" type="text" className="mt-1" defaultValue="Johnson" />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" type="email" className="mt-1" defaultValue="alex.johnson@example.com" disabled />
        <p className="text-sm text-neutral-500 mt-1">Contact your administrator to change your email address.</p>
      </div>
      <div>
        <Label htmlFor="institution">Institution/Organization</Label>
        <Input id="institution" type="text" className="mt-1" defaultValue="State University" />
      </div>
      <div className="flex justify-end pt-2">
        <Button className="bg-primary hover:bg-primary-300">
          <Save className="w-4 h-4 mr-2" />
          Update Profile
        </Button>
      </div>
    </div>
  </ScrollableSection>
);

const AIAssessmentSettings = ({ id }: { id: string }) => (
  <ScrollableSection id={id} title="AI Evaluation Settings" icon={Settings}>
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
  </ScrollableSection>
);

const ThresholdSettings = ({ id }: { id: string }) => (
  <ScrollableSection id={id} title="Thresholds for Warnings" icon={AlertTriangle}>
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
  </ScrollableSection>
);

const RubricDefaults = ({ id }: { id: string }) => (
  <ScrollableSection id={id} title="Rubric Defaults" icon={BookOpen}>
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
  </ScrollableSection>
);

const DataManagement = ({ id }: { id: string }) => (
  <div id={id} className='space-y-8 scroll-mt-20'> 
    {/* Batch Upload Formats */}
    <Card className="p-6">
      <h2 className="text-xl text-neutral-900 mb-4 flex items-center border-b pb-2">
        <Upload className="w-5 h-5 mr-2" />
        Batch Upload Formats
      </h2>
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
      <h2 className="text-xl text-neutral-900 mb-4 flex items-center border-b pb-2">
        <FileText className="w-5 h-5 mr-2" />
        Export Reports
      </h2>
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
  </div>
);

const NotificationSettings = ({ id }: { id: string }) => (
  <ScrollableSection id={id} title="Notification Settings" icon={Bell}>
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
  </ScrollableSection>
);


// --- Navigation Array and Main Component ---

const settingsNavigation = [
  { id: 'profile', name: 'Profile Information', icon: User, Component: ProfileInformation },
  { id: 'ai-assessment', name: 'AI Assessment', icon: Settings, Component: AIAssessmentSettings },
  { id: 'thresholds', name: 'Warning Thresholds', icon: AlertTriangle, Component: ThresholdSettings },
  { id: 'rubric', name: 'Rubric Defaults', icon: BookOpen, Component: RubricDefaults },
  { id: 'data', name: 'Data Management', icon: Upload, Component: DataManagement },
  { id: 'notifications', name: 'Notifications', icon: Bell, Component: NotificationSettings },
];

export function SettingsTab() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isScrollingManually, setIsScrollingManually] = useState(false); // New state to control Scrollspy
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  // Scrollspy logic using Intersection Observer
  useEffect(() => {
    // Only set up the observer if it hasn't been created yet
    if (!observerRef.current) {
        // Use the main scrollable container in TeacherLayout as the observer root
        const scrollContainer = document.querySelector('main');

        const observerOptions: IntersectionObserverInit = {
          // Observe within the main scroll container instead of the window
          root: scrollContainer as Element | null,
          // Trigger intersection when the section is near the top of the viewport
          rootMargin: '-10% 0px -85% 0px',
          threshold: 0,
        };

        observerRef.current = new IntersectionObserver((entries) => {
          // If we are currently executing a manual scroll (from a button click),
          // or if no elements are intersecting, do nothing.
          if (isScrollingManually || entries.every(entry => !entry.isIntersecting)) {
              return;
          }
          
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setActiveTab(entry.target.id);
            }
          });
        }, observerOptions);

        // Attach observer to all section elements
        settingsNavigation.forEach(item => {
          const element = document.getElementById(item.id);
          if (element) {
            observerRef.current?.observe(element);
          }
        });
    }

    // Cleanup function
    return () => {
      // Clean up observer on component unmount
      observerRef.current?.disconnect();
    };
  }, [isScrollingManually]); // Depend on isScrollingManually to potentially re-evaluate logic

  // Click handler for smooth scrolling within the main scroll container
  const handleNavClick = (id: string) => {
    // 1. Start the manual scroll process
    setIsScrollingManually(true);

    const scrollContainer = document.querySelector('main');
    const targetElement = document.getElementById(id);

    if (scrollContainer && targetElement) {
      const containerRect = (scrollContainer as HTMLElement).getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      // Calculate the scroll position so that the target is aligned near the top
      const offsetTop =
        targetRect.top - containerRect.top + (scrollContainer as HTMLElement).scrollTop - 16; // small padding

      (scrollContainer as HTMLElement).scrollTo({
        top: offsetTop,
        behavior: 'smooth',
      });
    }
    
    // 3. Set a timeout to end the manual scroll lock
    // The duration (400ms) should be slightly longer than the smooth scroll animation
    const scrollDuration = 400; 

    setTimeout(() => {
      // 4. End the manual scroll process, allowing the Intersection Observer to resume
      setIsScrollingManually(false);
      
      // Optional: Ensure the correct tab is highlighted after the scroll finishes
      setActiveTab(id);
      
      // Optional: Update URL hash
      window.history.pushState(null, '', `#${id}`);
    }, scrollDuration);
  };
  
  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8"> 
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage user profile, AI evaluation, and system preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Side Navigation (Left Column) - Sticky and highlighting active tab */}
        <div className="lg:w-1/4">
          <Card className="p-4 sticky top-6">
            <nav className="space-y-1">
              {settingsNavigation.map((item) => {
                const isActive = item.id === activeTab;
                const activeClasses = 'bg-neutral-100 text-primary-600 font-semibold';
                const inactiveClasses = 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900';
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-md transition-colors duration-150 ${
                      isActive ? activeClasses : inactiveClasses
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span className="text-sm text-left">{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Content Area (Right Column) - All components rendered sequentially */}
        <div className="lg:w-3/4 space-y-8">
          {/* Render components, using the common ID pattern */}
          {settingsNavigation.map((item) => (
            <item.Component key={item.id} id={item.id} />
          ))}

          {/* Persistent Save/Reset Actions */}
          <div className="flex justify-end gap-2 pb-6 pt-4">
            <Button variant="outline">Reset to Defaults</Button>
            <Button className="bg-primary hover:bg-primary-300">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}