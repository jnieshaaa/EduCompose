import { useState, useEffect } from "react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Link,
  BookOpen,
  Shield,
} from "lucide-react";

// Import reusable chart components
import {
  SectionPerformanceChart,
  GrammarTrendChart,
  CoherenceDistributionChart,
  VocabularyComplexityChart,
  type VocabularyComplexityData as ChartVocabularyComplexityData,
} from "../../components/charts";

// Import service function
import {
  fetchTeacherMetrics,
  type TeacherMetrics,
} from "../../services/activityService";

export function MetricsTab() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<TeacherMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTeacherMetrics();
        setMetrics(data);
      } catch (err) {
        console.error("Error loading metrics:", err);
        setError("Failed to load metrics data");
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-500">Loading metrics...</div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-error-default">
          {error || "No metrics data available"}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">
            AI Metrics & Performance
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Visualize NLP-based essay evaluation metrics
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary">
          AI-Powered Analytics
        </Badge>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Avg Grammar Score</p>
              <p className="text-2xl text-neutral-900 mt-1">
                {metrics.avgGrammarScore.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1 mt-2 text-success-default text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+1.5%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-success-default/10 flex items-center justify-center text-success-default">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Avg Coherence</p>
              <p className="text-2xl text-neutral-900 mt-1">
                {metrics.avgCoherenceScore.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1 mt-2 text-error-default text-sm">
                <TrendingDown className="w-4 h-4" />
                <span>-0.8%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-info-default/10 flex items-center justify-center text-info-default">
              <Link className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Vocabulary Level</p>
              <p className="text-2xl text-neutral-900 mt-1">
                {metrics.avgVocabularyLevel.toFixed(1)}/10
              </p>
              <div className="flex items-center gap-1 mt-2 text-success-default text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+0.4</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-warning-default/10 flex items-center justify-center text-warning-default">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-neutral-500">Plagiarism Risk</p>
              <p className="text-2xl text-neutral-900 mt-1">
                {metrics.plagiarismRisk.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1 mt-2 text-success-default text-sm">
                <TrendingDown className="w-4 h-4 rotate-180" />
                <span>-0.5%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-error-default/10 flex items-center justify-center text-error-default">
              <Shield className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Scores per Section */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">
            Average Scores per Section
          </h2>
          {metrics.sectionPerformance.length > 0 ? (
            <SectionPerformanceChart data={metrics.sectionPerformance} />
          ) : (
            <div className="text-neutral-500 text-center py-8">
              No section data available
            </div>
          )}
        </Card>

        {/* Grammar Error Trends */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">
            Grammar Error Trends
          </h2>
          {metrics.grammarTrends.length > 0 ? (
            <GrammarTrendChart data={metrics.grammarTrends} />
          ) : (
            <div className="text-neutral-500 text-center py-8">
              No grammar trend data available
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coherence Score Distribution */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">
            Coherence Score Distribution
          </h2>
          {metrics.coherenceDistribution.length > 0 ? (
            <CoherenceDistributionChart data={metrics.coherenceDistribution} />
          ) : (
            <div className="text-neutral-500 text-center py-8">
              No coherence distribution data available
            </div>
          )}
        </Card>

        {/* Vocabulary Complexity */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">
            Vocabulary Complexity Index
          </h2>
          {metrics.vocabularyComplexity.length > 0 ? (
            <VocabularyComplexityChart
              data={
                metrics.vocabularyComplexity as ChartVocabularyComplexityData[]
              }
            />
          ) : (
            <div className="text-neutral-500 text-center py-8">
              No vocabulary complexity data available
            </div>
          )}
        </Card>
      </div>

      {/* Student Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">
            Top-Performing Students
          </h2>
          {metrics.topPerformers.length > 0 ? (
            <div className="space-y-3">
              {metrics.topPerformers.map((student, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-success-default/5 rounded-rd border border-success-default/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-success-default text-white flex items-center justify-center text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-neutral-900">{student.name}</p>
                      <p className="text-xs text-neutral-500">
                        {student.essays} essays
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-success-default text-white">
                      {student.avgScore}%
                    </Badge>
                    <p className="text-xs text-success-default mt-1">
                      {student.improvement}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-neutral-500 text-center py-8">
              No top performers data available
            </div>
          )}
        </Card>

        {/* At-Risk Students */}
        <Card className="p-6">
          <h2 className="text-xl text-neutral-900 mb-4">At-Risk Students</h2>
          {metrics.atRiskStudents.length > 0 ? (
            <div className="space-y-3">
              {metrics.atRiskStudents.map((student, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-warning-default/5 rounded-rd border border-warning-default/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-neutral-900">{student.name}</p>
                      <p className="text-xs text-neutral-500">
                        {student.essays} essays submitted
                      </p>
                    </div>
                    <Badge className="bg-amber-600 text-white">
                      {student.avgScore}%
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {student.issues.map((issue, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-error-default/10 text-error-default border-error-default/20 text-xs"
                      >
                        {issue}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-neutral-500 text-center py-8">
              No at-risk students data available
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
