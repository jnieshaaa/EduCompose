import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import type { Program } from "../../data/programsData";
import { supabase } from "../../lib/supabaseClient";
import { PROGRAM_DETAILS } from "../../data/classOptions";

import {
  Plus,
  Search,
  Edit,
  Archive,
  BookOpen,
  Users,
  Layers,
  FileText,
  ArrowRight,
  MoreVertical,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { BatchUploadDialog } from "../../components/ui/BatchUploadDialog";
import type { UploadResult } from "../../services/BatchUploadController";
import { useAlert } from "../../hooks/useAlert";

import { initialNewProgramState } from "../../data/programsData";

export function ProgramsTab() {
  const navigate = useNavigate();
  const { showError, showSuccess, AlertComponent } = useAlert();

  // View mode state: 'cards' or 'table'
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // 1. STATE FOR THE LIST OF PROGRAMS
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // STATE for the new program form
  const [newProgram, setNewProgram] = useState(initialNewProgramState);

  // Autocomplete state for program name
  const [programSuggestions, setProgramSuggestions] = useState<
    typeof PROGRAM_DETAILS
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setNewProgram((prev) => ({ ...prev, [field]: value }));

    // Handle autocomplete for program name
    if (field === "name") {
      if (value.trim().length > 0) {
        const filtered = PROGRAM_DETAILS.filter(
          (program) =>
            program.name.toLowerCase().includes(value.toLowerCase()) ||
            program.code.toLowerCase().includes(value.toLowerCase())
        );
        setProgramSuggestions(filtered.slice(0, 10)); // Limit to 10 suggestions
        setShowSuggestions(true);
        setHighlightedIndex(-1);
      } else {
        setProgramSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  // Handle program selection from autocomplete
  const handleProgramSelect = (program: (typeof PROGRAM_DETAILS)[0]) => {
    setNewProgram((prev) => ({
      ...prev,
      name: program.name,
      description: program.description,
    }));
    setShowSuggestions(false);
    setProgramSuggestions([]);
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown: React.KeyboardEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (e) => {
    if (!showSuggestions || programSuggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < programSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < programSuggestions.length
        ) {
          handleProgramSelect(programSuggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  const handleBatchUploadComplete = (result: UploadResult) => {
    if (result.success && result.data) {
      // Add imported programs to the list
      setPrograms((prevPrograms) => [
        ...(result.data as Program[]),
        ...prevPrograms,
      ]);
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
          .select(
            "id, name, description, tracks, courses, avg_class_size, status"
          )
          .order("id", { ascending: true });

        if (error) {
          console.error("Error loading programs from Supabase:", error);
          setLoadError("Unable to load programs from Supabase.");
          return;
        }

        type SupabaseProgramRow = {
          id: number;
          name: string;
          description?: string | null;
          tracks?: number | null;
          courses?: number | null;
          avg_class_size?: number | null;
          status?: string | null;
        };

        const mapped: Program[] =
          (data as SupabaseProgramRow[] | undefined)?.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description ?? "",
            tracks: (row.tracks ?? 0) as number,
            courses: (row.courses ?? 0) as number,
            avgClassSize: (row.avg_class_size ?? 0) as number,
            status: (row.status ?? "Active") as string,
          })) ?? [];
        setPrograms(mapped);
      } catch (err) {
        console.error("Unexpected error loading programs:", err);
        setLoadError("Unable to load programs from Supabase.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  // 2. HANDLE SUBMIT FUNCTION
  const handleCreateProgram = async () => {
    // 1. Validate fields (Basic check)
    if (
      !newProgram.name ||
      !newProgram.description ||
      parseInt(newProgram.tracks) < 0
    ) {
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError("Please fill in required fields correctly.");
      }, 100);
      return;
    }

    try {
      // 2. Insert into Supabase
      const { data, error } = await supabase
        .from("programs")
        .insert({
          name: newProgram.name,
          description: newProgram.description,
          tracks: parseInt(newProgram.tracks, 10),
          courses: 0,
          avg_class_size: 0,
          status: newProgram.status || "Active",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating program:", error);
        setIsAddDialogOpen(false);
        setTimeout(() => {
          showError(`Failed to create program: ${error.message}`);
        }, 100);
        return;
      }

      // 3. Map Supabase response to Program type and add to the list
      const newProgramObject: Program = {
        id: data.id,
        name: data.name,
        description: data.description ?? "",
        tracks: data.tracks ?? 0,
        courses: data.courses ?? 0,
        avgClassSize: data.avg_class_size ?? 0,
        status: data.status ?? "Active",
      };

      setPrograms((prevPrograms) => [newProgramObject, ...prevPrograms]);

      // 4. Reset form and close dialog
      setNewProgram(initialNewProgramState);
      setProgramSuggestions([]);
      setShowSuggestions(false);
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showSuccess("Program created successfully!");
      }, 100);
    } catch (err) {
      console.error("Unexpected error creating program:", err);
      setIsAddDialogOpen(false);
      setTimeout(() => {
        showError("An unexpected error occurred while creating the program.");
      }, 100);
    }
  };

  // Drill-down navigation to Sections filtered by program
  const handleProgramClick = (programName: string) => {
    navigate(`/Teacher/Sections?program=${encodeURIComponent(programName)}`);
  };

  const filteredPrograms = programs.filter(
    (program) =>
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary stats
  const totalStudents = programs.reduce(
    (acc, p) => acc + p.avgClassSize * p.tracks,
    0
  );
  const totalSections = programs.reduce((acc, p) => acc + p.tracks, 0);
  const activePrograms = programs.filter((p) => p.status === "Active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-semibold">Programs</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Click on a program to view its sections and students
          </p>
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
                <div className="relative">
                  <Label htmlFor="program-name">Program Name</Label>
                  <div className="relative mt-1">
                    <Input
                      id="program-name"
                      placeholder="e.g., BS Computer Science or BSCS"
                      className="mt-0"
                      value={newProgram.name}
                      onChange={(value) => handleInputChange("name", value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => {
                        if (newProgram.name.trim().length > 0) {
                          const filtered = PROGRAM_DETAILS.filter(
                            (program) =>
                              program.name
                                .toLowerCase()
                                .includes(newProgram.name.toLowerCase()) ||
                              program.code
                                .toLowerCase()
                                .includes(newProgram.name.toLowerCase())
                          );
                          setProgramSuggestions(filtered.slice(0, 10));
                          setShowSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow click events
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                    />
                    {/* Autocomplete Suggestions Dropdown */}
                    {showSuggestions && programSuggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {programSuggestions.map((program, index) => (
                          <div
                            key={program.code}
                            className={`px-4 py-2 cursor-pointer transition-colors ${
                              index === highlightedIndex
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-neutral-50 text-neutral-900"
                            }`}
                            onClick={() => handleProgramSelect(program)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {program.name}
                                </div>
                                <div className="text-xs text-neutral-500 mt-0.5">
                                  {program.code}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="program-desc">Description</Label>
                  {/* 4. Textarea connected to state */}
                  <Textarea
                    id="program-desc"
                    placeholder="Brief description of the program/department"
                    className="mt-1"
                    value={newProgram.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="program-tracks">
                      Number of Course Tracks
                    </Label>
                    <Input
                      id="program-tracks"
                      type="number"
                      placeholder="0"
                      className="mt-1"
                      value={newProgram.tracks}
                      onChange={(value) => handleInputChange("tracks", value)}
                    />
                  </div>
                  {/* <div>
                    <Label htmlFor="program-status">Status</Label>
                    <select
                      id="program-status"
                      className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-rd"
                      value={newProgram.status}
                      onChange={(e) =>
                        handleInputChange("status", e.target.value)
                      }
                    >
                      <option>Active</option>
                      <option>Archived</option>
                    </select>
                  </div> */}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  {/* 3. Attach handleSubmit function */}
                  <Button
                    className="bg-primary hover:bg-primary-300"
                    onClick={handleCreateProgram}
                  >
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
              <p className="text-2xl font-bold text-neutral-900">
                {activePrograms}
              </p>
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
              <p className="text-2xl font-bold text-neutral-900">
                {totalSections}
              </p>
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
              <p className="text-2xl font-bold text-neutral-900">
                {totalStudents}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and View Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
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

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "cards"
                  ? "bg-white text-primary shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "table"
                  ? "bg-white text-primary shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <List className="w-4 h-4" />
              Table
            </button>
          </div>
        </div>
        {loadError && (
          <p className="mt-3 text-xs text-warning-default">{loadError}</p>
        )}
      </Card>

      {/* Programs Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-neutral-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : filteredPrograms.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-700 mb-2">
            No programs found
          </h3>
          <p className="text-sm text-neutral-500 mb-4">
            {programs.length === 0
              ? "Get started by adding your first program."
              : "Try adjusting your search query."}
          </p>
          {programs.length === 0 && (
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Program
            </Button>
          )}
        </Card>
      ) : viewMode === "cards" ? (
        /* Card Grid View */
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
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      program.status === "Active"
                        ? "bg-gradient-to-r from-success-default to-success-default/60"
                        : "bg-gradient-to-r from-neutral-400 to-neutral-300"
                    }`}
                  />

                  <div className="p-5">
                    {/* Header with title and menu */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-neutral-900 truncate group-hover:text-primary transition-colors">
                            {program.name}
                          </h3>
                          <Badge
                            className={
                              program.status === "Active"
                                ? "bg-success-default/10 text-success-default border-success-default/20 text-xs"
                                : "bg-neutral-300/50 text-neutral-600 border-neutral-300/30 text-xs"
                            }
                          >
                            {program.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-500 line-clamp-2">
                          {program.description || "No description available"}
                        </p>
                      </div>

                      {/* Actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Program
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => e.stopPropagation()}
                          >
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
                          <span className="text-xl font-bold">
                            {program.tracks}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          Sections
                        </p>
                      </div>
                      <div className="text-center p-3 bg-secondary/5 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-secondary">
                          <FileText className="w-4 h-4" />
                          <span className="text-xl font-bold">
                            {program.courses}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Courses</p>
                      </div>
                      <div className="text-center p-3 bg-success-default/5 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-success-default">
                          <Users className="w-4 h-4" />
                          <span className="text-xl font-bold">
                            {program.avgClassSize}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          Avg Size
                        </p>
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
      ) : (
        /* Table View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Sections</TableHead>
                <TableHead className="text-center">Courses</TableHead>
                <TableHead className="text-center">Avg Class Size</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrograms.map((program) => (
                <TableRow
                  key={program.id}
                  className="cursor-pointer hover:bg-neutral-50"
                  onClick={() => handleProgramClick(program.name)}
                >
                  <TableCell>
                    <div className="font-medium text-neutral-900">
                      {program.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-neutral-500 max-w-xs truncate">
                      {program.description || "No description"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      <Layers className="w-3 h-3 mr-1" />
                      {program.tracks}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-secondary/10 text-secondary border-secondary/20">
                      <FileText className="w-3 h-3 mr-1" />
                      {program.courses}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-success-default/10 text-success-default border-success-default/20">
                      <Users className="w-3 h-3 mr-1" />
                      {program.avgClassSize}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={
                        program.status === "Active"
                          ? "bg-success-default text-white"
                          : "bg-neutral-400 text-white"
                      }
                    >
                      {program.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="sm">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Alert Modal */}
      <AlertComponent />
    </div>
  );
}
