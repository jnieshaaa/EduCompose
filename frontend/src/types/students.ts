export interface Student {
    id: string;
    name: string;
    program: string;
    section: string;
    yearLevel: string;
    email: string;
    submitted: number;
    pending: number;
    avgScore: number;
    missing: number;
  }
  
  // Initial State for the "Add Student" Form
  export const initialNewStudentState = {
      id: '',
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      program: 'Select Program',
      section: 'Select Section',
      yearLevel: '',
  };
