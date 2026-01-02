import React from 'react';
import { CheckCircle, AlertCircle, Award, Info } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import type { AnalysisResponse, TextAnalysisResponse } from '../../types/Essay';

interface RubricScoresProps {
  analysis: Omit<AnalysisResponse, 'essay_id'> | TextAnalysisResponse;
}

interface RubricScoreData {
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
}

const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBadgeColor = (score: number): string => {
  if (score >= 90) return 'bg-green-100 text-green-800 border-green-300';
  if (score >= 75) return 'bg-blue-100 text-blue-800 border-blue-300';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-red-100 text-red-800 border-red-300';
};

const getPointsColor = (earned: number, max: number): string => {
  const percentage = (earned / max) * 100;
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 75) return 'text-blue-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const RubricScores: React.FC<RubricScoresProps> = ({ analysis }) => {
  // Extract rubric scores from analysis
  const rubricData = (analysis as any).rubric_scores as RubricScoreData | undefined;

  if (!rubricData || !rubricData.rubric_applied) {
    return (
      <Card className="text-center py-12">
        <Info className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Rubric Applied</h3>
        <p className="text-sm text-neutral-600 max-w-xs mx-auto">
          This essay was analyzed without a specific rubric. Select a rubric when analyzing
          to see rubric-based scores.
        </p>
      </Card>
    );
  }

  const { rubric_name, total_points, max_points, rubric_score, criterion_scores } = rubricData;

  return (
    <div className="space-y-6">
      {/* Rubric Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-1">{rubric_name}</h2>
            <p className="text-sm text-neutral-600">Rubric-based scoring applied</p>
          </div>
          <Badge className={getScoreBadgeColor(rubric_score)}>
            {rubric_score.toFixed(1)}%
          </Badge>
        </div>

        {/* Overall Score */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700">Overall Rubric Score</span>
            <span className={`text-lg font-bold ${getScoreColor(rubric_score)}`}>
              {total_points} / {max_points} points
            </span>
          </div>
          <ProgressBar
            value={rubric_score}
            max={100}
            className="h-3"
            color={rubric_score >= 90 ? 'green' : rubric_score >= 75 ? 'blue' : rubric_score >= 60 ? 'yellow' : 'red'}
          />
        </div>
      </Card>

      {/* Criterion Scores */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">Criterion Scores</h3>
        {criterion_scores.map((criterion, index) => {
          const percentage = (criterion.points_earned / criterion.max_points) * 100;
          const isExcellent = criterion.points_earned === criterion.max_points;
          const isGood = percentage >= 75;
          const isNeedsImprovement = percentage < 60;

          return (
            <Card key={criterion.criterion_id || index} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-base font-semibold text-neutral-900">
                      {criterion.criterion_title}
                    </h4>
                    {isExcellent && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {isNeedsImprovement && (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <Badge className={`inline-flex items-center gap-1 ${getScoreBadgeColor(percentage)}`}>
                    <Award className="w-3 h-3" />
                    {criterion.score_level}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${getPointsColor(criterion.points_earned, criterion.max_points)}`}>
                    {criterion.points_earned} / {criterion.max_points}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {percentage.toFixed(0)}%
                  </div>
                </div>
              </div>

              <ProgressBar
                value={percentage}
                max={100}
                className="h-2 mb-3"
                color={percentage >= 90 ? 'green' : percentage >= 75 ? 'blue' : percentage >= 60 ? 'yellow' : 'red'}
              />

              {criterion.score_level_description && (
                <p className="text-sm text-neutral-600 mb-2 italic">
                  {criterion.score_level_description}
                </p>
              )}

              {criterion.feedback && (
                <div className="mt-3 p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-700">{criterion.feedback}</p>
                </div>
              )}

              <div className="mt-2 text-xs text-neutral-500">
                Analysis score: {criterion.analysis_score.toFixed(1)}/100
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-blue-900">How Rubric Scoring Works</h4>
        </div>
        <p className="text-sm text-blue-800">
          Scores are automatically calculated by mapping your essay's analysis results (grammar, 
          coherence, argument strength, etc.) to each rubric criterion. Each criterion is scored 
          based on how well your essay meets the rubric's performance levels.
        </p>
      </Card>
    </div>
  );
};

export default RubricScores;

