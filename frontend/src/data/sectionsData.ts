// Data Structure Definition
export interface Section {
    id: number;
    name: string;
    program: string;
    term: string;
    students: number;
    essays: number;
  }
  
  // Initial Data Array
  export const initialSectionsData: Section[] = [
    { id: 1, name: 'Section A', program: 'Computer Science 101', term: 'Fall 2025', students: 25, essays: 48 },
    { id: 2, name: 'Section B', program: 'Computer Science 101', term: 'Fall 2025', students: 28, essays: 52 },
    { id: 3, name: 'Section A', program: 'Data Structures', term: 'Fall 2025', students: 26, essays: 45 },
    { id: 4, name: 'Section B', program: 'Data Structures', term: 'Fall 2025', students: 24, essays: 41 },
    { id: 5, name: 'Section A', program: 'Web Development', term: 'Fall 2025', students: 30, essays: 58 },
    { id: 6, name: 'Section B', program: 'Web Development', term: 'Fall 2025', students: 22, essays: 39 },
    { id: 7, name: 'Section A', program: 'Machine Learning', term: 'Fall 2025', students: 27, essays: 49 },
    { id: 8, name: 'Section A', program: 'Database Systems', term: 'Fall 2025', students: 23, essays: 42 },
  ];
  
  // Initial State for the "Add Section" Form
  export const initialNewSectionState = {
      name: '',
      program: 'Select Program', // Default to placeholder
      term: '',
      students: '0',
  };