import { useState } from 'react';
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

import { Plus, Search, Edit, Trash2, Upload, MoreVertical, Eye } from 'lucide-react';
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

// IMPORT DATA
import type { Student } from '../../data/studentsData';
import { initialStudentsData, initialNewStudentState } from '../../data/studentsData';
import { initialProgramsData } from '../../data/programsData';
import { initialSectionsData } from '../../data/sectionsData';


// NOTE: Conceptual update to the Student interface and initialStudentsData 
// to include 'missing': number
const updatedStudentsData = initialStudentsData.map(student => ({
  ...student,
  // Adding sample data for the new 'missing' column
  missing: student.id === 'STU005' ? 2 : (student.id === 'STU003' ? 1 : 0), 
}));


export function StudentsTab() {
  // STATE: Main list of students (using the updated mock data)
  const [students, setStudents] = useState<Student[]>(updatedStudentsData);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState(initialNewStudentState);
  
  // FILTER STATES
  const [programFilter, setProgramFilter] = useState('All Programs');
  const [sectionFilter, setSectionFilter] = useState('All Sections');

  // Helper for dropdown options
  const availablePrograms = initialProgramsData.map(p => p.name);
  const availableSections = Array.from(new Set(initialSectionsData.map(s => s.name)));

  const handleInputChange = (field: string, value: string) => {
    setNewStudent(prev => ({ ...prev, [field]: value }));
  };

  // HANDLE SUBMIT FUNCTION for creating a new student
  const handleCreateStudent = () => {
    // 1. Validation
    if (!newStudent.name || !newStudent.id || !newStudent.email || newStudent.program === 'Select Program' || newStudent.section === 'Select Section') {
      alert('Please fill in all required fields.');
      return;
    }

    // 2. Create the new student object
    const newStudentObject: Student = {
      id: newStudent.id.toUpperCase(), 
      name: newStudent.name,
      email: newStudent.email,
      program: newStudent.program,
      section: newStudent.section,
      submitted: 0,
      pending: 0,
      missing: 0, // <<-- INITIALIZED NEW FIELD
      avgScore: 0,
    };

    // 3. Add to the list (prepending for visibility)
    setStudents(prevStudents => [newStudentObject, ...prevStudents]);

    // 4. Reset form and close dialog
    setNewStudent(initialNewStudentState);
    setIsAddDialogOpen(false);
  };

  // Filter Logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.program.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProgram = programFilter === 'All Programs' || student.program === programFilter;
    const matchesSection = sectionFilter === 'All Sections' || student.section === sectionFilter;

    return matchesSearch && matchesProgram && matchesSection;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">Students Management</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage students and track their progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-300">
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="student-id">Student ID</Label>
                  <Input 
                    id="student-id" 
                    placeholder="e.g., STU009" 
                    className="mt-1" 
                    value={newStudent.id}
                    onChange={(value) => handleInputChange('id', value)}
                  />
                </div>
                <div>
                  <Label htmlFor="student-name">Full Name</Label>
                  <Input 
                    id="student-name" 
                    placeholder="e.g., John Doe" 
                    className="mt-1" 
                    value={newStudent.name}
                    onChange={(value) => handleInputChange('name', value)}
                  />
                </div>
                <div>
                  <Label htmlFor="student-email">Email</Label>
                  <Input 
                    id="student-email" 
                    type="email" 
                    placeholder="student@example.com" 
                    className="mt-1" 
                    value={newStudent.email}
                    onChange={(value) => handleInputChange('email', value)}
                  />
                </div>
                <div>
                  <Label htmlFor="student-program">Program</Label>
                  <select 
                    id="student-program" 
                    className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
                    value={newStudent.program}
                    onChange={(e) => handleInputChange('program', e.target.value)}
                  >
                    <option value="Select Program">Select Program</option>
                    {availablePrograms.map(program => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="student-section">Section</Label>
                  <select 
                    id="student-section" 
                    className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
                    value={newStudent.section}
                    onChange={(e) => handleInputChange('section', e.target.value)}
                  >
                    <option value="Select Section">Select Section</option>
                    {availableSections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button className="bg-primary hover:bg-primary-300" onClick={handleCreateStudent}>
                    Add Student
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

      {/* Stats Cards (unchanged) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Total Students</p>
          <p className="text-2xl text-neutral-900 mt-1">456</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Active Students</p>
          <p className="text-2xl text-success-default mt-1">448</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Avg. Submission Rate</p>
          <p className="text-2xl text-info-default mt-1">87%</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">At-Risk Students</p>
          <p className="text-2xl text-warning-default mt-1">12</p>
        </Card>
      </div>

      {/* Search & Filters (unchanged) */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search by name, ID, email..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="pl-10"
            />
          </div>
          <select 
            className="px-3 py-2 border border-neutral-300 rounded-rd"
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
          >
            <option value="All Programs">All Programs</option>
            {availablePrograms.map(program => (
              <option key={program} value={program}>{program}</option>
            ))}
          </select>
          <select 
            className="px-3 py-2 border border-neutral-300 rounded-rd"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            <option value="All Sections">All Sections</option>
            {availableSections.map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Students Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Submitted</TableHead>
              <TableHead className="text-center">Pending</TableHead>
              <TableHead className="text-center">Missing</TableHead> {/* <<-- NEW HEADER */}
              <TableHead className="text-center">Avg Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="text-sm text-neutral-600">{student.id}</div>
                </TableCell>
                <TableCell>
                  <div className="text-neutral-900">{student.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-neutral-600">{student.program}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                    {student.section}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-neutral-600">{student.email}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-success-default/10 text-success-default border-success-default/20">
                    {student.submitted}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={
                    student.pending > 2 
                      ? 'bg-error-default/10 text-error-default border-error-default/20'
                      : 'bg-warning-default/10 text-warning-default border-warning-default/20'
                  }>
                    {student.pending}
                  </Badge>
                </TableCell>
                
                {/* <<-- NEW MISSING ESSAY CELL -->> */}
                <TableCell className="text-center">
                  <Badge variant="outline" className={
                    student.missing > 0 
                      ? 'bg-error-default/10 text-error-default border-error-default/20'
                      : 'bg-neutral-300/10 text-neutral-600 border-neutral-300/20'
                  }>
                    {student.missing}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-center">
                  <Badge className={
                    student.avgScore >= 85 ? 'bg-success-default text-white' :
                    student.avgScore >= 75 ? 'bg-info-default text-white' :
                    'bg-warning-default text-white'
                  }>
                    {student.avgScore}%
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
                        <Eye className="w-4 h-4 mr-2" />
                        View Essay History
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Student
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-error-default">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Student
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