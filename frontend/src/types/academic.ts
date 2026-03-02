export interface Program {
  id?: string;
  department_id?: string;
  name: string;
  abbr: string;
}

export interface Course {
  id?: string;
  school_id?: string;
  department_id?: string;
  program_id?: string;
  user_id?: string;
  course_code: string;
  course_title: string;
  units: number;
  // For joined data
  schools?: { name: string };
  departments?: { name: string };
  programs_lookup?: { name: string };
  users?: { first_name: string; last_name: string };
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
