// src/types/Common.ts

export interface Program {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  sectionCount?: number;
  studentCount?: number;
}

export interface Section {
  id: string | number;
  name: string; // usually block name
  year?: number;
  program_id?: string;
  teacher_id?: string;
  program?: string;
  term?: string;
  students?: number;
  essays?: number;
}

export interface Student {
  id: string | number;
  student_code?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  email: string;
  class_id?: string | number; // legacy support
  year?: number;
  block_name?: string;
  created_at?: string;
  is_active?: boolean;
  name?: string; // full_name alias or specialized display name
  program?: string;
  section?: string;
  yearLevel?: string;
  submitted?: number;
  pending?: number;
  avgScore?: number;
  missing?: number;
}
