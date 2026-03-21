export interface Program {
  id: string; // Changed to string for UUID (programs_lookup table)
  name: string;
  sectionCount?: number;
  studentCount?: number;
  tracks?: number;
}

export const initialNewProgramState = {
  name: "",
};
