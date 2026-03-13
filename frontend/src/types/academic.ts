export interface Program {
  id?: string;
  department_id?: string;
  name: string;
  abbr: string;
  // For joined data
  departments?: { name: string };
  schools?: { name: string };
}

export interface TeacherProgramLoad {
  id: string;
  course_load_id: string;
  program_id: string;
  // Joined
  programs_lookup?: Program;
}

export interface Block {
  id: string;
  program_load_id: string;
  year: number;
  name: string;
  created_at?: string;
  // Joined
  program_loads?: TeacherProgramLoad;
}

export interface Course {
  id: string;
  school_id: string;
  department_id?: string;
  program_id?: string; // If not null, it's a major course
  user_id?: string;
  course_code: string;
  course_title: string;
  units: number;
  year_level?: string;
  semester?: string;
  department?: string;
  created_at?: string;
  // For joined data
  schools?: { name: string };
  departments?: { name: string };
  programs_lookup?: { name: string };
  users?: { first_name: string; last_name: string };
}

export interface Student {
  id: string;
  student_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  year: number;
  block_name: string;
  program_id: string;
  teacher_id?: string;
  created_at?: string;
  block_students?: { block_id: string }[];
}

export interface Section {
  id: string;
  course_id: string;
  block_id: string;
  name: string; 
  program_id?: string;
  year?: number;
  program_load_id?: string;
  students_estimated: number;
  essays_estimated: number;
  created_at: string;
  academic_year?: string;
  term?: string;
  courses?: Course;
  program_abbr?: string;
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

