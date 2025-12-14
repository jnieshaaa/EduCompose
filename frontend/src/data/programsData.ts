// Data Structure Definition (Optional but Recommended)
export interface Program {
    id: number;
    name: string;
    description: string;
    tracks: number;
    courses: number;
    avgClassSize: number;
    status: string;
  }
  
  // Initial Data Array
  export const initialProgramsData: Program[] = [
    { id: 1, name: 'Computer Science', description: 'Study of Computation, Algorithms, and Software Development', tracks: 4, courses: 45, avgClassSize: 28, status: 'Active' },
    { id: 2, name: 'Information Technology', description: 'Application of Computers to Store, Retrieve, Transmit, and Manipulate Data', tracks: 3, courses: 32, avgClassSize: 35, status: 'Active' },
    { id: 3, name: 'Business Administration', description: 'Management of Commercial Enterprises', tracks: 5, courses: 60, avgClassSize: 22, status: 'Active' },
    { id: 4, name: 'Entrepreneurship', description: 'Development and Management of New Business Ventures', tracks: 2, courses: 18, avgClassSize: 40, status: 'Active' },
    { id: 5, name: 'Electrical Engineering', description: 'Study and Application of Electricity, Electronics, and Electromagnetism', tracks: 3, courses: 40, avgClassSize: 30, status: 'Active' },
    { id: 6, name: 'Architecture', description: 'Art and Science of Designing and Constructing Buildings', tracks: 1, courses: 25, avgClassSize: 15, status: 'Archived' },
  ];
  
  // If other tabs need this initial state
  export const initialNewProgramState = {
      name: '',
      description: '',
      tracks: '0',
      status: 'Active',
  };