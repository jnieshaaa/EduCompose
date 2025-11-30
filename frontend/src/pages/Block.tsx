import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Plus,
  Pencil,
  Layers,
  Trash2,
  Filter,
  Search,
} from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";

type Student = {
  id: string;
  name: string;
  blockId: string;
};

type BlockType = {
  id: string;
  name: string;
  programId: string;
};

interface BlockPageProps {
  programId: string;
  programName: string;
  blocks: BlockType[];
  setBlocks: React.Dispatch<React.SetStateAction<BlockType[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  onBack: () => void;
}

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

export default function BlockPage({
  programId,
  programName,
  blocks,
  setBlocks,
  students,
  setStudents,
}: BlockPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Use ref to track if update is coming from URL to prevent loops
  const isUpdatingFromUrl = React.useRef(false);
  const previousBlockId = React.useRef<string | null>(null);

  // Get current blockId from URL
  const urlBlockId = searchParams.get("blockId");

  // Initialize selectedBlock from URL params (read from URL) - only when blockId in URL actually changes
  useEffect(() => {
    // Only proceed if blockId actually changed
    if (previousBlockId.current === urlBlockId) {
      return;
    }
    previousBlockId.current = urlBlockId || null;

    if (urlBlockId) {
      // Check if the block exists and belongs to this program
      const block = blocks.find(
        (b) => b.id === urlBlockId && b.programId === programId
      );
      if (block) {
        isUpdatingFromUrl.current = true;
        setSelectedBlock(urlBlockId);
      } else {
        // Block doesn't exist, reset to "all"
        isUpdatingFromUrl.current = true;
        setSelectedBlock("all");
      }
    } else {
      // No blockId in URL, select all blocks
      isUpdatingFromUrl.current = true;
      setSelectedBlock("all");
    }
  }, [urlBlockId, blocks, programId]);

  // Update URL when block is selected (write to URL) - only when state changes from user interaction
  useEffect(() => {
    // Skip if this update is coming from URL change
    if (isUpdatingFromUrl.current) {
      isUpdatingFromUrl.current = false;
      return;
    }

    const block = blocks.find((b) => b.id === selectedBlock);
    const currentBlockId = searchParams.get("blockId");
    const currentBlockName = searchParams.get("blockName");

    // Only update if there's an actual change
    if (selectedBlock !== "all" && block) {
      if (currentBlockId !== selectedBlock || currentBlockName !== block.name) {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("blockId", selectedBlock);
        newParams.set("blockName", block.name);
        setSearchParams(newParams, { replace: true });
      }
    } else if (
      selectedBlock === "all" &&
      (currentBlockId || currentBlockName)
    ) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("blockId");
      newParams.delete("blockName");
      setSearchParams(newParams, { replace: true });
    }
  }, [selectedBlock, blocks, searchParams, setSearchParams]);

  // Modals
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [newStudent, setNewStudent] = useState({ name: "", blockId: "" });
  const [newBlock, setNewBlock] = useState({ name: "" });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [blockError, setBlockError] = useState("");
  const [studentError, setStudentError] = useState("");
  const [editStudentError, setEditStudentError] = useState("");
  const [showBlockSuggestions, setShowBlockSuggestions] = useState(false);
  const [filteredBlockSuggestions, setFilteredBlockSuggestions] = useState<
    string[]
  >([]);

  // Delete confirmation state
  const [deleteType, setDeleteType] = useState<"block" | "student" | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string>("");
  const [deleteName, setDeleteName] = useState<string>("");

  // Filter blocks for this program
  const programBlocks = useMemo(() => {
    return blocks.filter((b) => b.programId === programId);
  }, [blocks, programId]);

  // Filter students based on selected block and search query
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const block = blocks.find((b) => b.id === student.blockId);
      if (!block || block.programId !== programId) return false;

      const matchesBlock =
        selectedBlock === "all" || student.blockId === selectedBlock;
      const matchesSearch = student.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesBlock && matchesSearch;
    });
  }, [students, blocks, programId, selectedBlock, searchQuery]);

  const getBlockName = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    return block?.name || "Unknown";
  };

  const formatStudentNameToTitleCase = (value: string): string => {
    if (!value) return value;

    // Split by word boundaries (spaces, dots, commas)
    // We want to capitalize the first letter of each word
    const formatted = value
      .split(/([\s.,]+)/) // Split but keep delimiters
      .map((part) => {
        // Skip delimiters (spaces, dots, commas)
        if (/^[\s.,]+$/.test(part)) {
          return part;
        }

        // Format words: capitalize first letter, lowercase rest
        if (part.length === 0) return part;
        return part[0].toUpperCase() + part.slice(1).toLowerCase();
      })
      .join("");

    return formatted;
  };

  const validateStudentName = (name: string): string | null => {
    const trimmed = name.trim();

    // Check minimum length (must be at least 3 characters)
    if (trimmed.length < 3) {
      return "Student name must be at least 3 characters long";
    }

    // Check if name contains at least one letter
    const hasLetter = /[a-zA-Z]/.test(trimmed);
    if (!hasLetter) {
      return "Student name must contain at least one letter";
    }

    // Only allow letters, spaces, dots, and commas
    const allowedPattern = /^[a-zA-Z\s.,]+$/;
    if (!allowedPattern.test(trimmed)) {
      return "Student name can only contain letters, spaces, dots (.), and commas (,)";
    }

    // Check for consecutive dots or commas (any sequence of 2+ consecutive)
    if (/\.{2,}/.test(trimmed) || /,{2,}/.test(trimmed)) {
      return "Student name cannot have consecutive dots or commas";
    }

    // Check for proper capitalization (camel case / title case)
    // Must have at least one uppercase and one lowercase letter
    const hasUpperCase = /[A-Z]/.test(trimmed);
    const hasLowerCase = /[a-z]/.test(trimmed);

    if (!hasUpperCase) {
      return "Student name must have at least one capital letter (e.g., John Smith)";
    }

    if (!hasLowerCase) {
      return "Student name cannot be all capital letters (e.g., use John Smith not JOHN SMITH)";
    }

    // Check that name follows title case pattern (first letter of each word should be uppercase)
    // Split by spaces, dots, and commas to check each word
    const words = trimmed.split(/[\s.,]+/).filter((word) => word.length > 0);
    const allWordsStartWithCapital = words.every((word) => {
      const firstChar = word[0];
      return /[A-Z]/.test(firstChar);
    });

    if (!allWordsStartWithCapital) {
      return "Each word in the student name must start with a capital letter (e.g., John Smith)";
    }

    return null; // Valid name
  };

  // Handlers
  const handleBlockNameChange = (value: string) => {
    const trimmed = value.slice(0, 2).toUpperCase();
    setNewBlock({ name: trimmed });
    setBlockError("");

    if (trimmed.length > 0) {
      const existingBlocks = programBlocks.map((b) => b.name.toUpperCase());
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
    setNewBlock({ name: suggestion });
    setShowBlockSuggestions(false);
    setFilteredBlockSuggestions([]);
    setBlockError("");
  };

  const handleAddBlock = () => {
    if (!newBlock.name.trim() || !programId) return;

    const blockName = newBlock.name.trim().toUpperCase();

    // Validate: must be exactly 2 characters - number 1-4 first, then letter A-D
    const validBlockPattern = /^[1-4][A-D]$/;
    if (!validBlockPattern.test(blockName)) {
      setBlockError(
        "Block must be number 1-4 followed by letter A-D (e.g., 1A, 2B, 3C, 4D)"
      );
      return;
    }

    // Check if block name already exists in this program
    const blockExists = programBlocks.some(
      (b) => b.name.toUpperCase() === blockName
    );
    if (blockExists) {
      setBlockError("Block already exists in this program!");
      return;
    }

    const block: BlockType = {
      id: `block-${Date.now()}`,
      name: blockName,
      programId: programId,
    };
    setBlocks((prev) => [...prev, block]);
    setNewBlock({ name: "" });
    setBlockError("");
    setShowAddBlockModal(false);
  };

  const handleAddStudent = () => {
    if (!newStudent.name.trim() || !newStudent.blockId) {
      setStudentError("Please fill in all fields");
      return;
    }

    const trimmedName = newStudent.name.trim();

    // Validate student name format
    const nameValidationError = validateStudentName(trimmedName);
    if (nameValidationError) {
      setStudentError(nameValidationError);
      return;
    }

    // Check for duplicate student name (case-insensitive)
    const duplicateExists = students.some(
      (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateExists) {
      setStudentError("A student with this name already exists!");
      return;
    }

    const student: Student = {
      id: `student-${Date.now()}`,
      name: trimmedName,
      blockId: newStudent.blockId,
    };
    setStudents((prev) => [...prev, student]);
    setNewStudent({ name: "", blockId: "" });
    setStudentError("");
    setShowAddStudentModal(false);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setEditStudentError("");
    setShowEditStudentModal(true);
  };

  const handleUpdateStudent = () => {
    if (!editingStudent) return;

    if (!editingStudent.name.trim()) {
      setEditStudentError("Student name cannot be empty");
      return;
    }

    const trimmedName = editingStudent.name.trim();

    // Validate student name format
    const nameValidationError = validateStudentName(trimmedName);
    if (nameValidationError) {
      setEditStudentError(nameValidationError);
      return;
    }

    // Check for duplicate student name (case-insensitive), excluding current student
    const duplicateExists = students.some(
      (s) =>
        s.id !== editingStudent.id &&
        s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateExists) {
      setEditStudentError("A student with this name already exists!");
      return;
    }

    setStudents((prev) =>
      prev.map((s) => (s.id === editingStudent.id ? editingStudent : s))
    );
    setEditingStudent(null);
    setEditStudentError("");
    setShowEditStudentModal(false);
  };

  const confirmDelete = (
    type: "block" | "student",
    id: string,
    name: string
  ) => {
    setDeleteType(type);
    setDeleteId(id);
    setDeleteName(name);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deleteType === "block") {
      setBlocks((prev) => prev.filter((b) => b.id !== deleteId));
      setStudents((prev) => prev.filter((s) => s.blockId !== deleteId));
      if (selectedBlock === deleteId) setSelectedBlock("all");
    } else if (deleteType === "student") {
      setStudents((prev) => prev.filter((s) => s.id !== deleteId));
    }
    setShowDeleteConfirm(false);
    setDeleteType(null);
    setDeleteId("");
    setDeleteName("");
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
        <div className='flex items-center gap-4'>
          <div>
            <h1 className='text-3xl font-bold text-neutral-900 tracking-tight'>
              {programName}
            </h1>
            <p className='text-neutral-600 mt-1'>Manage blocks and students</p>
          </div>
        </div>

        <div className='flex flex-wrap gap-3'>
          <Button
            variant='ghost'
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
            disabled={programBlocks.length === 0}
          >
            <UserPlus className='w-4 h-4 mr-2' />
            Add Student
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <div className='flex flex-wrap items-center gap-4 p-4 bg-white rounded-rd border border-neutral-200'>
        <div className='flex items-center gap-2 text-neutral-700'>
          <Filter className='w-4 h-4' />
          <span className='font-medium'>Filter Students:</span>
        </div>

        <div className='flex flex-wrap gap-3 flex-1'>
          {/* Block Filter */}
          <div className='relative min-w-[160px]'>
            <Layers className='w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2' />
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className='appearance-none pl-9 pr-8 py-2 rounded-rd border border-neutral-300 bg-white w-full focus:outline-none focus:ring-2 focus:ring-primary'
            >
              <option value='all'>All Blocks</option>
              {programBlocks.map((block) => (
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

      {/* Student List Card */}
      <Card>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-neutral-900 flex items-center gap-2'>
            <Users className='w-5 h-5 text-primary' />
            Student List{" "}
            <span className='text-sm font-normal text-neutral-500'>
              ({filteredStudents.length}{" "}
              {filteredStudents.length === 1 ? "student" : "students"})
            </span>
          </h3>
        </div>

        {/* Table Header */}
        <div className='hidden md:grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-neutral-500 border-b border-neutral-200 bg-neutral-50 rounded-t-rd'>
          <div className='col-span-5'>Name</div>
          <div className='col-span-3'>Block</div>
          <div className='col-span-4'>Essay</div>
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
                <div className='col-span-5 flex items-center gap-3 group'>
                  <div className='flex items-center gap-2'>
                    <p className='font-medium text-neutral-900 group-hover:text-primary transition-colors'>
                      {student.name}
                    </p>
                    <Pencil className='w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity' />
                  </div>
                </div>

                <div className='col-span-3'>
                  <span className='text-sm text-neutral-700'>
                    {getBlockName(student.blockId)}
                  </span>
                </div>

                <div className='col-span-4'>
                  <span className='text-sm text-neutral-500'>No essay yet</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredStudents.length === 0 && (
          <div className='text-center py-12'>
            <Users className='w-16 h-16 text-neutral-300 mx-auto mb-4' />
            <h4 className='text-lg font-semibold text-neutral-900 mb-2'>
              {programBlocks.length === 0
                ? "No blocks created yet"
                : "No students found"}
            </h4>

            <p className='text-neutral-500 mb-4'>
              {programBlocks.length === 0
                ? "Add a block first to start adding students"
                : searchQuery || selectedBlock !== "all"
                ? "Try adjusting your filters or search query"
                : "Add your first student to get started"}
            </p>

            {programBlocks.length === 0 ? (
              <Button
                variant='primary'
                onClick={() => setShowAddBlockModal(true)}
              >
                <Layers className='w-4 h-4 mr-2' />
                Add Block
              </Button>
            ) : (
              <Button
                variant='primary'
                onClick={() => setShowAddStudentModal(true)}
              >
                <UserPlus className='w-4 h-4 mr-2' />
                Add Student
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Add Block Modal */}
      <Modal
        isOpen={showAddBlockModal}
        onClose={() => {
          setShowAddBlockModal(false);
          setBlockError("");
          setNewBlock({ name: "" });
          setShowBlockSuggestions(false);
          setFilteredBlockSuggestions([]);
        }}
        title='Add New Block'
        size='md'
      >
        <div className='space-y-4'>
          <div className='relative'>
            <label className='block text-sm font-medium text-neutral-700 mb-1'>
              Block Name <span className='text-error-default'>*</span>
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
                        {suggestion}
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
                setNewBlock({ name: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleAddBlock}
              disabled={!newBlock.name.trim()}
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
          setStudentError("");
          setNewStudent({ name: "", blockId: "" });
        }}
        title='Add Student'
      >
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-neutral-700 mb-1'>
              Student Name <span className='text-error-default'>*</span>
            </label>
            <input
              type='text'
              value={newStudent.name}
              onChange={(e) => {
                const formatted = formatStudentNameToTitleCase(e.target.value);
                setNewStudent({ ...newStudent, name: formatted });
                setStudentError("");
              }}
              placeholder='Enter student name'
              className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-neutral-700 mb-1'>
              Block <span className='text-error-default'>*</span>
            </label>
            <select
              value={newStudent.blockId}
              onChange={(e) =>
                setNewStudent({ ...newStudent, blockId: e.target.value })
              }
              className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
            >
              <option value=''>Select a block...</option>
              {programBlocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </select>
          </div>
          {studentError && (
            <p className='text-error-default text-sm'>{studentError}</p>
          )}
          <div className='flex justify-end gap-3 pt-4'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowAddStudentModal(false);
                setStudentError("");
                setNewStudent({ name: "", blockId: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleAddStudent}
              disabled={!newStudent.name.trim() || !newStudent.blockId}
            >
              <Plus className='w-4 h-4 mr-2' />
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
          setEditStudentError("");
        }}
        title='Edit Student'
      >
        {editingStudent && (
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-neutral-700 mb-1'>
                Student Name
              </label>
              <input
                type='text'
                value={editingStudent.name}
                onChange={(e) => {
                  const formatted = formatStudentNameToTitleCase(
                    e.target.value
                  );
                  setEditingStudent({
                    ...editingStudent,
                    name: formatted,
                  });
                  setEditStudentError("");
                }}
                className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
              />
              {editStudentError && (
                <p className='text-error-default text-sm mt-1'>
                  {editStudentError}
                </p>
              )}
            </div>
            <div>
              <label className='block text-sm font-medium text-neutral-700 mb-1'>
                Block
              </label>
              <select
                value={editingStudent.blockId}
                onChange={(e) =>
                  setEditingStudent({
                    ...editingStudent,
                    blockId: e.target.value,
                  })
                }
                className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
              >
                {programBlocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='flex justify-between pt-4'>
              <Button
                variant='ghost'
                onClick={() =>
                  confirmDelete(
                    "student",
                    editingStudent.id,
                    editingStudent.name
                  )
                }
                className='group hover:bg-support-superlight/50 border-none'
              >
                <Trash2 className='w-4 h-4 mr-2 group-hover:text-error-default' />
              </Button>
              <div className='flex gap-3'>
                <Button
                  variant='ghost'
                  onClick={() => {
                    setShowEditStudentModal(false);
                    setEditingStudent(null);
                    setEditStudentError("");
                  }}
                >
                  Cancel
                </Button>
                <Button variant='primary' onClick={handleUpdateStudent}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
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
        title='Confirm Delete'
        size='sm'
      >
        <div className='space-y-4'>
          <p className='text-neutral-700'>
            Are you sure you want to remove{" "}
            <span className='font-semibold'>{deleteName}</span>?
            {deleteType === "block" && (
              <span className='block text-sm text-error-default mt-2'>
                This will also remove all students in this block.
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
}
