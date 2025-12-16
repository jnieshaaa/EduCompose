import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

import { Plus, Search, Edit, Trash2, MoreVertical, Eye, X } from 'lucide-react';
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
import { BatchUploadDialog } from '../../components/ui/BatchUploadDialog';
import type { UploadResult } from '../../services/BatchUploadController';

// IMPORT DATA
import type { Student } from '../../data/studentsData';
import { initialNewStudentState } from '../../data/studentsData';
import { initialProgramsData } from '../../data/programsData';
import { initialSectionsData } from '../../data/sectionsData';
import { supabase } from "../../lib/supabaseClient";


export function StudentsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read filters from URL params (for drill-down from Sections)
  const urlProgramFilter = searchParams.get('program');
  const urlSectionFilter = searchParams.get('section');
  
  // STATE: Main list of students (using the updated mock data)
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState(initialNewStudentState);
  
  // FILTER STATES - initialized from URL params
  const [programFilter, setProgramFilter] = useState(urlProgramFilter || 'All Programs');
  const [sectionFilter, setSectionFilter] = useState(urlSectionFilter || 'All Sections');

  // Sync filters with URL params
  useEffect(() => {
    if (urlProgramFilter) {
      setProgramFilter(urlProgramFilter);
    }
    if (urlSectionFilter) {
      setSectionFilter(urlSectionFilter);
    }
  }, [urlProgramFilter, urlSectionFilter]);

  // Helper for dropdown options
  const [availablePrograms, setAvailablePrograms] = useState<string[]>(
    initialProgramsData.map((p) => p.name)
  );
  const [availableSections, setAvailableSections] = useState<string[]>(
    Array.from(new Set(initialSectionsData.map((s) => s.name)))
  );

  const handleInputChange = (field: string, value: string) => {
    setNewStudent(prev => ({ ...prev, [field]: value }));
  };

  const handleBatchUploadComplete = (result: UploadResult) => {
    if (result.success && result.data) {
      // Add imported students to the list
      setStudents(prevStudents => [...(result.data as Student[]), ...prevStudents]);
    }
  };

  // Clear all filters and URL params
  const handleClearFilters = () => {
    setProgramFilter('All Programs');
    setSectionFilter('All Sections');
    setSearchParams({});
  };

  // Clear specific filter
  const handleClearProgramFilter = () => {
    setProgramFilter('All Programs');
    if (urlSectionFilter) {
      setSearchParams({ section: urlSectionFilter });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSectionFilter = () => {
    setSectionFilter('All Sections');
    if (urlProgramFilter) {
      setSearchParams({ program: urlProgramFilter });
    } else {
      setSearchParams({});
    }
  };

  // Load students + programs + sections from Supabase (teacher-end).
  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        // Load programs and sections to map ids -> names
        const [{ data: programsData, error: programsError }, { data: sectionsData, error: sectionsError }] =
          await Promise.all([
            supabase.from("programs").select("id, name").order("id", {
              ascending: true,
            }),
            supabase.from("sections").select("id, name").order("id", {
              ascending: true,
            }),
          ]);

        if (programsError) throw programsError;
        if (sectionsError) throw sectionsError;

        const programMap = new Map<number, string>();
        const sectionMap = new Map<number, string>();

        if (programsData) {
          programsData.forEach((p: any) => {
            programMap.set(p.id, p.name);
          });
          setAvailablePrograms(programsData.map((p: any) => p.name));
        }

        if (sectionsData) {
          sectionsData.forEach((s: any) => {
            sectionMap.set(s.id, s.name);
          });
          setAvailableSections(sectionsData.map((s: any) => s.name));
        }

        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select(
            "id, student_code, full_name, email, program_id, section_id"
          )
          .order("id", { ascending: true });

        if (studentsError) {
          throw studentsError;
        }

        const mapped: Student[] =
          studentsData?.map((row: any) => ({
            id: row.student_code,
            name: row.full_name ?? "",
            email: row.email ?? "",
            program:
              (row.program_id && programMap.get(row.program_id)) ||
              "Unknown program",
            section:
              (row.section_id && sectionMap.get(row.section_id)) ||
              "Unknown section",
            submitted: 0,
            pending: 0,
            missing: 0,
            avgScore: 0,
          })) ?? [];

        setStudents(mapped);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading students from Supabase:", error);
        setLoadError(
          "Unable to load students from Supabase."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, []);

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

  // Check if we're in drill-down mode
  const isDrillDown = urlProgramFilter !== null || urlSectionFilter !== null;
  const hasActiveFilters = programFilter !== 'All Programs' || sectionFilter !== 'All Sections';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-semibold">
            {urlSectionFilter 
              ? `${urlSectionFilter} Students`
              : urlProgramFilter 
                ? `${urlProgramFilter} Students`
                : 'Students Management'}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {isDrillDown 
              ? `Viewing ${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''}`
              : 'Manage students and track their progress'}
          </p>
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
          <BatchUploadDialog
            type="students"
            existingStudents={students}
            availablePrograms={availablePrograms}
            availableSections={availableSections}
            onUploadComplete={handleBatchUploadComplete}
          />
        </div>
      </div>

      {/* Active filter indicators */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-neutral-500">Filtered by:</span>
          {programFilter !== 'All Programs' && (
            <Badge 
              variant="outline" 
              className="bg-primary/10 text-primary border-primary/30 px-3 py-1 flex items-center gap-2"
            >
              Program: {programFilter}
              <button 
                onClick={handleClearProgramFilter}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {sectionFilter !== 'All Sections' && (
            <Badge 
              variant="outline" 
              className="bg-secondary/10 text-secondary border-secondary/30 px-3 py-1 flex items-center gap-2"
            >
              Section: {sectionFilter}
              <button 
                onClick={handleClearSectionFilter}
                className="hover:bg-secondary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {(programFilter !== 'All Programs' && sectionFilter !== 'All Sections') && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearFilters}
              className="text-neutral-500 hover:text-neutral-700"
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-neutral-500">
            {hasActiveFilters ? 'Filtered Students' : 'Total Students'}
          </p>
          <p className="text-2xl text-neutral-900 mt-1">{filteredStudents.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Active Students</p>
          <p className="text-2xl text-success-default mt-1">
            {filteredStudents.filter(s => s.submitted > 0 || s.pending > 0).length || filteredStudents.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Avg. Submission Rate</p>
          <p className="text-2xl text-info-default mt-1">
            {filteredStudents.length > 0 
              ? Math.round(filteredStudents.reduce((acc, s) => acc + (s.submitted / Math.max(s.submitted + s.pending + s.missing, 1)), 0) / filteredStudents.length * 100) || 0
              : 0}%
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">At-Risk Students</p>
          <p className="text-2xl text-warning-default mt-1">
            {filteredStudents.filter(s => s.missing > 2 || s.avgScore < 70).length}
          </p>
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
              onChange={setSearchQuery}
              className="pl-10"
            />
          </div>
          {/* Hide program filter dropdown when filtered from URL */}
          {!urlProgramFilter && (
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
          )}
          {/* Hide section filter dropdown when filtered from URL */}
          {!urlSectionFilter && (
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
          )}
        </div>
        {loadError && (
          <p className="mt-3 text-xs text-warning-default">
            {loadError}
          </p>
        )}
      </Card>

      {/* Students Table */}
      <Card>
        {isLoading ? (
          <div className="p-6 text-sm text-neutral-500">
            Loading students from Supabase…
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-6 text-sm text-neutral-500 text-center">
            {hasActiveFilters ? (
              <>
                No students found matching the current filters.{" "}
                <button 
                  onClick={handleClearFilters}
                  className="text-primary hover:underline"
                >
                  Clear filters
                </button>{" "}
                or use <span className="font-semibold">Add Student</span> to add a student.
              </>
            ) : (
              <>
                No students found in Supabase. Use{" "}
                <span className="font-semibold">Add Student</span> or{" "}
                <span className="font-semibold">Batch Upload</span> to add students
                to your classes.
              </>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                {!urlProgramFilter && <TableHead>Program</TableHead>}
                {!urlSectionFilter && <TableHead>Section</TableHead>}
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Submitted</TableHead>
                <TableHead className="text-center">Pending</TableHead>
                <TableHead className="text-center">Missing</TableHead>
                <TableHead className="text-center">Avg Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="text-sm text-neutral-600">
                      {student.id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-neutral-900">{student.name}</div>
                  </TableCell>
                  {!urlProgramFilter && (
                    <TableCell>
                      <div className="text-sm text-neutral-600">
                        {student.program}
                      </div>
                    </TableCell>
                  )}
                  {!urlSectionFilter && (
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-secondary/10 text-secondary border-secondary/20"
                      >
                        {student.section}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="text-sm text-neutral-600">
                      {student.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className="bg-success-default/10 text-success-default border-success-default/20"
                    >
                      {student.submitted}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        student.pending > 2
                          ? "bg-error-default/10 text-error-default border-error-default/20"
                          : "bg-warning-default/10 text-warning-default border-warning-default/20"
                      }
                    >
                      {student.pending}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        student.missing > 0
                          ? "bg-error-default/10 text-error-default border-error-default/20"
                          : "bg-neutral-300/10 text-neutral-600 border-neutral-300/20"
                      }
                    >
                      {student.missing}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={
                        student.avgScore >= 85
                          ? "bg-success-default text-white"
                          : student.avgScore >= 75
                          ? "bg-info-default text-white"
                          : "bg-warning-default text-white"
                      }
                    >
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
        )}
      </Card>
    </div>
  );
}
