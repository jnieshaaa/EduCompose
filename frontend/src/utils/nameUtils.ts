/**
 * Utility functions for name operations
 */

export interface NameParts {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
}

/**
 * Build a full display name from name parts
 * @param firstName - First name
 * @param middleName - Middle name (optional)
 * @param lastName - Last name
 * @param fallback - Fallback value if all names are empty
 * @returns Formatted full name
 */
export const buildFullName = (
  firstName?: string | null,
  middleName?: string | null,
  lastName?: string | null,
  fallback: string = "Unknown",
): string => {
  const parts = [firstName, middleName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : fallback;
};

/**
 * Build a full display name from an object with name properties
 * @param student - Object containing first_name, middle_name, last_name
 * @param fallback - Fallback value if all names are empty
 * @returns Formatted full name
 */
export const buildFullNameFromObject = (
  student: NameParts,
  fallback: string = "Unknown",
): string => {
  return buildFullName(
    student.first_name,
    student.middle_name,
    student.last_name,
    fallback,
  );
};

/**
 * Generate initials from a full name
 * Takes the first letter of each word in the name
 * Example: "Junie Abella Antina" -> "JAA"
 * Example: "John Doe" -> "JD"
 */
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName || !fullName.trim()) {
    return "U"; // Default to "U" for User if no name
  }

  const nameParts = fullName.trim().split(/\s+/);
  const initials = nameParts
    .map((part) => (part?.charAt(0) || "").toUpperCase())
    .join("");

  return initials || "U";
}
