export interface Essay {
  id: number;
  student_id: number;
  teacher_id: number;
  class_id: number;
  title: string;
  content: string;
  submitted_at: string;
  status: 'submitted' | 'analyzed' | 'reviewed';
  grammar_score?: number;
  readability_score?: number;
  coherence_score?: number;
  argument_strength_score?: number;
  overall_score?: number;
  grammar_errors?: GrammarError[];
  style_issues?: StyleIssue[];
  argument_analysis?: ArgumentAnalysis;
  recommendations?: string[];
}

export interface GrammarError {
  type: string;
  sentence?: number;
  message: string;
  suggestion: string;
}

export interface StyleIssue {
  type: string;
  message: string;
  suggestion: string;
}

export interface ArgumentAnalysis {
  thesis_found?: boolean;
  evidence_found?: boolean;
  conclusion_found?: boolean;
  thesis_issue?: string;
  evidence_issue?: string;
  conclusion_issue?: string;
}

export interface Student {
  id: number;
  student_id: string;
  full_name: string;
  email?: string;
  class_id: number;
  created_at: string;
  is_active: boolean;
}

export interface Class {
  id: number;
  name: string;
  description?: string;
  teacher_id: number;
  created_at: string;
  is_active: boolean;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: 'teacher' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface AnalysisRequest {
  essay_id: number;
  analysis_type: 'grammar' | 'style' | 'argument' | 'comprehensive';
}

export interface AnalysisResponse {
  essay_id: number;
  analysis_type: string;
  scores: {
    grammar: number;
    readability: number;
    coherence: number;
    argument_strength: number;
    overall: number;
  };
  detailed_analysis: {
    grammar_errors: GrammarError[];
    style_issues: StyleIssue[];
    argument_analysis: ArgumentAnalysis;
  };
  recommendations: string[];
  generated_at: string;
}

export interface DashboardStats {
  total_essays: number;
  total_classes: number;
  total_students: number;
  recent_essays: Essay[];
  class_stats: Array<{
    id: number;
    name: string;
    essay_count: number;
    student_count: number;
  }>;
}
