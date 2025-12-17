import React from 'react';
import { X, AlertTriangle, Lightbulb } from 'lucide-react';
import Badge from '../ui/Badge';
import type { HighlightError } from './EssayTextDisplay';

interface FloatingErrorCardProps {
  error: HighlightError;
  onClose: () => void;
}

const getErrorBadgeVariant = (type: string): 'error' | 'warning' | 'info' | 'neutral' => {
  switch (type?.toLowerCase()) {
    case 'grammar':
      return 'error';
    case 'spelling':
    case 'punctuation':
      return 'warning';
    case 'word_choice':
    case 'capitalization':
      return 'info';
    default:
      return 'neutral';
  }
};

const getErrorTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    grammar: 'Grammar Error',
    spelling: 'Spelling Issue',
    punctuation: 'Punctuation',
    word_choice: 'Word Choice',
    capitalization: 'Capitalization',
    structure: 'Structure Issue',
  };
  return labels[type?.toLowerCase()] || 'Grammar Issue';
};

export function FloatingErrorCard({ error, onClose }: FloatingErrorCardProps) {
  return (
    <div className="animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-neutral-50 to-neutral-100 border-b border-neutral-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <Badge variant={getErrorBadgeVariant(error.type || 'grammar')} size="sm">
                {getErrorTypeLabel(error.type || 'grammar')}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 transition-colors text-neutral-500 hover:text-neutral-700"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3">
          {/* Error Message */}
          <div>
            <p className="text-sm font-medium text-neutral-900">{error.message || 'Grammar issue detected'}</p>
            {error.context && (
              <p className="text-xs text-neutral-500 mt-1 italic">
                Context: "{error.context}"
              </p>
            )}
          </div>

          {/* Suggestion */}
          {error.suggestion && (
            <div className="flex items-start space-x-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Suggestion</p>
                <p className="text-sm text-emerald-700 mt-0.5">{error.suggestion}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default FloatingErrorCard;

