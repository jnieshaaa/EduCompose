import { useRef, useEffect, useMemo, useCallback, Fragment } from 'react';
import { X, AlertTriangle, Lightbulb } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import type { GrammarError } from '../../types/Essay';

export type HighlightError = GrammarError & {
  offset: number;
  errorLength: number;
};

// Helper functions for error badge
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

interface EssayTextDisplayProps {
  originalText: string;
  grammarErrors: GrammarError[];
  selectedErrorIndex: number | null;
  onErrorClick: (error: HighlightError, index: number) => void;
  analysisKey?: string;
}

// Get highlight color for error type
const getHighlightColor = (category: string, isSelected: boolean = false) => {
  const colors: Record<string, { bg: string; text: string; selectedBg: string }> = {
    grammar: {
      bg: 'rgba(239, 68, 68, 0.35)',
      selectedBg: 'rgba(239, 68, 68, 0.65)',
      text: '#991b1b',
    },
    capitalization: {
      bg: 'rgba(59, 130, 246, 0.35)',
      selectedBg: 'rgba(59, 130, 246, 0.65)',
      text: '#1e40af',
    },
    word_choice: {
      bg: 'rgba(168, 85, 247, 0.35)',
      selectedBg: 'rgba(168, 85, 247, 0.65)',
      text: '#6b21a8',
    },
    spelling: {
      bg: 'rgba(249, 115, 22, 0.35)',
      selectedBg: 'rgba(249, 115, 22, 0.65)',
      text: '#9a3412',
    },
    punctuation: {
      bg: 'rgba(234, 179, 8, 0.35)',
      selectedBg: 'rgba(234, 179, 8, 0.65)',
      text: '#854d0e',
    },
    structure: {
      bg: 'rgba(34, 197, 94, 0.35)',
      selectedBg: 'rgba(34, 197, 94, 0.65)',
      text: '#166534',
    },
  };
  const colorSet = colors[category.toLowerCase()] || colors.grammar;
  return {
    bg: isSelected ? colorSet.selectedBg : colorSet.bg,
    text: colorSet.text,
  };
};

export function EssayTextDisplay({
  originalText,
  grammarErrors,
  selectedErrorIndex,
  onErrorClick,
  analysisKey,
}: EssayTextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Process grammar errors and create text segments with highlights
  const textSegments = useMemo(() => {
    if (!originalText) {
      return { segments: [{ type: 'text', text: originalText }], errors: [] as HighlightError[] };
    }

    if (grammarErrors.length === 0) {
      return { segments: [{ type: 'text', text: originalText }], errors: [] as HighlightError[] };
    }

    // Deep clone errors array to validate types properly
    const clonedErrors = grammarErrors.map((error) => {
      const parsedOffset = Number(error.offset);
      const parsedErrorLength = Number(error.errorLength || (error as any).length); // Fallback to 'length' in case LLM used that
      return {
        ...error,
        offset: isNaN(parsedOffset) ? -1 : parsedOffset,
        errorLength: isNaN(parsedErrorLength) ? 0 : parsedErrorLength,
      };
    });

    // Validate errors and ensure offsets match the actual text
    const validErrors = clonedErrors
      .filter((error): error is HighlightError => {
        if (
          error.errorLength <= 0 ||
          error.offset < 0 ||
          error.offset >= originalText.length
        ) {
          console.log("Filtered out (invalid offset/length):", error);
          return false;
        }
        if (error.offset + error.errorLength > originalText.length) {
          console.log("Filtered out (exceeds length):", error, "text length:", originalText.length);
          return false;
        }
        const textAtOffset = originalText.slice(error.offset, error.offset + error.errorLength);
        // Allow whitespace-only errors (e.g., multiple spaces, tabs) but ensure there's actual content
        if (textAtOffset.length === 0) {
          console.log("Filtered out (empty text at offset):", error);
          return false;
        }
        return true;
      })
      .sort((a, b) => a.offset - b.offset);

    if (validErrors.length === 0) {
      return { segments: [{ type: 'text', text: originalText }], errors: [] };
    }

    // Create segments array with text and highlight segments
    const segments: Array<{ type: 'text' | 'highlight'; text: string; errorIndex?: number }> = [];
    let cursor = 0;

    validErrors.forEach((error, index) => {
      const start = Math.max(error.offset, cursor);
      const end = Math.min(error.offset + error.errorLength, originalText.length);

      if (start < cursor) return;

      // Add text before highlight
      if (start > cursor) {
        segments.push({ type: 'text', text: originalText.slice(cursor, start) });
      }

      // Add highlight segment
      const snippet = originalText.slice(start, end);
      if (snippet && snippet.trim()) {
        segments.push({ type: 'highlight', text: snippet, errorIndex: index });
      }

      cursor = end;
    });

    // Add remaining text
    if (cursor < originalText.length) {
      segments.push({ type: 'text', text: originalText.slice(cursor) });
    }

    return { segments, errors: validErrors };
  }, [originalText, grammarErrors, analysisKey]);

  // Scroll to selected error when it changes
  useEffect(() => {
    if (selectedErrorIndex !== null && containerRef.current) {
      const errorMark = document.getElementById(`error-mark-${selectedErrorIndex}`);
      if (errorMark) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          errorMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [selectedErrorIndex]);

  const handleErrorClick = useCallback(
    (errorIndex: number) => {
      if (errorIndex >= 0 && errorIndex < textSegments.errors.length) {
        // Toggle: if same error is clicked, close it; otherwise select new one
        const newIndex = selectedErrorIndex === errorIndex ? null : errorIndex;
        if (newIndex !== null) {
          onErrorClick(textSegments.errors[newIndex], newIndex);
        } else {
          onErrorClick(textSegments.errors[errorIndex], errorIndex);
        }
      }
    },
    [textSegments.errors, selectedErrorIndex, onErrorClick]
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Essay Text</h3>
        <div className="flex items-center space-x-3">
          {/* Error Type Legend - Inline */}
          <div className="hidden sm:flex items-center gap-3">
            {[
              { type: 'grammar', label: 'Grammar', color: 'rgba(239, 68, 68, 0.35)', textColor: '#991b1b' },
              { type: 'spelling', label: 'Spelling', color: 'rgba(249, 115, 22, 0.35)', textColor: '#9a3412' },
              { type: 'punctuation', label: 'Punctuation', color: 'rgba(234, 179, 8, 0.35)', textColor: '#854d0e' },
              { type: 'word_choice', label: 'Word Choice', color: 'rgba(168, 85, 247, 0.35)', textColor: '#6b21a8' },
            ].map((item) => (
              <div key={item.type} className="flex items-center space-x-1.5 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded"
                  style={{ backgroundColor: item.color, border: `1px solid ${item.textColor}` }}
                />
                <span className="text-neutral-500">{item.label}</span>
              </div>
            ))}
          </div>
          {textSegments.errors.length > 0 && (
            <Badge variant="warning" size="sm">
              {textSegments.errors.length} issues
            </Badge>
          )}
        </div>
      </div>

      {/* Instruction Text */}
      {textSegments.errors.length > 0 && (
        <p className="text-xs text-neutral-500 mb-3 italic">
          💡 Click on highlighted text to see error details and suggestions
        </p>
      )}

      {/* Essay Content */}
      <Card className="p-6">
        <div ref={containerRef} className="leading-relaxed text-neutral-800 text-[15px] selection:bg-primary/20">
          <div className="whitespace-pre-wrap">
            {textSegments.segments.map((segment: any, idx) => {
              if (segment.type === 'text') {
                return <span key={idx}>{segment.text}</span>;
              } else {
                // Highlight segment
                const errorIndex = segment.errorIndex!;
                const error = textSegments.errors[errorIndex];
                const isSelected = selectedErrorIndex === errorIndex;
                const color = getHighlightColor(error.type || 'grammar', isSelected);

                return (
                  <Fragment key={idx}>
                    <mark
                      id={`error-mark-${errorIndex}`}
                      onClick={() => handleErrorClick(errorIndex)}
                      style={{
                        background: color.bg,
                        color: color.text,
                        padding: '1px 3px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isSelected ? `0 0 0 2px ${color.text}` : 'none',
                      }}
                      title={error.message || 'Grammar issue'}
                      className="error-highlight hover:opacity-80"
                    >
                      {segment.text}
                    </mark>
                    {/* Show inline error details right after the selected highlight */}
                    {isSelected && (
                      <InlineErrorDetails
                        error={error}
                        errorIndex={errorIndex}
                        onClose={() => handleErrorClick(errorIndex)}
                      />
                    )}
                  </Fragment>
                );
              }
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Inline Error Details Component
interface InlineErrorDetailsProps {
  error: HighlightError;
  errorIndex: number;
  onClose: () => void;
}

function InlineErrorDetails({ error, errorIndex, onClose }: InlineErrorDetailsProps) {
  return (
    <div 
      id={`error-details-${errorIndex}`}
      className="block w-full mt-2 mb-2"
      style={{ animation: 'slideIn 0.2s ease-out' }}
    >
      <div className="bg-white rounded-lg shadow-md border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-neutral-50 to-neutral-100 border-b border-neutral-200">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            </div>
            <Badge variant={getErrorBadgeVariant(error.type || 'grammar')} size="sm">
              {getErrorTypeLabel(error.type || 'grammar')}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-200 transition-colors text-neutral-500 hover:text-neutral-700"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2.5">
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
            <div className="flex items-start space-x-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Suggestion</p>
                <p className="text-sm text-emerald-700 mt-0.5">{error.suggestion}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EssayTextDisplay;

