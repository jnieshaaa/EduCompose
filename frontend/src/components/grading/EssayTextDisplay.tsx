import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import type { GrammarError } from '../../types/Essay';

export type HighlightError = GrammarError & {
  offset: number;
  errorLength: number;
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

  // Process grammar errors for highlighting
  const highlightData = useMemo(() => {
    if (!originalText || grammarErrors.length === 0) {
      return { html: null, errors: [] as HighlightError[] };
    }

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Deep clone errors array to prevent mutations
    const clonedErrors = grammarErrors.map((error) => ({
      ...error,
      offset: error.offset,
      errorLength: error.errorLength,
    }));

    // Validate errors and ensure offsets match the actual text
    const validErrors = clonedErrors
      .filter((error): error is HighlightError => {
        if (
          typeof error.offset !== 'number' ||
          typeof error.errorLength !== 'number' ||
          error.errorLength <= 0 ||
          error.offset < 0 ||
          error.offset >= originalText.length
        ) {
          return false;
        }
        if (error.offset + error.errorLength > originalText.length) {
          return false;
        }
        const textAtOffset = originalText.slice(error.offset, error.offset + error.errorLength);
        if (!textAtOffset.trim()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.offset - b.offset);

    if (validErrors.length === 0) {
      return { html: null, errors: [] };
    }

    let html = '';
    let cursor = 0;

    validErrors.forEach((error, index) => {
      const start = Math.max(error.offset, cursor);
      const end = Math.min(error.offset + error.errorLength, originalText.length);

      if (start < cursor) return;

      if (start > cursor) {
        html += escapeHtml(originalText.slice(cursor, start));
      }

      const snippet = escapeHtml(originalText.slice(start, end));
      if (!snippet || !snippet.trim()) {
        cursor = Math.max(cursor, end);
        return;
      }

      const title = escapeHtml(error.message || 'Grammar issue');
      const errorType = error.type || 'grammar';
      const isSelected = selectedErrorIndex === index;
      const color = getHighlightColor(errorType, isSelected);

      html += `<mark 
        id="error-mark-${index}"
        data-error-index="${index}" 
        style="background: ${color.bg}; color: ${color.text}; padding: 1px 3px; border-radius: 4px; cursor: pointer; transition: all 0.2s; ${isSelected ? 'box-shadow: 0 0 0 2px ' + color.text + ';' : ''}" 
        title="${title}" 
        class="error-highlight hover:opacity-80"
      >`;
      html += snippet;
      html += '</mark>';
      cursor = end;
    });

    if (cursor < originalText.length) {
      html += escapeHtml(originalText.slice(cursor));
    }

    return { html, errors: validErrors };
  }, [originalText, grammarErrors, selectedErrorIndex, analysisKey]);

  // Scroll to selected error when it changes
  useEffect(() => {
    if (selectedErrorIndex !== null && containerRef.current) {
      const errorMark = document.getElementById(`error-mark-${selectedErrorIndex}`);
      if (errorMark) {
        errorMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedErrorIndex]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('error-highlight')) {
        const errorIndex = parseInt(target.getAttribute('data-error-index') || '0');
        if (errorIndex >= 0 && errorIndex < highlightData.errors.length) {
          onErrorClick(highlightData.errors[errorIndex], errorIndex);
        }
      }
    },
    [highlightData.errors, onErrorClick]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Essay Text</h3>
        {highlightData.errors.length > 0 && (
          <Badge variant="warning" size="sm">
            {highlightData.errors.length} issues found
          </Badge>
        )}
      </div>

      {/* Essay Content - Scrollable */}
      <Card className="flex-1 overflow-hidden">
        <div ref={containerRef} className="h-full overflow-y-auto pr-2">
          {highlightData.html ? (
            <div
              className="whitespace-pre-wrap leading-relaxed text-neutral-800 text-[15px]"
              dangerouslySetInnerHTML={{ __html: highlightData.html }}
              onClick={handleClick}
            />
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed text-neutral-800 text-[15px]">
              {originalText || 'No essay text available.'}
            </p>
          )}
        </div>
      </Card>

      {/* Error Type Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {[
          { type: 'grammar', label: 'Grammar', color: 'rgba(239, 68, 68, 0.35)', textColor: '#991b1b' },
          { type: 'spelling', label: 'Spelling', color: 'rgba(249, 115, 22, 0.35)', textColor: '#9a3412' },
          { type: 'punctuation', label: 'Punctuation', color: 'rgba(234, 179, 8, 0.35)', textColor: '#854d0e' },
          { type: 'word_choice', label: 'Word Choice', color: 'rgba(168, 85, 247, 0.35)', textColor: '#6b21a8' },
        ].map((item) => (
          <div key={item.type} className="flex items-center space-x-1.5 text-xs">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: item.color, border: `1px solid ${item.textColor}` }}
            />
            <span className="text-neutral-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EssayTextDisplay;

