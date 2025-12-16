import { X, Copy, Download, BookOpen } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import type { PlatformRubric } from './types';

interface RubricPreviewModalProps {
  rubric: PlatformRubric;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate?: (rubric: PlatformRubric) => void;
}

export function RubricPreviewModal({ rubric, isOpen, onClose, onUseTemplate }: RubricPreviewModalProps) {
  if (!isOpen) return null;

  // Calculate total possible points
  const maxPointsPerCriteria = rubric.criteria.map(c => Math.max(...c.scores.map(s => s.points)));
  const totalPossiblePoints = maxPointsPerCriteria.reduce((a, b) => a + b, 0);

  // Get all unique point levels for the header
  const allPoints = new Set<number>();
  rubric.criteria.forEach(c => c.scores.forEach(s => allPoints.add(s.points)));
  const pointHeaders = Array.from(allPoints).sort((a, b) => b - a);

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Basic': return 'bg-green-500/10 text-green-700 border-green-500/30';
      case 'Professional': return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
      case 'Advanced': return 'bg-purple-500/10 text-purple-700 border-purple-500/30';
      case 'Technical': return 'bg-orange-500/10 text-orange-700 border-orange-500/30';
      default: return 'bg-neutral-100 text-neutral-700 border-neutral-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal - Extra Large */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[95vw] max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b bg-gradient-to-r from-primary/5 to-purple-50">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <Badge className={`${getTypeBadgeColor(rubric.type)} border`}>
                {rubric.type}
              </Badge>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900">{rubric.name}</h2>
            <p className="text-neutral-600 mt-1">{rubric.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-neutral-500">
              <span><strong>{rubric.criteria.length}</strong> Criteria</span>
              <span><strong>{totalPossiblePoints}</strong> Total Points</span>
              <span>Used in <strong>{rubric.programs}</strong> programs</span>
              <span>Updated: {rubric.lastUpdated}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-neutral-500" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-auto p-6">
          {/* Rubric Table */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-primary/10 to-purple-100">
                  <th className="px-4 py-4 text-left text-sm font-bold text-neutral-800 w-48 border-r border-neutral-200">
                    Criteria
                  </th>
                  {pointHeaders.map(points => (
                    <th 
                      key={points} 
                      className="px-4 py-4 text-center text-sm font-bold text-neutral-800 border-r border-neutral-200 last:border-r-0"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-2xl text-primary">{points}</span>
                        <span className="text-xs text-neutral-500 mt-1">points</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {rubric.criteria.map((criteria, idx) => (
                  <tr 
                    key={criteria.id}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}
                  >
                    <td className="px-4 py-4 border-r border-neutral-200">
                      <div className="font-semibold text-neutral-900">{criteria.title}</div>
                      <div className="text-xs text-neutral-500 mt-1">
                        Max: {Math.max(...criteria.scores.map(s => s.points))} pts
                      </div>
                    </td>
                    {pointHeaders.map(points => {
                      const score = criteria.scores.find(s => s.points === points);
                      return (
                        <td 
                          key={`${criteria.id}-${points}`}
                          className="px-4 py-4 text-sm text-neutral-600 border-r border-neutral-200 last:border-r-0 align-top"
                        >
                          {score ? (
                            <div>
                              <div className="font-medium text-neutral-800 mb-1">{score.title}</div>
                              <div className="text-xs text-neutral-500 leading-relaxed">
                                {score.description}
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Score Summary */}
          <div className="mt-6 p-4 bg-neutral-50 rounded-xl">
            <h4 className="font-semibold text-neutral-800 mb-3">Scoring Guide</h4>
            <div className="grid grid-cols-4 gap-4">
              {pointHeaders.map(points => {
                // Find a sample title for this point level
                const sampleScore = rubric.criteria[0]?.scores.find(s => s.points === points);
                return (
                  <div key={points} className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      {points}
                    </span>
                    <span className="text-sm text-neutral-600">{sampleScore?.title || `${points} Points`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-neutral-50">
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copy to My Rubrics
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {onUseTemplate && (
              <Button 
                className="bg-primary hover:bg-primary-300"
                onClick={() => onUseTemplate(rubric)}
              >
                Use This Template
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

