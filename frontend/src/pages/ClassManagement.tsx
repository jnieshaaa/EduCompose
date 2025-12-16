import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BookOpen, Layers, Search, Users, Check } from "lucide-react";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import BlockPage from "./Block";
import StudentPage from "./Student";
import EssayActivity from "./EssayActivity";
import {
  PROGRAM_SUGGESTIONS,
  BLOCK_CODE_OPTIONS,
} from "../data/classOptions";

// Types
interface Program {
  id: string;
  name: string;
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
  activityId?: string | null;
}

// Empty initial data
const initialPrograms: Program[] = [];
const initialBlocks: Block[] = [];
const initialStudents: StudentV2[] = [];

const ClassManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");

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

  // Selected program for Block view
  const [selectedProgram, setSelectedProgram] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Sync selected program with URL search params
  useEffect(() => {
    const programId = searchParams.get("programId");
    const programName = searchParams.get("programName");
    if (programId && programName) {
      setSelectedProgram({ id: programId, name: programName });
    } else {
      setSelectedProgram(null);
    }
  }, [searchParams]);

  useEffect(() => {
    setSelectedProgramIds((prev) =>
      prev.filter((id) => programs.some((program) => program.id === id))
    );
  }, [programs]);

  // Handler to select a program and update URL
  const handleSelectProgram = (program: { id: string; name: string }) => {
    setSearchParams({ programId: program.id, programName: program.name });
  };

  const toggleProgramSelection = (programId: string) => {
    setSelectedProgramIds((prev) =>
      prev.includes(programId)
        ? prev.filter((id) => id !== programId)
        : [...prev, programId]
    );
  };

  const exitDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedProgramIds([]);
    setPendingDeleteProgramIds([]);
  };

  const handleSelectAllVisiblePrograms = (visibleIds: string[]) => {
    if (visibleIds.length === 0) {
      setSelectedProgramIds([]);
      return;
    }

    const alreadySelected = visibleIds.every((id) =>
      selectedProgramIds.includes(id)
    );

    setSelectedProgramIds(alreadySelected ? [] : visibleIds);
  };

  const handleRemoveProgramAction = () => {
    if (totalPrograms === 0) {
      return;
    }

    if (!isDeleteMode) {
      setIsDeleteMode(true);
      return;
    }

    if (selectedProgramIds.length === 0) {
      exitDeleteMode();
      return;
    }

    const selectedNames = programs
      .filter((program) => selectedProgramIds.includes(program.id))
      .map((program) => program.name);

    setPendingDeleteProgramIds(selectedProgramIds);
    setDeleteType("program");
    setDeleteName(
      selectedNames.length === 1
        ? selectedNames[0]
        : `${selectedNames.length} selected programs`
    );
    setShowDeleteConfirm(true);
  };

  // Modals
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);

  // Delete confirmation modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<"program" | "block" | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string>("");
  const [deleteName, setDeleteName] = useState<string>("");
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [pendingDeleteProgramIds, setPendingDeleteProgramIds] = useState<
    string[]
  >([]);

  // Form states
  const [newProgram, setNewProgram] = useState({ name: "" });
  const [programError, setProgramError] = useState("");
  const [showProgramSuggestions, setShowProgramSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [newBlock, setNewBlock] = useState({ name: "", programId: "" });
  const [blockError, setBlockError] = useState("");
  const [showBlockSuggestions, setShowBlockSuggestions] = useState(false);
  const [filteredBlockSuggestions, setFilteredBlockSuggestions] = useState<
    string[]
  >([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const totalPrograms = programs.length;
  const totalBlocks = blocks.length;

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

    // Validate: only letters, spaces, and dashes allowed
    const validNamePattern = /^[A-Za-z\s-]+$/;
    if (!validNamePattern.test(newProgram.name.trim())) {
      setProgramError(
        "Program name must contain only letters, spaces, and dashes (no numbers or symbols)"
      );
      return;
    }

    // Validate: maximum 10 letters
    const letterCount = (newProgram.name.trim().match(/[A-Za-z]/g) || [])
      .length;
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
    };
    setPrograms((prev) => [...prev, program]);
    setNewProgram({ name: "" });
    setProgramError("");
    setShowAddProgramModal(false);
  };

  const handleDeletePrograms = (programIds: string[]) => {
    if (programIds.length === 0) return;

    const programBlocks = blocks.filter((b) =>
      programIds.includes(b.programId)
    );
    const blockIds = programBlocks.map((b) => b.id);

    setPrograms((prev) => prev.filter((p) => !programIds.includes(p.id)));
    setBlocks((prev) => prev.filter((b) => !programIds.includes(b.programId)));
    setStudents((prev) => prev.filter((s) => !blockIds.includes(s.blockId)));
  };

  const handleBlockNameChange = (value: string) => {
    const trimmed = value.slice(0, 2).toUpperCase();
    setNewBlock((prev) => ({ ...prev, name: trimmed }));
    setBlockError("");

    if (trimmed.length > 0) {
      // Get existing blocks for selected program
      const existingBlocks = blocks
        .filter((b) => b.programId === newBlock.programId)
        .map((b) => b.name.toUpperCase());

      const filtered = BLOCK_CODE_OPTIONS.filter(
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

  const handleConfirmDelete = () => {
    if (deleteType === "program") {
      const idsToDelete =
        pendingDeleteProgramIds.length > 0
          ? pendingDeleteProgramIds
          : deleteId
          ? [deleteId]
          : [];
      handleDeletePrograms(idsToDelete);
      setPendingDeleteProgramIds([]);
      exitDeleteMode();
    } else if (deleteType === "block") {
      handleDeleteBlock(deleteId);
    }
    setShowDeleteConfirm(false);
    setDeleteType(null);
    setDeleteId("");
    setDeleteName("");
  };

  // Program overview data with search filter
  const programOverview = useMemo(() => {
    return programs
      .filter((program) =>
        program.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((program) => {
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
  }, [programs, blocks, students, searchQuery]);
  const visibleProgramIds = useMemo(
    () => programOverview.map((program) => program.id),
    [programOverview]
  );
  const areAllVisibleSelected =
    visibleProgramIds.length > 0 &&
    visibleProgramIds.every((id) => selectedProgramIds.includes(id));

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

  // If a program is selected, show Activity view
  if (selectedProgram && view === "activities") {
    return (
      <div className='p-6 min-h-screen bg-neutral-300/10'>
        <EssayActivity students={students} />
      </div>
    );
  }

  // If a program is selected, show Student view
  if (selectedProgram && view === "students") {
    return (
      <div className='p-6 min-h-screen bg-neutral-300/10'>
        <StudentPage
          programId={selectedProgram.id}
          programName={selectedProgram.name}
          blocks={blocks}
          students={students}
          setStudents={setStudents}
        />
      </div>
    );
  }

  // If a program is selected, show Block view
  if (selectedProgram) {
    return (
      <div className='p-6 min-h-screen bg-neutral-300/10'>
        <BlockPage
          programId={selectedProgram.id}
          programName={selectedProgram.name}
          blocks={blocks}
          setBlocks={setBlocks}
          students={students}
          setStudents={setStudents}
        />
      </div>
    );
  }

  return (
    <div className='p-6 space-y-6 min-h-screen bg-neutral-300/10'>
      {/* Header */}
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold text-neutral-900 tracking-tight'>
            Class Management
          </h1>
        </div>
        <div className='flex flex-wrap gap-3'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowAddProgramModal(true)}
            disabled={isDeleteMode}
            className={isDeleteMode ? "opacity-50 cursor-not-allowed" : ""}
          >
            <BookOpen className='w-4 h-4 mr-2' />
            Add Program
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleRemoveProgramAction}
            className={`text-error-default ${
              isDeleteMode
                ? "border border-error-default/40 bg-error-default/10"
                : ""
            } ${totalPrograms === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={totalPrograms === 0}
          >
            Remove Program
            {isDeleteMode && selectedProgramIds.length > 0
              ? ` (${selectedProgramIds.length})`
              : ""}
          </Button>
          {isDeleteMode && (
            <>
              <Button
                variant='ghost'
                size='sm'
                onClick={() =>
                  handleSelectAllVisiblePrograms(visibleProgramIds)
                }
                disabled={visibleProgramIds.length === 0}
                className='border border-primary/30 bg-primary/5 text-primary'
                aria-pressed={areAllVisibleSelected}
              >
                Select All
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={exitDeleteMode}
                className='text-neutral-600'
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats + Search Bar Container */}
      <div className='flex flex-wrap items-center justify-between gap-10 text-sm text-neutral-700 w-full'>
        {/* Left: Stats */}
        <div className='flex gap-10'>
          <p>
            Total Programs:{" "}
            <span className='font-semibold'>{totalPrograms}</span>
          </p>
          <p>
            Total Blocks: <span className='font-semibold'>{totalBlocks}</span>
          </p>
        </div>

        {/* Right: Search Bar */}
        <div className='relative max-w-md'>
          <Search className='w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2' />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search programs...'
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-rd bg-white focus:outline-none focus:ring-2 focus:ring-primary'
          />
        </div>
      </div>

      {isDeleteMode && (
        <p className='text-sm text-error-default'>
          Select the programs you want to remove, then press Remove Program
          again to confirm.
        </p>
      )}

      {/* Program & Block Overview */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        <AnimatePresence>
          {programOverview.map((program, index) => {
            const isSelected = selectedProgramIds.includes(program.id);
            return (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                className={`border border-neutral-200 rounded-rd bg-white overflow-hidden cursor-pointer transition-shadow ${
                  isSelected
                    ? "ring-2 ring-primary shadow-lg bg-primary/5"
                    : "hover:shadow-md"
                }`}
                onClick={() =>
                  isDeleteMode
                    ? toggleProgramSelection(program.id)
                    : handleSelectProgram({
                        id: program.id,
                        name: program.name,
                      })
                }
              >
                <div className='p-4 shadow-lg bg-white'>
                  <div className='flex items-center justify-between mb-3'>
                    <h4 className='text-lg font-bold text-neutral-900'>
                      {program.name}
                    </h4>
                    {isDeleteMode && (
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? "border-primary bg-primary text-white"
                            : "border-neutral-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className='w-3 h-3' />}
                      </div>
                    )}
                  </div>
                  <div className='flex gap-4'>
                    <div className='flex-1 p-3 bg-neutral-100 rounded-rd text-center'>
                      <div className='flex items-center justify-center gap-2'>
                        <Layers className='w-5 h-5 text-primary' />
                        <p className='text-2xl font-bold text-neutral-900'>
                          {program.blockCount}
                        </p>
                      </div>
                      <p className='text-xs text-neutral-500 mt-1'>Blocks</p>
                    </div>
                    <div className='flex-1 p-3 bg-neutral-100 rounded-rd text-center'>
                      <div className='flex items-center justify-center gap-2'>
                        <Users className='w-5 h-5 text-primary' />
                        <p className='text-2xl font-bold text-neutral-900'>
                          {program.studentCount}
                        </p>
                      </div>
                      <p className='text-xs text-neutral-500 mt-1'>Students</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {programs.length === 0 && (
          <div className='text-center py-8 col-span-full'>
            <BookOpen className='w-12 h-12 text-neutral-300 mx-auto mb-3' />
            <p className='text-neutral-500'>
              No programs created yet. Add your first program!
            </p>
          </div>
        )}
      </div>

      {/* Add Program Modal */}
      <Modal
        isOpen={showAddProgramModal}
        onClose={() => {
          setShowAddProgramModal(false);
          setProgramError("");
          setNewProgram({ name: "" });
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
          <div className='flex justify-end gap-3 pt-4'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowAddProgramModal(false);
                setProgramError("");
                setNewProgram({ name: "" });
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteType(null);
          setDeleteId("");
          setDeleteName("");
          setPendingDeleteProgramIds([]);
        }}
        title='Confirm Removing'
        size='sm'
      >
        <div className='space-y-4'>
          <div className='text-neutral-700 space-y-2'>
            <p>
              Are you sure you want to remove{" "}
              <span className='font-semibold'>{deleteName}</span>?
            </p>
            {deleteType === "program" && pendingDeleteProgramIds.length > 1 && (
              <ul className='list-disc list-inside text-sm text-neutral-600'>
                {programs
                  .filter((program) =>
                    pendingDeleteProgramIds.includes(program.id)
                  )
                  .map((program) => (
                    <li key={program.id}>{program.name}</li>
                  ))}
              </ul>
            )}
            {deleteType === "program" && (
              <span className='block text-sm text-error-default'>
                This will also delete all blocks and students in the selected
                programs.
              </span>
            )}
            {deleteType === "block" && (
              <span className='block text-sm text-error-default'>
                This will also delete all students in this block.
              </span>
            )}
          </div>
          <div className='flex justify-end gap-3 pt-2'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteType(null);
                setDeleteId("");
                setDeleteName("");
                setPendingDeleteProgramIds([]);
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

export default ClassManagement;
