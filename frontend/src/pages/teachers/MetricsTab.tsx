import { useState, useEffect } from "react";
import Card from "../../components/ui/Card";
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
          {error || "No data yet"}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">
            Performance Overview
          </h1>
          <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={14} className="text-primary/50" />
            View how students are doing in their essays
          </p>
        </div>
        <div className="px-5 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
           <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <Shield size={14} />
               Smart Analysis
           </span>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-3xl border-neutral-100/60 shadow-sm group hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Grammar Average</p>
              <div className="flex items-end gap-2 mt-2">
                <p className="text-3xl font-bold text-neutral-900 tracking-tight">
                  {metrics.avgGrammarScore.toFixed(1)}%
                </p>
                <div className="flex items-center gap-1 mb-1.5 text-success-default text-xs font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+1.5%</span>
                </div>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-success-default/10 flex items-center justify-center text-success-default group-hover:scale-110 transition-transform">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-3xl border-neutral-100/60 shadow-sm group hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Coherence Average</p>
              <div className="flex items-end gap-2 mt-2">
                <p className="text-3xl font-bold text-neutral-900 tracking-tight">
                  {metrics.avgCoherenceScore.toFixed(1)}%
                </p>
                <div className="flex items-center gap-1 mb-1.5 text-error-default text-xs font-bold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>-0.8%</span>
                </div>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-info-default/10 flex items-center justify-center text-info-default group-hover:scale-110 transition-transform">
              <Link className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-3xl border-neutral-100/60 shadow-sm group hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Word Choice</p>
              <div className="flex items-end gap-2 mt-2">
                <p className="text-3xl font-bold text-neutral-900 tracking-tight">
                  {metrics.avgVocabularyLevel.toFixed(1)}<span className="text-sm text-neutral-300">/10</span>
                </p>
                <div className="flex items-center gap-1 mb-1.5 text-success-default text-xs font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+0.4</span>
                </div>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-warning-default/10 flex items-center justify-center text-warning-default group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-3xl border-neutral-100/60 shadow-sm group hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Originality Risk</p>
              <div className="flex items-end gap-2 mt-2">
                <p className="text-3xl font-bold text-neutral-900 tracking-tight">
                  {metrics.plagiarismRisk.toFixed(1)}%
                </p>
                <div className="flex items-center gap-1 mb-1.5 text-success-default text-xs font-bold">
                  <TrendingDown className="w-3.5 h-3.5 rotate-180" />
                  <span>-0.5%</span>
                </div>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-error-default/10 flex items-center justify-center text-error-default group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Scores per Section */}
        <Card className="p-8 rounded-3xl border-neutral-100/60 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-base font-bold text-neutral-800 tracking-tight mb-8">
            Average per Class
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
        <Card className="p-8 rounded-3xl border-neutral-100/60 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-base font-bold text-neutral-800 tracking-tight mb-8">
            Common Grammar Issues
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
        <Card className="p-8 rounded-3xl border-neutral-100/60 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-base font-bold text-neutral-800 tracking-tight mb-8">
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
        <Card className="p-8 rounded-3xl border-neutral-100/60 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-base font-bold text-neutral-800 tracking-tight mb-8">
            Word Choice Level
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
        <Card className="p-8 rounded-3xl border-neutral-100/60 shadow-sm">
          <h2 className="text-base font-bold text-neutral-800 tracking-tight mb-8 flex items-center gap-2">
            <TrendingUp size={18} className="text-success-default" />
            Top Students
          </h2>
          {metrics.topPerformers.length > 0 ? (
            <div className="space-y-4">
              {metrics.topPerformers.map((student, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-neutral-50/50 rounded-2xl border border-neutral-100 hover:border-success-default/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-success-default/10 text-success-default font-bold flex items-center justify-center text-sm shadow-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-800 tracking-tight">{student.name}</p>
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                        {student.essays} essays
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-success-default text-white font-bold text-sm rounded-lg shadow-md shadow-success-default/20">
                      {student.avgScore}%
                    </span>
                    <p className="text-[11px] font-bold text-success-default uppercase tracking-widest mt-1.5 flex items-center justify-end gap-1">
                      <TrendingUp size={12} />
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
        <Card className="p-8 rounded-3xl border-neutral-100/60 shadow-sm">
          <h2 className="text-base font-bold text-neutral-800 tracking-tight mb-8 flex items-center gap-2">
            <TrendingDown size={18} className="text-error-default" />
            Students who need help
          </h2>
          {metrics.atRiskStudents.length > 0 ? (
            <div className="space-y-4">
              {metrics.atRiskStudents.map((student, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-neutral-50/50 rounded-2xl border border-neutral-100 hover:border-error-default/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-neutral-800 tracking-tight">{student.name}</p>
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                        {student.essays} submissions
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-amber-500 text-white font-bold text-sm rounded-lg shadow-md shadow-amber-500/20">
                      {student.avgScore}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {student.issues.map((issue, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-error-default/10 text-error-default border border-error-default/20 text-[10px] font-bold uppercase rounded-md tracking-widest"
                      >
                        {issue}
                      </span>
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
