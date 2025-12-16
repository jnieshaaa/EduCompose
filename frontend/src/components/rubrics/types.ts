// Shared types for the Rubric Builder

export interface ScoreLevel {
  id: number;
  title: string;
  points: number;
  description: string;
}

export interface CriteriaRow {
  id: number;
  title: string;
  scores: ScoreLevel[];
}

export interface RubricFormData {
  name: string;
  gradingIntensity: 'Easy' | 'Normal' | 'Strict';
  program: string;
  criteria: CriteriaRow[];
}

// Full rubric data structure for platform rubrics
export interface PlatformRubric {
  id: number;
  name: string;
  description: string;
  type: 'Basic' | 'Professional' | 'Advanced' | 'Technical';
  criteria: CriteriaRow[];
  programs: number;
  lastUpdated: string;
}

export type BuilderMode = 'upload' | 'template' | 'ai' | 'scratch' | null;

export const initialScoreLevels: ScoreLevel[] = [
  { id: 1, title: 'Excellent', points: 4, description: 'Demonstrates exceptional understanding and execution.' },
  { id: 2, title: 'Proficient', points: 3, description: 'Meets expectations with minor areas for improvement.' },
  { id: 3, title: 'Developing', points: 2, description: 'Shows basic understanding but needs significant improvement.' },
  { id: 4, title: 'Beginning', points: 1, description: 'Minimal evidence of understanding or skill.' },
];

export const initialCriteria: CriteriaRow[] = [
  { id: 1, title: 'Evidence & Support', scores: initialScoreLevels },
  { id: 2, title: 'Organization', scores: [
    { id: 1, title: 'Excellent', points: 4, description: 'Clear, logical structure with smooth transitions.' },
    { id: 2, title: 'Proficient', points: 3, description: 'Generally organized with some minor flow issues.' },
    { id: 3, title: 'Developing', points: 2, description: 'Basic structure but lacks coherence.' },
    { id: 4, title: 'Beginning', points: 1, description: 'Disorganized and difficult to follow.' },
  ]},
];

export const defaultRubricFormData: RubricFormData = {
  name: '',
  gradingIntensity: 'Normal',
  program: '',
  criteria: initialCriteria,
};

// ============================================
// PLATFORM RUBRICS - College-Level Examples
// ============================================

export const platformRubrics: PlatformRubric[] = [
  {
    id: 1,
    name: 'Basic Essay Rubric',
    description: 'A foundational rubric for general college essays focusing on core writing competencies.',
    type: 'Basic',
    programs: 12,
    lastUpdated: '2025-12-10',
    criteria: [
      {
        id: 1,
        title: 'Thesis & Focus',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Clear, specific thesis that is consistently maintained throughout. Central argument is compelling and well-defined.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Thesis is present and generally maintained. Argument is clear but could be more specific or compelling.' },
          { id: 3, title: 'Developing', points: 2, description: 'Thesis is vague or occasionally strays from focus. Central argument needs more clarity.' },
          { id: 4, title: 'Beginning', points: 1, description: 'No clear thesis or the essay lacks focus. Purpose is unclear.' },
        ]
      },
      {
        id: 2,
        title: 'Evidence & Support',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Strong, relevant evidence that effectively supports all claims. Sources are credible and well-integrated.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Adequate evidence supports most claims. Some sources could be stronger or better integrated.' },
          { id: 3, title: 'Developing', points: 2, description: 'Limited evidence or evidence does not clearly support claims. Sources may be weak or poorly integrated.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Little to no evidence provided. Claims are unsupported.' },
        ]
      },
      {
        id: 3,
        title: 'Organization',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Logical, coherent structure with smooth transitions. Introduction and conclusion are strong.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Generally organized with clear sections. Transitions are present but could be smoother.' },
          { id: 3, title: 'Developing', points: 2, description: 'Basic structure exists but paragraphs may be disjointed. Transitions are weak or missing.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Disorganized and difficult to follow. No clear structure.' },
        ]
      },
      {
        id: 4,
        title: 'Grammar & Mechanics',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Virtually error-free. Demonstrates command of standard written English.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Minor errors that do not impede understanding. Generally correct grammar and punctuation.' },
          { id: 3, title: 'Developing', points: 2, description: 'Frequent errors that occasionally impede understanding. Needs proofreading.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Numerous errors that significantly impede understanding.' },
        ]
      },
    ]
  },
  {
    id: 2,
    name: 'Professional Academic Writing Rubric',
    description: 'Comprehensive rubric for upper-division coursework emphasizing scholarly writing and critical analysis.',
    type: 'Professional',
    programs: 8,
    lastUpdated: '2025-12-08',
    criteria: [
      {
        id: 1,
        title: 'Critical Analysis',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Demonstrates sophisticated critical thinking. Synthesizes multiple perspectives and offers original insights.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Shows good analytical skills. Engages with sources thoughtfully but could push analysis further.' },
          { id: 3, title: 'Developing', points: 2, description: 'Analysis is surface-level. Relies too heavily on summary rather than interpretation.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Minimal or no analysis. Primarily descriptive or summarizes sources.' },
        ]
      },
      {
        id: 2,
        title: 'Argument Development',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Compelling argument with nuanced reasoning. Anticipates and addresses counterarguments effectively.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Clear argument with logical reasoning. May not fully address opposing viewpoints.' },
          { id: 3, title: 'Developing', points: 2, description: 'Argument is present but underdeveloped. Reasoning may have gaps or logical fallacies.' },
          { id: 4, title: 'Beginning', points: 1, description: 'No clear argument or argument is incoherent.' },
        ]
      },
      {
        id: 3,
        title: 'Research Integration',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Seamlessly integrates scholarly sources. Demonstrates deep engagement with relevant literature.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Uses sources appropriately. Integration is generally smooth with minor issues.' },
          { id: 3, title: 'Developing', points: 2, description: 'Sources are used but integration is awkward. May rely on inappropriate sources.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Sources are missing, irrelevant, or improperly used.' },
        ]
      },
      {
        id: 4,
        title: 'Academic Style & Voice',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Maintains consistent scholarly tone. Writing is clear, precise, and engaging.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Generally appropriate academic tone. Some inconsistencies in style or clarity.' },
          { id: 3, title: 'Developing', points: 2, description: 'Tone is inconsistent or inappropriate for academic writing. Clarity issues.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Inappropriate tone or voice. Writing is unclear or unprofessional.' },
        ]
      },
      {
        id: 5,
        title: 'Citation & Documentation',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Flawless citation format. All sources properly documented with complete references.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Minor citation errors. References are mostly complete and properly formatted.' },
          { id: 3, title: 'Developing', points: 2, description: 'Several citation errors or inconsistencies. References may be incomplete.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Major citation problems or missing citations. Possible plagiarism concerns.' },
        ]
      },
    ]
  },
  {
    id: 3,
    name: 'Research Paper Rubric',
    description: 'Detailed rubric for research-based assignments requiring literature review and methodology discussion.',
    type: 'Advanced',
    programs: 6,
    lastUpdated: '2025-12-05',
    criteria: [
      {
        id: 1,
        title: 'Research Question & Significance',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Research question is clear, focused, and addresses a significant gap in the literature.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Research question is clear and relevant. Significance is established but could be stronger.' },
          { id: 3, title: 'Developing', points: 2, description: 'Research question is vague or too broad. Significance is unclear.' },
          { id: 4, title: 'Beginning', points: 1, description: 'No clear research question or the question is trivial.' },
        ]
      },
      {
        id: 2,
        title: 'Literature Review',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Comprehensive review of relevant literature. Synthesizes sources and identifies key themes and gaps.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Good coverage of relevant sources. Some synthesis but could be more thorough.' },
          { id: 3, title: 'Developing', points: 2, description: 'Limited sources or sources are not well-integrated. More of a list than a synthesis.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Inadequate literature review. Sources are irrelevant or missing.' },
        ]
      },
      {
        id: 3,
        title: 'Methodology',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Methodology is appropriate, well-described, and justified. Replicable by other researchers.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Methodology is appropriate and described adequately. Some details missing.' },
          { id: 3, title: 'Developing', points: 2, description: 'Methodology is vague or inappropriate. Justification is lacking.' },
          { id: 4, title: 'Beginning', points: 1, description: 'No clear methodology or methodology is fundamentally flawed.' },
        ]
      },
      {
        id: 4,
        title: 'Data Analysis & Findings',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Rigorous analysis with clear, well-presented findings. Interpretation is insightful.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Adequate analysis and clear findings. Interpretation is sound.' },
          { id: 3, title: 'Developing', points: 2, description: 'Analysis is superficial or findings are unclear. Interpretation may be flawed.' },
          { id: 4, title: 'Beginning', points: 1, description: 'No meaningful analysis or findings are absent/incorrect.' },
        ]
      },
      {
        id: 5,
        title: 'Discussion & Conclusion',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Thoughtful discussion of implications. Limitations acknowledged. Strong conclusion.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Good discussion of findings. Limitations mentioned. Conclusion is adequate.' },
          { id: 3, title: 'Developing', points: 2, description: 'Discussion is limited. Limitations not addressed. Conclusion is weak.' },
          { id: 4, title: 'Beginning', points: 1, description: 'No meaningful discussion or conclusion.' },
        ]
      },
    ]
  },
  {
    id: 4,
    name: 'Technical Writing Rubric',
    description: 'Specialized rubric for technical documentation, reports, and STEM-focused writing assignments.',
    type: 'Technical',
    programs: 5,
    lastUpdated: '2025-12-01',
    criteria: [
      {
        id: 1,
        title: 'Technical Accuracy',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'All technical information is accurate and demonstrates expert understanding of the subject.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Technical content is generally accurate with minor errors that don\'t affect understanding.' },
          { id: 3, title: 'Developing', points: 2, description: 'Some technical errors that may cause confusion. Demonstrates partial understanding.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Significant technical errors. Content is unreliable or incorrect.' },
        ]
      },
      {
        id: 2,
        title: 'Clarity & Precision',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Writing is exceptionally clear and precise. Technical terms are used correctly and defined when needed.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Writing is clear and generally precise. Minor ambiguities or unnecessary jargon.' },
          { id: 3, title: 'Developing', points: 2, description: 'Writing is sometimes unclear or imprecise. Terms may be misused or undefined.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Writing is confusing. Technical language is misused or inaccessible.' },
        ]
      },
      {
        id: 3,
        title: 'Visual Elements',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Diagrams, tables, and figures are professional, well-labeled, and enhance understanding.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Visual elements are appropriate and mostly well-executed. Minor labeling issues.' },
          { id: 3, title: 'Developing', points: 2, description: 'Visual elements are present but poorly executed or don\'t clearly support the text.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Visual elements are missing, incorrect, or confusing.' },
        ]
      },
      {
        id: 4,
        title: 'Document Structure',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Follows technical writing conventions perfectly. Sections are logical and well-organized.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Structure follows conventions with minor deviations. Generally well-organized.' },
          { id: 3, title: 'Developing', points: 2, description: 'Structure is inconsistent or doesn\'t follow conventions. Organization could be improved.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Ignores technical writing conventions. Disorganized.' },
        ]
      },
      {
        id: 5,
        title: 'Practical Application',
        scores: [
          { id: 1, title: 'Excellent', points: 4, description: 'Content is immediately usable. Reader can apply the information effectively.' },
          { id: 2, title: 'Proficient', points: 3, description: 'Content is practical and mostly usable. Some areas may need clarification.' },
          { id: 3, title: 'Developing', points: 2, description: 'Limited practical value. Reader would struggle to apply the information.' },
          { id: 4, title: 'Beginning', points: 1, description: 'Not practical or usable. Information cannot be applied.' },
        ]
      },
    ]
  },
];
