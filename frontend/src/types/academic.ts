export interface Program {
  id?: string;
  department_id?: string;
  name: string;
  abbr: string;
  // For joined data
  departments?: { name: string };
  schools?: { name: string };
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
  department?: string; // Add this
  created_at?: string;
  // For joined data
  schools?: { name: string };
  departments?: { name: string };
  programs_lookup?: { name: string };
  users?: { first_name: string; last_name: string };
}


export interface Section {
  id: number;
  course_id: string;
  program_id?: number | null;
  name: string;
  term: string;
  students_estimated: number;
  essays_estimated: number;
  created_at: string;
  // For joined data
  courses?: Course;
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

