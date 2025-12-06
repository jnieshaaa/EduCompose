import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Users, Search, Plus, Check, ListChecks } from "lucide-react";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useSearchParams } from "react-router-dom";
import {
  ACTIVITY_STORAGE_KEY,
  buildActivityCountMap,
  loadActivities,
} from "../utils/activityStorage.ts";

interface Student {
  id: string;
  name: string;
  blockId: string;
  activityId?: string | null;
}

interface BlockType {
  id: string;
  name: string;
  programId: string;
}

interface BlockPageProps {
  programId: string;
  programName: string;
  blocks: BlockType[];
  setBlocks: React.Dispatch<React.SetStateAction<BlockType[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

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

const BlockPage: React.FC<BlockPageProps> = ({
  programId,
  programName,
  blocks,
  setBlocks,
  students,
  setStudents,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") ?? ""
  );
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [deleteName, setDeleteName] = useState("");
  const [newBlock, setNewBlock] = useState({ name: "" });
  const [blockError, setBlockError] = useState("");
  const [showBlockSuggestions, setShowBlockSuggestions] = useState(false);
  const [filteredBlockSuggestions, setFilteredBlockSuggestions] = useState<
    string[]
  >([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [pendingDeleteBlockIds, setPendingDeleteBlockIds] = useState<string[]>(
    []
  );
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>(
    {}
  );

  const programBlocks = useMemo(
    () => blocks.filter((block) => block.programId === programId),
    [blocks, programId]
  );

  const totalActivities = useMemo(() => {
    return programBlocks.reduce(
      (sum, block) => sum + (activityCounts[block.id] || 0),
      0
    );
  }, [activityCounts, programBlocks]);

  const blockOverview = useMemo(() => {
    return programBlocks
      .filter((block) =>
        block.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((block) => ({
        ...block,
        studentCount: students.filter((student) => student.blockId === block.id)
          .length,
      }));
  }, [programBlocks, students, searchQuery]);

  const totalBlocks = programBlocks.length;
  const visibleBlockIds = useMemo(
    () => blockOverview.map((block) => block.id),
    [blockOverview]
  );
  const areAllVisibleSelected =
    visibleBlockIds.length > 0 &&
    visibleBlockIds.every((id) => selectedBlockIds.includes(id));

  useEffect(() => {
    const paramQuery = searchParams.get("q") ?? "";
    setSearchQuery((prev) => (prev === paramQuery ? prev : paramQuery));
  }, [searchParams]);

  useEffect(() => {
    setSelectedBlockIds((prev) =>
      prev.filter((id) => programBlocks.some((block) => block.id === id))
    );
  }, [programBlocks]);

  const refreshActivityCounts = useCallback(() => {
    const activities = loadActivities();
    setActivityCounts(buildActivityCountMap(activities));
  }, []);

  useEffect(() => {
    refreshActivityCounts();
  }, [refreshActivityCounts]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_STORAGE_KEY) {
        refreshActivityCounts();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshActivityCounts]);

  const handleBlockNameChange = (value: string) => {
    const trimmed = value.slice(0, 2).toUpperCase();
    setNewBlock({ name: trimmed });
    setBlockError("");

    if (trimmed.length > 0) {
      const existingBlocks = programBlocks.map((block) =>
        block.name.toUpperCase()
      );
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

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set("q", value);
    } else {
      nextParams.delete("q");
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleAddBlock = () => {
    if (!newBlock.name.trim()) return;

    const blockName = newBlock.name.trim().toUpperCase();
    const validBlockPattern = /^[1-4][A-D]$/;

    if (!validBlockPattern.test(blockName)) {
      setBlockError(
        "Block must be number 1-4 followed by letter A-D (e.g., 1A, 2B)"
      );
      return;
    }

    const blockExists = programBlocks.some(
      (block) => block.name.toUpperCase() === blockName
    );

    if (blockExists) {
      setBlockError("Block already exists in this program!");
      return;
    }

    const newBlockEntry: BlockType = {
      id: `block-${Date.now()}`,
      name: blockName,
      programId,
    };

    setBlocks((prev) => [...prev, newBlockEntry]);
    setNewBlock({ name: "" });
    setBlockError("");
    setShowAddBlockModal(false);
    setShowBlockSuggestions(false);
    setFilteredBlockSuggestions([]);
  };

  const toggleBlockSelection = (blockId: string) => {
    setSelectedBlockIds((prev) =>
      prev.includes(blockId)
        ? prev.filter((id) => id !== blockId)
        : [...prev, blockId]
    );
  };

  const exitDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedBlockIds([]);
    setPendingDeleteBlockIds([]);
  };

  const handleSelectAllVisibleBlocks = (visibleIds: string[]) => {
    if (visibleIds.length === 0) {
      setSelectedBlockIds([]);
      return;
    }

    const alreadySelected = visibleIds.every((id) =>
      selectedBlockIds.includes(id)
    );
    setSelectedBlockIds(alreadySelected ? [] : visibleIds);
  };

  const handleDeleteBlocks = (blockIds: string[]) => {
    if (blockIds.length === 0) return;

    setBlocks((prev) => prev.filter((block) => !blockIds.includes(block.id)));
    setStudents((prev) =>
      prev.filter((student) => !blockIds.includes(student.blockId))
    );
  };

  const handleNavigateToEssayActivity = (
    block: BlockType & { studentCount?: number }
  ) => {
    const blockStudentCount =
      typeof block.studentCount === "number"
        ? block.studentCount
        : students.filter((student) => student.blockId === block.id).length;
    const activityParams = new URLSearchParams(searchParams);
    activityParams.set("programId", programId);
    activityParams.set("programName", programName);
    activityParams.set("view", "activities");
    activityParams.set("blockId", block.id);
    activityParams.set("blockName", block.name);
    activityParams.set("studentCount", String(blockStudentCount));
    setSearchParams(activityParams, { replace: true });
  };

  const handleRemoveBlockAction = () => {
    if (totalBlocks === 0) {
      return;
    }

    if (!isDeleteMode) {
      setIsDeleteMode(true);
      return;
    }

    if (selectedBlockIds.length === 0) {
      exitDeleteMode();
      return;
    }

    const selectedNames = programBlocks
      .filter((block) => selectedBlockIds.includes(block.id))
      .map((block) => block.name);

    setPendingDeleteBlockIds(selectedBlockIds);
    setDeleteId(selectedBlockIds[0] ?? "");
    setDeleteName(
      selectedNames.length === 1
        ? selectedNames[0]
        : `${selectedNames.length} selected blocks`
    );
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    const idsToDelete =
      pendingDeleteBlockIds.length > 0
        ? pendingDeleteBlockIds
        : deleteId
        ? [deleteId]
        : [];
    handleDeleteBlocks(idsToDelete);
    setShowDeleteConfirm(false);
    setDeleteId("");
    setDeleteName("");
    setPendingDeleteBlockIds([]);
    exitDeleteMode();
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
        <div className='flex items-center gap-4'>
          <div>
            <h1 className='text-3xl font-bold text-neutral-900 tracking-tight'>
              {programName}
            </h1>
          </div>
        </div>

        <div className='flex flex-wrap gap-3'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowAddBlockModal(true)}
            disabled={isDeleteMode}
            className={isDeleteMode ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Layers className='w-4 h-4 mr-2' />
            Add Block
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleRemoveBlockAction}
            disabled={totalBlocks === 0}
            className={`text-error-default ${
              isDeleteMode
                ? "border border-error-default/40 bg-error-default/10"
                : ""
            } ${totalBlocks === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Remove Block
            {isDeleteMode && selectedBlockIds.length > 0
              ? ` (${selectedBlockIds.length})`
              : ""}
          </Button>
          {isDeleteMode && (
            <>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleSelectAllVisibleBlocks(visibleBlockIds)}
                disabled={visibleBlockIds.length === 0}
                aria-pressed={areAllVisibleSelected}
                className='border border-primary/30 bg-primary/5 text-primary'
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

      <div className='flex flex-wrap items-center justify-between gap-10 text-sm text-neutral-700 w-full'>
        <div className='flex gap-10'>
          <p>
            Total Blocks: <span className='font-semibold'>{totalBlocks}</span>
          </p>
          <p>
            Total Activities:{" "}
            <span className='font-semibold'>{totalActivities}</span>
          </p>
        </div>

        <div className='relative max-w-md'>
          <Search className='w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2' />
          <input
            type='text'
            value={searchQuery}
            onChange={(event) => handleSearchInputChange(event.target.value)}
            placeholder='Search blocks...'
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-rd bg-white focus:outline-none focus:ring-2 focus:ring-primary'
          />
        </div>
      </div>

      {isDeleteMode && (
        <p className='text-sm text-error-default'>
          Select the blocks you want to remove, then press Remove Block again to
          confirm.
        </p>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        <AnimatePresence>
          {blockOverview.map((block, index) => {
            const isSelected = selectedBlockIds.includes(block.id);
            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                className={`border border-neutral-200 rounded-rd bg-white overflow-hidden transition-shadow ${
                  isDeleteMode
                    ? "cursor-pointer"
                    : "cursor-default hover:shadow-md"
                } ${
                  isSelected ? "ring-2 ring-primary shadow-lg bg-primary/5" : ""
                }`}
                onClick={() => {
                  if (isDeleteMode) {
                    toggleBlockSelection(block.id);
                  } else {
                    handleNavigateToEssayActivity(block);
                  }
                }}
              >
                <div className='p-4 shadow-lg bg-white'>
                  <div className='flex items-center justify-between mb-3'>
                    <h4 className='text-lg font-bold text-neutral-900'>
                      {block.name}
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
                        <Users className='w-5 h-5 text-primary' />
                        <p className='text-2xl font-bold text-neutral-900'>
                          {block.studentCount}
                        </p>
                      </div>
                      <p className='text-xs text-neutral-500 mt-1'>Students</p>
                    </div>
                    <div className='flex-1 p-3 bg-neutral-100 rounded-rd text-center'>
                      <div className='flex items-center justify-center gap-2'>
                        <ListChecks className='w-5 h-5 text-primary' />
                        <p className='text-2xl font-bold text-neutral-900'>
                          {activityCounts[block.id] ?? 0}
                        </p>
                      </div>
                      <p className='text-xs text-neutral-500 mt-1'>
                        Activities
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {programBlocks.length === 0 && (
          <div className='text-center py-8 col-span-full'>
            <Layers className='w-12 h-12 text-neutral-300 mx-auto mb-3' />
            <p className='text-neutral-500'>
              No blocks created yet. Add your first block!
            </p>
          </div>
        )}
      </div>

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
              Block <span className='text-error-default'>*</span>
            </label>
            <input
              type='text'
              value={newBlock.name}
              onChange={(event) => handleBlockNameChange(event.target.value)}
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

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteId("");
          setDeleteName("");
          setPendingDeleteBlockIds([]);
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
            {pendingDeleteBlockIds.length > 1 && (
              <ul className='list-disc list-inside text-sm text-neutral-600'>
                {programBlocks
                  .filter((block) => pendingDeleteBlockIds.includes(block.id))
                  .map((block) => (
                    <li key={block.id}>{block.name}</li>
                  ))}
              </ul>
            )}
            <span className='block text-sm text-error-default'>
              This will also delete all students assigned to the selected block
              {pendingDeleteBlockIds.length > 1 ? "s" : ""}.
            </span>
          </div>
          <div className='flex justify-end gap-3 pt-2'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteId("");
                setDeleteName("");
                setPendingDeleteBlockIds([]);
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

export default BlockPage;
