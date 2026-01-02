import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import jsPDF from 'jspdf';
import Card from '../components/ui/Card';
import KnowledgeGraphLoader from '../components/ui/KnowledgeGraphLoader';
import Modal from '../components/ui/Modal';
import { EssayTextDisplay, AnalysisMetrics, FeedbackPanel, RubricScores, type HighlightError } from '../components/grading';
import type { AnalysisResponse, TextAnalysisResponse, DiagnosticRecommendation } from '../types/Essay';
import { analysisApi, plagiarismApi, type PlagiarismCheckResponse, type PlagiarismMatch } from '../api';

const STORAGE_KEY = 'essay_analysis_results';

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
        grounds_per_claim: 1.5,
        has_thesis: true,
        has_evidence: true,
        has_reasoning: true,
        has_counterarguments: true,
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
        ],
        edges: [
          { source: 'claim1', target: 'thesis', type: 'supports' },
          { source: 'evidence1', target: 'claim1', type: 'proves' },
          { source: 'claim2', target: 'thesis', type: 'supports' },
          { source: 'evidence2', target: 'claim2', type: 'proves' },
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
} as unknown as Omit<AnalysisResponse, 'essay_id'>;

const MOCK_ESSAY_TEXT = `Climate change represents one of the most pressing challenges of our time, requiring immediate and coordinated global action to mitigate its devastating effects. The scientific consensus is clear: human activities, particularly the burning of fossil fuels, have led to unprecedented increases in atmospheric greenhouse gas concentrations.

The evidence for climate change is overwhelming. NASA data shows a 1.1°C increase in global average temperature since pre-industrial times. The students is working hard to understand these complex issues. This warming has accelerated over the past few decades, with the last seven years being the warmest on record.

Renewable energy sources offer a viable path forward. Solar costs dropped 89% since 2010, making it competitive with traditional fossil fuels in many markets. Wind power has experienced similar cost reductions, and both technologies continue to improve. However the research shows that adoption rates vary significantly across regions.

The economic arguments for action are compelling. Studies indicate that the cost of inaction far exceeds the investment required for transition to clean energy. Furthermore, the renewable energy sector has become a significant source of employment, creating millions of jobs worldwide.

Some skeptics argue that climate action would harm economic growth. However, this view fails to account for the long-term costs of climate impacts, including extreme weather events, sea-level rise, and agricultural disruption. The common occurance in academic literature suggests that early action is more cost-effective than delayed response.

In conclusion, addressing climate change requires coordinated effort across all sectors of society. The things that affect our climate are complex, but the solutions are within reach. Walking to school, the rain started falling, reminding us of the unpredictable weather patterns increasingly common in our changing world. By embracing renewable energy, improving energy efficiency, and implementing effective policies, we can build a sustainable future for generations to come.`;

const AnalysisResults: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [analysis, setAnalysis] = useState<Omit<AnalysisResponse, 'essay_id'> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'feedback' | 'rubric' | 'plagiarism'>('insights');
  const [originalText, setOriginalText] = useState<string>('');
  const [selectedErrorIndex, setSelectedErrorIndex] = useState<number | null>(null);
  const [selectedError, setSelectedError] = useState<HighlightError | null>(null);
  const [analysisKey, setAnalysisKey] = useState<string>('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismCheckResponse | null>(null);
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
  const [plagiarismError, setPlagiarismError] = useState<string | null>(null);

  // Stable references to prevent recalculation
  const stableAnalysisRef = useRef<Omit<AnalysisResponse, 'essay_id'> | null>(null);
  const stableTextRef = useRef<string>('');

  const handleAnalyze = async (text: string, title: string, essayId?: number) => {
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
      const analysisResult: Omit<AnalysisResponse, 'essay_id'> = 
        'essay_id' in result 
          ? (() => {
              const { essay_id, ...rest } = result;
              return rest;
            })()
          : result;

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
      } catch (storageError) {
        console.warn('Failed to save analysis to localStorage:', storageError);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze essay';
      setError(errorMessage);
      console.error('Error analyzing essay:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get analysis data from location state, localStorage, or use mock data for preview
  useEffect(() => {
    if (analysis && originalText) return;

    const state = location.state as {
      rubricId?: string;
      analysis?: Omit<AnalysisResponse, 'essay_id'>;
      text?: string;
      title?: string;
      essayId?: number;
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
      } catch (storageError) {
        console.warn('Failed to load analysis from localStorage:', storageError);
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
      setLoading(true);
      // Create async function to handle the fetch
      const fetchAnalysis = async () => {
        try {
          // Dynamic import to avoid potential circular dependencies
          const { fetchEssayAnalysis } = await import('../services/activityService');
          const analysisData = await fetchEssayAnalysis(state.studentId, state.activityId);
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
          console.error('Error loading analysis from notification:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchAnalysis();
      return;
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
        } catch (storageError) {
          console.warn('Failed to save analysis to localStorage:', storageError);
        }
      }
    } else if (state?.text) {
      const textToAnalyze = state.text;
      setOriginalText(textToAnalyze);
      handleAnalyze(textToAnalyze, state.title || 'Essay Analysis', state.essayId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Handle error click - toggle selection (inline details are handled in EssayTextDisplay)
  const handleErrorClick = useCallback((error: HighlightError, index: number) => {
    // Toggle: if same error is clicked, deselect it; otherwise select the new one
    if (selectedErrorIndex === index) {
      setSelectedErrorIndex(null);
      setSelectedError(null);
    } else {
      setSelectedErrorIndex(index);
      setSelectedError(error);
    }
  }, [selectedErrorIndex]);

  // Check for plagiarism
  const handleCheckPlagiarism = async () => {
    if (!originalText || originalText.trim().length < 10) {
      setPlagiarismError('Text must be at least 10 characters long');
      return;
    }

    setIsCheckingPlagiarism(true);
    setPlagiarismError(null);
    setPlagiarismResult(null);

    try {
      const result = await plagiarismApi.checkPlagiarism(originalText);
      setPlagiarismResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check for plagiarism';
      setPlagiarismError(errorMessage);
      console.error('Error checking plagiarism:', err);
    } finally {
      setIsCheckingPlagiarism(false);
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
  const grammarErrors = analysis.detailed_analysis?.grammar?.errors || [];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-b border-neutral-200 px-6 py-3">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <div className="h-6 w-px bg-neutral-300" />
            <div>
              <h1 className="text-lg font-bold text-neutral-900">
                {isPreviewMode ? 'Analysis Preview (Demo)' : 'Essay Analysis'}
              </h1>
              <div className="flex items-center space-x-3 text-xs text-neutral-500">
                {analysis.word_count && <span>{analysis.word_count} words</span>}
                <span>•</span>
                <span>{new Date(analysis.generated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="font-medium">Export PDF</span>
          </button>
        </div>
      </div>

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
                  selectedErrorIndex={selectedErrorIndex}
                  onErrorClick={handleErrorClick}
                  analysisKey={analysisKey}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Analysis Tabs */}
          <div className="h-full flex flex-col bg-neutral-50/50 overflow-hidden">
            {/* Tabs Header */}
            <div className="flex-shrink-0 bg-white border-b border-neutral-200">
              <div className="flex">
                {[
                  { id: 'insights', label: 'Insights', icon: TrendingUp },
                  { id: 'feedback', label: 'Feedback', icon: Lightbulb },
                  { id: 'rubric', label: 'Rubric', icon: ClipboardList },
                  { id: 'plagiarism', label: 'Plagiarism', icon: Shield },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as 'insights' | 'feedback' | 'rubric' | 'plagiarism')}
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-4 text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-primary border-b-2 border-primary bg-primary-50/50'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
