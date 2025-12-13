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

const studentsData = [
  { id: 'STU001', name: 'Emma Wilson', program: 'Computer Science 101', section: 'Section A', email: 'emma.w@example.com', submitted: 8, pending: 2, avgScore: 88 },
  { id: 'STU002', name: 'James Lee', program: 'Computer Science 101', section: 'Section A', email: 'james.l@example.com', submitted: 10, pending: 0, avgScore: 85 },
  { id: 'STU003', name: 'Sarah Martinez', program: 'Data Structures', section: 'Section A', email: 'sarah.m@example.com', submitted: 7, pending: 3, avgScore: 82 },
  { id: 'STU004', name: 'Michael Chen', program: 'Web Development', section: 'Section A', email: 'michael.c@example.com', submitted: 9, pending: 1, avgScore: 92 },
  { id: 'STU005', name: 'Olivia Brown', program: 'Machine Learning', section: 'Section A', email: 'olivia.b@example.com', submitted: 6, pending: 4, avgScore: 79 },
  { id: 'STU006', name: 'Daniel Garcia', program: 'Computer Science 101', section: 'Section B', email: 'daniel.g@example.com', submitted: 8, pending: 2, avgScore: 86 },
  { id: 'STU007', name: 'Sophia Taylor', program: 'Database Systems', section: 'Section A', email: 'sophia.t@example.com', submitted: 9, pending: 1, avgScore: 90 },
  { id: 'STU008', name: 'Liam Anderson', program: 'Web Development', section: 'Section B', email: 'liam.a@example.com', submitted: 7, pending: 3, avgScore: 84 },
];

export function StudentsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredStudents = studentsData.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.program.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  {/* Note: Uncontrolled Input usage (missing value/onChange) is okay now 
                     assuming InputProps were made optional in the last step. */}
                  <Input id="student-id" placeholder="e.g., STU001" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="student-name">Full Name</Label>
                  <Input id="student-name" placeholder="e.g., John Doe" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="student-email">Email</Label>
                  <Input id="student-email" type="email" placeholder="student@example.com" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="student-program">Program</Label>
                  <select id="student-program" className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd">
                    <option>Select Program</option>
                    <option>Computer Science 101</option>
                    <option>Data Structures</option>
                    <option>Web Development</option>
                    <option>Machine Learning</option>
                    <option>Database Systems</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="student-section">Section</Label>
                  <select id="student-section" className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd">
                    <option>Select Section</option>
                    <option>Section A</option>
                    <option>Section B</option>
                    <option>Section C</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button className="bg-primary hover:bg-primary-300">Add Student</Button>
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

      {/* Stats Cards */}
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

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search by name, ID, email..."
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
            <option>All Sections</option>
            <option>Section A</option>
            <option>Section B</option>
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