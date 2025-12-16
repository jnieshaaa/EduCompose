import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input"; 
import type { Program } from '../../data/programsData';
import { supabase } from "../../lib/supabaseClient";

import { Plus, Search, Edit, Archive, BookOpen, Users, Layers, FileText, ArrowRight, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { BatchUploadDialog } from '../../components/ui/BatchUploadDialog';
import type { UploadResult } from '../../services/BatchUploadController'; 

import { 
  initialNewProgramState,  
} from '../../data/programsData';


export function ProgramsTab() {
  const navigate = useNavigate();
  
  // 1. STATE FOR THE LIST OF PROGRAMS
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // STATE for the new program form
  const [newProgram, setNewProgram] = useState(initialNewProgramState);

  const handleInputChange = (field: string, value: string) => {
    setNewProgram(prev => ({ ...prev, [field]: value }));
  };

  const handleBatchUploadComplete = (result: UploadResult) => {
    if (result.success && result.data) {
      // Add imported programs to the list
      setPrograms(prevPrograms => [...(result.data as Program[]), ...prevPrograms]);
    }
  };

  // Load programs from Supabase (teacher-end) – falls back to mock data on error.
  useEffect(() => {
    const fetchPrograms = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const { data, error } = await supabase
          .from("programs")
          .select("id, name, description, tracks, courses, avg_class_size, status")
          .order("id", { ascending: true });

        if (error) {
          // eslint-disable-next-line no-console
          console.error("Error loading programs from Supabase:", error);
          setLoadError("Unable to load programs from Supabase.");
          return;
        }

        const mapped: Program[] =
          data?.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description ?? "",
            tracks: row.tracks ?? 0,
            courses: row.courses ?? 0,
            avgClassSize: row.avg_class_size ?? 0,
            status: row.status ?? "Active",
          })) ?? [];
        setPrograms(mapped);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Unexpected error loading programs:", err);
        setLoadError("Unable to load programs from Supabase.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrograms();
  }, []);

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

  // Drill-down navigation to Sections filtered by program
  const handleProgramClick = (programName: string) => {
    navigate(`/Teacher/Sections?program=${encodeURIComponent(programName)}`);
  };

  const filteredPrograms = programs.filter(program =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    program.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary stats
  const totalStudents = programs.reduce((acc, p) => acc + (p.avgClassSize * p.tracks), 0);
  const totalSections = programs.reduce((acc, p) => acc + p.tracks, 0);
  const activePrograms = programs.filter(p => p.status === 'Active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-semibold">Programs</h1>
          <p className="text-sm text-neutral-500 mt-1">Click on a program to view its sections and students</p>
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
          <BatchUploadDialog
            type="programs"
            existingPrograms={programs}
            onUploadComplete={handleBatchUploadComplete}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Active Programs</p>
              <p className="text-2xl font-bold text-neutral-900">{activePrograms}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/20 rounded-lg">
              <Layers className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Total Sections</p>
              <p className="text-2xl font-bold text-neutral-900">{totalSections}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-success-default/5 to-success-default/10 border-success-default/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-default/20 rounded-lg">
              <Users className="w-5 h-5 text-success-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Est. Students</p>
              <p className="text-2xl font-bold text-neutral-900">{totalStudents}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
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
        </div>
        {loadError && (
          <p className="mt-3 text-xs text-warning-default">
            {loadError}
          </p>
        )}
      </Card>

      {/* Programs Card Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-neutral-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredPrograms.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-700 mb-2">No programs found</h3>
          <p className="text-sm text-neutral-500 mb-4">
            {programs.length === 0 
              ? "Get started by adding your first program."
              : "Try adjusting your search query."}
          </p>
          {programs.length === 0 && (
            <Button className="bg-primary hover:bg-primary-300" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Program
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPrograms.map((program, index) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                layout
              >
                <Card 
                  className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1"
                  onClick={() => handleProgramClick(program.name)}
                >
                  {/* Status indicator bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    program.status === 'Active' 
                      ? 'bg-gradient-to-r from-success-default to-success-default/60' 
                      : 'bg-gradient-to-r from-neutral-400 to-neutral-300'
                  }`} />
                  
                  <div className="p-5">
                    {/* Header with title and menu */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-neutral-900 truncate group-hover:text-primary transition-colors">
                            {program.name}
                          </h3>
                          <Badge className={
                            program.status === 'Active' 
                              ? 'bg-success-default/10 text-success-default border-success-default/20 text-xs' 
                              : 'bg-neutral-300/50 text-neutral-600 border-neutral-300/30 text-xs'
                          }>
                            {program.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-500 line-clamp-2">
                          {program.description || "No description available"}
                        </p>
                      </div>
                      
                      {/* Actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Program
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive Program
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="text-center p-3 bg-primary/5 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-primary">
                          <Layers className="w-4 h-4" />
                          <span className="text-xl font-bold">{program.tracks}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Sections</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/5 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-secondary">
                          <FileText className="w-4 h-4" />
                          <span className="text-xl font-bold">{program.courses}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Courses</p>
                      </div>
                      <div className="text-center p-3 bg-success-default/5 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-success-default">
                          <Users className="w-4 h-4" />
                          <span className="text-xl font-bold">{program.avgClassSize}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Avg Size</p>
                      </div>
                    </div>
                    
                    {/* Drill-down hint */}
                    <div className="flex items-center justify-end gap-1 mt-4 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View sections</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
