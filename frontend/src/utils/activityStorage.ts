export const ACTIVITY_STORAGE_KEY = "educompose.activities";

export type ActivityItem = {
  id: string;
  blockId: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  submittedStudentIds: string[];
};

const hasBrowserStorage =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const safeParseActivities = (raw: string | null): ActivityItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    let legacyCounter = 0;
    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null
      )
      .map((item) => {
        const id =
          typeof item.id === "string"
            ? item.id
            : `legacy-${Date.now()}-${legacyCounter++}`;
        const blockId =
          typeof item.blockId === "string" ? item.blockId : "unknown-block";
        const title =
          typeof item.title === "string" ? item.title : "Untitled Activity";
        const description =
          typeof item.description === "string" ? item.description : undefined;
        const createdAt =
          typeof item.createdAt === "string"
            ? item.createdAt
            : new Date().toISOString();
        const updatedAt =
          typeof item.updatedAt === "string" ? item.updatedAt : undefined;
        const submittedStudentIds = Array.isArray(item.submittedStudentIds)
          ? item.submittedStudentIds.filter(
              (entry): entry is string => typeof entry === "string"
            )
          : [];

        return {
          id,
          blockId,
          title,
          description,
          createdAt,
          updatedAt,
          submittedStudentIds,
        };
      });
  } catch (error) {
    console.warn("Failed to parse activities from storage:", error);
    return [];
  }
};

export const loadActivities = (): ActivityItem[] => {
  if (!hasBrowserStorage) return [];
  const raw = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
  return safeParseActivities(raw);
};

export const saveActivities = (activities: ActivityItem[]): void => {
  if (!hasBrowserStorage) return;
  try {
    window.localStorage.setItem(
      ACTIVITY_STORAGE_KEY,
      JSON.stringify(activities)
    );
  } catch (error) {
    console.warn("Failed to save activities to storage:", error);
  }
};

export const getActivitiesForBlock = (
  blockId: string,
  activities?: ActivityItem[]
): ActivityItem[] => {
  const source = activities ?? loadActivities();
  return source.filter((activity) => activity.blockId === blockId);
};

export const buildActivityCountMap = (
  activities: ActivityItem[]
): Record<string, number> => {
  return activities.reduce<Record<string, number>>((acc, activity) => {
    acc[activity.blockId] = (acc[activity.blockId] ?? 0) + 1;
    return acc;
  }, {});
};
