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
  argument_analysis?: {
    argumentation?: ArgumentAnalysis;
    knowledge_graph?: {
      score: number;
      concepts: Array<{
        text: string;
        frequency: number;
        importance: number;
      }>;
      relationships: Array<{
        source: string;
        target: string;
        type: string;
        weight: number;
      }>;
    };
    coherence?: {
      score: number;
      coherence_issues: Array<{
        type: string;
        severity: string;
        message: string;
        suggestion: string;
      }>;
    };
  };
  recommendations?: Array<{
    priority: 'high' | 'medium' | 'low';
    dimension: string;
    message: string;
    suggestion: string;
    action_items: string[];
  }> | string[]; // Support both old format (string[]) and new format
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
  score: number;
  claim_score: number;
  evidence_score: number;
  warrant_score: number;
  rebuttal_score: number;
  thesis_statement?: {
    sentence: string;
    paragraph: number;
    confidence: string;
  };
  claims: Array<{
    sentence_index: number;
    sentence: string;
    indicator: string;
    type: string;
  }>;
  grounds: Array<{
    sentence_index: number;
    sentence: string;
    indicator: string;
    type: string;
  }>;
  warrants: Array<{
    sentence_index: number;
    sentence: string;
    indicator: string;
    type: string;
  }>;
  rebuttals: Array<{
    sentence_index: number;
    sentence: string;
    indicator: string;
    type: string;
  }>;
  argument_structure: {
    total_claims: number;
    total_grounds: number;
    total_warrants: number;
    total_rebuttals: number;
    grounds_per_claim: number;
    has_thesis: boolean;
    has_evidence: boolean;
    has_reasoning: boolean;
    has_counterarguments: boolean;
  };
  toulmin_analysis: {
    has_claim: boolean;
    has_ground: boolean;
    has_warrant: boolean;
    has_rebuttal: boolean;
    completeness_score: number;
  };
  argument_issues: Array<{
    type: string;
    severity: string;
    message: string;
    suggestion: string;
  }>;
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
  analysis_type: 'grammar' | 'readability' | 'coherence' | 'argument' | 'comprehensive';
}

export interface DetailedAnalysis {
  grammar: {
    score: number;
    errors: GrammarError[];
    error_count: number;
    syntax_patterns: Record<string, any>;
  };
  readability: {
    score: number;
    flesch_reading_ease: number;
    flesch_kincaid_grade: number;
    smog_index: number;
    coleman_liau_index: number;
    lexical_diversity: number;
    issues: StyleIssue[];
  };
  coherence: {
    score: number;
    entity_grid_score: number;
    semantic_similarity_score: number;
    transition_score: number;
    paragraph_unity: number;
    topic_sentences: Array<{
      paragraph_index: number;
      sentence: string;
      position: string;
    }>;
    transitional_elements: Array<{
      sentence_index: number;
      category: string;
      word: string;
      sentence: string;
    }>;
    coherence_issues: Array<{
      type: string;
      severity: string;
      message: string;
      suggestion: string;
    }>;
    structure_analysis: {
      has_introduction: boolean;
      has_body: boolean;
      has_conclusion: boolean;
      paragraph_count: number;
      sentence_count: number;
      structure_quality: string;
    };
  };
  argumentation: ArgumentAnalysis;
  knowledge_graph: {
    score: number;
    concepts: Array<{
      text: string;
      frequency: number;
      importance: number;
      type: string;
    }>;
    relationships: Array<{
      source: string;
      target: string;
      type: string;
      weight: number;
      sentences: number[];
    }>;
    graph_structure: {
      nodes: number;
      edges: number;
      density: number;
      clusters: number;
      avg_clustering: number;
      is_connected: boolean;
    };
    concept_coverage: {
      coverage_score: number;
      concept_distribution: Record<string, any>;
    };
    conceptual_gaps: Array<{
      type: string;
      severity: string;
      message: string;
      concepts?: string[];
      suggestion: string;
    }>;
    connectivity_score: number;
    depth_score: number;
  };
}

export interface DiagnosticRecommendation {
  priority: 'high' | 'medium' | 'low';
  dimension: string;
  message: string;
  suggestion: string;
  action_items: string[];
}

export interface DiagnosticSummary {
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  critical_issues: string[];
  dimension_scores: Record<string, number>;
}

export interface AnalysisResponse {
  essay_id: number;
  analysis_type: string;
  scores: {
    grammar: number;
    readability: number;
    coherence: number;
    argument_strength: number;
    knowledge_graph: number;
    overall: number;
  };
  detailed_analysis: DetailedAnalysis;
  recommendations: DiagnosticRecommendation[];
  diagnostic_summary: DiagnosticSummary;
  word_count: number;
  generated_at: string;
}

export interface BatchAnalysisRequest {
  essay_ids: number[];
  analysis_type: 'grammar' | 'readability' | 'coherence' | 'argument' | 'comprehensive';
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
