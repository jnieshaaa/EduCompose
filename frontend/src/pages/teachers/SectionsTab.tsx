import { useState } from 'react';
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

import { Plus, Search, Edit, Trash2, Upload, MoreVertical } from 'lucide-react';
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

const sectionsData = [
  { id: 1, name: 'Section A', program: 'Computer Science 101', term: 'Fall 2025', students: 25, essays: 48 },
  { id: 2, name: 'Section B', program: 'Computer Science 101', term: 'Fall 2025', students: 28, essays: 52 },
  { id: 3, name: 'Section A', program: 'Data Structures', term: 'Fall 2025', students: 26, essays: 45 },
  { id: 4, name: 'Section B', program: 'Data Structures', term: 'Fall 2025', students: 24, essays: 41 },
  { id: 5, name: 'Section A', program: 'Web Development', term: 'Fall 2025', students: 30, essays: 58 },
  { id: 6, name: 'Section B', program: 'Web Development', term: 'Fall 2025', students: 22, essays: 39 },
  { id: 7, name: 'Section A', program: 'Machine Learning', term: 'Fall 2025', students: 27, essays: 49 },
  { id: 8, name: 'Section A', program: 'Database Systems', term: 'Fall 2025', students: 23, essays: 42 },
];

export function SectionsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredSections = sectionsData.filter(section =>
    section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.term.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">Blocks / Sections Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage class sections and blocks</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-300">
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Section</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="section-name">Section Name</Label>
                  {/* Note: Input usage in dialog is currently uncontrolled (missing value/onChange). 
                      If InputProps requires them, you'll get more errors. 
                      Assuming InputProps were made optional in the last step. */}
                  <Input id="section-name" placeholder="e.g., Section A" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="section-program">Program</Label>
                  <select id="section-program" className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd">
                    <option>Select Program</option>
                    <option>Computer Science 101</option>
                    <option>Data Structures</option>
                    <option>Web Development</option>
                    <option>Machine Learning</option>
                    <option>Database Systems</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="section-term">Academic Term</Label>
                  <Input id="section-term" placeholder="e.g., Fall 2025" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="section-students">Expected Students</Label>
                  <Input id="section-students" type="number" placeholder="0" className="mt-1" />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button className="bg-primary hover:bg-primary-300">Create Section</Button>
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search sections..."
              value={searchQuery}
              // FIX: Use the string value directly, not e.target.value
              onChange={setSearchQuery} 
              className="pl-10"
            />
          </div>
          <select className="px-3 py-2 border border-neutral-300 rounded-rd">
            <option>All Programs</option>
            <option>Computer Science 101</option>
            <option>Data Structures</option>
            <option>Web Development</option>
          </select>
          <select className="px-3 py-2 border border-neutral-300 rounded-rd">
            <option>All Terms</option>
            <option>Fall 2025</option>
            <option>Spring 2025</option>
          </select>
        </div>
      </Card>

      {/* Sections Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section Name</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Academic Term</TableHead>
              <TableHead className="text-center">Students</TableHead>
              <TableHead className="text-center">Essays</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSections.map((section) => (
              <TableRow key={section.id}>
                <TableCell>
                  <div className="text-neutral-900">{section.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-neutral-600">{section.program}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-info-default/10 text-info-default border-info-default/20">
                    {section.term}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                    {section.students}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {section.essays}
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
                        Edit Section
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-error-default">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Section
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