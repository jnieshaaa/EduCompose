// Data Structure Definition
export interface Student {
    id: string;
    name: string;
    program: string;
    section: string;
    email: string;
    submitted: number;
    pending: number;
    avgScore: number;
    missing: number;
  }
  
  // Initial Data Array
  export const initialStudentsData: Student[] = [
    { id: 'STU001', name: 'Emma Wilson', program: 'Computer Science 101', section: 'Section A', email: 'emma.w@example.com', submitted: 8, pending: 2, avgScore: 88, missing: 0 },
    { id: 'STU002', name: 'James Lee', program: 'Computer Science 101', section: 'Section A', email: 'james.l@example.com', submitted: 10, pending: 0, avgScore: 85, missing: 0 },
    { id: 'STU003', name: 'Sarah Martinez', program: 'Data Structures', section: 'Section A', email: 'sarah.m@example.com', submitted: 7, pending: 3, avgScore: 82, missing: 0 },
    { id: 'STU004', name: 'Michael Chen', program: 'Web Development', section: 'Section A', email: 'michael.c@example.com', submitted: 9, pending: 1, avgScore: 92, missing: 0 },
    { id: 'STU005', name: 'Olivia Brown', program: 'Machine Learning', section: 'Section A', email: 'olivia.b@example.com', submitted: 6, pending: 4, avgScore: 79, missing: 0 },
    { id: 'STU006', name: 'Daniel Garcia', program: 'Computer Science 101', section: 'Section B', email: 'daniel.g@example.com', submitted: 8, pending: 2, avgScore: 86, missing: 0 },
    { id: 'STU007', name: 'Sophia Taylor', program: 'Database Systems', section: 'Section A', email: 'sophia.t@example.com', submitted: 9, pending: 1, avgScore: 90, missing: 0 },
    { id: 'STU008', name: 'Liam Anderson', program: 'Web Development', section: 'Section B', email: 'liam.a@example.com', submitted: 7, pending: 3, avgScore: 84, missing: 0 },
  ];
  
  // Initial State for the "Add Student" Form
  export const initialNewStudentState = {
      id: '',
      name: '',
      email: '',
      program: 'Select Program',
      section: 'Select Section',
  };