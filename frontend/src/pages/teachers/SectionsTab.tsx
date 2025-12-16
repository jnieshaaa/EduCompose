import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

import { Plus, Search, Edit, Trash2, MoreVertical, Users, X, LayoutGrid, List, FileText, Calendar, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

// IMPORT PROGRAMS DATA for dropdown population
import { initialProgramsData } from '../../data/programsData';

// IMPORT SECTIONS DATA and TYPE
import type { Section } from '../../data/sectionsData';
import { initialNewSectionState } from '../../data/sectionsData';
import { supabase } from "../../lib/supabaseClient";


export function SectionsTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read program filter from URL params (for drill-down from Programs)
  const urlProgramFilter = searchParams.get('program');
  
  // STATE: Main list of sections
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSection, setNewSection] = useState(initialNewSectionState);
  const [programFilter, setProgramFilter] = useState(urlProgramFilter || 'All Programs');
  const [termFilter, setTermFilter] = useState('All Terms');
  
  // View mode state
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Sync programFilter with URL params
  useEffect(() => {
    if (urlProgramFilter) {
      setProgramFilter(urlProgramFilter);
    }
  }, [urlProgramFilter]);

  // Helper to get course names from the Programs list for dropdowns
  const [availablePrograms, setAvailablePrograms] = useState<string[]>(
    initialProgramsData.map((p) => p.name)
  );

  const handleInputChange = (field: string, value: string) => {
    setNewSection(prev => ({ ...prev, [field]: value }));
  };

  const handleBatchUploadComplete = (result: UploadResult) => {
    if (result.success && result.data) {
      // Add imported sections to the list
      setSections(prevSections => [...(result.data as Section[]), ...prevSections]);
    }
  };

  // Clear program filter and URL params
  const handleClearProgramFilter = () => {
    setProgramFilter('All Programs');
    setSearchParams({});
  };


  // Drill-down to Students filtered by section
  const handleSectionClick = (sectionName: string, programName: string) => {
    const params = new URLSearchParams();
    params.set('section', sectionName);
    params.set('program', programName);
    navigate(`/Teacher/Students?${params.toString()}`);
  };

  // Load sections + programs from Supabase (teacher-end).
  useEffect(() => {
    const fetchSections = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        // Load programs first to map program_id -> name
        const { data: programsData, error: programsError } = await supabase
          .from("programs")
          .select("id, name")
          .order("id", { ascending: true });

        if (programsError) {
          throw programsError;
        }

        const programMap = new Map<number, string>();
        if (programsData) {
          programsData.forEach((p: any) => {
            programMap.set(p.id, p.name);
          });
          setAvailablePrograms(programsData.map((p: any) => p.name));
        }

        const { data: sectionsData, error: sectionsError } = await supabase
          .from("sections")
          .select(
            "id, name, term, students_estimated, essays_estimated, program_id"
          )
          .order("id", { ascending: true });

        if (sectionsError) {
          throw sectionsError;
        }

        const mapped: Section[] =
          sectionsData?.map((row: any) => ({
            id: row.id,
            name: row.name,
            program:
              (row.program_id && programMap.get(row.program_id)) ||
              "Unknown program",
            term: row.term ?? "",
            students: row.students_estimated ?? 0,
            essays: row.essays_estimated ?? 0,
          })) ?? [];
        setSections(mapped);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading sections from Supabase:", error);
        setLoadError(
          "Unable to load blocks/sections from Supabase."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSections();
  }, []);

  // HANDLE SUBMIT FUNCTION for creating a new section
  const handleCreateSection = () => {
    // 1. Validation
    if (!newSection.name || newSection.program === 'Select Program' || !newSection.term || parseInt(newSection.students) <= 0) {
      alert('Please fill in all required fields.');
      return;
    }

    // 2. Create the new section object
    const newSectionObject: Section = {
      id: sections.length > 0 ? Math.max(...sections.map(s => s.id)) + 1 : 1,
      name: newSection.name,
      program: newSection.program,
      term: newSection.term,
      students: parseInt(newSection.students, 10), 
      essays: 0, // New sections start with 0 essays
    };

    // 3. Add to the list (prepending for visibility)
    setSections(prevSections => [newSectionObject, ...prevSections]);

    // 4. Reset form and close dialog
    setNewSection(initialNewSectionState);
    setIsAddDialogOpen(false);
  };

  // Filter Logic
  const filteredSections = sections.filter(section => {
    const matchesSearch = 
      section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.term.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProgram = programFilter === 'All Programs' || section.program === programFilter;
    const matchesTerm = termFilter === 'All Terms' || section.term === termFilter;

    return matchesSearch && matchesProgram && matchesTerm;
  });

  // Check if we're in drill-down mode (filtered from Programs)
  const isDrillDown = urlProgramFilter !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-semibold">
            {isDrillDown ? `${urlProgramFilter} Sections` : 'Blocks / Sections'}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {isDrillDown 
              ? 'Click on a section to view its students' 
              : 'Manage class sections and blocks'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-300">
                <Plus className="w-4 h-4 mr-2" />
                Add Block
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Block</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="section-name">Block Name</Label>
                  {/* Controlled Input */}
                  <Input 
                    id="section-name" 
                    placeholder="e.g., Section A" 
                    className="mt-1" 
                    value={newSection.name}
                    onChange={(value) => handleInputChange('name', value)}
                  />
                </div>
                <div>
                  <Label htmlFor="section-program">Program</Label>
                  <select 
                    id="section-program" 
                    className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
                    value={newSection.program}
                    onChange={(e) => handleInputChange('program', e.target.value)}
                  >
                    <option value="Select Program">Select Program</option>
                    {/* PROGRAM DATA INTEGRATION */}
                    {availablePrograms.map(program => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="section-term">Academic Term</Label>
                   {/* Controlled Input */}
                  <Input 
                    id="section-term" 
                    placeholder="e.g., Fall 2025" 
                    className="mt-1" 
                    value={newSection.term}
                    onChange={(value) => handleInputChange('term', value)}
                  />
                </div>
                <div>
                  <Label htmlFor="section-students">Expected Students</Label>
                  {/* Controlled Input */}
                  <Input 
                    id="section-students" 
                    type="number" 
                    placeholder="0" 
                    className="mt-1" 
                    value={newSection.students}
                    onChange={(value) => handleInputChange('students', value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  {/* Attach handler to create button */}
                  <Button className="bg-primary hover:bg-primary-300" onClick={handleCreateSection}>
                    Create Block
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <BatchUploadDialog
            type="sections"
            existingSections={sections}
            availablePrograms={availablePrograms}
            onUploadComplete={handleBatchUploadComplete}
          />
        </div>
      </div>

      {/* Active filter indicator when in drill-down mode */}
      {isDrillDown && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">Filtered by:</span>
          <Badge 
            variant="outline" 
            className="bg-primary/10 text-primary border-primary/30 px-3 py-1 flex items-center gap-2"
          >
            {urlProgramFilter}
            <button 
              onClick={handleClearProgramFilter}
              className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="search"
                placeholder="Search sections..."
                value={searchQuery}
                onChange={setSearchQuery} 
                className="pl-10"
              />
            </div>
            {/* PROGRAM FILTER INTEGRATION - Hide when in drill-down mode */}
            {!isDrillDown && (
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
            <select 
              className="px-3 py-2 border border-neutral-300 rounded-rd"
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
            >
              <option value="All Terms">All Terms</option>
              <option value="Fall 2025">Fall 2025</option>
              <option value="Spring 2025">Spring 2025</option>
              <option value="Summer 2025">Summer 2025</option>
            </select>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <List className="w-4 h-4" />
              Table
            </button>
          </div>
        </div>
        {loadError && (
          <p className="mt-3 text-xs text-warning-default">
            {loadError}
          </p>
        )}
      </Card>

      {/* Sections Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-neutral-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredSections.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-700 mb-2">No sections found</h3>
          <p className="text-sm text-neutral-500 mb-4">
            {isDrillDown ? (
              <>No sections found for <span className="font-semibold">{urlProgramFilter}</span>.</>
            ) : (
              "Get started by adding your first section."
            )}
          </p>
          <Button className="bg-primary hover:bg-primary-300" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Block
          </Button>
        </Card>
      ) : viewMode === 'cards' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredSections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                layout
              >
                <Card 
                  className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1"
                  onClick={() => handleSectionClick(section.name, section.program)}
                >
                  {/* Top color bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-secondary/60" />
                  
                  <div className="p-5">
                    {/* Header with name and menu */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-neutral-900 truncate group-hover:text-primary transition-colors">
                          {section.name}
                        </h3>
                        {!isDrillDown && (
                          <p className="text-sm text-neutral-500 truncate">
                            {section.program}
                          </p>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Block
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-error-default" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Block
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Term badge */}
                    <div className="mb-4">
                      <Badge className="bg-info-default/10 text-info-default border-info-default/20 text-xs flex items-center gap-1 w-fit">
                        <Calendar className="w-3 h-3" />
                        {section.term}
                      </Badge>
                    </div>
                    
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-100">
                      <div className="text-center p-3 bg-secondary/5 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-secondary">
                          <Users className="w-4 h-4" />
                          <span className="text-xl font-bold">{section.students}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Students</p>
                      </div>
                      <div className="text-center p-3 bg-primary/5 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-primary">
                          <FileText className="w-4 h-4" />
                          <span className="text-xl font-bold">{section.essays}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Essays</p>
                      </div>
                    </div>
                    
                    {/* Drill-down hint */}
                    <div className="flex items-center justify-end gap-1 mt-4 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View students</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Table View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section Name</TableHead>
                {!isDrillDown && <TableHead>Program</TableHead>}
                <TableHead>Academic Term</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Essays</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSections.map((section) => (
                <TableRow 
                  key={section.id} 
                  className="cursor-pointer hover:bg-primary/5 transition-colors group"
                  onClick={() => handleSectionClick(section.name, section.program)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="text-neutral-900 group-hover:text-primary transition-colors font-medium">
                        {section.name}
                      </div>
                      <Users className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </TableCell>
                  {!isDrillDown && (
                    <TableCell>
                      <div className="text-sm text-neutral-600">
                        {section.program}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-info-default/10 text-info-default border-info-default/20"
                    >
                      {section.term}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className="bg-secondary/10 text-secondary border-secondary/20"
                    >
                      {section.students}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20"
                    >
                      {section.essays}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Block
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-error-default" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Block
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
