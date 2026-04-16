// src/constants/rubrics.ts

export interface Criterion {
  id: number;
  name: string;
  weight: number;
  range: string;
  description: string;
  level: string;
}

export interface RubricTemplate {
  id: number;
  name: string;
  criteria: number;
  programs: number;
  lastUsed: string;
  level: string;
}

// Initial Criteria List for the Builder
export const initialCriteriaList: Criterion[] = [
  { id: 1, name: 'Grammar & Mechanics', weight: 20, range: '0-100', description: 'Proper use of grammar, spelling, and punctuation', level: 'Elementary' },
  { id: 2, name: 'Coherence & Flow', weight: 20, range: '0-100', description: 'Logical organization and smooth transitions between ideas', level: 'Elementary' },
  { id: 3, name: 'Argument Strength', weight: 25, range: '0-100', description: 'Clarity and persuasiveness of main arguments', level: 'Elementary' },
  { id: 4, name: 'Vocabulary Usage', weight: 15, range: '0-100', description: 'Appropriate and varied word choice', level: 'Elementary' },
  { id: 5, name: 'Structure & Organization', weight: 15, range: '0-100', description: 'Clear introduction, body, and conclusion', level: 'Elementary' },
  { id: 6, name: 'Originality / Plagiarism', weight: 5, range: '0-100', description: 'Original content with proper citations', level: 'Elementary' },
];

// Initial Saved Rubrics
export const initialSavedRubrics: RubricTemplate[] = [
  { id: 1, name: 'Standard Essay Rubric', criteria: 6, programs: 8, lastUsed: '2025-12-10', level: 'Elementary' },
  { id: 2, name: 'Technical Writing Rubric', criteria: 7, programs: 3, lastUsed: '2025-12-08', level: 'Elementary' },
  { id: 3, name: 'Creative Writing Rubric', criteria: 5, programs: 2, lastUsed: '2025-12-05', level: 'Elementary' },
];

export const initialNewCriterionState = {
  name: '',
  description: '',
  weight: '0',
};
