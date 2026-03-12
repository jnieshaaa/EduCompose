export interface Program {
  id?: string;
  department_id?: string;
  name: string;
  abbr: string;
  // For joined data
  departments?: { name: string };
  schools?: { name: string };
}

export interface Block {
  id: string;
  program_id: string;
  year_level: number;
  name: string;
  created_at?: string;
  // Joined data
  programs_lookup?: Program;
}

export interface Course {
  id: string;
  school_id: string;
  department_id?: string;
  program_id?: string;
  user_id?: string;
  course_code: string;
  course_title: string;
  units: number;
  year_level?: string;
  semester?: string;
  department?: string; // Add this
  created_at?: string;
  // For joined data
  schools?: { name: string };
  departments?: { name: string };
  programs_lookup?: { name: string };
  users?: { first_name: string; last_name: string };
}


export interface Section {
  id: string; // This will now represent the assignment ID or block ID depending on context
  course_id: string;
  block_id: string;
  name: string; // The specific block name (e.g., "1A")
  program_id?: string;
  year_level?: number;
  term: string;
  academic_year: string;
  students_estimated: number;
  essays_estimated: number;
  created_at: string;
  // For joined data
  courses?: Course;
  blocks?: Block;
}

export interface Department {
  id?: string;
  school_id?: string;
  code: string;
  name: string;
  programs: Program[];
}

export interface School {
  id?: string;
  name: string;
  code: string;
  departments: Department[];
  courses?: Course[];
}

