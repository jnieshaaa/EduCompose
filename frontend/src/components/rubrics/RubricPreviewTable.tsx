import type { CriteriaRow } from './types';

interface RubricPreviewTableProps {
  criteriaList: CriteriaRow[];
}

/**
 * RubricPreviewTable - Displays a formatted preview of the rubric criteria
 * Shows criteria rows with score levels and their point values
 */
export function RubricPreviewTable({ criteriaList }: RubricPreviewTableProps) {
  // Collect all unique score titles for the table header, ordered by points descending
  const allScoreTitles = criteriaList.flatMap(c => c.scores.map(s => ({ title: s.title, points: s.points })));
  const uniqueScoreTitles = Array.from(new Map(allScoreTitles.map(item => [item.title, item])).values())
    .sort((a, b) => b.points - a.points);

  // Determine the highest number of points to set the maximum columns
  const maxPoints = Math.max(...uniqueScoreTitles.map(t => t.points), 0);
  const pointHeaders = Array.from({ length: maxPoints + 1 }, (_, i) => i).reverse();

  if (criteriaList.length === 0) {
    return (
      <div className="border border-neutral-200 rounded-lg p-8 text-center">
        <p className="text-neutral-500">No criteria added yet. Switch to the Create tab to add criteria.</p>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead>
          <tr className="bg-neutral-50 text-neutral-600">
            <th className="px-4 py-3 text-left text-sm font-semibold uppercase w-1/4">Criteria</th>
            <th colSpan={maxPoints + 1} className="px-4 py-3 text-left text-sm font-semibold uppercase">
              Grade and Descriptors
            </th>
          </tr>
          <tr className="bg-neutral-50 text-neutral-600">
            <th className="px-4 py-1 text-left text-xs font-medium uppercase w-1/4"></th>
            {pointHeaders.map(point => (
              <th key={point} className="px-4 py-1 text-center text-xs font-medium uppercase border-l border-neutral-200">
                {point} pts
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 bg-white">
          {criteriaList.map((criteria) => (
            <tr key={criteria.id}>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 w-1/4">
                {criteria.title}
              </td>
              {pointHeaders.map(point => {
                const scoreMatch = criteria.scores.find(score => score.points === point);
                return (
                  <td 
                    key={`${criteria.id}-${point}`} 
                    className="px-4 py-4 text-sm text-neutral-500 border-l border-neutral-200"
                  >
                    {scoreMatch ? (
                      <div>
                        <span className="font-medium text-neutral-700">{scoreMatch.title}</span>
                        {scoreMatch.description && (
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{scoreMatch.description}</p>
                        )}
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
  );
}

