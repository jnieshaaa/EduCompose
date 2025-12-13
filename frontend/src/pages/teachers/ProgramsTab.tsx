import { useState } from 'react';
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input"; // Requires 'id' prop to be added to InputProps

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
import { Textarea } from '../../components/ui/textarea'; // Note: Textarea is likely fine, but Label is also custom

const programsData = [
  { id: 1, name: 'Computer Science 101', description: 'Introduction to Programming', sections: 5, students: 125, status: 'Active' },
  { id: 2, name: 'Data Structures', description: 'Advanced Data Structures', sections: 3, students: 78, status: 'Active' },
  { id: 3, name: 'Web Development', description: 'Full Stack Web Development', sections: 4, students: 96, status: 'Active' },
  { id: 4, name: 'Machine Learning', description: 'ML Fundamentals', sections: 2, students: 54, status: 'Active' },
  { id: 5, name: 'Database Systems', description: 'Relational and NoSQL Databases', sections: 3, students: 67, status: 'Active' },
  { id: 6, name: 'Software Engineering', description: 'Software Development Lifecycle', sections: 2, students: 45, status: 'Archived' },
];

export function ProgramsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // ADDED STATE for the new program form
  const [newProgram, setNewProgram] = useState({
    name: '',
    description: '',
    sections: '0',
    status: 'Active',
  });

  const handleInputChange = (field: string, value: string) => {
    setNewProgram(prev => ({ ...prev, [field]: value }));
  };

  const filteredPrograms = programsData.filter(program =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    program.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">Programs Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Organize and manage academic programs</p>
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
                  {/* FIX: Added required 'value' and 'onChange' props, and the 'id' prop is now valid */}
                  <Input 
                    id="program-name" 
                    placeholder="e.g., Computer Science 101" 
                    className="mt-1" 
                    value={newProgram.name}
                    onChange={(value) => handleInputChange('name', value)}
                  />
                </div>
                <div>
                  <Label htmlFor="program-desc">Description</Label>
                  {/* Textarea likely uses native HTML input, but if it's a custom component, 
                      we assume it also requires value and onChange for control. 
                      Since Textarea is imported but not defined, we'll assume it's controlled via custom implementation or a wrapper */}
                  <Textarea id="program-desc" placeholder="Brief description of the program" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="program-sections">Number of Sections</Label>
                    {/* FIX: Added required 'value' and 'onChange' props, and the 'id' prop is now valid */}
                    <Input 
                      id="program-sections" 
                      type="number" 
                      placeholder="0" 
                      className="mt-1"
                      value={newProgram.sections}
                      onChange={(value) => handleInputChange('sections', value)}
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
                  <Button className="bg-primary hover:bg-primary-300">Create Program</Button>
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
              onChange={setSearchQuery} // Corrected: passes string value directly
              className="pl-10"
            />
          </div>
          <Button variant="outline">Filter</Button>
        </div>
      </Card>

      {/* Programs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Sections</TableHead>
              <TableHead className="text-center">Students</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                    {program.sections}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                    {program.students}
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
                    <DropdownMenuContent align="end">
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