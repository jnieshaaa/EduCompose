export interface Essay {
  id: number;
  student_id: number;
  user_id: number;
  class_id: number;
  title: string;
  content: string;
  submitted_at: string;
  status: "submitted" | "analyzed" | "reviewed";
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
  recommendations?:
    | Array<{
        priority: "high" | "medium" | "low";
        dimension: string;
        message: string;
        suggestion: string;
        action_items: string[];
      }>
    | string[]; // Support both old format (string[]) and new format
}

export interface GrammarError {
  type: string;
  sentence?: number;
  message: string;
  suggestion: string;
  offset?: number;
  errorLength?: number;
  context?: string;
  category?: string;
}

export interface GrammarSyntaxPatterns {
  sentence_types: {
    simple: number;
    compound: number;
    complex: number;
    compound_complex: number;
  };
  dependency_tags: Record<string, number>;
  pos_tags: Record<string, number>;
  complexity_score: number;
  avg_dependency_depth: number;
}

export interface ArgumentGraphNode {
  id: string;
  type: "thesis" | "claim" | "evidence" | "warrant" | "rebuttal";
  text: string;
  sentence_index?: number;
  confidence?: string;
  indicator?: string;
}

export interface ArgumentGraphEdge {
  source: string;
  target: string;
  type: "supports" | "elaborates" | "rebuts";
}

export interface ArgumentGraphData {
  nodes: ArgumentGraphNode[];
  edges: ArgumentGraphEdge[];
  legend?: Array<{
    type: ArgumentGraphNode["type"];
    label: string;
  }>;
}

export interface ArgumentStrengthMetric {
  claim_id: string;
  claim: string;
  evidence: number;
  warrants: number;
  rebuttals: number;
  score: number;
}

export interface ArgumentVerificationEntry {
  statement: string;
  status: string;
}

export interface ArgumentMetrics {
  argument_strength: ArgumentStrengthMetric[];
  coherence: number;
  verification: ArgumentVerificationEntry[];
  overall_score: number;
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
  graph?: ArgumentGraphData;
  metrics?: ArgumentMetrics;
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
  user_id: number;
  created_at: string;
  is_active: boolean;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: "teacher" | "admin";
  is_active: boolean;
  created_at: string;
}

export interface AnalysisRequest {
  essay_id: number;
  analysis_type:
    | "grammar"
    | "readability"
    | "coherence"
    | "argument"
    | "comprehensive";
}

export interface DetailedAnalysis {
  grammar: {
    score: number;
    errors: GrammarError[];
    error_count: number;
    syntax_patterns: GrammarSyntaxPatterns;
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
      concept_distribution: Record<
        string,
        {
          frequency: number;
          coverage: number;
        }
      >;
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
  priority: "high" | "medium" | "low";
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

export interface TextAnalysisResponse {
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
  diagnostic_summary?: DiagnosticSummary;
  word_count?: number;
  generated_at: string;
  processing_time_seconds?: number;
  rubric_scores?: {
    rubric_id?: string | number;
    rubric_name: string;
    total_points: number;
    max_points: number;
    rubric_score: number;
    criterion_scores: Array<{
      criterion_id: number;
      criterion_title: string;
      points_earned: number;
      max_points: number;
      score_level: string;
      score_level_description: string;
      analysis_score: number;
      feedback: string;
    }>;
    rubric_applied: boolean;
  };
}

export interface BatchAnalysisRequest {
  essay_ids: number[];
  analysis_type:
    | "grammar"
    | "readability"
    | "coherence"
    | "argument"
    | "comprehensive";
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

export interface SystemStatsResponse {
  total_users: number;
  total_teachers: number;
  total_students: number;
  total_admins: number;
  total_programs: number;
  total_sections: number;
  total_activities: number;
  total_essays: number;
  total_rubrics: number;
  platform_rubrics: number;
}
