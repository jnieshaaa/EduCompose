import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  GraduationCap,
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

// Empty initial data - add your own items
const initialPrograms: Program[] = [];
const initialBlocks: Block[] = [];
const initialStudents: StudentV2[] = [];

const Dashboard_v2: React.FC = () => {
  // State
  const [programs, setPrograms] = useState<Program[]>(initialPrograms);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [students, setStudents] = useState<StudentV2[]>(initialStudents);

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

  // Form states
  const [newProgram, setNewProgram] = useState({ name: "", description: "" });
  const [programError, setProgramError] = useState("");
  const [newBlock, setNewBlock] = useState({ name: "", programId: "" });
  const [blockError, setBlockError] = useState("");
  const [newStudent, setNewStudent] = useState({
    name: "",
    programId: "",
    blockId: "",
  });

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
  const handleAddProgram = () => {
    if (!newProgram.name.trim()) return;

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

  const handleAddBlock = () => {
    if (!newBlock.name.trim() || !newBlock.programId) return;

    // Check if block name already exists in the same program
    const blockExists = blocks.some(
      (b) =>
        b.programId === newBlock.programId &&
        b.name.toLowerCase() === newBlock.name.trim().toLowerCase()
    );

    if (blockExists) {
      setBlockError("Block already exists in this program!");
      return;
    }

    const block: Block = {
      id: `block-${Date.now()}`,
      name: newBlock.name.trim(),
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
    const student: StudentV2 = {
      id: `s-${Date.now()}`,
      name: newStudent.name.trim(),
      blockId: newStudent.blockId,
    };
    setStudents((prev) => [...prev, student]);
    setNewStudent({ name: "", programId: "", blockId: "" });
    setShowAddStudentModal(false);
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleEditStudent = (student: StudentV2) => {
    setEditingStudent({ ...student });
    setShowEditStudentModal(true);
  };

  const handleSaveEditStudent = () => {
    if (!editingStudent || !editingStudent.name.trim()) return;
    setStudents((prev) =>
      prev.map((s) =>
        s.id === editingStudent.id
          ? { ...s, name: editingStudent.name.trim() }
          : s
      )
    );
    setShowEditStudentModal(false);
    setEditingStudent(null);
  };

  // Program overview data
  const programOverview = useMemo(() => {
    return programs.map((program) => {
      const programBlocks = blocks.filter((b) => b.programId === program.id);
      const blockIds = programBlocks.map((b) => b.id);
      const programStudents = students.filter((s) =>
        blockIds.includes(s.blockId)
      );
      return {
        ...program,
        blockCount: programBlocks.length,
        studentCount: programStudents.length,
        blocks: programBlocks.map((block) => ({
          ...block,
          studentCount: students.filter((s) => s.blockId === block.id).length,
        })),
      };
    });
  }, [programs, blocks, students]);

  return (
    <div className='p-6 space-y-6 min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-50 to-primary-50/30'>
      {/* Header */}
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 tracking-tight'>
            Class Dashboard
          </h1>
          <p className='text-neutral-600 mt-1'>
            Manage your programs, blocks, and students
          </p>
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

      {/* Program & Block Overview */}
      <Card>
        <h3 className='text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2'>
          <GraduationCap className='w-5 h-5 text-primary' />
          Programs & Blocks Overview
        </h3>
        <div className='space-y-6'>
          <AnimatePresence>
            {programOverview.map((program, index) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                className='border border-neutral-200 rounded-rd bg-white overflow-hidden'
              >
                {/* Program Header */}
                <div className='p-4 bg-gradient-to-r from-primary-50 to-white border-b border-neutral-200'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div>
                        <h4
                          className='text-lg font-bold text-white'
                          style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}
                        >
                          {program.name}
                        </h4>
                        {program.description && (
                          <p className='text-sm font-md'>
                            {program.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className='flex items-center gap-4'>
                      <div className='text-right'>
                        <p className='text-sm font-md'>
                          {program.blockCount} blocks • {program.studentCount}{" "}
                          students
                        </p>
                      </div>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleDeleteProgram(program.id)}
                        className='group text-neutral-400 hover:bg-support-superlight/30 border-none'
                      >
                        <Trash2 className='w-4 h-4 group-hover:text-error-default transition-colors' />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Blocks */}
                <div className='p-4'>
                  {program.blocks.length > 0 ? (
                    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
                      {program.blocks.map((block) => (
                        <div
                          key={block.id}
                          className='p-3 border border-neutral-200 rounded-rd bg-neutral-50 hover:border-primary-200 transition-colors'
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <Layers className='w-4 h-4 text-primary' />
                              <span className='font-medium text-neutral-900'>
                                {block.name}
                              </span>
                            </div>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleDeleteBlock(block.id)}
                              className='group text-neutral-400 hover:bg-support-superlight/30 border-none -mr-1'
                            >
                              <Trash2 className='w-3 h-3 group-hover:text-error-default transition-colors' />
                            </Button>
                          </div>
                          <p className='text-xs text-neutral-500 mt-1 ml-6'>
                            {block.studentCount} students
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-neutral-500 text-center py-4'>
                      No blocks yet. Add a block to this program.
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {programs.length === 0 && (
          <div className='text-center py-8'>
            <BookOpen className='w-12 h-12 text-neutral-300 mx-auto mb-3' />
            <p className='text-neutral-500'>
              No programs created yet. Add your first program!
            </p>
          </div>
        )}
      </Card>

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
          <div className='col-span-3'>Block</div>
          <div className='col-span-2 text-right'>Actions</div>
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
                className='grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-4 hover:bg-neutral-50/50 transition-colors'
              >
                <div
                  className='col-span-4 flex items-center gap-3 cursor-pointer group'
                  onClick={() => handleEditStudent(student)}
                >
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
                <div className='col-span-3'>
                  <span className='text-sm text-neutral-700'>
                    {getBlockName(student.blockId)}
                  </span>
                </div>
                <div className='col-span-2 flex justify-end'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleDeleteStudent(student.id)}
                    className='group text-neutral-400 hover:bg-support-superlight/30 border-none'
                  >
                    <Trash2 className='w-4 h-4 group-hover:text-error-default transition-colors' />
                  </Button>
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
        }}
        title='Add New Program'
        size='md'
      >
        <div className='space-y-4'>
          <div>
            <Input
              label='Program Name'
              value={newProgram.name}
              onChange={(value) => {
                setNewProgram((prev) => ({ ...prev, name: value }));
                setProgramError("");
              }}
              placeholder='e.g., BSCS-DS, BSIT, BSCE'
              required
            />
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
                setNewBlock((prev) => ({ ...prev, programId: e.target.value }));
                setBlockError("");
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
          <div>
            <Input
              label='Block Name'
              value={newBlock.name}
              onChange={(value) => {
                setNewBlock((prev) => ({ ...prev, name: value }));
                setBlockError("");
              }}
              placeholder='e.g., 4A, 4B, 3A'
              required
            />
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
        }}
        title='Add New Student'
        size='md'
      >
        <div className='space-y-4'>
          <Input
            label='Student Name'
            value={newStudent.name}
            onChange={(value) =>
              setNewStudent((prev) => ({ ...prev, name: value }))
            }
            placeholder='Enter full name...'
            required
          />
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
        }}
        title='Edit Student'
        size='md'
      >
        <div className='space-y-4'>
          <Input
            label='Student Name'
            value={editingStudent?.name || ""}
            onChange={(value) =>
              setEditingStudent((prev) =>
                prev ? { ...prev, name: value } : null
              )
            }
            placeholder='Enter full name...'
            required
          />
          <div className='flex justify-end gap-3 pt-4'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowEditStudentModal(false);
                setEditingStudent(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleSaveEditStudent}
              disabled={!editingStudent?.name.trim()}
            >
              <Pencil className='w-4 h-4 mr-2' />
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard_v2;
