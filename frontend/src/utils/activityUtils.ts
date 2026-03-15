import type {
  Course,
  Block,
  Rubric,
} from "../types/activityTypes";

/**
 * Helper to get a human-readable label for a single course
 */
export const getCourseLabel = (
  courseId: string | "all",
  courses: Course[]
): string =>
  courseId === "all"
    ? "All Courses"
    : courses.find((c) => c.id === courseId)?.name ?? "Unknown";

/**
 * Helper to get a human-readable label for a single block
 */
export const getBlockLabel = (
  blockId: string | "all",
  blocks: Block[]
): string =>
  blockId === "all"
    ? "All Sections"
    : blocks.find((b) => b.id === blockId)?.name ?? "Unknown";

/**
 * Helper to get a human-readable label for a rubric
 */
export const getRubricLabel = (
  rubricId: string | null,
  rubrics: Rubric[]
): string | null =>
  rubricId ? rubrics.find((r) => r.id === rubricId)?.name ?? "Unknown" : null;

/**
 * Helper to get a comma-separated list of course labels
 */
export const getCoursesLabel = (
  courseIds: string[] | undefined,
  courses: Course[]
): string => {
  if (!courseIds || courseIds.length === 0) return "No Course";
  return courseIds
    .map((id) => courses.find((c) => c.id === id)?.name ?? "Unknown")
    .join(", ");
};

/**
 * Helper to get a comma-separated list of block labels
 */
export const getBlocksLabel = (
  blockIds: string[] | undefined,
  blocks: Block[]
): string => {
  if (!blockIds || blockIds.length === 0) return "No Block";
  return blockIds
    .map((id) => blocks.find((b) => b.id === id)?.name ?? "Unknown")
    .join(", ");
};

/**
 * Helper to get the status (color and label) for a due date
 */
export const getDueDateStatus = (dueDate?: string) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0)
    return {
      label: "Overdue",
      color: "bg-error-default/10 text-error-default border-error-default/20",
    };
  if (diffDays <= 3)
    return {
      label: `${diffDays}d left`,
      color:
        "bg-warning-default/10 text-warning-default border-warning-default/20",
    };
  if (diffDays <= 7)
    return {
      label: `${diffDays}d left`,
      color: "bg-info-default/10 text-info-default border-info-default/20",
    };
  return {
    label: dueDate,
    color: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };
};
