import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  TrendingUp,
  Lightbulb,
  ClipboardList,
} from 'lucide-react';
import jsPDF from 'jspdf';
import Card from '../components/ui/Card';
import KnowledgeGraphLoader from '../components/ui/KnowledgeGraphLoader';
import Modal from '../components/ui/Modal';
import { EssayTextDisplay, AnalysisMetrics, FeedbackPanel, type HighlightError } from '../components/grading';
import type { AnalysisResponse, DiagnosticRecommendation } from '../types/Essay';
import { analysisApi } from '../api';

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
          suggestion: 'Consider using "occurrence" instead',
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
          suggestion: 'Consider using more specific language',
          context: 'things that affect',
          offset: 1745,
          errorLength: 6,
        },
        {
          type: 'grammar',
          message: 'Dangling modifier',
          suggestion: 'Rephrase to clarify the subject',
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
  const [activeTab, setActiveTab] = useState<'insights' | 'feedback' | 'rubric'>('insights');
  const [originalText, setOriginalText] = useState<string>('');
  const [selectedErrorIndex, setSelectedErrorIndex] = useState<number | null>(null);
  const [analysisKey, setAnalysisKey] = useState<string>('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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
      let result;
      if (essayId) {
        result = await analysisApi.analyzeEssay(essayId, 'comprehensive');
      } else {
        result = await analysisApi.analyzeText(text, title, 'comprehensive');
      }
      const analysisResult = result as Omit<AnalysisResponse, 'essay_id'>;

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
      analysis?: Omit<AnalysisResponse, 'essay_id'>;
      text?: string;
      title?: string;
      essayId?: number;
      error?: string;
      preview?: boolean;
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

  // Handle error click from metrics panel - scroll to error in essay
  const handleErrorClick = useCallback((_error: HighlightError, index: number) => {
    setSelectedErrorIndex(index);
  }, []);

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
            onClick={() => navigate('/', { state: { text: originalText } })}
            className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </button>
          <Modal isOpen={true} onClose={() => navigate('/', { state: { text: originalText } })} size="md">
            <div className="flex flex-col items-center text-center p-8">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Analysis Error</h3>
              <p className="text-neutral-600">{error}</p>
              <button
                onClick={() => navigate('/', { state: { text: originalText } })}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-neutral-200 px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/', { state: { text: originalText } })}
              className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <div className="h-6 w-px bg-neutral-300" />
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
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

      {/* Main Split-Screen Layout */}
      <div className="max-w-[1800px] mx-auto p-6">
        <div 
          className="gap-6" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'minmax(0, 1fr) 420px',
          }}
        >
          {/* Left Column - Essay Text */}
          <div className="min-w-0">
            <div style={{ height: 'calc(100vh - 160px)', position: 'sticky', top: '100px' }}>
              <EssayTextDisplay
                originalText={originalText}
                grammarErrors={grammarErrors}
                selectedErrorIndex={selectedErrorIndex}
                onErrorClick={handleErrorClick}
                analysisKey={analysisKey}
              />
            </div>
          </div>

          {/* Right Column - Sticky Sidebar with Tabs */}
          <div className="w-[420px] flex-shrink-0">
            <div style={{ position: 'sticky', top: '100px' }}>
              {/* Sidebar Tabs */}
              <div className="bg-white rounded-t-xl border border-b-0 border-neutral-200">
                <div className="flex">
                  {[
                    { id: 'insights', label: 'Insights', icon: TrendingUp },
                    { id: 'feedback', label: 'Feedback', icon: Lightbulb },
                    { id: 'rubric', label: 'Rubric', icon: ClipboardList },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'insights' | 'feedback' | 'rubric')}
                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
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

              {/* Tab Content */}
              <div className="bg-white rounded-b-xl border border-t-0 border-neutral-200 shadow-sm">
                <div className="p-4 h-[calc(100vh-220px)] overflow-y-auto">
                  {activeTab === 'insights' && (
                    <AnalysisMetrics analysis={analysis} onErrorClick={handleErrorClick} />
                  )}

                  {activeTab === 'feedback' && <FeedbackPanel recommendations={recommendations} />}

                  {activeTab === 'rubric' && (
                    <Card className="text-center py-12">
                      <ClipboardList className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2">Manual Grading</h3>
                      <p className="text-sm text-neutral-600 max-w-xs mx-auto">
                        Manual grading interface with custom rubrics coming soon. Teachers will be able
                        to apply rubrics and provide personalized feedback.
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
