import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Textarea } from '../../components/ui/textarea';
import Badge from '../../components/ui/Badge';
import { Upload, FileText, X, Clock, FileIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

// 1. UPDATED: Mock data with more than 10 items to test the limit
const ALL_POSTS = [
  { id: 1, title: "019__ Thesis Adviser Evaluation Form", date: "Dec 14, 2025 | 5:00 pm", isOverdue: true },
  { id: 2, title: "007__ Panel Comment Sheet", date: "Dec 12, 2025 | 5:00 pm", isOverdue: false },
  { id: 3, title: "Chapter III - Methodology", date: "Dec 12, 2025 | 5:00 pm", isOverdue: false },
  { id: 4, title: "01-LU-AA-FO-11-Thesis Advising Monitoring", date: "Dec 12, 2025 | 5:00 pm", isOverdue: false },
  { id: 5, title: "Chapter II Review of Related Literature", date: "Nov 14, 2025 | 5:00 pm", isOverdue: false },
  { id: 6, title: "Lesson 4 Writing the Components of Chapter III", date: "Nov 10, 2025 | 5:00 pm", isOverdue: false },
  { id: 7, title: "Chapter 1 Research Description", date: "Oct 28, 2025 | 1:00 pm", isOverdue: false },
  { id: 8, title: "Activity #3 Software Project Schedule", date: "Oct 23, 2025 | 1:00 pm", isOverdue: false },
  { id: 9, title: "Lesson 3 Writing the Components of Chapter II", date: "Oct 20, 2025 | 5:00 pm", isOverdue: false },
  { id: 10, title: "Thesis Proposal Outline/Template", date: "Oct 15, 2025 | 5:00 pm", isOverdue: false },
  { id: 11, title: "010__ LU AA-FO-10 Thesis Advising Form", date: "Sep 24, 2025 | 5:00 pm", isOverdue: false }, // Should be hidden
  { id: 12, title: "Initial Title Defense Result", date: "Sep 10, 2025 | 5:00 pm", isOverdue: false }, // Should be hidden
];

// Activity data mapping
const ACTIVITY_DATA: Record<string, { title: string; course: string; instructor: string; deadline: string; instructions: string }> = {
  'quiz-1': {
    title: "QUIZ #1",
    course: "PC 4122 - CS Thesis 1",
    instructor: "Joselle Banocnoc",
    deadline: "October 17, 2025 at 3:00 pm",
    instructions: "Complete the quiz within the specified time frame."
  },
  'eval-form': {
    title: "019__ Thesis Adviser Evaluation Form",
    course: "PC 4122 - CS Thesis 1",
    instructor: "Joselle Banocnoc",
    deadline: "December 14, 2025 at 5:00 pm",
    instructions: "Please accomplish the attached form and upload the signed document in pdf format here in iLearnU and..."
  },
  'panel-comment': {
    title: "007__ Panel Comment Sheet",
    course: "PC 4122 - CS Thesis 1",
    instructor: "Joselle Banocnoc",
    deadline: "December 12, 2025 at 5:00 pm",
    instructions: "Please upload the signed document in pdf format here in iLearnU and in the attached google drive folder..."
  }
};

export function SubmitEssayTab() {
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('activityId') || 'eval-form';
  
  const activityData = ACTIVITY_DATA[activityId] || ACTIVITY_DATA['eval-form'];
  
  const [activeTab, setActiveTab] = useState('my-work');
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
  // 2. UPDATED: Track if the assignment has been submitted to show the grade placeholder
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Maximum size is 10MB.");
        return;
      }
      setSelectedFile(file.name);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      setIsSubmitted(true);
    }
  };

  // 3. UPDATED: Logic to slice only the first 10 posts
  const displayedPosts = ALL_POSTS.slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto w-full font-sans">
      {/* Page Header */}
      <div className="mb-6 bg-success-default/10 border border-success-default/20 p-6 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-success-default text-white rounded-full">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{activityData.title}</h1>
            <p className="text-neutral-600 mt-1">{activityData.instructions}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            
            {/* 1. UPDATED: Custom styled tabs with bottom border indicator */}
            <TabsList className="flex w-fit bg-transparent p-0 rounded-none justify-start gap-2">
              <TabsTrigger 
                value="details"
                className="
                  w-fit rounded-none px-3 py-2 text-sm font-medium
                  text-neutral-500 hover:text-neutral-700
                  data-[state=active]:bg-white
                  data-[state=active]:text-primary
                  data-[state=active]:shadow-sm
                  bg-transparent shadow-none transition-all
                "
              >
                DETAILS
              </TabsTrigger>

              <TabsTrigger 
                value="my-work"
                className="
                  w-fit rounded-none px-3 py-2 text-sm font-medium
                  text-neutral-500 hover:text-neutral-700
                  data-[state=active]:bg-white
                  data-[state=active]:text-primary
                  data-[state=active]:shadow-sm
                  bg-transparent shadow-none transition-all
                "
              >
                MY WORK
              </TabsTrigger>
            </TabsList>



            {/* DETAILS TAB */}
            <TabsContent value="details">
              <Card className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-neutral-900 block">Course:</span>
                    <span className="text-neutral-600">{activityData.course}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900 block">Instructor:</span>
                    <span className="text-neutral-600">{activityData.instructor}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900 block">Term:</span>
                    <span className="text-neutral-600">Finals</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900 block">Deadline:</span>
                    <span className="text-danger-default font-medium">{activityData.deadline}</span>
                  </div>
                </div>
                <div className="border-t border-neutral-200 my-4"></div>
                <div className="prose text-neutral-700 text-sm">
                  <p>{activityData.instructions}</p>
                </div>
                {/* Attachment Example */}
                <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200 mt-4">
                  <h4 className="text-sm font-semibold text-neutral-900 mb-3">Attachments:</h4>
                  <div className="flex items-center gap-3 p-2 bg-white border border-neutral-200 rounded w-fit">
                    <div className="w-8 h-8 bg-success-default/10 rounded flex items-center justify-center text-success-default">
                      <FileIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-success-default underline cursor-pointer">
                      019__LU_AA-FO-19_Evaluation_Form.docx
                    </span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* MY WORK TAB */}
            <TabsContent value="my-work" className="space-y-6">
              
              {/* If NOT submitted, show the upload area */}
              {!isSubmitted ? (
                <Card className="p-6">
                  <h2 className="text-xl text-neutral-900 mb-4">Add Work</h2>
                  <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'file' | 'text')}>
                    <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                      <TabsTrigger value="file"><Upload className="w-4 h-4 mr-2" />File Upload</TabsTrigger>
                      <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Text Editor</TabsTrigger>
                    </TabsList>

                    <TabsContent value="file" className="space-y-4">
                      {!selectedFile ? (
                        <div className="border-2 border-dashed border-neutral-300 rounded-rd p-12 text-center hover:border-primary transition-colors relative">
                          <input 
                            type="file" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                          />
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                              <Upload className="w-8 h-8 text-primary" />
                            </div>
                            <p className="text-neutral-900">Drop your file here or click to browse</p>
                            <p className="text-xs text-danger-default">* Maximum size 10MB</p>
                            <Button className="mt-2 pointer-events-none bg-primary">Choose File</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-neutral-200 rounded-rd p-4 flex items-center justify-between">
                          <span className="text-sm font-medium">{selectedFile}</span>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="text">
                      <Textarea placeholder="Type your submission..." className="min-h-[300px]" />
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 flex justify-end gap-3">
                     <Button variant="outline">Save Draft</Button>
                     <Button 
                       className="bg-primary hover:bg-primary-300" 
                       disabled={!selectedFile && uploadMode === 'file'}
                       onClick={handleSubmit}
                     >
                       Submit Assignment
                     </Button>
                  </div>
                </Card>
              ) : (
                // If SUBMITTED, show the success state + Grade Placeholder
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="p-6 flex items-center justify-between bg-success-default/5 border-success-default/20">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-success-default rounded-full flex items-center justify-center text-white">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{selectedFile || "Essay Submission"}</p>
                          <p className="text-xs text-neutral-500">Submitted just now</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsSubmitted(false)}>Resubmit</Button>
                        <Badge className="bg-success-default text-white">Submitted</Badge>
                     </div>
                  </Card>

                  {/* 2. UPDATED: Grade Placeholder - Only appears when submitted */}
                  <div className="text-center py-10 text-neutral-400 text-sm">
                    <div className="flex justify-center mb-3">
                      <div className="w-8 h-8 rounded-full border-2 border-neutral-300 flex items-center justify-center">
                         <span className="font-serif font-bold text-lg">!</span>
                      </div>
                    </div>
                    Your grade for this work will appear here.
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-white shadow-sm border border-neutral-200 sticky top-4">
             <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
               <h3 className="font-semibold text-neutral-700 flex items-center gap-2">
                 <span className="text-lg">📰</span> Posts in PC 4122
               </h3>
             </div>
             
             {/* 3. UPDATED: Limit to 10 items */}
             <div className="divide-y divide-neutral-100">
               {displayedPosts.map((post) => (
                 <div key={post.id} className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer group">
                   <h4 className={`text-sm font-medium mb-1 group-hover:text-primary transition-colors ${post.isOverdue ? 'text-success-default' : 'text-neutral-800'}`}>
                     {post.title}
                   </h4>
                   <div className="flex items-center gap-1 text-xs">
                     <Clock className="w-3 h-3 text-neutral-400" />
                     <span className={post.isOverdue ? 'text-danger-default font-medium' : 'text-neutral-500'}>
                       {post.date}
                     </span>
                   </div>
                 </div>
               ))}
               
               {/* View All Button always visible at bottom */}
               <div className="p-4 text-center border-t border-neutral-100">
                 <Button variant="outline" className="w-full text-primary border-primary/20 hover:bg-primary/5">
                   View all posts
                 </Button>
               </div>
             </div>
          </Card>
        </div>

      </div>
    </div>
  );
}