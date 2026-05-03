import React from "react";
import { CheckCircle, AlertCircle, Award, Info, Target } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import ProgressBar from "../ui/ProgressBar";
import Button from "../ui/Button";
import { motion } from "framer-motion";
import type { AnalysisResponse, TextAnalysisResponse } from "../../types/Essay";

interface RubricScoresProps {
  analysis: Omit<AnalysisResponse, "essay_id"> | TextAnalysisResponse;
}

const getScoreColor = (score: number): string => {
  if (score >= 90) return "text-green-600";
  if (score >= 75) return "text-blue-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
};

const getScoreBadgeColor = (score: number): string => {
  if (score >= 90) return "bg-green-500 text-green-800 border-green-300";
  if (score >= 75) return "bg-blue-500 text-blue-800 border-blue-300";
  if (score >= 60) return "bg-yellow-500 text-yellow-800 border-yellow-300";
  return "bg-red-500 text-red-800 border-red-300";
};

const getPointsColor = (earned: number, max: number): string => {
  const percentage = (earned / max) * 100;
  if (percentage >= 90) return "text-green-600";
  if (percentage >= 75) return "text-blue-600";
  if (percentage >= 60) return "text-yellow-600";
  return "text-red-600";
};

const RubricScores: React.FC<RubricScoresProps> = ({ analysis }) => {
  // Extract rubric scores from analysis
  const rubricData =
    "rubric_scores" in analysis
    ? (analysis as TextAnalysisResponse).rubric_scores
    : (analysis as any).rubric_scores;

  if (!rubricData || !rubricData.rubric_applied) {
    return (
      <Card variant="glass" className="text-center py-20 border-neutral-200/50">
        <div className="p-4 bg-neutral-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
           <Info className="w-10 h-10 text-neutral-300" />
        </div>
        <h3 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">
          Rubric Not Applied
        </h3>
        <p className="text-sm font-medium text-neutral-500 max-w-xs mx-auto mb-8">
          This manuscript analysis was performed without a structural protocol. Initialize a rubric intake to view detailed score matrices.
        </p>
        <Button variant="ghost" className="rounded-xl border border-neutral-200">Initialize Rubric Selection</Button>
      </Card>
    );
  }

  const {
    rubric_name,
    total_points,
    max_points,
    rubric_score,
    criterion_scores,
  } = rubricData;

  return (
    <div className="space-y-8">
      {/* Rubric Header - Institutional HUD */}
      <Card variant="glass" className="p-8 border-primary-100/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-100/20 blur-[80px] rounded-full -mr-24 -mt-24 pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-neutral-900 tracking-tighter leading-none mb-3">
              {rubric_name}
            </h2>
            <div className="flex items-center gap-2">
               <Badge variant="info" size="sm" className="rounded-lg font-black text-[10px] uppercase tracking-widest bg-primary/10 text-primary border-primary-200/50">Structural Protocol Applied</Badge>
            </div>
          </div>
          <div className={`flex flex-col items-end`}>
            <div className={`p-4 rounded-3xl backdrop-blur-md border border-white shadow-xl ${getScoreBadgeColor(rubric_score)}`}>
              <span className="text-3xl font-black tracking-tighter">{(Number(rubric_score) || 0).toFixed(0)}</span>
              <span className="text-sm font-black opacity-60 ml-0.5">%</span>
            </div>
          </div>
        </div>

        {/* Overall Score Progress */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Institutional Consensus</span>
            <span className={`text-lg font-black ${getScoreColor(rubric_score)} tracking-tight`}>
              {total_points} <span className="text-xs opacity-50 font-medium">/ {max_points} PTS</span>
            </span>
          </div>
          <ProgressBar
            value={rubric_score}
            max={100}
            className="h-3 rounded-full"
            color={
              rubric_score >= 90 ? "success" : rubric_score >= 75 ? "info" : rubric_score >= 60 ? "warning" : "error"
            }
          />
        </div>
      </Card>

      {/* Criterion Scores Stream */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] px-1">Criterion Matrices</h3>
        {criterion_scores.map((criterion: any, index: number) => {
          const percentage = (criterion.points_earned / criterion.max_points) * 100;
          const isExcellent = criterion.points_earned === criterion.max_points;
          const isNeedsImprovement = percentage < 60;

          return (
            <motion.div
              key={criterion.criterion_id || index}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card variant="glass" className="p-6 border-white/60 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="text-lg font-black text-neutral-900 tracking-tight leading-none group flex items-center gap-2">
                        {criterion.criterion_title}
                        {isExcellent && <CheckCircle className="w-5 h-5 text-success-default" />}
                        {isNeedsImprovement && <AlertCircle className="w-5 h-5 text-error-default" />}
                      </h4>
                    </div>
                    <Badge
                      className={`rounded-xl px-3 py-1.5 font-black text-[9px] uppercase tracking-widest border ${getScoreBadgeColor(percentage)}`}
                    >
                      <Award className="w-3 h-3 mr-1.5" />
                      {criterion.score_level.toUpperCase()} PROTOCOL
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-black tracking-tighter ${getPointsColor(criterion.points_earned, criterion.max_points)}`}>
                      {criterion.points_earned} <span className="text-xs opacity-40">/ {criterion.max_points}</span>
                    </div>
                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">
                       Index: {(Number(percentage) || 0).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <ProgressBar
                  value={percentage}
                  max={100}
                  className="h-2 mb-5 rounded-full"
                  color={
                    percentage >= 90 ? "success" : percentage >= 75 ? "info" : percentage >= 60 ? "warning" : "error"
                  }
                />

                {criterion.score_level_description && (
                  <p className="text-sm font-medium text-neutral-500 mb-4 leading-relaxed bg-neutral-50/50 p-4 rounded-2xl border border-white/60 italic">
                    "{criterion.score_level_description}"
                  </p>
                )}

                {criterion.feedback && (
                  <div className="mt-4 p-5 bg-primary-50/30 backdrop-blur-sm rounded-2xl border border-white/60">
                    <div className="flex items-center gap-2 mb-2">
                       <Target className="w-3.5 h-3.5 text-primary" />
                       <span className="text-[10px] font-black text-primary uppercase tracking-widest">Diagnostic feedback</span>
                    </div>
                    <p className="text-sm font-medium text-neutral-700 leading-relaxed italic">
                      {criterion.feedback}
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[9px] font-black text-neutral-300 uppercase tracking-widest">Sub-Matrix Core Score</span>
                  <Badge variant="neutral" size="sm" className="rounded-lg font-black text-[9px] bg-neutral-100/50 text-neutral-500 border-none">
                    AI RAW: {(Number(criterion.analysis_score) || 0).toFixed(1)}/100
                  </Badge>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Protocol Summary Card */}
      <Card variant="glass" className="p-8 bg-neutral-900/90 text-white border-none shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
               <Info className="w-6 h-6 text-primary-200" />
            </div>
            <h4 className="text-xl font-black tracking-tight">Institutional Scoring Protocol</h4>
          </div>
          <p className="text-neutral-400 text-sm leading-relaxed font-medium">
            Scores are synthesized via real-time mapping of manuscript analysis results—grammar, coherence, and argument strength—onto each structural criterion. Performance levels represent the definitive academic consensus on manuscript quality.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default RubricScores;
