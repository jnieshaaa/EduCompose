import { useState } from 'react';
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input"; // Assuming updated InputProps
// NOTE: Textarea and Slider components must be correctly defined to accept props
// used here (id, placeholder, value, onValueChange, etc.)

import { Plus, Save, Copy, Edit, Trash2, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Slider } from '../../components/ui/slider';

const criteriaList = [
  { id: 1, name: 'Grammar & Mechanics', weight: 20, range: '0-100', description: 'Proper use of grammar, spelling, and punctuation' },
  { id: 2, name: 'Coherence & Flow', weight: 20, range: '0-100', description: 'Logical organization and smooth transitions between ideas' },
  { id: 3, name: 'Argument Strength', weight: 25, range: '0-100', description: 'Clarity and persuasiveness of main arguments' },
  { id: 4, name: 'Vocabulary Usage', weight: 15, range: '0-100', description: 'Appropriate and varied word choice' },
  { id: 5, name: 'Structure & Organization', weight: 15, range: '0-100', description: 'Clear introduction, body, and conclusion' },
  { id: 6, name: 'Originality / Plagiarism', weight: 5, range: '0-100', description: 'Original content with proper citations' },
];

const savedRubrics = [
  { id: 1, name: 'Standard Essay Rubric', criteria: 6, programs: 8, lastUsed: '2025-12-10' },
  { id: 2, name: 'Technical Writing Rubric', criteria: 7, programs: 3, lastUsed: '2025-12-08' },
  { id: 3, name: 'Creative Writing Rubric', criteria: 5, programs: 2, lastUsed: '2025-12-05' },
];

export function RubricsTab() {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [weights, setWeights] = useState<{ [key: number]: number }>({
    1: 20, 2: 20, 3: 25, 4: 15, 5: 15, 6: 5
  });

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">Rubrics / Criteria Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Create and manage grading rubrics</p>
        </div>
        <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-300">
              <Plus className="w-4 h-4 mr-2" />
              Create New Rubric
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Rubric</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="rubric-name">Rubric Name</Label>
                {/* FIX: InputProps must allow optional value/onChange, 
                    and must allow the 'id' prop. */}
                <Input id="rubric-name" placeholder="e.g., Standard Essay Rubric" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="rubric-description">Description</Label>
                <Textarea id="rubric-description" placeholder="Brief description of this rubric" className="mt-1" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>Cancel</Button>
                <Button className="bg-primary hover:bg-primary-300">
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rubric Builder */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl text-neutral-900">Rubric Builder</h2>
            <p className="text-sm text-neutral-500 mt-1">Design grading criteria and weights</p>
          </div>
          <Badge className={totalWeight === 100 ? 'bg-success-default text-white' : 'bg-error-default text-white'}>
            Total: {totalWeight}%
          </Badge>
        </div>

        <div className="space-y-4">
          {criteriaList.map((criteria) => (
            <Card key={criteria.id} className="p-4 bg-neutral-50 border-neutral-200">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-1 flex items-center justify-center">
                  <button className="text-neutral-400 hover:text-neutral-600 cursor-move">
                    <GripVertical className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="lg:col-span-4">
                  <Label className="text-sm text-neutral-900">{criteria.name}</Label>
                  <p className="text-xs text-neutral-500 mt-1">{criteria.description}</p>
                </div>

                <div className="lg:col-span-3">
                  <Label className="text-xs text-neutral-500">Weight (%)</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Slider
                      value={[weights[criteria.id]]}
                      onValueChange={(value) => setWeights({ ...weights, [criteria.id]: value[0] })}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      // FIX 2: Convert the number value to a string
                      value={String(weights[criteria.id])}
                      // FIX 3: The onChange handler in Input.tsx expects a string 'e'.
                      // We must pass that string value to parseInt before setting state.
                      onChange={(value) => setWeights({ ...weights, [criteria.id]: parseInt(value) || 0 })}
                      className="w-16 text-center"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <Label className="text-xs text-neutral-500">Score Range</Label>
                  {/* FIX 4: InputProps must include 'readOnly' prop */}
                  <Input value={criteria.range} readOnly className="mt-2 bg-white" />
                </div>

                <div className="lg:col-span-2 flex items-end gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-error-default hover:text-error-default">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-neutral-200">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Criterion
          </Button>
          <div className="flex gap-2">
            <Button variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
            <Button className="bg-primary hover:bg-primary-300">
              <Save className="w-4 h-4 mr-2" />
              Apply to Programs
            </Button>
          </div>
        </div>
      </Card>

      {/* Saved Rubrics */}
      <Card className="p-6">
        <h2 className="text-xl text-neutral-900 mb-4">Saved Rubric Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedRubrics.map((rubric) => (
            <Card key={rubric.id} className="p-4 bg-neutral-50 border-neutral-200 hover:border-primary transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-neutral-900">{rubric.name}</h3>
                  <p className="text-xs text-neutral-500 mt-1">{rubric.criteria} criteria</p>
                </div>
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Used in:</span>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {rubric.programs} programs
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Last used:</span>
                  <span className="text-neutral-600">{rubric.lastUsed}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-200">
                <Button variant="outline" size="sm" className="flex-1">
                  <Copy className="w-3 h-3 mr-2" />
                  Duplicate
                </Button>
                <Button size="sm" className="flex-1 bg-primary hover:bg-primary-300">
                  Apply
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}