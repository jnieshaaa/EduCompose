import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  TrendingUp,
  Lightbulb,
  ClipboardList,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  BookOpen,
  Info,
} from 'lucide-react';
import jsPDF from 'jspdf';

import { motion } from 'framer-motion';
import KnowledgeGraphLoader from '../components/ui/KnowledgeGraphLoader';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { EssayTextDisplay, AnalysisMetrics, FeedbackPanel, RubricScores, getGrammarErrorSelectionKey, type HighlightError } from '../components/grading';
import type { AnalysisResponse, TextAnalysisResponse, DiagnosticRecommendation } from '../types/Essay';
import { analysisApi, plagiarismApi, aiDetectionApi, type PlagiarismCheckResponse, type PlagiarismMatch, type AIDetectionResponse } from '../api';
import { RubricPreviewModal } from '../components/rubrics/RubricPreviewModal';
import { platformRubrics } from '../data/rubricData';
import type { PlatformRubric } from '../components/rubrics/types';
import { savePlagiarismResult, loadPlagiarismResult, saveAIDetectionResult, loadAIDetectionResult, fetchDuplicateEssays, resolveEssayIdFromStudentActivity, type DuplicateEssayGroup } from '../services/activityService';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { readSecureParams } from '../utils/secureUrl';

const STORAGE_KEY = 'essay_analysis_results';
const AI_DETECTION_STORAGE_KEY_PREFIX = 'essay_ai_detection_result';

/** Analysis payload stored in this page (may include rubric_scores from text analysis API). */
type StoredAnalysisResult = Omit<AnalysisResponse, 'essay_id'> & {
  rubric_scores?: TextAnalysisResponse['rubric_scores'];
};

// Mock data for UI preview - using type assertion for demo purposes
const MOCK_ANALYSIS = {
  word_count: 487,
  generated_at: new Date().toISOString(),
  scores: {
    grammar: 78,
    readability: 85,
    coherence: 72,
    argument_strength: 81,
    knowledge_graph: 76,
    overall: 78.4,
  },
  detailed_analysis: {
    grammar: {
      score: 78,
      error_count: 5,
      errors: [
        {
          type: 'grammar',
          message: 'Subject-verb agreement error',
          suggestion: 'Use "are" instead of "is" for plural subjects',
          context: 'The students is working hard',
          offset: 363,
          errorLength: 2,
        },
        {
          type: 'spelling',
          message: 'Commonly misspelled word',
          suggestion: 'Consider using "occurrence" instead of "occurance"',
          context: 'common occurance in academic',
          offset: 1559,
          errorLength: 9,
        },
        {
          type: 'punctuation',
          message: 'Missing comma after introductory phrase',
          suggestion: 'Add a comma after "However"',
          context: 'However the research shows',
          offset: 691,
          errorLength: 7,
        },
        {
          type: 'word_choice',
          message: 'Vague word usage',
          suggestion: 'Replace "things" with more specific language like "factors" or "elements"',
          context: 'things that affect',
          offset: 1745,
          errorLength: 6,
        },
        {
          type: 'grammar',
          message: 'Dangling modifier',
          suggestion: 'Rephrase to clarify the subject: "As I walked to school, the rain started falling"',
          context: 'Walking to school, the rain started',
          offset: 1779,
          errorLength: 18,
        },
      ],
      syntax_patterns: {
        passive_voice_count: 2,
        complex_sentences: 8,
        simple_sentences: 12,
      },
    },
    readability: {
      score: 85,
      flesch_reading_ease: 62.3,
      flesch_kincaid_grade: 10.2,
      lexical_diversity: 0.68,
      smog_index: 11.4,
      coleman_liau_index: 12.1,
      issues: [],
    },
    coherence: {
      score: 72,
      entity_grid_score: 0.78,
      semantic_similarity_score: 0.71,
      transition_score: 0.75,
      paragraph_unity: 0.72,
      topic_sentences: [],
      transitional_elements: [],
      coherence_issues: [],
      structure_analysis: {
        has_introduction: true,
        has_body: true,
        has_conclusion: true,
        paragraph_count: 6,
      },
    },
    argumentation: {
      argument_structure: {
        total_claims: 4,
        total_grounds: 6,
        total_warrants: 3,
        total_rebuttals: 1,
        total_qualifiers: 2,
        grounds_per_claim: 1.5,
        has_thesis: true,
        has_evidence: true,
        has_reasoning: true,
        has_counterarguments: true,
        has_qualifiers: true,
      },
      thesis_statement: {
        sentence: 'Climate change represents one of the most pressing challenges of our time, requiring immediate and coordinated global action to mitigate its devastating effects.',
        confidence: 'High',
        paragraph: 0,
      },
      metrics: [],
      graph: {
        nodes: [
          { id: 'thesis', text: 'Thesis: Climate change requires action', type: 'claim', paragraph: 0 },
          { id: 'claim1', text: 'Rising temperatures are accelerating', type: 'claim', paragraph: 1 },
          { id: 'evidence1', text: 'NASA data shows 1.1°C increase', type: 'evidence', paragraph: 1 },
          { id: 'claim2', text: 'Renewable energy is viable', type: 'claim', paragraph: 2 },
          { id: 'evidence2', text: 'Solar costs dropped 89% since 2010', type: 'evidence', paragraph: 2 },
          { id: 'qualifier1', text: 'In most cases, these changes are inevitable', type: 'qualifier', paragraph: 2 },
        ],
        edges: [
          { source: 'claim1', target: 'thesis', type: 'supports' },
          { source: 'evidence1', target: 'claim1', type: 'proves' },
          { source: 'claim2', target: 'thesis', type: 'supports' },
          { source: 'evidence2', target: 'claim2', type: 'proves' },
          { source: 'qualifier1', target: 'claim2', type: 'supports' },
        ],
      },
    },
    knowledge_graph: {
      concepts: [
        { text: 'climate change', frequency: 8, importance: 0.9, type: 'topic' },
        { text: 'renewable energy', frequency: 5, importance: 0.8, type: 'topic' },
        { text: 'global warming', frequency: 4, importance: 0.7, type: 'topic' },
        { text: 'carbon emissions', frequency: 4, importance: 0.7, type: 'topic' },
        { text: 'sustainability', frequency: 3, importance: 0.6, type: 'topic' },
        { text: 'fossil fuels', frequency: 3, importance: 0.6, type: 'topic' },
        { text: 'solar power', frequency: 2, importance: 0.5, type: 'topic' },
        { text: 'policy intervention', frequency: 2, importance: 0.5, type: 'topic' },
      ],
      relationships: [
        { source: 'climate change', target: 'global warming', type: 'related_to', weight: 0.9, sentences: [0, 1] },
        { source: 'renewable energy', target: 'solar power', type: 'includes', weight: 0.8, sentences: [2] },
        { source: 'fossil fuels', target: 'carbon emissions', type: 'causes', weight: 0.85, sentences: [0] },
      ],
      connectivity_score: 76.5,
      graph_structure: {
        nodes: 8,
        edges: 3,
        density: 0.42,
        clusters: 2,
        avg_clustering: 0.58,
        is_connected: true,
      },
    },
  },
  recommendations: [
    {
      priority: 'high',
      dimension: 'grammar',
      message: 'Address subject-verb agreement issues',
      suggestion: 'Review sentences for proper agreement between subjects and verbs, especially with compound subjects.',
      action_items: [
        'Check each sentence for subject-verb agreement',
        'Pay attention to collective nouns',
        'Review rules for compound subjects',
      ],
    },
    {
      priority: 'medium',
      dimension: 'coherence',
      message: 'Strengthen paragraph transitions',
      suggestion: 'Add transitional phrases between paragraphs to improve flow and reader comprehension.',
      action_items: [
        'Use transitional words like "Furthermore," "In addition," and "Consequently"',
        'Ensure each paragraph logically connects to the next',
      ],
    },
    {
      priority: 'medium',
      dimension: 'argumentation',
      message: 'Add more supporting evidence',
      suggestion: 'Include additional statistics or citations to strengthen your claims.',
      action_items: [
        'Add at least one more piece of evidence per main claim',
        'Cite authoritative sources',
      ],
    },
    {
      priority: 'low',
      dimension: 'readability',
      message: 'Vary sentence structure',
      suggestion: 'Mix short and long sentences to improve readability and maintain reader engagement.',
      action_items: [
        'Break up long sentences where possible',
        'Combine short sentences for variety',
      ],
    },
  ],
} as unknown as StoredAnalysisResult;

const MOCK_ESSAY_TEXT = `Climate change represents one of the most pressing challenges of our time, requiring immediate and coordinated global action to mitigate its devastating effects. The scientific consensus is clear: human activities, particularly the burning of fossil fuels, have led to unprecedented increases in atmospheric greenhouse gas concentrations.

The evidence for climate change is overwhelming. NASA data shows a 1.1°C increase in global average temperature since pre-industrial times. The students is working hard to understand these complex issues. This warming has accelerated over the past few decades, with the last seven years being the warmest on record.

Renewable energy sources offer a viable path forward. Solar costs dropped 89% since 2010, making it competitive with traditional fossil fuels in many markets. Wind power has experienced similar cost reductions, and both technologies continue to improve. However the research shows that adoption rates vary significantly across regions.

The economic arguments for action are compelling. Studies indicate that the cost of inaction far exceeds the investment required for transition to clean energy. Furthermore, the renewable energy sector has become a significant source of employment, creating millions of jobs worldwide.

Some skeptics argue that climate action would harm economic growth. However, this view fails to account for the long-term costs of climate impacts, including extreme weather events, sea-level rise, and agricultural disruption. The common occurance in academic literature suggests that early action is more cost-effective than delayed response.

In conclusion, addressing climate change requires coordinated effort across all sectors of society. The things that affect our climate are complex, but the solutions are within reach. Walking to school, the rain started falling, reminding us of the unpredictable weather patterns increasingly common in our changing world. By embracing renewable energy, improving energy efficiency, and implementing effective policies, we can build a sustainable future for generations to come.`;

const AnalysisResults: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [analysis, setAnalysis] = useState<StoredAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'feedback' | 'rubric' | 'plagiarism'>('insights');
  const [originalText, setOriginalText] = useState<string>('');
  const [selectedErrorKey, setSelectedErrorKey] = useState<string | null>(null);
  const [analysisKey, setAnalysisKey] = useState<string>('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismCheckResponse | null>(null);
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
  const [plagiarismError, setPlagiarismError] = useState<string | null>(null);
  const [aiDetectionResult, setAiDetectionResult] = useState<AIDetectionResponse | null>(null);
  const [isCheckingAIDetection, setIsCheckingAIDetection] = useState(false);
  const [aiDetectionError, setAiDetectionError] = useState<string | null>(null);
  const [showRubricPreview, setShowRubricPreview] = useState(false);
  const [previewRubric, setPreviewRubric] = useState<PlatformRubric | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [essayId, setEssayId] = useState<string | number | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateEssayGroup[]>([]);
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false);

  // Stable references to prevent recalculation
  const stableAnalysisRef = useRef<StoredAnalysisResult | null>(null);
  const stableTextRef = useRef<string>('');
  
  // Track if plagiarism result has been saved to avoid duplicate saves
  const plagiarismResultSavedRef = useRef<boolean>(false);
  const plagiarismResultRef = useRef<PlagiarismCheckResponse | null>(null);
  
  // Update ref when plagiarism result changes
  useEffect(() => {
    plagiarismResultRef.current = plagiarismResult;
    plagiarismResultSavedRef.current = false; // Reset when new result is set
  }, [plagiarismResult]);

  const handleAnalyze = async (text: string, title: string, essayId?: string | number) => {
    if (!text.trim() || text.trim().split(/\s+/).length < 150) {
      setError('Essay must be at least 150 words for analysis');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      let result: AnalysisResponse | TextAnalysisResponse;
      if (essayId) {
        result = await analysisApi.analyzeEssay(essayId, 'comprehensive');
      } else {
        const rubricId = (location.state as { rubricId?: string })?.rubricId;
        result = await analysisApi.analyzeText(text, title, 'comprehensive', rubricId);
      }
      // Convert both response types to the format expected by the component
      // TextAnalysisResponse is already without essay_id, AnalysisResponse needs it removed
      const analysisResult: StoredAnalysisResult = 
        'essay_id' in result 
          ? (() => {
              const rest = { ...result };
              delete (rest as Partial<AnalysisResponse>).essay_id;
              return rest;
            })()
          : {
              ...result,
              diagnostic_summary: result.diagnostic_summary || {
                overall_score: result.scores.overall || 0,
                strengths: [],
                weaknesses: [],
                critical_issues: [],
                dimension_scores: {}
              },
              word_count: result.word_count || 0,
              rubric_scores: result.rubric_scores,
            };

      const stableAnalysis = JSON.parse(JSON.stringify(analysisResult));
      const stableText = text;
      const newAnalysisKey = `${stableText.substring(0, 50)}-${Date.now()}`;

      stableAnalysisRef.current = stableAnalysis;
      stableTextRef.current = stableText;

      setAnalysis(stableAnalysis);
      setAnalysisKey(newAnalysisKey);

      try {
        const dataToSave = {
          analysis: stableAnalysis,
          text: stableText,
          title: title || 'Essay Analysis',
          timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch {
        // console.warn('Failed to save analysis to localStorage:', storageError);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze essay';
      setError(errorMessage);
      // console.error('Error analyzing essay:', err);
    } finally {
      setLoading(false);
    }
  };

  const aiDetectionStorageKey = useMemo(() => {
    if (essayId) {
      return `${AI_DETECTION_STORAGE_KEY_PREFIX}:essay:${essayId}`;
    }
    if (studentId && activityId) {
      return `${AI_DETECTION_STORAGE_KEY_PREFIX}:student:${studentId}:activity:${activityId}`;
    }
    const ref = new URLSearchParams(location.search).get('ref');
    if (ref) {
      return `${AI_DETECTION_STORAGE_KEY_PREFIX}:ref:${ref}`;
    }
    return null;
  }, [essayId, studentId, activityId, location.search]);

  // Get analysis data from location state, localStorage, or use mock data for preview
  useEffect(() => {
    if (analysis && originalText) return;

    const state = location.state as {
      rubricId?: string;
      analysis?: StoredAnalysisResult;
      text?: string;
      title?: string;
      essayId?: string | number;
      error?: string;
      preview?: boolean;
      studentId?: string;
      studentName?: string;
      activityId?: string;
    } | null;

    if (state?.error) {
      setError(state.error);
      if (state.text) setOriginalText(state.text);
      return;
    }

    // Check if we have a ref token in the URL (encoded studentId + activityId)
    const secureParams = readSecureParams(window.location.search);

    // If no state but we have a ref token, fetch from Supabase
    if (!state?.analysis && !state?.text && !state?.preview && secureParams) {
      const refStudentId = secureParams.s;
      const refActivityId = secureParams.a;

      if (refStudentId && refActivityId) {
        setStudentId(refStudentId);
        setActivityId(refActivityId);
        setLoading(true);

        const fetchFromRef = async () => {
          try {
            const { fetchEssayAnalysis } = await import('../services/activityService');
            const analysisData = await fetchEssayAnalysis(refStudentId, refActivityId);
            if (analysisData) {
              const stableAnalysis = JSON.parse(JSON.stringify(analysisData.analysis));
              const stableText = analysisData.text || '';
              const newAnalysisKey = `${stableText.substring(0, 50)}-${Date.now()}`;

              stableAnalysisRef.current = stableAnalysis;
              stableTextRef.current = stableText;

              setAnalysis(stableAnalysis);
              setOriginalText(stableText);
              setAnalysisKey(newAnalysisKey);
            } else {
              setError('Analysis results not found. The essay may not have been graded yet.');
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load analysis results';
            setError(errorMessage);
            // console.error('Error loading analysis from ref token:', err);
          } finally {
            setLoading(false);
          }
        };
        fetchFromRef();
        return;
      }
    }

    // Check for preview mode
    if (state?.preview || (!state?.analysis && !state?.text)) {
      // Try localStorage first
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          const maxAge = 24 * 60 * 60 * 1000;
          if (parsed.timestamp && Date.now() - parsed.timestamp < maxAge) {
            const stableAnalysis = JSON.parse(JSON.stringify(parsed.analysis));
            const stableText = parsed.text || '';
            const newAnalysisKey = `${stableText.substring(0, 50)}-${parsed.timestamp || Date.now()}`;

            stableAnalysisRef.current = stableAnalysis;
            stableTextRef.current = stableText;

            setAnalysis(stableAnalysis);
            setOriginalText(stableText);
            setAnalysisKey(newAnalysisKey);
            return;
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        // console.warn('Failed to load analysis from localStorage:', storageError);
      }

      // Use mock data for preview
      setIsPreviewMode(true);
      setAnalysis(MOCK_ANALYSIS);
      setOriginalText(MOCK_ESSAY_TEXT);
      setAnalysisKey(`preview-${Date.now()}`);
      return;
    }

    // If studentId and activityId are provided (from notification), fetch analysis from Supabase
    if (state?.studentId && state?.activityId && !state?.analysis && !state?.text) {
      setStudentId(state.studentId);
      setActivityId(state.activityId);
      setLoading(true);
      // Create async function to handle the fetch
      const fetchAnalysis = async () => {
        try {
          // Dynamic import to avoid potential circular dependencies
          const { fetchEssayAnalysis } = await import('../services/activityService');
          const analysisData = await fetchEssayAnalysis(state.studentId!, state.activityId!);
          if (analysisData) {
            const stableAnalysis = JSON.parse(JSON.stringify(analysisData.analysis));
            const stableText = analysisData.text || '';
            const newAnalysisKey = `${stableText.substring(0, 50)}-${Date.now()}`;

            stableAnalysisRef.current = stableAnalysis;
            stableTextRef.current = stableText;

            setAnalysis(stableAnalysis);
            setOriginalText(stableText);
            setAnalysisKey(newAnalysisKey);
          } else {
            setError("Analysis results not found. The essay may not have been graded yet.");
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load analysis results';
          setError(errorMessage);
          // console.error('Error loading analysis from notification:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchAnalysis();
      return;
    }
    
    // Store studentId, activityId, and essayId if available from state
    if (state?.studentId) setStudentId(state.studentId);
    if (state?.activityId) setActivityId(state.activityId);
    if (state?.essayId) setEssayId(state.essayId);
    
    // If we have studentId and activityId but no essayId, try to derive it
    if (state?.studentId && state?.activityId && !state?.essayId) {
      const deriveEssayId = async () => {
        try {
          const resolvedEssayId = await resolveEssayIdFromStudentActivity(
            state.studentId!,
            state.activityId!,
          );
          if (resolvedEssayId) {
            setEssayId(resolvedEssayId);
            // console.log(`Derived essayId: ${resolvedEssayId} from studentId: ${state.studentId}, activityId: ${state.activityId}`);
          }
        } catch {
          // console.warn('Could not derive essayId from studentId and activityId:');
        }
      };
      deriveEssayId();
    }

    if (state?.analysis) {
      const stableAnalysis = JSON.parse(JSON.stringify(state.analysis));
      const stableText = state.text || '';
      const newAnalysisKey = `${stableText.substring(0, 50)}-${Date.now()}`;

      stableAnalysisRef.current = stableAnalysis;
      stableTextRef.current = stableText;

      setAnalysis(stableAnalysis);
      setAnalysisKey(newAnalysisKey);
      if (state.text) {
        setOriginalText(stableText);
        try {
          const dataToSave = {
            analysis: stableAnalysis,
            text: stableText,
            title: state.title || 'Essay Analysis',
            timestamp: Date.now(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch {
          // console.warn('Failed to save analysis to localStorage:', storageError);
        }
      }
    } else if (state?.text) {
      const textToAnalyze = state.text;
      setOriginalText(textToAnalyze);
      handleAnalyze(
        textToAnalyze,
        state.title || 'Essay Analysis',
        state.essayId,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Load saved plagiarism results when component mounts (if essayId or studentId/activityId are available)
  useEffect(() => {
    if (plagiarismResult) return; // Don't load if already have a result

    const loadSavedPlagiarism = async () => {
      try {
        let savedResult: PlagiarismCheckResponse | null = null;
        
        if (essayId) {
          savedResult = await loadPlagiarismResult(essayId);
        } else if (studentId && activityId) {
          savedResult = await loadPlagiarismResult(studentId, activityId);
        }
        
        if (savedResult) {
          setPlagiarismResult(savedResult);
        }
      } catch (err) {
        console.warn('Error loading saved plagiarism result:', err);
        // Don't show error - just silently fail, user can still check manually
      }
    };

    loadSavedPlagiarism();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essayId, studentId, activityId]);

  // Load saved AI detection results when component mounts (if essayId or studentId/activityId are available)
  useEffect(() => {
    if (aiDetectionResult) return; // Don't load if already have a result

    const loadSavedAIDetection = async () => {
      try {
        if (aiDetectionStorageKey) {
          const cached = localStorage.getItem(aiDetectionStorageKey);
          if (cached) {
            const parsed = JSON.parse(cached) as {
              result?: AIDetectionResponse;
            };
            if (parsed?.result) {
              setAiDetectionResult(parsed.result);
              return;
            }
          }
        }

        let savedResult: AIDetectionResponse | null = null;

        if (essayId) {
          savedResult = await loadAIDetectionResult(essayId);
        } else if (studentId && activityId) {
          savedResult = await loadAIDetectionResult(studentId, activityId);
        }

        if (savedResult) {
          setAiDetectionResult(savedResult);
          if (aiDetectionStorageKey) {
            localStorage.setItem(
              aiDetectionStorageKey,
              JSON.stringify({ result: savedResult, timestamp: Date.now() }),
            );
          }
        }
      } catch {
        // console.warn('Error loading saved AI detection result:');
      }
    };

    loadSavedAIDetection();
  }, [essayId, studentId, activityId, aiDetectionResult, aiDetectionStorageKey]);

  // Fetch duplicate essays for the activity
  useEffect(() => {
    if (!activityId) return;

    const loadDuplicates = async () => {
      setIsLoadingDuplicates(true);
      try {
        const groups = await fetchDuplicateEssays(activityId);
        setDuplicateGroups(groups);
      } catch {
        // console.warn('Error loading duplicate essays:');
      } finally {
        setIsLoadingDuplicates(false);
      }
    };

    loadDuplicates();
  }, [activityId]);

  // Save plagiarism result when navigating away, refreshing, or switching tabs
  useEffect(() => {
    const savePlagiarismOnExit = async () => {
      // Skip if already saved, in preview mode, user not authenticated, or no result to save
      if (plagiarismResultSavedRef.current || isPreviewMode || !isAuthenticated || !plagiarismResultRef.current) {
        return;
      }

      const result = plagiarismResultRef.current;
      let currentEssayId = essayId;
      let currentStudentId = studentId;
      let currentActivityId = activityId;

      // Fallback: check location.state if IDs aren't set
      if (!currentEssayId && !currentStudentId && !currentActivityId) {
        const state = location.state as {
          essayId?: string | number;
          studentId?: string;
          activityId?: string;
        } | null;
        if (state) {
          currentEssayId = state.essayId || currentEssayId;
          currentStudentId = state.studentId || currentStudentId;
          currentActivityId = state.activityId || currentActivityId;
        }
      }

      // Try to derive essayId if we have studentId and activityId
      if (!currentEssayId && currentStudentId && currentActivityId) {
        try {
          const { supabase } = await import('../lib/supabaseClient');
          
          let studentDbId = currentStudentId;
          const { isUuidString } = await import('../services/activityService');
          
          if (!isUuidString(currentStudentId)) {
            const { data: studentData } = await supabase
              .from('students')
              .select('id')
              .eq('student_code', currentStudentId)
              .maybeSingle();
            if (studentData) {
              studentDbId = studentData.id;
            }
          }
          
          const activityDbId = currentActivityId;
          if (studentDbId && activityDbId) {
            const { data: essayData } = await supabase
              .from('essays')
              .select('id')
              .eq('student_id', studentDbId)
              .eq('activity_id', activityDbId)
              .maybeSingle();
            
            if (essayData?.id) {
              currentEssayId = essayData.id;
            }
          }
        } catch {
          // console.warn('Could not derive essayId for saving plagiarism result:');
        }
      }

      // Save the result
      if (currentEssayId) {
        try {
          const saveResult = await savePlagiarismResult(currentEssayId, result);
          if (saveResult.success) {
            plagiarismResultSavedRef.current = true;
            // console.log('Saved plagiarism result on exit for essayId:', currentEssayId);
          } else {
            // console.warn('Failed to save plagiarism result on exit:', saveResult.error);
          }
        } catch {
          // console.warn('Error saving plagiarism result on exit:');
        }
      } else if (currentStudentId && currentActivityId) {
        try {
          const saveResult = await savePlagiarismResult(currentStudentId, currentActivityId, result);
          if (saveResult.success) {
            plagiarismResultSavedRef.current = true;
            // console.log('Saved plagiarism result on exit for studentId:', currentStudentId, 'activityId:', currentActivityId);
          } else {
            // console.warn('Failed to save plagiarism result on exit:', saveResult.error);
          }
        } catch {
          // console.warn('Error saving plagiarism result on exit:');
        }
      }
    };

    // Save on component unmount (back button, navigation)
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable saving on page unload
      if (!plagiarismResultSavedRef.current && !isPreviewMode && plagiarismResultRef.current) {
        // For beforeunload, we can't use async, so we'll trigger a sync save
        savePlagiarismOnExit();
      }
    };

    // Save when tab becomes hidden (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        savePlagiarismOnExit();
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup: save on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Save on unmount (synchronous save attempt)
      if (!plagiarismResultSavedRef.current && !isPreviewMode && plagiarismResultRef.current) {
        // Use a synchronous-like approach for unmount
        savePlagiarismOnExit().catch(() => {
          // console.warn('Error saving plagiarism result on unmount:');
        });
      }
    };
  }, [essayId, studentId, activityId, isPreviewMode, isAuthenticated, location.state]);

  // Match highlights by offset+length (not raw API index — display order is sorted/filtered).
  const handleErrorClick = useCallback((error: HighlightError) => {
    const key = getGrammarErrorSelectionKey(error);
    setSelectedErrorKey((prev) => (prev === key ? null : key));
  }, []);

  // Check for plagiarism
  const handleCheckPlagiarism = async () => {
    setIsCheckingPlagiarism(true);
    setPlagiarismError(null);
    setPlagiarismResult(null);

    try {
      // Skip saving in preview mode
      if (isPreviewMode) {
        const result = await plagiarismApi.checkPlagiarism(originalText);
        setPlagiarismResult(result);
        setIsCheckingPlagiarism(false);
        return;
      }

      // Get current IDs - check both state and location.state as fallback
      let currentEssayId = essayId;
      let currentStudentId = studentId;
      let currentActivityId = activityId;
      
      // Fallback: check location.state if IDs aren't set yet
      if (!currentEssayId && !currentStudentId && !currentActivityId) {
        const state = location.state as {
          essayId?: string | number;
          studentId?: string;
          activityId?: string;
        } | null;
        if (state) {
          currentEssayId = state.essayId || currentEssayId;
          currentStudentId = state.studentId || currentStudentId;
          currentActivityId = state.activityId || currentActivityId;
        }
      }

      // Try to get original_text from Supabase if essayId or studentId+activityId are available
      let textToCheck = originalText;
      let derivedEssayId = currentEssayId;
      
      if (currentEssayId) {
        // Fetch original_text from essay_analysis_results using essayId
        try {
          const { supabase } = await import('../lib/supabaseClient');
          const { data: analysisData, error } = await supabase
            .from('essay_analysis_results')
            .select('original_text')
            .eq('essay_id', currentEssayId)
            .maybeSingle();
          
          if (!error && analysisData?.original_text) {
            textToCheck = analysisData.original_text;
            // console.log(`Using original_text from Supabase for essay_id: ${currentEssayId}`);
          }
        } catch (err) {
          console.warn('Could not fetch original_text from Supabase, using provided text:', err);
        }
      } else if (currentStudentId && currentActivityId) {
        // Fetch original_text from essay_analysis_results using studentId and activityId
        try {
          // First get essay_id from essays table
          const { supabase } = await import('../lib/supabaseClient');
          
          // Parse student ID
          let studentDbId = currentStudentId;
          const { isUuidString } = await import('../services/activityService');
          
          if (!isUuidString(currentStudentId)) {
            const { data: studentData } = await supabase
              .from('students')
              .select('id')
              .eq('student_code', currentStudentId)
              .maybeSingle();
            if (studentData) studentDbId = studentData.id;
          }
          
          const activityDbId = currentActivityId;
          if (studentDbId && activityDbId) {
            // Get essay_id
            const { data: essayData } = await supabase
              .from('essays')
              .select('id')
              .eq('student_id', studentDbId)
              .eq('activity_id', activityDbId)
              .maybeSingle();
            
            if (essayData?.id) {
              derivedEssayId = essayData.id;
              // Update state for future use
              setEssayId(essayData.id);
              
              // Get original_text from essay_analysis_results
              const { data: analysisData, error } = await supabase
                .from('essay_analysis_results')
                .select('original_text')
                .eq('essay_id', essayData.id)
                .maybeSingle();
              
              if (!error && analysisData?.original_text) {
                textToCheck = analysisData.original_text;
                // console.log(`Using original_text from Supabase for studentId: ${currentStudentId}, activityId: ${currentActivityId}`);
              }
            }
          }
        } catch (err) {
          console.warn('Could not fetch original_text from Supabase, using provided text:', err);
        }
      }
      
      if (!textToCheck || textToCheck.trim().length < 10) {
        setPlagiarismError('Text must be at least 10 characters long. Could not fetch original text from database.');
        return;
      }

      const result = await plagiarismApi.checkPlagiarism(textToCheck);
      setPlagiarismResult(result);
      
      // Save plagiarism result to Supabase only if user is authenticated
      // Skip saving if user is not logged in to avoid unnecessary costs
      if (!isAuthenticated) {
        // console.log('Plagiarism check completed. Results not saved (user not authenticated).');
        return;
      }
      
      // Save plagiarism result to Supabase if essayId is available, or studentId and activityId
      if (derivedEssayId) {
        try {
          // console.log('Saving plagiarism result for essayId:', derivedEssayId);
          const saveResult = await savePlagiarismResult(derivedEssayId, result);
          if (saveResult.success) {
            // console.log('Successfully saved plagiarism result for essayId:', derivedEssayId);
            plagiarismResultSavedRef.current = true; // Mark as saved
          } else {
            // console.error('Failed to save plagiarism result for essayId:', derivedEssayId, saveResult.error);
            // Show a non-blocking warning to the user
            setPlagiarismError(`Plagiarism check completed, but failed to save results: ${saveResult.error}`);
          }
        } catch {
          // console.error('Error saving plagiarism result for essayId:');
          setPlagiarismError(`Plagiarism check completed, but failed to save results.`);
        }
      } else if (currentStudentId && currentActivityId) {
        try {
          // console.log('Saving plagiarism result for studentId:', currentStudentId, 'activityId:', currentActivityId);
          const saveResult = await savePlagiarismResult(currentStudentId, currentActivityId, result);
          if (saveResult.success) {
            // console.log('Successfully saved plagiarism result for studentId:', currentStudentId, 'activityId:', currentActivityId);
            plagiarismResultSavedRef.current = true; // Mark as saved
          } else {
            // console.error('Failed to save plagiarism result for studentId:', currentStudentId, 'activityId:', currentActivityId, saveResult.error);
            setPlagiarismError(`Plagiarism check completed, but failed to save results: ${saveResult.error}`);
          }
        } catch {
          // console.error('Error saving plagiarism result for studentId:');
          setPlagiarismError(`Plagiarism check completed, but failed to save results.`);
        }
      } else {
        // When no IDs are available, just show the result without saving
        // console.log('Plagiarism check completed. Results not saved (no identifiers available).');
      }
    } catch {
      const errorMessage = 'Failed to check for plagiarism';
      setPlagiarismError(errorMessage);
      // console.error('Error checking plagiarism:');
    } finally {
      setIsCheckingPlagiarism(false);
    }
  };

  const handleCheckAIDetection = async () => {
    setIsCheckingAIDetection(true);
    setAiDetectionError(null);
    setAiDetectionResult(null);

    try {
      const textToCheck = (originalText || '').trim();
      if (textToCheck.length < 10) {
        setAiDetectionError('Text must be at least 10 characters long for AI detection.');
        return;
      }

      const result = await aiDetectionApi.checkAIDetection(textToCheck);
      setAiDetectionResult(result);
      if (aiDetectionStorageKey) {
        localStorage.setItem(
          aiDetectionStorageKey,
          JSON.stringify({ result, timestamp: Date.now() }),
        );
      }

      if (!isAuthenticated) {
        // console.log('AI detection completed. Results not saved (user not authenticated).');
        return;
      }

      // Save AI detection result to Supabase if essayId is available, or studentId and activityId
      if (essayId) {
        const saveResult = await saveAIDetectionResult(essayId, result);
        if (!saveResult.success) {
          setAiDetectionError(`AI detection completed, but failed to save results: ${saveResult.error}`);
        }
      } else if (studentId && activityId) {
        const saveResult = await saveAIDetectionResult(studentId, activityId, result);
        if (!saveResult.success) {
          setAiDetectionError(`AI detection completed, but failed to save results: ${saveResult.error}`);
        }
      } else {
        // console.log('AI detection completed. Results not saved (no identifiers available).');
      }
    } catch {
      const errorMessage = 'Failed to check AI detection';
      setAiDetectionError(errorMessage);
      // console.error('Error checking AI detection:');
    } finally {
      setIsCheckingAIDetection(false);
    }
  };

  // Export analysis results to PDF
  const handleExportPDF = () => {
    if (!analysis || !originalText) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Essay Analysis Report', margin, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = analysis.generated_at
      ? new Date(analysis.generated_at).toLocaleString()
      : new Date().toLocaleString();
    doc.text(`Generated: ${dateStr}`, margin, yPosition);
    yPosition += 5;
    if (analysis.word_count) {
      doc.text(`Word Count: ${analysis.word_count}`, margin, yPosition);
      yPosition += 10;
    } else {
      yPosition += 5;
    }

    checkPageBreak(20);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Score', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(24);
    const overallScore = analysis.scores?.overall || 0;
    const scoreColor =
      overallScore >= 80 ? [34, 197, 94] : overallScore >= 60 ? [234, 179, 8] : [239, 68, 68];
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text(`${overallScore.toFixed(1)}/100`, margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 15;

    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Score Breakdown', margin, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const scores = analysis.scores || {};
    const scoreLabels = [
      { key: 'grammar', label: 'Grammar' },
      { key: 'readability', label: 'Readability' },
      { key: 'coherence', label: 'Coherence' },
      { key: 'argument_strength', label: 'Argument Strength' },
      { key: 'knowledge_graph', label: 'Knowledge Graph' },
    ];

    scoreLabels.forEach(({ key, label }) => {
      checkPageBreak(8);
      const score = scores[key as keyof typeof scores] || 0;
      doc.text(`${label}: ${score.toFixed(1)}/100`, margin + 5, yPosition);
      yPosition += 6;
    });
    yPosition += 5;

    if (analysis.recommendations && analysis.recommendations.length > 0) {
      checkPageBreak(30);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Recommendations', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      analysis.recommendations.forEach((rec, index) => {
        checkPageBreak(15);
        const recText = typeof rec === 'string' ? rec : rec.message || '';
        const lines = doc.splitTextToSize(`${index + 1}. ${recText}`, maxWidth - 10);
        lines.forEach((line: string) => {
          checkPageBreak(6);
          doc.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
        yPosition += 2;
      });
      yPosition += 5;
    }

    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Essay Text', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const essayLines = doc.splitTextToSize(originalText, maxWidth);
    essayLines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });

    const fileName = `essay-analysis-${Date.now()}.pdf`;
    doc.save(fileName);
  };

  // Memoize grammarErrors to prevent unnecessary recalculations in EssayTextDisplay
  // Must be called before any early returns to follow Rules of Hooks
  const grammarErrors = useMemo(() => {
    return analysis?.detailed_analysis?.grammar?.errors || [];
  }, [analysis]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <KnowledgeGraphLoader size="md" className="mb-6" />
          <p className="text-lg font-medium text-white mb-2 drop-shadow-lg">Analyzing your essay...</p>
          <p className="text-sm text-neutral-200 drop-shadow-md">Building knowledge graph connections...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <Modal isOpen={true} onClose={() => navigate(-1)} size="md">
            <div className="flex flex-col items-center text-center p-8">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Analysis Error</h3>
              <p className="text-neutral-600">{error}</p>
              <button
                onClick={() => navigate(-1)}
                className="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Close
              </button>
            </div>
          </Modal>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const recommendations: DiagnosticRecommendation[] = analysis.recommendations || [];
  const rubricData = analysis.rubric_scores
    ? {
        rubric_id: analysis.rubric_scores.rubric_id,
        rubric_name: analysis.rubric_scores.rubric_name,
      }
    : undefined;

  // Find the rubric for preview
  const handlePreviewRubric = () => {
    if (!rubricData?.rubric_id) return;

    // Try to find in platform rubrics
    // rubric_id might be a number or string like "platform-1"
    let rubricId: number | null = null;
    if (typeof rubricData.rubric_id === 'number') {
      rubricId = rubricData.rubric_id;
    } else if (typeof rubricData.rubric_id === 'string') {
      // Handle "platform-1" format
      if (rubricData.rubric_id.startsWith('platform-')) {
        const numId = parseInt(rubricData.rubric_id.replace('platform-', ''));
        if (!isNaN(numId)) rubricId = numId;
      } else {
        const numId = parseInt(rubricData.rubric_id);
        if (!isNaN(numId)) rubricId = numId;
      }
    }

    if (rubricId !== null) {
      const rubric = platformRubrics.find((r) => r.id === rubricId);
      if (rubric) {
        setPreviewRubric(rubric);
        setShowRubricPreview(true);
      }
    }
  };

  return (
    <div className="relative h-screen flex flex-col bg-neutral-50/50 overflow-hidden font-sans">
      {/* Premium visual background flourishes */}
      <div className="absolute top-[-5%] right-[-10%] w-[45%] h-[45%] bg-primary-200/20 blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[-10%] w-[35%] h-[35%] bg-success-200/10 blur-[110px] rounded-full pointer-events-none z-0" />

      {/* Header - Fixed height with glassmorphism */}
      <header className="relative z-20 flex-shrink-0 bg-white/70 backdrop-blur-xl border-b border-white/40 px-8 py-4 shadow-sm">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center space-x-2 text-neutral-500 hover:text-primary transition-all duration-300"
            >
              <div className="p-2 rounded-xl group-hover:bg-primary-50 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs uppercase tracking-widest px-2">Back</span>
            </button>
            <div className="h-8 w-px bg-neutral-200/60" />
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-neutral-900 tracking-tight leading-none">
                  {isPreviewMode ? <>Analysis <span className="text-primary">Preview</span></> : <>Analysis <span className="text-primary">Report</span></>}
                </h1>
                {rubricData?.rubric_name && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50/50 border border-primary-100/50 rounded-xl">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{rubricData.rubric_name}</span>
                    <button
                      onClick={handlePreviewRubric}
                      className="p-1 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-primary-100"
                      title="Preview rubric details"
                    >
                      <Info className="w-3.5 h-3.5 text-primary" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3 mt-1.5">
                {analysis.word_count && <div className="flex items-center gap-1.5"><Badge variant="neutral" size="sm" className="bg-neutral-100 text-[9px] font-bold uppercase rounded-md">{analysis.word_count} Words</Badge></div>}
                <span className="text-neutral-300">•</span>
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">{new Date(analysis.generated_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={handleExportPDF}
            className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 py-3 px-6 font-bold text-[10px] uppercase tracking-widest"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </header>

      {/* Main 50/50 Split-Screen Layout */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="h-full"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
          }}
        >
          {/* Left Panel - Essay Text */}
          <div className="relative h-full flex flex-col border-r border-neutral-200 bg-white overflow-hidden">
            {/* Scrollable Essay Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <EssayTextDisplay
                  originalText={originalText}
                  grammarErrors={grammarErrors}
                  selectedErrorKey={selectedErrorKey}
                  onErrorClick={handleErrorClick}
                  analysisKey={analysisKey}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Analysis Tabs */}
          <div className="h-full flex flex-col bg-white/30 backdrop-blur-md overflow-hidden relative z-10">
            {/* Tabs Header */}
            <div className="flex-shrink-0 bg-white/80 border-b border-neutral-200">
              <div className="flex px-4">
                {[
                  { id: 'insights', label: 'Analysis Insights', icon: TrendingUp },
                  { id: 'feedback', label: 'Diagnostic Feedback', icon: Lightbulb },
                  { id: 'rubric', label: 'Rubric Index', icon: ClipboardList },
                  { id: 'plagiarism', label: 'Integrity Scan', icon: Shield },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as 'insights' | 'feedback' | 'rubric' | 'plagiarism')}
                      className={`relative flex-1 flex flex-col items-center justify-center py-5 transition-all duration-300 group ${
                        isActive ? 'text-primary' : 'text-neutral-400 hover:text-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                         <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                         <span className={`text-[10px] font-bold uppercase tracking-widest transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{tab.label}</span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="activeTabUnderline"
                          className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {activeTab === 'insights' && (
                <AnalysisMetrics 
                  analysis={analysis} 
                  onErrorClick={handleErrorClick}
                  prominentGraph={true}
                />
              )}

              {activeTab === 'feedback' && <FeedbackPanel recommendations={recommendations} />}

              {activeTab === 'rubric' && (
                <RubricScores analysis={analysis} />
              )}

              {activeTab === 'plagiarism' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg border border-neutral-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-neutral-900 mb-1">Plagiarism Check</h2>
                        <p className="text-sm text-neutral-600">
                          Check your essay for potential plagiarism using Copyscape
                        </p>
                      </div>
                    </div>
                    
                    {!plagiarismResult && !isCheckingPlagiarism && (
                      <div className="space-y-4">
                        <p className="text-sm text-neutral-600">
                          Click the button below to check your essay for plagiarism. This will compare your text against billions of web pages.
                        </p>
                        <button
                          onClick={handleCheckPlagiarism}
                          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                        >
                          <Shield className="w-5 h-5" />
                          <span>Check for Plagiarism</span>
                        </button>
                      </div>
                    )}

                    {isCheckingPlagiarism && (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-neutral-600">Checking for plagiarism...</p>
                        <p className="text-xs text-neutral-500">This may take a few moments</p>
                      </div>
                    )}

                    {plagiarismError && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                            <p className="text-sm text-red-700">{plagiarismError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {plagiarismResult && !isCheckingPlagiarism && (
                      <div className="space-y-4 mt-4">
                        {/* Overall Result */}
                        <div className={`p-4 rounded-lg border-2 ${
                          plagiarismResult.is_plagiarized
                            ? 'bg-red-50 border-red-200'
                            : 'bg-green-50 border-green-200'
                        }`}>
                          <div className="flex items-center space-x-3">
                            {plagiarismResult.is_plagiarized ? (
                              <XCircle className="w-6 h-6 text-red-600" />
                            ) : (
                              <CheckCircle2 className="w-6 h-6 text-green-600" />
                            )}
                            <div>
                              <h3 className={`font-bold text-lg ${
                                plagiarismResult.is_plagiarized ? 'text-red-900' : 'text-green-900'
                              }`}>
                                {plagiarismResult.is_plagiarized
                                  ? 'Potential Plagiarism Detected'
                                  : 'No Plagiarism Detected'}
                              </h3>
                              <p className={`text-sm ${
                                plagiarismResult.is_plagiarized ? 'text-red-700' : 'text-green-700'
                              }`}>
                                {plagiarismResult.is_plagiarized
                                  ? `Found ${plagiarismResult.match_count} potential match${plagiarismResult.match_count !== 1 ? 'es' : ''} with ${plagiarismResult.plagiarism_percentage.toFixed(1)}% similarity`
                                  : 'Your essay appears to be original'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Statistics */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-neutral-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-neutral-900">
                              {plagiarismResult.plagiarism_percentage.toFixed(1)}%
                            </div>
                            <div className="text-xs text-neutral-600 mt-1">Similarity</div>
                          </div>
                          <div className="bg-neutral-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-neutral-900">
                              {plagiarismResult.match_count}
                            </div>
                            <div className="text-xs text-neutral-600 mt-1">Matches Found</div>
                          </div>
                          <div className="bg-neutral-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-neutral-900">
                              {plagiarismResult.text_length}
                            </div>
                            <div className="text-xs text-neutral-600 mt-1">Characters Checked</div>
                          </div>
                        </div>

                        {/* Matches */}
                        {plagiarismResult.matches && plagiarismResult.matches.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-semibold text-neutral-900">Potential Matches</h3>
                            {plagiarismResult.matches.map((match: PlagiarismMatch, index: number) => (
                              <div
                                key={index}
                                className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 hover:bg-neutral-100 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-sm font-semibold text-red-600">
                                        {match.percent.toFixed(1)}% match
                                      </span>
                                      {match.words && (
                                        <span className="text-xs text-neutral-500">
                                          ({match.words} words)
                                        </span>
                                      )}
                                    </div>
                                    {match.title && (
                                      <h4 className="font-medium text-neutral-900 mb-1">
                                        {match.title}
                                      </h4>
                                    )}
                                    <a
                                      href={match.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:text-primary-600 flex items-center space-x-1 group"
                                    >
                                      <span className="truncate max-w-md">{match.url}</span>
                                      <ExternalLink className="w-3 h-3 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Check Again Button */}
                        <button
                          onClick={handleCheckPlagiarism}
                          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium mt-4"
                        >
                          <Shield className="w-5 h-5" />
                          <span>Check Again</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg border border-neutral-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-neutral-900 mb-1">AI Detection</h2>
                        <p className="text-sm text-neutral-600">
                          Check whether the essay appears AI-generated using Copyscape AI detection
                        </p>
                      </div>
                    </div>

                    {!aiDetectionResult && !isCheckingAIDetection && (
                      <div className="space-y-4">
                        <p className="text-sm text-neutral-600">
                          Click the button below to run AI detection on this essay text.
                        </p>
                        <button
                          onClick={handleCheckAIDetection}
                          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                          <Shield className="w-5 h-5" />
                          <span>Run AI Detection</span>
                        </button>
                      </div>
                    )}

                    {isCheckingAIDetection && (
                      <div className="flex flex-col items-center justify-center py-10 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        <p className="text-neutral-600">Checking AI likelihood...</p>
                      </div>
                    )}

                    {aiDetectionError && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                            <p className="text-sm text-red-700">{aiDetectionError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {aiDetectionResult && !isCheckingAIDetection && (
                      <div className="space-y-4 mt-4">
                        <div className={`p-4 rounded-lg border-2 ${
                          aiDetectionResult.is_ai_generated
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-green-50 border-green-200'
                        }`}>
                          <div className="flex items-center space-x-3">
                            {aiDetectionResult.is_ai_generated ? (
                              <AlertTriangle className="w-6 h-6 text-amber-600" />
                            ) : (
                              <CheckCircle2 className="w-6 h-6 text-green-600" />
                            )}
                            <div>
                              <h3 className={`font-bold text-lg ${
                                aiDetectionResult.is_ai_generated ? 'text-amber-900' : 'text-green-900'
                              }`}>
                                {aiDetectionResult.is_ai_generated ? 'Potential AI-Generated Content' : 'Likely Human-Written'}
                              </h3>
                              <p className={`text-sm ${
                                aiDetectionResult.is_ai_generated ? 'text-amber-700' : 'text-green-700'
                              }`}>
                                {aiDetectionResult.verdict || 'AI detection completed'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-neutral-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-neutral-900">
                              {Number(aiDetectionResult.ai_score || 0).toFixed(1)}%
                            </div>
                            <div className="text-xs text-neutral-600 mt-1">AI Score</div>
                          </div>
                          <div className="bg-neutral-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-neutral-900">
                              {Number(aiDetectionResult.confidence || 0).toFixed(1)}%
                            </div>
                            <div className="text-xs text-neutral-600 mt-1">Confidence</div>
                          </div>
                        </div>

                        <button
                          onClick={handleCheckAIDetection}
                          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium mt-2"
                        >
                          <Shield className="w-5 h-5" />
                          <span>Run Again</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Duplicate Essays Section */}
                  <div className="bg-white rounded-lg border border-neutral-200 p-6 mt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${duplicateGroups.length > 0 ? 'text-warning-default' : 'text-neutral-400'}`} />
                      <div>
                        <h2 className="text-xl font-bold text-neutral-900 mb-1">Cross-Class Duplicate Detection</h2>
                        <p className="text-sm text-neutral-600">
                          Identifies identical content submitted by different students across all programs and blocks.
                        </p>
                      </div>
                    </div>

                    {isLoadingDuplicates ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="ml-2 text-neutral-600">Checking for duplicate submissions...</span>
                      </div>
                    ) : duplicateGroups.length > 0 ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-warning-default/5 border border-warning-default/20 rounded-lg">
                          <p className="text-sm text-warning-default-dark font-medium">
                            Warning: {duplicateGroups.length} duplicate group{duplicateGroups.length !== 1 ? 's' : ''} found in this activity.
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          {duplicateGroups.map((group, index) => (
                            <div key={index} className="bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden">
                              <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-200 flex items-center justify-between">
                                <span className="text-sm font-bold text-neutral-900">Duplicate Group #{index + 1}</span>
                                <Badge className="bg-warning-default text-white border-none text-xs">
                                  {group.essays.length} matching essays
                                </Badge>
                              </div>
                              <div className="divide-y divide-neutral-100">
                                {group.essays.map((essay, essayIndex) => (
                                  <div key={essayIndex} className="p-3 bg-white">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-semibold text-neutral-900">{essay.studentName}</span>
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                        {essay.programName} • {essay.sectionName}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-neutral-500 italic truncate">
                                      "{essay.title}"
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                        <CheckCircle2 className="w-8 h-8 text-success-default mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-neutral-500">No cross-class duplicate essays detected.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rubric Preview Modal */}
      {showRubricPreview && previewRubric && (
        <RubricPreviewModal
          rubric={previewRubric}
          isOpen={showRubricPreview}
          onClose={() => setShowRubricPreview(false)}
        />
      )}
    </div>
  );
};

export default AnalysisResults;
