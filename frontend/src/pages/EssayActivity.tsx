import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Pencil } from "lucide-react";
import Button from "../components/ui/Button.tsx";
import Modal from "../components/ui/Modal";
import {
  ACTIVITY_STORAGE_KEY,
  getActivitiesForBlock,
  loadActivities,
  saveActivities,
} from "../utils/activityStorage.ts";
import type { ActivityItem } from "../utils/activityStorage.ts";
import { readSecureParams } from "../utils/secureUrl";

type NewActivityState = {
  title: string;
  description: string;
};

const defaultNewActivity: NewActivityState = {
  title: "",
  description: "",
};

type StudentSummary = {
  id: string;
  blockId: string;
  activityId?: string | null;
};

interface ActivityListProps {
  students?: StudentSummary[];
}

const ActivityList: React.FC<ActivityListProps> = ({ students }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const secureParams = readSecureParams(window.location.search);
  const blockId = secureParams?.blockId || searchParams.get("blockId");
  const programId = secureParams?.programId || searchParams.get("programId");
  const programName = secureParams?.programName || searchParams.get("programName");
  const blockName = secureParams?.blockName || searchParams.get("blockName");
  const searchParamStudentCount =
    Number(secureParams?.studentCount || (searchParams.get("studentCount") ?? "0")) || 0;

  const activityTitleParam = secureParams?.activityTitle || searchParams.get("activityTitle");
  const headingTitle = blockName || "Essay Activity";

  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    loadActivities()
  );
  const [newActivity, setNewActivity] =
    useState<NewActivityState>(defaultNewActivity);
  const [error, setError] = useState("");
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteActivityIds, setPendingDeleteActivityIds] = useState<
    string[]
  >([]);
  const [deleteName, setDeleteName] = useState("");
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showEditActivityModal, setShowEditActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(
    null
  );
  const [originalActivity, setOriginalActivity] = useState<ActivityItem | null>(
    null
  );
  const [editActivityError, setEditActivityError] = useState("");

  const blockActivities = useMemo(() => {
    if (!blockId) return [];
    return getActivitiesForBlock(blockId, activities);
  }, [activities, blockId]);
  const visibleActivityIds = useMemo(
    () => blockActivities.map((activity) => activity.id),
    [blockActivities]
  );
  const areAllVisibleSelected =
    visibleActivityIds.length > 0 &&
    visibleActivityIds.every((id) => selectedActivityIds.includes(id));

  const activityStudentCounts = useMemo(() => {
    if (!students) {
      return {};
    }
    return students.reduce<Record<string, number>>((acc, student) => {
      if (!student.activityId || (blockId && student.blockId !== blockId)) {
        return acc;
      }
      acc[student.activityId] = (acc[student.activityId] ?? 0) + 1;
      return acc;
    }, {});
  }, [students, blockId]);

  const blockStudentCount = useMemo(() => {
    if (!blockId || !students) {
      return searchParamStudentCount;
    }
    return students.filter((student) => student.blockId === blockId).length;
  }, [blockId, students, searchParamStudentCount]);

  useEffect(() => {
    const defaultActivityTitle = "Essay Activity";
    if (activityTitleParam === defaultActivityTitle) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set("activityTitle", defaultActivityTitle);
    setSearchParams(params, { replace: true });
  }, [activityTitleParam, searchParams, setSearchParams]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_STORAGE_KEY) {
        setActivities(loadActivities());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    setSelectedActivityIds((prev) =>
      prev.filter((id) =>
        blockActivities.some((activity) => activity.id === id)
      )
    );
  }, [blockActivities]);

  const handleAddActivity = () => {
    if (!blockId) {
      setError("Missing block context. Please navigate from Blocks.");
      return;
    }

    if (!newActivity.title.trim()) {
      setError("Activity title is required.");
      return;
    }

    const normalizedTitle = newActivity.title.trim().toLowerCase();
    const duplicateActivity = blockActivities.some(
      (activity) => activity.title.trim().toLowerCase() === normalizedTitle
    );

    if (duplicateActivity) {
      setError("An activity with that name already exists for this block.");
      return;
    }

    const activity: ActivityItem = {
      id: `activity-${Date.now()}`,
      blockId,
      title: newActivity.title.trim(),
      description: newActivity.description.trim() || undefined,
      createdAt: new Date().toISOString(),
      submittedStudentIds: [],
    };

    const updated = [...activities, activity];
    setActivities(updated);
    saveActivities(updated);
    setNewActivity(defaultNewActivity);
    setError("");
    setShowAddActivityModal(false);
  };

  const handleDeleteActivities = (activityIds: string[]) => {
    if (activityIds.length === 0) return;
    const updated = activities.filter(
      (activity) => !activityIds.includes(activity.id)
    );
    setActivities(updated);
    saveActivities(updated);
  };

  const openEditActivityModal = (activity: ActivityItem) => {
    setEditingActivity({ ...activity });
    setOriginalActivity({ ...activity });
    setEditActivityError("");
    setShowEditActivityModal(true);
  };

  const closeEditActivityModal = () => {
    setShowEditActivityModal(false);
    setEditingActivity(null);
    setOriginalActivity(null);
    setEditActivityError("");
  };

  const handleUpdateActivity = () => {
    if (!editingActivity || !blockId) return;

    const trimmedTitle = editingActivity.title.trim();
    const trimmedDescription = editingActivity.description?.trim();

    if (!trimmedTitle) {
      setEditActivityError("Activity title is required.");
      return;
    }

    const normalizedTitle = trimmedTitle.toLowerCase();
    const duplicate = blockActivities.some(
      (activity) =>
        activity.id !== editingActivity.id &&
        activity.title.trim().toLowerCase() === normalizedTitle
    );

    if (duplicate) {
      setEditActivityError("Another activity with that name already exists.");
      return;
    }

    const updatedActivities = activities.map((activity) =>
      activity.id === editingActivity.id
        ? {
            ...activity,
            title: trimmedTitle,
            description: trimmedDescription || undefined,
            updatedAt: new Date().toISOString(),
          }
        : activity
    );

    setActivities(updatedActivities);
    saveActivities(updatedActivities);
    closeEditActivityModal();
  };

  const handleDeleteActivityFromEdit = () => {
    if (!editingActivity) return;
    handleDeleteActivities([editingActivity.id]);
    closeEditActivityModal();
  };

  const hasEditChanges = (() => {
    if (!editingActivity || !originalActivity) return false;
    const currentTitle = editingActivity.title.trim();
    const originalTitle = originalActivity.title.trim();
    const currentDescription = (editingActivity.description || "").trim();
    const originalDescription = (originalActivity.description || "").trim();
    return (
      currentTitle !== originalTitle ||
      currentDescription !== originalDescription
    );
  })();

  const navigateToStudentManagement = (activity: ActivityItem) => {
    if (!programId || !programName || !blockId) {
      console.warn(
        "Missing program or block context; cannot open student management view."
      );
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set("programId", programId);
    params.set("programName", programName);
    params.set("view", "students");
    params.set("blockId", blockId);
    if (blockName) {
      params.set("blockName", blockName);
    }
    const activityStudentCount = activityStudentCounts[activity.id] ?? 0;
    params.set("studentCount", String(activityStudentCount));
    params.set("activityTitle", activity.title);
    params.set("activityId", activity.id);

    if (location.pathname.toLowerCase() === "/classmanagement") {
      setSearchParams(params, { replace: true });
    } else {
      navigate(`/ClassManagement?${params.toString()}`);
    }
  };

  const handleActivityRowClick = (activity: ActivityItem) => {
    if (isDeleteMode) {
      toggleActivitySelection(activity.id);
      return;
    }
    navigateToStudentManagement(activity);
  };

  const toggleActivitySelection = (activityId: string) => {
    setSelectedActivityIds((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    );
  };

  const handleSelectAllVisibleActivities = (visibleIds: string[]) => {
    if (visibleIds.length === 0) {
      setSelectedActivityIds([]);
      return;
    }

    const alreadySelected = visibleIds.every((id) =>
      selectedActivityIds.includes(id)
    );
    setSelectedActivityIds(alreadySelected ? [] : visibleIds);
  };

  const exitDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedActivityIds([]);
    setPendingDeleteActivityIds([]);
    setDeleteName("");
  };

  const handleRemoveActivitiesAction = () => {
    if (blockActivities.length === 0) {
      return;
    }

    if (!isDeleteMode) {
      setIsDeleteMode(true);
      return;
    }

    if (selectedActivityIds.length === 0) {
      exitDeleteMode();
      return;
    }

    const selectedNames = blockActivities
      .filter((activity) => selectedActivityIds.includes(activity.id))
      .map((activity) => activity.title);

    setPendingDeleteActivityIds(selectedActivityIds);
    setDeleteName(
      selectedNames.length === 1
        ? selectedNames[0]
        : `${selectedNames.length} selected activities`
    );
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteActivityIds.length === 0) return;
    handleDeleteActivities(pendingDeleteActivityIds);
    setShowDeleteConfirm(false);
    exitDeleteMode();
  };

  if (!blockId) {
    return (
      <div className='p-6 space-y-4 min-h-screen bg-neutral-300/10'>
        <div className='p-4 bg-white border border-neutral-200 rounded-lg'>
          <h1 className='text-xl font-semibold text-neutral-900 mb-2'>
            Missing Block Information
          </h1>
          <p className='text-neutral-600'>
            Please select a block from Class Management before opening the
            activity list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6 space-y-6 min-h-screen bg-neutral-300/10'>
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
        <div className='flex items-center gap-3 flex-wrap'>
          <div className='space-y-1'>
            <h1 className='text-3xl font-bold text-neutral-900'>
              {headingTitle} Essay Activity
            </h1>
          </div>
        </div>
        <div className='flex flex-wrap gap-3'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShowAddActivityModal(true)}
            disabled={isDeleteMode}
            className={isDeleteMode ? "opacity-50 cursor-not-allowed" : ""}
          >
            Add Activity
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleRemoveActivitiesAction}
            disabled={blockActivities.length === 0}
            className={`text-error-default ${
              isDeleteMode
                ? "border border-error-default/40 bg-error-default/10"
                : ""
            } ${
              blockActivities.length === 0
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            Remove Activities
            {isDeleteMode && selectedActivityIds.length > 0
              ? ` (${selectedActivityIds.length})`
              : ""}
          </Button>
          {isDeleteMode && (
            <>
              <Button
                variant='ghost'
                size='sm'
                onClick={() =>
                  handleSelectAllVisibleActivities(visibleActivityIds)
                }
                disabled={visibleActivityIds.length === 0}
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
            Total Activities:{" "}
            <span className='font-semibold'>{blockActivities.length}</span>
          </p>
          <p>
            Total Students:{" "}
            <span className='font-semibold'>{blockStudentCount}</span>
          </p>
        </div>
      </div>

      {isDeleteMode && (
        <p className='text-sm text-error-default'>
          Select the activities you want to remove, then press Remove Activities
          again to confirm.
        </p>
      )}

      <div className='space-y-4'>
        <div className='space-y-4'>
          {blockActivities.length === 0 ? (
            <div className='p-6 border border-dashed border-neutral-300 rounded-rd bg-white text-neutral-500 text-center'>
              No activities yet. Use the Add Activity button above to create
              one.
            </div>
          ) : (
            blockActivities.map((activity) => {
              const isSelected = selectedActivityIds.includes(activity.id);
              const submittedCount = activity.submittedStudentIds.length;
              const rosterCount = activityStudentCounts[activity.id] ?? 0;
              const formatDateTime = (isoString: string) =>
                new Date(isoString).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });
              const formattedPostedDate = formatDateTime(activity.createdAt);
              const formattedUpdatedDate = activity.updatedAt
                ? formatDateTime(activity.updatedAt)
                : null;
              return (
                <div
                  key={activity.id}
                  className={`bg-white border border-neutral-200 rounded-rd p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                    isDeleteMode ? "cursor-pointer" : ""
                  } ${
                    isDeleteMode && isSelected
                      ? "ring-2 ring-primary shadow-lg bg-primary/5"
                      : ""
                  }`}
                  onClick={() => handleActivityRowClick(activity)}
                >
                  <div className='space-y-1'>
                    <h3 className='text-lg font-semibold text-neutral-900'>
                      {activity.title}
                    </h3>
                    {activity.description && (
                      <p className='text-sm text-neutral-600'>
                        {activity.description}
                      </p>
                    )}
                    <div className='flex flex-wrap gap-4 text-xs tracking-wide text-neutral-500 pt-2'>
                      <span>{rosterCount} students</span>
                      <span>
                        {submittedCount}{" "}
                        {submittedCount === 1 ? "submission" : "submissions"}
                      </span>
                      <span>Posted {formattedPostedDate}</span>
                      {formattedUpdatedDate && (
                        <span>Updated {formattedUpdatedDate}</span>
                      )}
                    </div>
                  </div>
                  {isDeleteMode ? (
                    <div
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-neutral-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className='w-3 h-3' />}
                    </div>
                  ) : (
                    <Button
                      variant='ghost'
                      className='text-primary'
                      onClick={(event) => {
                        event?.stopPropagation();
                        openEditActivityModal(activity);
                      }}
                    >
                      <Pencil className='w-4 h-4 mr-2' />
                      Edit
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <Modal
        isOpen={showAddActivityModal}
        onClose={() => {
          setShowAddActivityModal(false);
          setNewActivity(defaultNewActivity);
          setError("");
        }}
        title='Add Activity'
        size='md'
      >
        <div className='space-y-4'>
          <div className='space-y-3'>
            <div className='space-y-1'>
              <label className='text-sm font-medium text-neutral-700'>
                Title <span className='text-error-default'>*</span>
              </label>
              <input
                type='text'
                value={newActivity.title}
                onChange={(event) =>
                  setNewActivity((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder='e.g., Midterm Review Session'
              />
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium text-neutral-700'>
                Description
              </label>
              <textarea
                value={newActivity.description}
                onChange={(event) =>
                  setNewActivity((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]'
                placeholder='Add optional notes or context'
              />
            </div>
            {error && <p className='text-sm text-error-default'>{error}</p>}
          </div>
          <div className='flex justify-end gap-3 pt-4'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowAddActivityModal(false);
                setNewActivity(defaultNewActivity);
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button variant='primary' onClick={handleAddActivity}>
              Add Activity
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditActivityModal}
        onClose={closeEditActivityModal}
        title='Edit Activity'
        size='md'
      >
        {editingActivity && (
          <div className='space-y-4'>
            <div className='space-y-1'>
              <label className='text-sm font-medium text-neutral-700'>
                Title <span className='text-error-default'>*</span>
              </label>
              <input
                type='text'
                value={editingActivity.title}
                onChange={(event) =>
                  setEditingActivity((prev) =>
                    prev
                      ? {
                          ...prev,
                          title: event.target.value,
                        }
                      : prev
                  )
                }
                className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder='Activity title'
              />
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium text-neutral-700'>
                Description
              </label>
              <textarea
                value={editingActivity.description ?? ""}
                onChange={(event) =>
                  setEditingActivity((prev) =>
                    prev
                      ? {
                          ...prev,
                          description: event.target.value,
                        }
                      : prev
                  )
                }
                className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]'
                placeholder='Optional description'
              />
            </div>
            {editActivityError && (
              <p className='text-sm text-error-default'>{editActivityError}</p>
            )}
            <div className='flex flex-wrap items-center justify-between gap-3 pt-4'>
              <Button
                variant='ghost'
                className='text-error-default'
                onClick={handleDeleteActivityFromEdit}
              >
                Delete Activity
              </Button>
              <div className='flex gap-3'>
                <Button variant='ghost' onClick={closeEditActivityModal}>
                  Cancel
                </Button>
                <Button
                  variant='primary'
                  onClick={handleUpdateActivity}
                  disabled={!hasEditChanges}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPendingDeleteActivityIds([]);
          setDeleteName("");
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
            {pendingDeleteActivityIds.length > 1 && (
              <ul className='list-disc list-inside text-sm text-neutral-600'>
                {blockActivities
                  .filter((activity) =>
                    pendingDeleteActivityIds.includes(activity.id)
                  )
                  .map((activity) => (
                    <li key={activity.id}>{activity.title}</li>
                  ))}
              </ul>
            )}
            <span className='block text-sm text-error-default'>
              This will permanently delete the selected activities.
            </span>
          </div>
          <div className='flex justify-end gap-3 pt-2'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowDeleteConfirm(false);
                setPendingDeleteActivityIds([]);
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

export default ActivityList;
