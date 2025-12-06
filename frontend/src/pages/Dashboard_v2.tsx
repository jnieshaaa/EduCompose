// Dashboard_v2.tsx

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Layers,
  UserPlus,
  Trash2,
  Filter,
  Pencil,
  BookOpen,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";

// Types
interface Program {
  id: string;
  name: string;
  description?: string;
}

interface Block {
  id: string;
  name: string;
  programId: string;
}

interface StudentV2 {
  id: string;
  name: string;
  blockId: string;
}

// Program suggestions for autocomplete
const PROGRAM_SUGGESTIONS = [
  // Business / Management / Finance
  "BSA",
  "BSBA",
  "BSBA-FM",
  "BSBA-MM",
  "BSBA-HRDM",
  "BSBA-MKT",
  "BSBA-BA",
  "BSAIS",
  "BSMA",
  "BSECON",
  "BSEntrep",
  "BSHM",
  "BSTM",
  "BSRE",
  "BSCoEcon",
  // Engineering / Technology
  "BSCE",
  "BSME",
  "BSEE",
  "BSCoE",
  "BSECE",
  "BSChE",
  "BSIE",
  "BSMatE",
  "BSARE",
  "BSGE",
  "BSMetE",
  "BSEnE",
  "BSEM",
  "BSEnTech",
  // Computing / IT / Data
  "BSCS",
  "BSIT",
  "BSIS",
  "BSDA",
  "BSDS",
  "BSSE",
  "BSAI",
  "BSCpE",
  // Health / Medical-Allied
  "BSN",
  "BSMT",
  "BSPharma",
  "BSRT",
  "BSMedTech",
  "BSND",
  "BSSW",
  "BSMLS",
  "BSOT",
  "BSPT",
  // Science / Natural Science
  "BSBio",
  "BSCH",
  "BSPhy",
  "BSStat",
  "BSAMath",
  "BSMath",
  "BSEnvSci",
  "BSITech",
  "BSFT",
  "BSBiotech",
  "BSMicro",
  "BSGeol",
  "BSMarBio",
  "BSEnviEng",
  // Arts / Humanities
  "ABEng",
  "ABFil",
  "ABPolSci",
  "ABPsy",
  "ABComm",
  "ABMMA",
  "ABHist",
  "ABPhilo",
  "ABIS",
  "BFA",
  "BFA-ID",
  "BFA-MC",
  "BFA-PA",
  "BFAMMA",
  // Education
  "BEEd",
  "BSEd",
  "BSEd-Eng",
  "BSEd-Fil",
  "BSEd-Math",
  "BSEd-Sci",
  "BPEd",
  "BTVTEd",
  "BTTE",
  "BCAEd",
  // Social Sciences
  "ABSS",
  "ABDevStud",
  "ABAnthro",
  "ABJourn",
  // Media / Communications / Design
  "BJourn",
  "BFA-AD",
  "BFA-VC",
  "BFA-MMA",
  "BSD",
  // Law / Public Affairs / Governance
  "BSPA",
  "BSLGA",
  "ABPH",
  "ABILS",
  // Criminology / Security / Public Safety
  "BSCrim",
  "BSSec",
  "BSForenSci",
  // Agriculture / Forestry / Environment
  "BSAgri",
  "BSFor",
  "BSAB",
  "BSAT",
  // Maritime
  "BSMarE",
  "BSMarT",
  "BSNav",
];

// Empty initial data - add your own items
const initialPrograms: Program[] = [];
const initialBlocks: Block[] = [];
const initialStudents: StudentV2[] = [];

const Dashboard_v2: React.FC = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>(initialPrograms);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [students, setStudents] = useState<StudentV2[]>(initialStudents);

  // Simulate initial loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Simulate API call delay
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filters
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentV2 | null>(null);
  const [editingStudentProgramId, setEditingStudentProgramId] = useState("");

  // Delete confirmation modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<
    "program" | "block" | "student" | null
  >(null);
  const [deleteId, setDeleteId] = useState<string>("");
  const [deleteName, setDeleteName] = useState<string>("");

  // Form states
  const [newProgram, setNewProgram] = useState({ name: "", description: "" });
  const [programError, setProgramError] = useState("");
  const [showProgramSuggestions, setShowProgramSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [newBlock, setNewBlock] = useState({ name: "", programId: "" });
  const [blockError, setBlockError] = useState("");
  const [showBlockSuggestions, setShowBlockSuggestions] = useState(false);
  const [filteredBlockSuggestions, setFilteredBlockSuggestions] = useState<
    string[]
  >([]);
  const [newStudent, setNewStudent] = useState({
    name: "",
    programId: "",
    blockId: "",
  });
  const [studentError, setStudentError] = useState("");

  // Filtered blocks based on selected program
  const filteredBlocksForFilter = useMemo(() => {
    if (selectedProgram === "all") return blocks;
    return blocks.filter((b) => b.programId === selectedProgram);
  }, [blocks, selectedProgram]);

  // Available blocks for student form based on selected program
  const availableBlocksForStudent = useMemo(() => {
    if (!newStudent.programId) return [];
    return blocks.filter((b) => b.programId === newStudent.programId);
  }, [blocks, newStudent.programId]);

  // Available blocks for editing student based on selected program
  const availableBlocksForEditStudent = useMemo(() => {
    if (!editingStudentProgramId) return [];
    return blocks.filter((b) => b.programId === editingStudentProgramId);
  }, [blocks, editingStudentProgramId]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const studentBlock = blocks.find((b) => b.id === student.blockId);
      const matchesProgram =
        selectedProgram === "all" ||
        studentBlock?.programId === selectedProgram;
      const matchesBlock =
        selectedBlock === "all" || student.blockId === selectedBlock;
      const matchesSearch = student.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesProgram && matchesBlock && matchesSearch;
    });
  }, [students, blocks, selectedProgram, selectedBlock, searchQuery]);

  // Stats
  const totalStudents = students.length;
  const totalPrograms = programs.length;
  const totalBlocks = blocks.length;

  // Get names
  const getProgramName = (programId: string) =>
    programs.find((p) => p.id === programId)?.name || "Unknown";
  const getBlockName = (blockId: string) =>
    blocks.find((b) => b.id === blockId)?.name || "Unknown";
  const getBlockProgramId = (blockId: string) =>
    blocks.find((b) => b.id === blockId)?.programId || "";

  // Handlers
  const handleProgramNameChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setNewProgram((prev) => ({ ...prev, name: upperValue }));
    setProgramError("");

    if (upperValue.length > 0) {
      const filtered = PROGRAM_SUGGESTIONS.filter(
        (suggestion) =>
          suggestion.toUpperCase().includes(upperValue) &&
          !programs.some(
            (p) => p.name.toUpperCase() === suggestion.toUpperCase()
          )
      );
      setFilteredSuggestions(filtered);
      setShowProgramSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowProgramSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setNewProgram((prev) => ({ ...prev, name: suggestion }));
    setShowProgramSuggestions(false);
    setFilteredSuggestions([]);
    setProgramError("");
  };

  const handleAddProgram = () => {
    if (!newProgram.name.trim()) return;

    // Validate: only uppercase letters, spaces, and dashes allowed
    const validNamePattern = /^[A-Z\s-]+$/;
    if (!validNamePattern.test(newProgram.name.trim())) {
      setProgramError(
        "Program name must contain only letters, spaces, and dashes (no numbers or symbols)"
      );
      return;
    }

    // Validate: maximum 10 letters
    const letterCount = (newProgram.name.trim().match(/[A-Z]/g) || []).length;
    if (letterCount > 10) {
      setProgramError("Program name must have 10 letters or less");
      return;
    }

    const programExists = programs.some(
      (p) => p.name.toLowerCase() === newProgram.name.trim().toLowerCase()
    );

    if (programExists) {
      setProgramError("Program already exists!");
      return;
    }

    const program: Program = {
      id: `program-${Date.now()}`,
      name: newProgram.name.trim(),
      description: newProgram.description,
    };
    setPrograms((prev) => [...prev, program]);
    setNewProgram({ name: "", description: "" });
    setProgramError("");
    setShowAddProgramModal(false);
  };

  const handleDeleteProgram = (programId: string) => {
    // Get all blocks in this program
    const programBlocks = blocks.filter((b) => b.programId === programId);
    const blockIds = programBlocks.map((b) => b.id);

    // Remove the program
    setPrograms((prev) => prev.filter((p) => p.id !== programId));
    // Remove all blocks in this program
    setBlocks((prev) => prev.filter((b) => b.programId !== programId));
    // Remove all students in those blocks
    setStudents((prev) => prev.filter((s) => !blockIds.includes(s.blockId)));
  };

  // Block suggestions: 1A-1D, 2A-2D, 3A-3D, 4A-4D
  const ALL_BLOCK_OPTIONS = [
    "1A",
    "1B",
    "1C",
    "1D",
    "2A",
    "2B",
    "2C",
    "2D",
    "3A",
    "3B",
    "3C",
    "3D",
    "4A",
    "4B",
    "4C",
    "4D",
  ];

  const handleBlockNameChange = (value: string) => {
    const trimmed = value.slice(0, 2).toUpperCase();
    setNewBlock((prev) => ({ ...prev, name: trimmed }));
    setBlockError("");

    if (trimmed.length > 0) {
      // Get existing blocks for selected program
      const existingBlocks = blocks
        .filter((b) => b.programId === newBlock.programId)
        .map((b) => b.name.toUpperCase());

      const filtered = ALL_BLOCK_OPTIONS.filter(
        (option) =>
          option.startsWith(trimmed) && !existingBlocks.includes(option)
      );
      setFilteredBlockSuggestions(filtered);
      setShowBlockSuggestions(filtered.length > 0);
    } else {
      setFilteredBlockSuggestions([]);
      setShowBlockSuggestions(false);
    }
  };

  const handleSelectBlockSuggestion = (suggestion: string) => {
    setNewBlock((prev) => ({ ...prev, name: suggestion }));
    setShowBlockSuggestions(false);
    setFilteredBlockSuggestions([]);
    setBlockError("");
  };

  const handleAddBlock = () => {
    if (!newBlock.name.trim() || !newBlock.programId) return;

    const blockName = newBlock.name.trim().toUpperCase();

    // Validate: must be exactly 2 characters - number 1-4 first, then letter A-D (e.g., 1A, 4B)
    const validBlockPattern = /^[1-4][A-D]$/;
    if (!validBlockPattern.test(blockName)) {
      setBlockError(
        "Block must be number 1-4 followed by letter A-D (e.g., 1A, 2B, 3C, 4D)"
      );
      return;
    }

    // Check if block name already exists in the same program
    const blockExists = blocks.some(
      (b) =>
        b.programId === newBlock.programId && b.name.toUpperCase() === blockName
    );

    if (blockExists) {
      setBlockError("Block already exists in this program!");
      return;
    }

    const block: Block = {
      id: `block-${Date.now()}`,
      name: blockName,
      programId: newBlock.programId,
    };
    setBlocks((prev) => [...prev, block]);
    setNewBlock({ name: "", programId: "" });
    setBlockError("");
    setShowAddBlockModal(false);
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setStudents((prev) => prev.filter((s) => s.blockId !== blockId));
  };

  const handleAddStudent = () => {
    if (!newStudent.name.trim() || !newStudent.blockId) return;

    // Validate: must contain at least 3 letters
    const letterCount = (newStudent.name.trim().match(/[a-zA-Z]/g) || [])
      .length;
    if (letterCount < 3) {
      setStudentError("Name must contain at least 3 letters");
      return;
    }

    // Validate: only letters, spaces, period, and comma allowed (no numbers or other symbols)
    const validNamePattern = /^[a-zA-Z\s.,]+$/;
    if (!validNamePattern.test(newStudent.name.trim())) {
      setStudentError(
        "Name must contain only letters and allowed symbols (. ,)"
      );
      return;
    }

    // Check for consecutive periods
    if (/\.{2,}/.test(newStudent.name.trim())) {
      setStudentError("Name cannot contain consecutive periods (..)");
      return;
    }

    // Check if student name already exists (case-insensitive)
    const studentExists = students.some(
      (s) => s.name.toLowerCase() === newStudent.name.trim().toLowerCase()
    );

    if (studentExists) {
      setStudentError("Student already exists!");
      return;
    }

    const student: StudentV2 = {
      id: `s-${Date.now()}`,
      name: newStudent.name.trim(),
      blockId: newStudent.blockId,
    };
    setStudents((prev) => [...prev, student]);
    setNewStudent({ name: "", programId: "", blockId: "" });
    setStudentError("");
    setShowAddStudentModal(false);
  };

  const confirmDeleteStudent = (studentId: string, studentName: string) => {
    setDeleteType("student");
    setDeleteId(studentId);
    setDeleteName(studentName);
    setShowDeleteConfirm(true);
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleConfirmDelete = () => {
    if (deleteType === "program") {
      handleDeleteProgram(deleteId);
    } else if (deleteType === "block") {
      handleDeleteBlock(deleteId);
    } else if (deleteType === "student") {
      handleDeleteStudent(deleteId);
      setShowEditStudentModal(false);
      setEditingStudent(null);
      setEditingStudentProgramId("");
    }
    setShowDeleteConfirm(false);
    setDeleteType(null);
    setDeleteId("");
    setDeleteName("");
  };

  const handleEditStudent = (student: StudentV2) => {
    setEditingStudent({ ...student });
    const studentBlock = blocks.find((b) => b.id === student.blockId);
    setEditingStudentProgramId(studentBlock?.programId || "");
    setShowEditStudentModal(true);
  };

  const handleSaveEditStudent = () => {
    if (
      !editingStudent ||
      !editingStudent.name.trim() ||
      !editingStudent.blockId
    )
      return;
    setStudents((prev) =>
      prev.map((s) =>
        s.id === editingStudent.id
          ? {
              ...s,
              name: editingStudent.name.trim(),
              blockId: editingStudent.blockId,
            }
          : s
      )
    );
    setShowEditStudentModal(false);
    setEditingStudent(null);
    setEditingStudentProgramId("");
  };

  if (loading) {
    return (
      <div className='p-6 min-h-screen bg-neutral-300/10'>
        <div className='animate-pulse space-y-6'>
          <div className='h-8 bg-neutral-300 rounded w-1/4'></div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='h-32 bg-neutral-300 rounded-rd'></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6 space-y-6 min-h-screen bg-neutral-300/10'>
      {/* Header */}
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 tracking-tight'>
            Dashboard
          </h1>
        </div>
        <div className='flex flex-wrap gap-3'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowAddProgramModal(true)}
          >
            <BookOpen className='w-4 h-4 mr-2' />
            Add Program
          </Button>
          <Button
            variant='secondary'
            size='sm'
            onClick={() => setShowAddBlockModal(true)}
          >
            <Layers className='w-4 h-4 mr-2' />
            Add Block
          </Button>
          <Button
            variant='primary'
            size='sm'
            onClick={() => setShowAddStudentModal(true)}
          >
            <UserPlus className='w-4 h-4 mr-2' />
            Add Student
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className='flex flex-wrap gap-10 text-sm text-neutral-700'>
        <p>
          Total Students: <span className='font-semibold'>{totalStudents}</span>
        </p>
        <p>
          Total Programs: <span className='font-semibold'>{totalPrograms}</span>
        </p>
        <p>
          Total Blocks: <span className='font-semibold'>{totalBlocks}</span>
        </p>
      </div>

      {/* Filters and Search */}
      <Card>
        <div className='flex flex-col md:flex-row gap-4 items-start md:items-center'>
          <div className='flex items-center gap-2 text-neutral-700'>
            <Filter className='w-4 h-4' />
            <span className='font-medium'>Filter Students:</span>
          </div>

          <div className='flex flex-wrap gap-3 flex-1'>
            {/* Program Filter */}
            <div className='relative min-w-[160px]'>
              <BookOpen className='w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2' />
              <select
                value={selectedProgram}
                onChange={(e) => {
                  setSelectedProgram(e.target.value);
                  setSelectedBlock("all");
                }}
                className='appearance-none pl-9 pr-8 py-2 rounded-rd border border-neutral-300 bg-white w-full focus:outline-none focus:ring-2 focus:ring-primary'
              >
                <option value='all'>All Programs</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
              <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500'>
                ▾
              </span>
            </div>

            {/* Block Filter */}
            <div className='relative min-w-[160px]'>
              <Layers className='w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2' />
              <select
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                className='appearance-none pl-9 pr-8 py-2 rounded-rd border border-neutral-300 bg-white w-full focus:outline-none focus:ring-2 focus:ring-primary'
              >
                <option value='all'>All Blocks</option>
                {filteredBlocksForFilter.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name}
                  </option>
                ))}
              </select>
              <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500'>
                ▾
              </span>
            </div>

            {/* Search */}
            <div className='relative flex-1 min-w-[200px]'>
              <Search className='w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2' />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search students...'
                className='pl-9 pr-4 py-2 rounded-rd border border-neutral-300 bg-white w-full focus:outline-none focus:ring-2 focus:ring-primary'
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Student List */}
      <Card>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-neutral-900 flex items-center gap-2'>
            <Users className='w-5 h-5 text-primary' />
            Student List
            <span className='text-sm font-normal text-neutral-500'>
              ({filteredStudents.length}{" "}
              {filteredStudents.length === 1 ? "student" : "students"})
            </span>
          </h3>
          <Button
            variant='primary'
            size='sm'
            onClick={() => setShowAddStudentModal(true)}
          >
            <Plus className='w-4 h-4 mr-1' />
            Add Student
          </Button>
        </div>

        {/* Table Header */}
        <div className='hidden md:grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-neutral-500 border-b border-neutral-200 bg-neutral-50 rounded-t-rd'>
          <div className='col-span-4'>Name</div>
          <div className='col-span-3'>Program</div>
          <div className='col-span-2'>Block</div>
          <div className='col-span-3'>Essay</div>
        </div>

        {/* Student Rows */}
        <div className='divide-y divide-neutral-100'>
          <AnimatePresence>
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className='grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-4 hover:bg-neutral-50/50 transition-colors cursor-pointer'
                onClick={() => handleEditStudent(student)}
              >
                <div className='col-span-4 flex items-center gap-3 group'>
                  <div className='flex items-center gap-2'>
                    <p className='font-medium text-neutral-900 group-hover:text-primary transition-colors'>
                      {student.name}
                    </p>
                    <Pencil className='w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity' />
                  </div>
                </div>
                <div className='col-span-3'>
                  <span className='text-sm text-neutral-700'>
                    {getProgramName(getBlockProgramId(student.blockId))}
                  </span>
                </div>
                <div className='col-span-2'>
                  <span className='text-sm text-neutral-700'>
                    {getBlockName(student.blockId)}
                  </span>
                </div>
                <div className='col-span-3'>
                  <span className='text-sm text-neutral-500'>No essay yet</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredStudents.length === 0 && (
          <div className='text-center py-12'>
            <Users className='w-16 h-16 text-neutral-300 mx-auto mb-4' />
            <h4 className='text-lg font-semibold text-neutral-900 mb-2'>
              No students found
            </h4>
            <p className='text-neutral-500 mb-4'>
              {searchQuery ||
              selectedProgram !== "all" ||
              selectedBlock !== "all"
                ? "Try adjusting your filters or search query"
                : "Add your first student to get started"}
            </p>
            <Button
              variant='primary'
              onClick={() => setShowAddStudentModal(true)}
            >
              <UserPlus className='w-4 h-4 mr-2' />
              Add Student
            </Button>
          </div>
        )}
      </Card>

      {/* Add Program Modal */}
      <Modal
        isOpen={showAddProgramModal}
        onClose={() => {
          setShowAddProgramModal(false);
          setProgramError("");
          setNewProgram({ name: "", description: "" });
          setShowProgramSuggestions(false);
          setFilteredSuggestions([]);
        }}
        title='Add New Program'
        size='md'
      >
        <div className='space-y-4'>
          <div className='relative'>
            <label className='block text-sm font-medium text-neutral-700 mb-1'>
              Program Name <span className='text-error-default'>*</span>
            </label>
            <div className='relative'>
              <input
                type='text'
                value={newProgram.name}
                onChange={(e) => handleProgramNameChange(e.target.value)}
                onFocus={() => {
                  if (
                    newProgram.name.length > 0 &&
                    filteredSuggestions.length > 0
                  ) {
                    setShowProgramSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowProgramSuggestions(false), 150);
                }}
                placeholder='e.g., BSCS, BSIT, BSCE'
                className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
              />
              {/* Search icon */}
              <Search className='w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2' />
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showProgramSuggestions && filteredSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className='absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-rd shadow-lg max-h-48 overflow-y-auto'
                >
                  {filteredSuggestions.slice(0, 8).map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type='button'
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={`w-full px-3 py-2 text-left hover:bg-support-superlight/35 transition-colors flex items-center gap-2 ${
                        index === 0 ? "rounded-t-rd" : ""
                      } ${
                        index === Math.min(filteredSuggestions.length - 1, 7)
                          ? "rounded-b-rd"
                          : ""
                      }`}
                    >
                      <BookOpen className='w-4 h-4 text-primary' />
                      <span className='font-medium text-neutral-900'>
                        {suggestion
                          .split(new RegExp(`(${newProgram.name})`, "gi"))
                          .map((part, i) =>
                            part.toUpperCase() ===
                            newProgram.name.toUpperCase() ? (
                              <span key={i} className='text-primary font-bold'>
                                {part}
                              </span>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                      </span>
                    </button>
                  ))}
                  {filteredSuggestions.length > 8 && (
                    <div className='px-3 py-2 text-xs text-neutral-500 border-t border-neutral-100'>
                      +{filteredSuggestions.length - 8} more results...
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {programError && (
              <p className='text-error-default text-sm mt-1'>{programError}</p>
            )}
          </div>
          <Input
            label='Description'
            value={newProgram.description}
            onChange={(value) =>
              setNewProgram((prev) => ({ ...prev, description: value }))
            }
            placeholder='Optional description...'
            type='textarea'
            rows={2}
          />
          <div className='flex justify-end gap-3 pt-4'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowAddProgramModal(false);
                setProgramError("");
                setNewProgram({ name: "", description: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleAddProgram}
              disabled={!newProgram.name.trim()}
            >
              <Plus className='w-4 h-4 mr-2' />
              Add Program
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Block Modal */}
      <Modal
        isOpen={showAddBlockModal}
        onClose={() => {
          setShowAddBlockModal(false);
          setBlockError("");
          setNewBlock({ name: "", programId: "" });
          setShowBlockSuggestions(false);
          setFilteredBlockSuggestions([]);
        }}
        title='Add New Block'
        size='md'
      >
        <div className='space-y-4'>
          <div className='space-y-1'>
            <label className='block text-sm font-medium text-neutral-700'>
              Program <span className='text-error-default'>*</span>
            </label>
            <select
              value={newBlock.programId}
              onChange={(e) => {
                setNewBlock((prev) => ({
                  ...prev,
                  programId: e.target.value,
                  name: "",
                }));
                setBlockError("");
                setShowBlockSuggestions(false);
                setFilteredBlockSuggestions([]);
              }}
              className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
            >
              <option value=''>Select a program...</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
          <div className='relative'>
            <label className='block text-sm font-medium text-neutral-700 mb-1'>
              Block <span className='text-error-default'>*</span>
            </label>
            <input
              type='text'
              value={newBlock.name}
              onChange={(e) => handleBlockNameChange(e.target.value)}
              onFocus={() => {
                if (
                  newBlock.name.length > 0 &&
                  filteredBlockSuggestions.length > 0
                ) {
                  setShowBlockSuggestions(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowBlockSuggestions(false), 150);
              }}
              placeholder='e.g., 1A, 2B, 3C, 4D'
              className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
            />

            {/* Block Suggestions Dropdown */}
            <AnimatePresence>
              {showBlockSuggestions && filteredBlockSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className='absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-rd shadow-lg'
                >
                  {filteredBlockSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type='button'
                      onClick={() => handleSelectBlockSuggestion(suggestion)}
                      className={`w-full px-3 py-2 text-left hover:bg-support-superlight/35 transition-colors flex items-center gap-2 ${
                        index === 0 ? "rounded-t-rd" : ""
                      } ${
                        index === filteredBlockSuggestions.length - 1
                          ? "rounded-b-rd"
                          : ""
                      }`}
                    >
                      <Layers className='w-4 h-4 text-primary' />
                      <span className='font-medium text-neutral-900'>
                        {suggestion.split("").map((char, i) =>
                          newBlock.name.includes(char) ? (
                            <span key={i} className='text-primary font-bold'>
                              {char}
                            </span>
                          ) : (
                            <span key={i}>{char}</span>
                          )
                        )}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {blockError && (
              <p className='text-error-default text-sm mt-1'>{blockError}</p>
            )}
          </div>
          <div className='flex justify-end gap-3 pt-4'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowAddBlockModal(false);
                setBlockError("");
                setNewBlock({ name: "", programId: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleAddBlock}
              disabled={!newBlock.name.trim() || !newBlock.programId}
            >
              <Plus className='w-4 h-4 mr-2' />
              Add Block
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddStudentModal}
        onClose={() => {
          setShowAddStudentModal(false);
          setNewStudent({ name: "", programId: "", blockId: "" });
          setStudentError("");
        }}
        title='Add New Student'
        size='md'
      >
        <div className='space-y-4'>
          <div>
            <Input
              label='Student Name'
              value={newStudent.name}
              onChange={(value) => {
                // Capitalize first letter of each word (Title Case)
                const capitalized = value
                  .split(" ")
                  .map((word) =>
                    word.length > 0
                      ? word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                      : ""
                  )
                  .join(" ");
                setNewStudent((prev) => ({ ...prev, name: capitalized }));
                setStudentError("");
              }}
              placeholder='Enter full name...'
              required
            />
            {studentError && (
              <p className='text-error-default text-sm mt-1'>{studentError}</p>
            )}
          </div>
          <div className='space-y-1'>
            <label className='block text-sm font-medium text-neutral-700'>
              Program <span className='text-error-default'>*</span>
            </label>
            <select
              value={newStudent.programId}
              onChange={(e) =>
                setNewStudent((prev) => ({
                  ...prev,
                  programId: e.target.value,
                  blockId: "",
                }))
              }
              className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
            >
              <option value=''>Select a program...</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
          <div className='space-y-1'>
            <label className='block text-sm font-medium text-neutral-700'>
              Block <span className='text-error-default'>*</span>
            </label>
            <select
              value={newStudent.blockId}
              onChange={(e) =>
                setNewStudent((prev) => ({
                  ...prev,
                  blockId: e.target.value,
                }))
              }
              disabled={!newStudent.programId}
              className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-neutral-100 disabled:cursor-not-allowed'
            >
              <option value=''>
                {newStudent.programId
                  ? "Select a block..."
                  : "Select a program first"}
              </option>
              {availableBlocksForStudent.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </select>
          </div>
          <div className='flex justify-end gap-3 pt-4'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowAddStudentModal(false);
                setNewStudent({ name: "", programId: "", blockId: "" });
                setStudentError("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleAddStudent}
              disabled={!newStudent.name.trim() || !newStudent.blockId}
            >
              <UserPlus className='w-4 h-4 mr-2' />
              Add Student
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={showEditStudentModal}
        onClose={() => {
          setShowEditStudentModal(false);
          setEditingStudent(null);
          setEditingStudentProgramId("");
        }}
        title='Edit Student'
        size='md'
      >
        <div className='space-y-4'>
          <Input
            label='Student Name'
            value={editingStudent?.name || ""}
            onChange={(value) => {
              // Capitalize first letter of each word (Title Case)
              const capitalized = value
                .split(" ")
                .map((word) =>
                  word.length > 0
                    ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    : ""
                )
                .join(" ");
              setEditingStudent((prev) =>
                prev ? { ...prev, name: capitalized } : null
              );
            }}
            placeholder='Enter full name...'
            required
          />
          <div className='space-y-1'>
            <label className='block text-sm font-medium text-neutral-700'>
              Program <span className='text-error-default'>*</span>
            </label>
            <select
              value={editingStudentProgramId}
              onChange={(e) => {
                setEditingStudentProgramId(e.target.value);
                setEditingStudent((prev) =>
                  prev ? { ...prev, blockId: "" } : null
                );
              }}
              className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
            >
              <option value=''>Select a program...</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
          <div className='space-y-1'>
            <label className='block text-sm font-medium text-neutral-700'>
              Block <span className='text-error-default'>*</span>
            </label>
            <select
              value={editingStudent?.blockId || ""}
              onChange={(e) =>
                setEditingStudent((prev) =>
                  prev ? { ...prev, blockId: e.target.value } : null
                )
              }
              disabled={!editingStudentProgramId}
              className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-neutral-100 disabled:cursor-not-allowed'
            >
              <option value=''>
                {editingStudentProgramId
                  ? "Select a block..."
                  : "Select a program first"}
              </option>
              {availableBlocksForEditStudent.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </select>
          </div>
          <div className='flex justify-between pt-4'>
            <Button
              variant='ghost'
              onClick={() => {
                if (editingStudent) {
                  confirmDeleteStudent(editingStudent.id, editingStudent.name);
                }
              }}
              className='group hover:text-error-default hover:bg-support-superlight/35 border-none'
            >
              <Trash2 className='w-4 h-4 mr-2 group-hover:text-error-default transition-colors' />
            </Button>
            <div className='flex gap-3'>
              <Button
                variant='ghost'
                onClick={() => {
                  setShowEditStudentModal(false);
                  setEditingStudent(null);
                  setEditingStudentProgramId("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant='primary'
                onClick={handleSaveEditStudent}
                disabled={
                  !editingStudent?.name.trim() || !editingStudent?.blockId
                }
              >
                <Pencil className='w-4 h-4 mr-2' />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteType(null);
          setDeleteId("");
          setDeleteName("");
        }}
        title='Confirm Removing'
        size='sm'
      >
        <div className='space-y-4'>
          <p className='text-neutral-700'>
            Are you sure you want to remove{" "}
            <span className='font-semibold'>{deleteName}</span>?
            {deleteType === "program" && (
              <span className='block text-sm text-error-default mt-2'>
                This will also delete all blocks and students in this program.
              </span>
            )}
            {deleteType === "block" && (
              <span className='block text-sm text-error-default mt-2'>
                This will also delete all students in this block.
              </span>
            )}
          </p>
          <div className='flex justify-end gap-3 pt-2'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteType(null);
                setDeleteId("");
                setDeleteName("");
              }}
            >
              No, Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleConfirmDelete}
              className='bg-error-default hover:bg-error-dark'
            >
              Yes, Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard_v2;
