import { useState } from 'react';
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

import { 
  Plus, Upload, FileCheck, Edit,
  MoreVertical, X, Settings, ClipboardList, Check, Trash2, Eye,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

// Extracted components
import { RubricDetailsForm, RubricCriteriaEditor } from '../../components/rubrics/RubricBuilderSteps';
import { RubricPreviewModal } from '../../components/rubrics/RubricPreviewModal';
import type { RubricFormData, BuilderMode, PlatformRubric } from '../../components/rubrics/types';
import { defaultRubricFormData, initialCriteria, platformRubrics } from '../../components/rubrics/types';

// Data imports
import type { RubricTemplate } from '../../data/rubricsData';
import { initialSavedRubrics } from '../../data/rubricsData';

// --- VIEW TYPES ---
type RubricView = 'list' | 'options';

// --- UTILITY COMPONENTS ---

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

const RubricCreationOptions = ({ selectedMode, setMode }: { selectedMode: BuilderMode, setMode: (mode: BuilderMode) => void }) => {
  const options: { icon: React.ElementType, title: string, mode: BuilderMode }[] = [
    { icon: Upload, title: 'Upload or import', mode: 'upload' },
    { icon: FileCheck, title: 'Build from an existing template', mode: 'template' },
    { icon: Edit, title: 'Build from scratch', mode: 'scratch' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 pb-4 border-b border-neutral-200 mb-6">
      {options.map((option) => (
        <Card 
          key={option.mode} 
          className={`p-4 flex flex-col items-center text-center cursor-pointer transition-colors border shadow-sm h-32 justify-center
            ${option.mode === selectedMode ? 'border-primary bg-purple-50 ring-2 ring-primary/50' : 'hover:bg-neutral-50'}
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

// --- UPLOAD MODE COMPONENT ---
const UploadModeContent = ({ onCancel }: { onCancel: () => void }) => (
  <div className="w-full mt-6 p-6 border rounded-lg shadow-md bg-white">
    <h3 className="text-2xl font-semibold text-neutral-900 mb-6">Upload or Import</h3>
    <div className="space-y-6">
      <p className="text-neutral-600">Add your rubric file here and EduCompose will turn it into a digital, ready-to-use rubric.</p>
      <div className="border-2 border-dashed border-purple-300 bg-purple-50 p-16 text-center h-96 flex flex-col items-center justify-center">
        <p className="text-neutral-500 mb-8 text-lg">Drop files here. <span className="text-primary font-medium cursor-pointer hover:text-primary-300">browse files</span> or import from:</p>
        <div className="flex gap-10 justify-center">
          <div className="text-center">
            <Upload className="w-8 h-8 text-primary mx-auto" /> 
            <p className="text-sm mt-2">My Device</p>
          </div>
          <div className="text-center">
            <Settings className="w-8 h-8 text-primary mx-auto" /> 
            <p className="text-sm mt-2">Google Drive</p>
          </div>
          <div className="text-center">
            <Check className="w-8 h-8 text-primary mx-auto" /> 
            <p className="text-sm mt-2">OneDrive</p>
          </div>
        </div>
      </div>
    </div>
    <div className="flex justify-end gap-2 pt-6 border-t mt-8">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button className="bg-primary hover:bg-primary-300">Upload Rubric</Button>
    </div>
  </div>
);

// --- TEMPLATE MODE COMPONENT ---
interface TemplateModeContentProps {
  onCancel: () => void;
  onPreviewRubric: (rubric: PlatformRubric) => void;
}

const TemplateModeContent = ({ onCancel, onPreviewRubric }: TemplateModeContentProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredRubrics = platformRubrics.filter(rubric =>
    rubric.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Basic': return 'bg-green-500/10 text-green-700 border-green-500/30';
      case 'Professional': return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
      case 'Advanced': return 'bg-purple-500/10 text-purple-700 border-purple-500/30';
      case 'Technical': return 'bg-orange-500/10 text-orange-700 border-orange-500/30';
      default: return 'bg-neutral-100 text-neutral-700 border-neutral-300';
    }
  };

  return (
    <div className="w-full mt-6 p-6 border rounded-lg shadow-md bg-white">
      <h3 className="text-2xl font-semibold text-neutral-900 mb-6">Select Template</h3>
      <div className="space-y-6">
        <p className="text-neutral-600">Select an existing template from the library. Click to preview and use.</p>
        <div className="border p-4 rounded-lg">
          <Input 
            type="search" 
            placeholder="Search rubrics..." 
            value={searchQuery}
            onChange={setSearchQuery}
            className="mb-4" 
          />
          <div className="space-y-3">
            {filteredRubrics.map((rubric) => ( 
              <Card 
                key={rubric.id} 
                className="p-4 flex justify-between items-center bg-neutral-50 hover:bg-neutral-100 cursor-pointer transition-colors"
                onClick={() => onPreviewRubric(rubric)}
              >
                <div className="flex-1">
                  <h4 className="text-base font-medium text-neutral-900">{rubric.name}</h4>
                  <p className="text-sm text-neutral-500 mt-1">{rubric.criteria.length} Criteria • {rubric.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getTypeBadgeColor(rubric.type)} border`}>{rubric.type}</Badge>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={(e) => {
                      e?.stopPropagation();
                      onPreviewRubric(rubric);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-6 border-t mt-8">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

// --- SCRATCH MODE BUILDER ---
interface ScratchModeBuilderProps {
  formData: RubricFormData;
  onFormChange: (updates: Partial<RubricFormData>) => void;
  onSave: () => void;
  onCancel: () => void;
}

const ScratchModeBuilder = ({ formData, onFormChange, onSave, onCancel }: ScratchModeBuilderProps) => {
  const [step, setStep] = useState<'details' | 'criteria'>('details');

  const handleContinue = () => {
    setStep('criteria');
  };

  const handleBack = () => {
    setStep('details');
  };

  return (
    <div className="w-full mt-6 p-6 border rounded-lg shadow-md bg-white">
      <h3 className="text-2xl font-semibold text-neutral-900 mb-6">
        {step === 'details' ? 'Rubric Details' : 'Build Your Rubric'}
      </h3>
      
      {step === 'details' ? (
        <RubricDetailsForm 
          formData={formData}
          onFormChange={onFormChange}
          onContinue={handleContinue}
          onCancel={onCancel}
        />
      ) : (
        <RubricCriteriaEditor 
          formData={formData}
          onFormChange={onFormChange}
          onSave={onSave}
          onBack={handleBack}
        />
      )}
    </div>
  );
};

// --- PLATFORM RUBRIC CARD ---
interface PlatformRubricCardProps {
  rubric: PlatformRubric;
  onClick: () => void;
}

const PlatformRubricCard = ({ rubric, onClick }: PlatformRubricCardProps) => {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Basic': return 'bg-green-500/10 text-green-700 border-green-500/30';
      case 'Professional': return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
      case 'Advanced': return 'bg-purple-500/10 text-purple-700 border-purple-500/30';
      case 'Technical': return 'bg-orange-500/10 text-orange-700 border-orange-500/30';
      default: return 'bg-neutral-100 text-neutral-700 border-neutral-300';
    }
  };

  const totalPoints = rubric.criteria.reduce((sum, c) => 
    sum + Math.max(...c.scores.map(s => s.points)), 0
  );

  return (
    <Card 
      className="p-5 hover:bg-neutral-50 cursor-pointer transition-all hover:shadow-md border-2 border-transparent hover:border-primary/20"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${getTypeBadgeColor(rubric.type)} border`}>{rubric.type}</Badge>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">{rubric.name}</h3>
          <p className="text-sm text-neutral-500 mb-3 line-clamp-2">{rubric.description}</p>
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <span>{rubric.criteria.length} Criteria</span>
            <span>{totalPoints} Points</span>
            <span>{rubric.programs} Programs</span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="shrink-0"
          onClick={(e) => {
            e?.stopPropagation();
            onClick();
          }}
        >
          <Eye className="w-4 h-4 text-primary" />
        </Button>
      </div>
    </Card>
  );
};

// --- MAIN TAB COMPONENT ---
export function RubricsTab() {
  const [currentView, setCurrentView] = useState<RubricView>('list');
  const [selectedMode, setSelectedMode] = useState<BuilderMode>(null);

  const [activeTab, setActiveTab] = useState<'platform' | 'my'>('platform');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lifted state: savedRubrics can now be added to
  const [savedRubrics, setSavedRubrics] = useState<RubricTemplate[]>(initialSavedRubrics);
  
  // Form state for the rubric builder
  const [rubricFormData, setRubricFormData] = useState<RubricFormData>(defaultRubricFormData);

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedPreviewRubric, setSelectedPreviewRubric] = useState<PlatformRubric | null>(null);

  // Handlers
  const handleCreateClick = () => {
    setCurrentView('options');
    setSelectedMode(null);
    // Reset form data for new rubric
    setRubricFormData({
      ...defaultRubricFormData,
      criteria: [...initialCriteria.map(c => ({ ...c, scores: c.scores.map(s => ({ ...s })) }))],
    });
  };

  const handleModeSelection = (mode: BuilderMode) => {
    setSelectedMode(mode);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedMode(null);
  };

  const handleFormChange = (updates: Partial<RubricFormData>) => {
    setRubricFormData(prev => ({ ...prev, ...updates }));
  };

  // Save rubric handler
  const handleSaveRubric = () => {
    // Construct the final rubric object
    const newRubric: RubricTemplate = {
      id: Date.now(), // Generate unique ID
      name: rubricFormData.name || 'Untitled Rubric',
      criteria: rubricFormData.criteria.length,
      programs: 1, // Default to 1 program
      lastUsed: new Date().toISOString().split('T')[0],
      level: 'College',
    };

    // Add to the savedRubrics list
    setSavedRubrics(prev => [newRubric, ...prev]);

    // Switch view back to list
    setCurrentView('list');
    setSelectedMode(null);
    
    // Switch to "My rubrics" tab to show the new rubric
    setActiveTab('my');
  };

  const handleCancelMode = () => {
    setSelectedMode(null);
  };

  // Preview modal handlers
  const handlePreviewRubric = (rubric: PlatformRubric) => {
    setSelectedPreviewRubric(rubric);
    setPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setSelectedPreviewRubric(null);
  };

  const handleUseTemplate = (rubric: PlatformRubric) => {
    // Copy the rubric to My Rubrics
    const newRubric: RubricTemplate = {
      id: Date.now(),
      name: rubric.name,
      criteria: rubric.criteria.length,
      programs: 1,
      lastUsed: new Date().toISOString().split('T')[0],
      level: 'College',
    };
    setSavedRubrics(prev => [newRubric, ...prev]);
    handleClosePreview();
    setActiveTab('my');
  };
  
  const filteredPlatformRubrics = platformRubrics.filter(rubric =>
    rubric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rubric.type.toLowerCase().includes(searchQuery.toLowerCase())
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
          
          {/* Render mode-specific content */}
          {selectedMode === 'upload' && (
            <UploadModeContent onCancel={handleCancelMode} />
          )}
          
          {selectedMode === 'template' && (
            <TemplateModeContent 
              onCancel={handleCancelMode} 
              onPreviewRubric={handlePreviewRubric}
            />
          )}
          
          {selectedMode === 'scratch' && (
            <ScratchModeBuilder 
              formData={rubricFormData}
              onFormChange={handleFormChange}
              onSave={handleSaveRubric}
              onCancel={handleCancelMode}
            />
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
              Platform rubrics ({platformRubrics.length})
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'my' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 hover:text-neutral-700'}`}
              onClick={() => setActiveTab('my')}
            >
              My rubrics ({savedRubrics.length})
            </button>
          </div>

          {/* Search Input */}
          <Input
            type="search"
            placeholder="Search rubrics by name or type..."
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)} 
            className="mb-6"
          />

          {/* Tab Content */}
          <div>
            {activeTab === 'platform' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPlatformRubrics.map((rubric) => (
                  <PlatformRubricCard 
                    key={rubric.id}
                    rubric={rubric}
                    onClick={() => handlePreviewRubric(rubric)}
                  />
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
                          <p className="text-sm text-neutral-500 mt-1">
                            {rubric.criteria} Criteria | Last Used: {rubric.lastUsed}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className="bg-primary/10 text-primary border border-primary/30">College</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4 text-neutral-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Rubric
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-error-default">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Rubric
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Preview Modal */}
      {selectedPreviewRubric && (
        <RubricPreviewModal
          rubric={selectedPreviewRubric}
          isOpen={previewModalOpen}
          onClose={handleClosePreview}
          onUseTemplate={handleUseTemplate}
        />
      )}
    </div>
  );
}
