export interface Section {
    id: number;
    name: string;
    program: string;
    term: string;
    students: number;
    essays: number;
  }
  
  // Initial State for the "Add Section" Form
  export const initialNewSectionState = {
      name: '',
      program: 'Select Program', // Default to placeholder
      term: '',
      students: '0',
  };
