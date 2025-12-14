import { useState } from 'react';
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input"; 
import type { Program } from '../../data/programsData';

import { Plus, Search, Edit, Archive, Upload, MoreVertical } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea'; 

import { 
  initialProgramsData, 
  initialNewProgramState,  
} from '../../data/programsData';


export function ProgramsTab() {
  // 1. STATE FOR THE LIST OF PROGRAMS
  const [programs, setPrograms] = useState<Program[]>(initialProgramsData);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // STATE for the new program form
  const [newProgram, setNewProgram] = useState(initialNewProgramState);

  const handleInputChange = (field: string, value: string) => {
    setNewProgram(prev => ({ ...prev, [field]: value }));
  };

  // 2. HANDLE SUBMIT FUNCTION
  const handleCreateProgram = () => {
    // 1. Validate fields (Basic check)
    if (!newProgram.name || !newProgram.description || parseInt(newProgram.tracks) < 0) {
      alert('Please fill in required fields correctly.');
      return;
    }

    // 2. Create the new program object
    const newProgramObject: Program = {
      id: programs.length > 0 ? Math.max(...programs.map(p => p.id)) + 1 : 1, // Simple unique ID generation
      name: newProgram.name,
      description: newProgram.description,
      tracks: parseInt(newProgram.tracks, 10), 
      courses: 0, 
      avgClassSize: 0, 
      status: newProgram.status,
    };

    // 3. Add to the list
    setPrograms(prevPrograms => [newProgramObject, ...prevPrograms]);

    // 4. Reset form and close dialog
    setNewProgram(initialNewProgramState);
    setIsAddDialogOpen(false);
  };

  const filteredPrograms = programs.filter(program =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    program.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">Programs Management</h1>
          <p className="text-sm text-neutral-500 mt-1">View and manage course tracks within academic programs</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-300">
                <Plus className="w-4 h-4 mr-2" />
                Add Program
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Program</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="program-name">Program Name</Label>
                  <Input 
                    id="program-name" 
                    placeholder="e.g., Computer Science" 
                    className="mt-1" 
                    value={newProgram.name}
                    onChange={(value) => handleInputChange('name', value)}
                  />
                </div>
                <div>
                  <Label htmlFor="program-desc">Description</Label>
                  {/* 4. Textarea connected to state */}
                  <Textarea 
                    id="program-desc" 
                    placeholder="Brief description of the program/department" 
                    className="mt-1" 
                    value={newProgram.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="program-tracks">Number of Course Tracks</Label>
                    <Input 
                      id="program-tracks" 
                      type="number" 
                      placeholder="0" 
                      className="mt-1"
                      value={newProgram.tracks}
                      onChange={(value) => handleInputChange('tracks', value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="program-status">Status</Label>
                    <select 
                      id="program-status" 
                      className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
                      value={newProgram.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                    >
                      <option>Active</option>
                      <option>Archived</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  {/* 3. Attach handleSubmit function */}
                  <Button className="bg-primary hover:bg-primary-300" onClick={handleCreateProgram}>
                    Create Program
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Batch Upload
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search programs..."
              value={searchQuery}
              onChange={setSearchQuery} 
              className="pl-10"
            />
          </div>
          {/* <Button variant="outline">Filter</Button> */}
        </div>
      </Card>

      {/* Programs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Course Tracks</TableHead>
              <TableHead className="text-center">Total Courses</TableHead>
              <TableHead className="text-center">Avg. Class Size</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* The table now renders data from the 'programs' state */}
            {filteredPrograms.map((program) => (
              <TableRow key={program.id}>
                <TableCell>
                  <div className="text-neutral-900">{program.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-neutral-600">{program.description}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {program.tracks}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-success-default/10 text-success-default border-success-default/20">
                    {program.courses}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                    {program.avgClassSize}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={
                    program.status === 'Active' 
                      ? 'bg-success-default text-white' 
                      : 'bg-neutral-400 text-white'
                  }>
                    {program.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      
                      {/* 💥 ADD forceMount FOR DEBUGGING 💥 */}
                      <DropdownMenuContent 
                       side="bottom"
                        forceMount // This ensures it stays in the DOM, even when closed, for debugging. Remove later.
                        className="z-50" // Ensures it stacks above everything else.
                      >
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Program
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="w-4 h-4 mr-2" />
                          Archive Program
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                      
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}