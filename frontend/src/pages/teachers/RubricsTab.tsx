import { useState } from 'react';
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input"; 
import { Label } from '../../components/ui/label';

import { 
  Plus, Upload, FileCheck, Edit, // Icons for creation options
  MoreVertical, X, Settings, ClipboardList, Check, Trash2, // Utility Icons
} from 'lucide-react';

// --- DATA IMPORTS (MOCK DATA ASSUMPTIONS) ---
// Assuming these types and data are available in the project structure
import type { RubricTemplate } from '../../data/rubricsData';
import { initialSavedRubrics } from '../../data/rubricsData';
import { initialProgramsData } from '../../data/programsData';

const platformRubrics: (RubricTemplate & { level?: string })[] = [
    { id: 101, name: 'Alabama ACAP ELA Informative/Explanatory Rubric (Grades 4-5)', criteria: 3, programs: 8, lastUsed: '2025-12-10', level: 'Elementary' },
    { id: 102, name: 'Alabama ACAP ELA Narrative Rubric (Grades 7-8)', criteria: 4, programs: 3, lastUsed: '2025-12-08', level: 'Middleschool' },
    { id: 103, name: 'Alaska AK STAR ELA Constructed Response Rubric (Grade 9)', criteria: 5, programs: 2, lastUsed: '2025-12-05', level: 'Highschool' },
    { id: 104, name: 'AP Comparative Government and Politics Argument Essay Rubric', criteria: 4, programs: 1, lastUsed: '2025-12-01', level: 'Highschool' },
];

// --- VIEW TYPES ---
type RubricView = 'list' | 'options';
type BuilderMode = 'upload' | 'template' | 'ai' | 'scratch' | null;

// --- UTILITY COMPONENTS ---

// Component for the empty state illustration (Unchanged)
const EmptyRubricState = ({ handleCreateClick }: { handleCreateClick: () => void }) => (
    <div className="flex flex-col items-center justify-center py-20">
        <div className="relative p-6 bg-purple-50 rounded-full mb-6">
            <ClipboardList className="w-16 h-16 text-purple-400" />
            <Check className="w-6 h-6 text-green-500 absolute bottom-6 right-6 bg-white rounded-full p-0.5 border border-white" />
        </div>
        <p className="text-neutral-500 mb-2">You haven't created any rubrics yet.</p>
        <button 
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            onClick={handleCreateClick}
        >
            Create new rubric
        </button>
    </div>
);

// Component for the creation options (Step 2) (Unchanged)
const RubricCreationOptions = ({ selectedMode, setMode }: { selectedMode: BuilderMode, setMode: (mode: BuilderMode) => void }) => {
    
    const options: { icon: any, title: string, mode: BuilderMode }[] = [
        { icon: Upload, title: 'Upload or import', mode: 'upload' },
        { icon: FileCheck, title: 'Build from an existing template', mode: 'template' },
        { icon: Edit, title: 'Build from scratch', mode: 'scratch' },
        // Assuming there might be an 'AI' mode placeholder
        // { icon: Sparkles, title: 'Build with AI', mode: 'ai' }, 
    ];

    return (
        <div className="grid grid-cols-4 gap-4 pb-4 border-b border-neutral-200 mb-6">
            {options.map((option) => (
                <Card 
                    key={option.mode} 
                    className={`p-4 flex flex-col items-center text-center cursor-pointer transition-colors border shadow-sm h-32 justify-center
                        ${option.mode === selectedMode ? 'border-primary-500 bg-purple-50 ring-2 ring-primary-500/50' : 'hover:bg-neutral-50'}
                    `}
                    onClick={() => setMode(option.mode)}
                >
                    <option.icon className="w-6 h-6 text-primary mb-2" />
                    <h3 className="text-sm font-medium text-neutral-900 whitespace-nowrap">{option.title}</h3>
                </Card>
            ))}
        </div>
    );
};


// --- SCRATCH MODE STEP 1 (Details Configuration) ---
const ScratchStepOne = ({ selectedProgram, setSelectedProgram }: { selectedProgram: string, setSelectedProgram: (program: string) => void }) => (
    <div className="space-y-6">
        <p className="text-lg font-medium">Configure basic settings before building your criteria.</p>
        <div className="space-y-6 border p-4 rounded-lg">
            <h4 className="text-lg font-semibold">Rubric Details</h4>
            
            {/* Student Level (Added back for completeness based on screenshot) */}
            <div>
                <Label className="font-medium">Student level *</Label>
                <p className="text-sm text-neutral-500 mb-2">The student level this rubric is for</p>
                <div className="flex gap-2 flex-wrap">
                    <Badge className="bg-green-500/10 text-green-700 border border-green-700">Elementary</Badge>
                    <Badge className="bg-red-500/10 text-red-700 border border-red-700">Middle School</Badge>
                    <Badge className="bg-blue-500/10 text-blue-700 border border-blue-700">High School</Badge>
                    <Badge className="bg-purple-500/10 text-purple-700 border border-purple-700">College</Badge>
                </div>
            </div>

            <div>
                <Label className="font-medium">Grading intensity *</Label>
                <p className="text-sm text-neutral-500 mb-2">Control how strict or lenient the grading should be.</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">Easy</Button>
                    <Button size="sm" className="bg-primary-300 text-white">Normal</Button>
                    <Button variant="outline" size="sm">Strict</Button>
                </div>
            </div>

            <div>
                <Label className="font-medium">Program *</Label>
                <p className="text-sm text-neutral-500 mb-2">This rubric will be available for courses within the selected program(s).</p>
                <div className="flex gap-2 flex-wrap">
                    {initialProgramsData.map(program => (
                        <Button 
                            key={program.id}
                            size="sm" 
                            variant={selectedProgram === program.name ? 'primary' : 'outline'} 
                            className={selectedProgram === program.name ? 'bg-primary-300 text-white hover:bg-primary-400' : ''}
                            onClick={() => setSelectedProgram(program.name)}
                        >
                            {program.name}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// Located inside RubricsTab.tsx

// Define the structure for a Score Level (Used for initial state and adding)
const initialScoreLevels = [
  { id: 1, title: 'Excellent', points: 4, description: 'Ex: Supports the central claim and reasons with strong facts, thorough details, and accurate citations.' },
  { id: 2, title: 'Proficient', points: 3, description: 'Ex: Supports the central claim with facts and details, but may lack thoroughness or accurate citations.' },
];

// Define the structure for a Criteria Row
const initialCriteria = [
  { id: 1, title: 'Evidence', scores: initialScoreLevels },
  { id: 2, title: 'Organization', scores: [{ id: 1, title: 'Excellent', points: 4, description: 'Clear structure.' }] },
];

// --- NEW COMPONENT: Rubric Preview Table ---
const RubricPreviewTable = ({ criteriaList }: { criteriaList: typeof initialCriteria }) => {
  // Collect all unique score titles for the table header, ordered by points descending
  const allScoreTitles = criteriaList.flatMap(c => c.scores.map(s => ({ title: s.title, points: s.points })));
  const uniqueScoreTitles = Array.from(new Map(allScoreTitles.map(item => [item.title, item])).values())
      .sort((a, b) => b.points - a.points); // Sort by points descending

  // Determine the highest number of points to set the maximum columns
  const maxPoints = Math.max(...uniqueScoreTitles.map(t => t.points), 0);
  const pointHeaders = Array.from({ length: maxPoints + 1 }, (_, i) => i).reverse(); // [4, 3, 2, 1, 0] if max is 4

  return (
      <div className="border border-neutral-200 rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
              <thead>
                  <tr className="bg-neutral-50 text-neutral-600">
                      <th className="px-4 py-3 text-left text-sm font-semibold uppercase w-1/4">Criteria</th>
                      <th colSpan={maxPoints + 1} className="px-4 py-3 text-left text-sm font-semibold uppercase">Grade and Descriptors</th>
                  </tr>
                  <tr className="bg-neutral-50 text-neutral-600">
                      <th className="px-4 py-1 text-left text-xs font-medium uppercase w-1/4"></th>
                      {pointHeaders.map(point => (
                          <th key={point} className="px-4 py-1 text-center text-xs font-medium uppercase border-l border-neutral-200">
                              {point}
                          </th>
                      ))}
                  </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                  {criteriaList.map((criteria, rowIndex) => (
                      <tr key={criteria.id}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 w-1/4">
                              {criteria.title}
                          </td>
                          {/* Render score cells based on maxPoints */}
                          {pointHeaders.map(point => {
                              const scoreMatch = criteria.scores.find(score => score.points === point);
                              return (
                                  <td 
                                      key={`${criteria.id}-${point}`} 
                                      className="px-4 py-4 text-sm text-neutral-500 text-center border-l border-neutral-200"
                                  >
                                      {/* Display descriptor or points here. Displaying points for simplicity, matching screenshot. */}
                                      {scoreMatch ? scoreMatch.points : ''}
                                  </td>
                              );
                          })}
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
  );
};


// --- UPDATED SCRATCH MODE STEP 2 (Criteria Builder) ---
const ScratchStepTwo = () => {
  // State to manage criteria rows
  const [criteriaList, setCriteriaList] = useState(initialCriteria);
  // NEW STATE: To manage the active sub-tab (Create or Preview)
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'preview'>('create');


  // --- Criteria Row Handlers ---
  const handleAddCriteria = () => {
      const newId = criteriaList.length > 0 ? criteriaList[criteriaList.length - 1].id + 1 : 1;
      const newCriteria = {
          id: newId,
          title: `Criteria ${newId}`,
          // Start with a default set of score levels for the new row
          scores: [{ id: 1, title: 'Excellent', points: 4, description: '' }],
      };
      setCriteriaList([...criteriaList, newCriteria]);
  };

  const handleDeleteCriteria = (criteriaId: number) => {
      setCriteriaList(criteriaList.filter(c => c.id !== criteriaId));
      // If criteria list becomes empty, consider showing a default state if needed.
  };

  // --- Score Level Column Handlers ---
  const handleAddScoreLevel = (criteriaId: number) => {
      setCriteriaList(criteriaList.map(criteria => {
          if (criteria.id === criteriaId) {
              const newScoreId = criteria.scores.length > 0 ? criteria.scores[criteria.scores.length - 1].id + 1 : 1;
              // Default new score is typically 0 points
              const newScore = { id: newScoreId, title: 'New Level', points: 0, description: '' };
              return { ...criteria, scores: [...criteria.scores, newScore] };
          }
          return criteria;
      }));
  };

  const handleDeleteScoreLevel = (criteriaId: number, scoreId: number) => {
      setCriteriaList(criteriaList.map(criteria => {
          if (criteria.id === criteriaId) {
              const updatedScores = criteria.scores.filter(s => s.id !== scoreId);
              return { ...criteria, scores: updatedScores };
          }
          return criteria;
      }));
  };
  
  // --- Render logic ---
  return (
      <div className="space-y-6">
          {/* Details Summary (Unchanged) */}
          <div className="space-y-2 border-b pb-4">
              <h4 className="text-xl font-semibold">Details</h4>
              <div className="flex flex-col gap-2 text-sm text-neutral-600">
                  {/* ... (Existing Details) ... */}
              </div>
          </div>

          {/* Rubric Name Input (Unchanged) */}
          <div>
              <Label htmlFor="rubric-name" className="font-medium">Rubric name *</Label>
              <Input id="rubric-name" placeholder="Name" className="mt-2" />
          </div>

          {/* Criteria Building Section */}
          <div className="mt-8 space-y-4">
              <div className="flex items-center gap-4">
                  {/* Create Tab Button */}
                  <Button 
                      size="sm"
                      variant={activeSubTab === 'create' ? 'primary' : 'outline'}
                      className={activeSubTab === 'create' ? 'bg-primary hover:bg-primary-300' : ''}
                      onClick={() => setActiveSubTab('create')}
                  >
                      Create
                  </Button>
                  
                  {/* Preview Tab Button */}
                  <Button 
                      size="sm"
                      variant={activeSubTab === 'preview' ? 'primary' : 'outline'}
                      className={activeSubTab === 'preview' ? 'bg-primary hover:bg-primary-300' : ''}
                      onClick={() => setActiveSubTab('preview')}
                  >
                      Preview
                  </Button>
                
              </div>
              
              {/* --- CONDITIONAL VIEW RENDERING --- */}
              {activeSubTab === 'create' ? (
                  // --- CREATE VIEW (Existing Criteria Builder Logic) ---
                  <div className="space-y-4">
                      {criteriaList.map((criteria) => (
                          <div key={criteria.id} className="border p-4 rounded-lg space-y-4">
                              {/* Criteria Title and Delete Button */}
                              <div className="flex items-center gap-2 border-b pb-2">
                                  <Input
                                      placeholder="Criteria Title - for example, Evidence"
                                      defaultValue={criteria.title}
                                      className="flex-grow font-medium"
                                      // onChange handler for title update would go here
                                  />
                                  <Button 
                                      variant="ghost" 
                                      className="shrink-0"
                                      onClick={() => handleDeleteCriteria(criteria.id)}
                                  >
                                      <Trash2 className="w-4 h-4 text-neutral-500" />
                                  </Button>
                              </div>

                              {/* Score Levels Container */}
                              <div className="flex gap-4 overflow-x-auto pb-2">
                                  {criteria.scores.map((score) => (
                                      <div key={score.id} className="w-64 flex-shrink-0"> 
                                          <div className="flex items-center gap-2 mb-2">
                                              <Input defaultValue={score.title} className="font-medium p-2 text-center flex-grow" />
                                              <Input type="number" defaultValue={score.points} className="w-12 text-center p-2" />
                                              <Button 
                                                  variant="ghost" 
                                                  className="p-0 h-auto w-auto shrink-0"
                                                  onClick={() => handleDeleteScoreLevel(criteria.id, score.id)}
                                              >
                                                  <Trash2 className="w-4 h-4 text-neutral-500" />
                                              </Button>
                                          </div>
                                          <textarea
                                              className="w-full p-2 border rounded-md text-sm h-32 resize-none"
                                              placeholder="Enter the requirements the student needs to demonstrate to get this grade."
                                              defaultValue={score.description}
                                          />
                                      </div>
                                  ))}

                                  {/* Add Score Level Column Button */}
                                  <div className="flex flex-col justify-end">
                                      <Button 
                                          variant="ghost" 
                                          className="p-2 h-auto w-auto self-end mb-2 border border-dashed border-neutral-300 hover:bg-neutral-100"
                                          onClick={() => handleAddScoreLevel(criteria.id)}
                                      >
                                          <Plus className="w-4 h-4 text-neutral-500" />
                                      </Button>
                                  </div>
                              </div>
                          </div>
                      ))}
                      
                      {/* Add Criteria Button */}
                      <Button 
                          variant="ghost" 
                          className="text-primary-600 hover:text-primary-700"
                          onClick={handleAddCriteria}
                      >
                          <Plus className="w-4 h-4 mr-1" /> Add Criteria
                      </Button>
                  </div>

              ) : (
                  // --- PREVIEW VIEW (New Table Component) ---
                  <RubricPreviewTable criteriaList={criteriaList} />
              )}

          </div>
      </div>
  );
};


// Component for the dynamic builder/form section (Full Width)
const RubricFormContent = ({ mode, setMode }: { mode: BuilderMode, setMode: (mode: BuilderMode) => void }) => {
    
    // State Management for Program Selection
    const [selectedProgram, setSelectedProgram] = useState('Computer Science');
    // State to manage the steps within 'scratch' mode
    const [scratchStep, setScratchStep] = useState<'details' | 'criteria'>('details');

    const getHeader = () => {
        if (mode === 'scratch') {
            return scratchStep === 'details' ? 'Details' : 'Build from scratch';
        }
        switch (mode) {
            case 'upload': return 'Upload or import';
            case 'template': return 'Select Template';
            default: return 'Configuration';
        }
    };

    const handleContinue = () => {
        if (mode === 'scratch' && scratchStep === 'details') {
            setScratchStep('criteria'); // Move to the criteria builder
        } else {
            // Handle final submission or other mode's continue/submit logic
            console.log('Continuing/Submitting Rubric...');
        }
    }

    const handleCancel = () => {
        if (mode === 'scratch' && scratchStep === 'criteria') {
             setScratchStep('details'); // Go back to details step
        } else {
            setMode(null); // Return to options view
        }
    };

    const getCancelButtonText = () => {
        return (mode === 'scratch' && scratchStep === 'criteria') ? 'Back' : 'Cancel';
    }

    const getSubmitButtonText = () => {
        if (mode === 'scratch' && scratchStep === 'details') {
            return 'Continue';
        }
        // Assuming 'Save Rubric' for upload/scratch final step, and 'Use Template' for template
        return mode === 'template' ? 'Use Template' : 'Save Rubric';
    }


    return (
        <div className="w-full mt-6 p-6 border rounded-lg shadow-md bg-white">
            <h3 className="text-2xl font-semibold text-neutral-900 mb-6">{getHeader()}</h3>
            
            {/* --- UPLOAD MODE --- */}
            {mode === 'upload' && (
              <div className="space-y-6">
                  <p className="text-neutral-600">Add your rubric file here and EssayGrader will turn it into a digital, ready-to-use rubric.</p>
                  
                  {/* Card made bigger (h-96, p-16) */}
                  <div className="border-2 border-dashed border-purple-300 bg-purple-50 p-16 text-center h-96 flex flex-col items-center justify-center">
                      <p className="text-neutral-500 mb-8 text-lg">Drop files here. <span className="text-primary-600 font-medium cursor-pointer hover:text-primary-700">browse files</span> or import from:</p>
                      <div className="flex gap-10 justify-center">
                          
                          {/* Icons are slightly bigger for the larger card */}
                          <div className="text-center">
                              <Upload className="w-8 h-8 text-primary-500 mx-auto" /> 
                              <p className="text-sm mt-2">My Device</p>
                          </div>
                          <div className="text-center">
                              <Settings className="w-8 h-8 text-primary-500 mx-auto" /> 
                              <p className="text-sm mt-2">Google Drive</p>
                          </div>
                          <div className="text-center">
                              <Check className="w-8 h-8 text-primary-500 mx-auto" /> 
                              <p className="text-sm mt-2">OneDrive</p>
                          </div>
                          <div className="text-center">
                              <X className="w-8 h-8 text-primary-500 mx-auto" /> 
                              <p className="text-sm mt-2">Webcam</p>
                          </div>
                      </div>
                  </div>
              </div>
          )}
            
            {/* --- SCRATCH MODE --- */}
            {mode === 'scratch' && (
                <>
                    {scratchStep === 'details' && (
                         <ScratchStepOne 
                            selectedProgram={selectedProgram}
                            setSelectedProgram={setSelectedProgram}
                         />
                    )}
                    {scratchStep === 'criteria' && (
                        <ScratchStepTwo />
                    )}
                </>
            )}

            {/* --- TEMPLATE MODE (Tab replaced with Dropdown) --- */}
            {mode === 'template' && (
              <div className="space-y-6">
                  <p className="text-neutral-600">Select an existing template from the library to begin building your new rubric.</p>
                  
                  <div className="border p-4 rounded-lg">
                      
                      {/* --- DROPDOWN REPLACEMENT for tabs --- */}
                      <div className="mb-4">
                          <label className="text-sm font-medium text-neutral-700 block mb-1">Rubric Source</label>
                          <select className="border border-neutral-300 rounded-md p-2 w-full">
                              <option value="platform">Platform Rubrics</option>
                              <option value="my">My Rubrics</option>
                          </select>
                      </div>
                      
                      <Input type="search" placeholder="Filter by rubric name" className="mb-4" />
                      
                      <div className="space-y-3">
                          {platformRubrics.slice(0, 3).map((rubric) => ( 
                              <Card key={rubric.id} className="p-4 flex justify-between items-center bg-neutral-50">
                                  <div>
                                      <h4 className="text-base text-neutral-900">{rubric.name}</h4>
                                      <p className="text-sm text-neutral-500 mt-1">US English</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <Badge className="bg-green-500/10 text-green-700 border border-green-700">{rubric.level}</Badge>
                                      <Button className="bg-primary hover:bg-primary-300">Select</Button>
                                  </div>
                              </Card>
                          ))}
                      </div>
                  </div>
              </div>
          )}

            {/* --- FOOTER BUTTONS --- */}
            <div className="flex justify-end gap-2 pt-6 border-t mt-8">
                <Button variant="outline" onClick={handleCancel}>
                    {getCancelButtonText()}
                </Button>
                <Button 
                    className="bg-primary hover:bg-primary-300"
                    onClick={handleContinue}
                >
                    {getSubmitButtonText()}
                </Button>
            </div>
        </div>
    );
};


// --- MAIN TAB COMPONENT ---
export function RubricsTab() {
  const [currentView, setCurrentView] = useState<RubricView>('list');
  const [selectedMode, setSelectedMode] = useState<BuilderMode>(null);

  const [activeTab, setActiveTab] = useState<'platform' | 'my'>('platform');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedRubrics] = useState<RubricTemplate[]>(initialSavedRubrics);

  // Handlers
  const handleCreateClick = () => {
    setCurrentView('options');
    setSelectedMode(null);
  };

  const handleModeSelection = (mode: BuilderMode) => {
    setSelectedMode(mode);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedMode(null);
  };
  
  const filteredPlatformRubrics = platformRubrics.filter(rubric =>
    rubric.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredMyRubrics = savedRubrics.filter(rubric =>
    rubric.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- RENDER FUNCTION ---
  return (
    <div className="space-y-6 p-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl text-neutral-900 font-semibold">
            {currentView === 'options' ? 'New Rubric' : 'Rubrics'}
        </h1>
        <div className="flex gap-2">
          {/* Button only shows in 'list' view */}
          {currentView === 'list' && (
            <Button 
                className="bg-primary hover:bg-primary-300"
                onClick={handleCreateClick}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Rubric
            </Button>
          )}
          
          {currentView === 'options' && (
             <Button 
                variant="outline"
                onClick={handleBackToList}
            >
                <X className="w-4 h-4 mr-2" />
                Close
            </Button>
          )}

        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      
      {/* View 2/3: Creation Options and Dynamic Builder */}
      {currentView === 'options' && (
        <div className="w-full space-y-6">
            <Card className="p-6">
                <RubricCreationOptions selectedMode={selectedMode} setMode={handleModeSelection} />
            </Card>
            
            {/* RENDER DYNAMIC BUILDER SECTION BELOW OPTIONS IF A MODE IS SELECTED */}
            {selectedMode !== null && (
                <RubricFormContent mode={selectedMode} setMode={handleModeSelection} />
            )}
        </div>
      )}

      {/* View 1: Main Rubric List Screen */}
      {currentView === 'list' && (
        <Card className="p-4">
          <div className="flex border-b border-neutral-200 mb-4">
            <button 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'platform' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 hover:text-neutral-700'}`}
              onClick={() => setActiveTab('platform')}
            >
              Platform rubrics
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'my' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 hover:text-neutral-700'}`}
              onClick={() => setActiveTab('my')}
            >
              My rubrics
            </button>
          </div>

          {/* Search Input */}
          <Input
            type="search"
            placeholder="Filter by rubric name"
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)} 
            className="mb-6"
          />

          {/* Tab Content */}
          <div>
            {activeTab === 'platform' && (
              <div className="space-y-3">
                {filteredPlatformRubrics.map((rubric) => (
                  <Card key={rubric.id} className="p-4 flex justify-between items-center hover:bg-neutral-50 cursor-pointer">
                    <div>
                      <h3 className="text-base text-neutral-900">{rubric.name}</h3>
                      <p className="text-sm text-neutral-500 mt-1">US English</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4 text-neutral-500" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'my' && (
              <>
                {filteredMyRubrics.length === 0 ? (
                  <EmptyRubricState handleCreateClick={handleCreateClick} />
                ) : (
                  <div className="space-y-3">
                    {filteredMyRubrics.map((rubric) => (
                      <Card key={rubric.id} className="p-4 flex justify-between items-center hover:bg-neutral-50 cursor-pointer">
                        <div>
                          <h3 className="text-base text-neutral-900">{rubric.name}</h3>
                          <p className="text-sm text-neutral-500 mt-1">{rubric.criteria} Criteria | Last Used: {rubric.lastUsed}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4 text-neutral-500" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}