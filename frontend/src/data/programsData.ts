export interface Program {
  id: number;
  name: string;
  sectionCount?: number;
  studentCount?: number;
}

export const initialProgramsData: Program[] = [
  { id: 1, name: 'Computer Science' },
  { id: 2, name: 'Information Technology' },
  { id: 3, name: 'Business Administration' },
  { id: 4, name: 'Entrepreneurship' },
  { id: 5, name: 'Electrical Engineering' },
  { id: 6, name: 'Architecture' },
];

export const initialNewProgramState = {
  name: '',
};