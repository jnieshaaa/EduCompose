/**
 * Utility functions for name operations
 */

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
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}

