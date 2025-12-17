import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { TrendingUp, TrendingDown } from 'lucide-react';

// Import reusable chart components
import { 
  SectionPerformanceChart,
  GrammarTrendChart,
  CoherenceDistributionChart,
  VocabularyComplexityChart,
  type SectionPerformanceData,
  type GrammarTrendData,
  type CoherenceDistributionData,
  type VocabularyComplexityData,
} from '../../components/charts';

// --- MOCK DATA ---

const sectionScoresData: SectionPerformanceData[] = [
  { section: 'CS101-A', avgScore: 85 },
  { section: 'CS101-B', avgScore: 82 },
  { section: 'DS-A', avgScore: 79 },
  { section: 'DS-B', avgScore: 81 },
  { section: 'WD-A', avgScore: 88 },
  { section: 'WD-B', avgScore: 84 },
  { section: 'ML-A', avgScore: 76 },
  { section: 'DB-A', avgScore: 87 },
];

const grammarTrendsData: GrammarTrendData[] = [
  { week: 'Week 1', errors: 45 },
  { week: 'Week 2', errors: 42 },
  { week: 'Week 3', errors: 38 },
  { week: 'Week 4', errors: 35 },
  { week: 'Week 5', errors: 32 },
  { week: 'Week 6', errors: 29 },
  { week: 'Week 7', errors: 27 },
  { week: 'Week 8', errors: 25 },
];

const coherenceDistribution: CoherenceDistributionData[] = [
  { range: '90-100', count: 120 },
  { range: '80-89', count: 180 },
  { range: '70-79', count: 145 },
  { range: '60-69', count: 85 },
  { range: '<60', count: 42 },
];

const vocabularyComplexity: VocabularyComplexityData[] = [
  { level: 'Advanced', value: 28, color: '#10B981' },
  { level: 'Intermediate', value: 45, color: '#38BDF8' },
  { level: 'Basic', value: 27, color: '#F59E0B' },
];

const topPerformers = [
  { name: 'Michael Chen', avgScore: 92, essays: 12, improvement: '+5%' },
  { name: 'Sophia Taylor', avgScore: 90, essays: 10, improvement: '+3%' },
  { name: 'Emma Wilson', avgScore: 88, essays: 11, improvement: '+2%' },
  { name: 'Daniel Garcia', avgScore: 86, essays: 9, improvement: '+4%' },
  { name: 'Liam Anderson', avgScore: 84, essays: 10, improvement: '+1%' },
];

const atRiskStudents = [
  { name: 'Alex Johnson', avgScore: 58, essays: 8, trend: 'down', issues: ['Grammar', 'Coherence'] },
  { name: 'Rachel Kim', avgScore: 62, essays: 7, trend: 'down', issues: ['Structure', 'Citations'] },
  { name: 'Tyler Brown', avgScore: 65, essays: 6, trend: 'stable', issues: ['Vocabulary', 'Flow'] },
];

export function MetricsTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">AI Metrics & Performance</h1>
          <p className="text-sm text-neutral-500 mt-1">Visualize NLP-based essay evaluation metrics</p>
        </div>
        <Badge className="bg-primary/10 text-primary">AI-Powered Analytics</Badge>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Avg Grammar Score</p>
              <p className="text-2xl text-neutral-900 mt-1">88.2%</p>
              <div className="flex items-center gap-1 mt-2 text-success-default text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+1.5%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-success-default/10 flex items-center justify-center text-success-default text-2xl">
              ✓
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Avg Coherence</p>
              <p className="text-2xl text-neutral-900 mt-1">79.8%</p>
              <div className="flex items-center gap-1 mt-2 text-error-default text-sm">
                <TrendingDown className="w-4 h-4" />
                <span>-0.8%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-info-default/10 flex items-center justify-center text-info-default text-2xl">
              
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Vocabulary Level</p>
              <p className="text-2xl text-neutral-900 mt-1">7.2/10</p>
              <div className="flex items-center gap-1 mt-2 text-success-default text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+0.4</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-warning-default/10 flex items-center justify-center text-warning-default text-2xl">
              
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Plagiarism Risk</p>
              <p className="text-2xl text-neutral-900 mt-1">2.3%</p>
              <div className="flex items-center gap-1 mt-2 text-success-default text-sm">
                <TrendingDown className="w-4 h-4 rotate-180" />
                <span>-0.5%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-error-default/10 flex items-center justify-center text-error-default text-2xl">
              
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Scores per Section */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">Average Scores per Section</h2>
          <SectionPerformanceChart data={sectionScoresData} />
        </Card>

        {/* Grammar Error Trends */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">Grammar Error Trends</h2>
          <GrammarTrendChart data={grammarTrendsData} />
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coherence Score Distribution */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">Coherence Score Distribution</h2>
          <CoherenceDistributionChart data={coherenceDistribution} />
        </Card>

        {/* Vocabulary Complexity */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">Vocabulary Complexity Index</h2>
          <VocabularyComplexityChart data={vocabularyComplexity} />
        </Card>
      </div>

      {/* Student Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">Top-Performing Students</h2>
          <div className="space-y-3">
            {topPerformers.map((student, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-success-default/5 rounded-rd border border-success-default/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-success-default text-white flex items-center justify-center text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-neutral-900">{student.name}</p>
                    <p className="text-xs text-neutral-500">{student.essays} essays</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-success-default text-white">{student.avgScore}%</Badge>
                  <p className="text-xs text-success-default mt-1">{student.improvement}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* At-Risk Students */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">At-Risk Students</h2>
          <div className="space-y-3">
            {atRiskStudents.map((student, idx) => (
              <div key={idx} className="p-4 bg-warning-default/5 rounded-rd border border-warning-default/20">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-neutral-900">{student.name}</p>
                    <p className="text-xs text-neutral-500">{student.essays} essays submitted</p>
                  </div>
                  <Badge className="bg-warning-default text-white">{student.avgScore}%</Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {student.issues.map((issue, i) => (
                    <Badge key={i} variant="outline" className="bg-error-default/10 text-error-default border-error-default/20 text-xs">
                      {issue}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
