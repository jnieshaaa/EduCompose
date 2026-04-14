import { useRef, useEffect, useMemo, useCallback, Fragment } from "react";
import { X, AlertTriangle, Lightbulb } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import type { GrammarError } from "../../types/Essay";

export type HighlightError = GrammarError & {
  offset: number;
  errorLength: number;
};

/** Stable id for matching list clicks to highlights (not raw array index — display list is sorted/filtered). */
export function getGrammarErrorSelectionKey(
  error: Pick<HighlightError, "offset" | "errorLength">,
): string {
  const off = Number(error.offset);
  const len = Number(error.errorLength);
  return `${isNaN(off) ? -1 : off}-${isNaN(len) ? 0 : len}`;
}

// Helper functions for error badge
const getErrorBadgeVariant = (
  type: string,
): "error" | "warning" | "info" | "neutral" => {
  switch (type?.toLowerCase()) {
    case "grammar":
      return "error";
    case "spelling":
    case "punctuation":
      return "warning";
    case "word_choice":
    case "capitalization":
      return "info";
    default:
      return "neutral";
  }
};

const getErrorTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    grammar: "Grammar Error",
    spelling: "Spelling Issue",
    punctuation: "Punctuation",
    word_choice: "Word Choice",
    capitalization: "Capitalization",
    structure: "Structure Issue",
  };
  return labels[type?.toLowerCase()] || "Grammar Issue";
};

interface EssayTextDisplayProps {
  originalText: string;
  grammarErrors: GrammarError[];
  selectedErrorKey: string | null;
  onErrorClick: (error: HighlightError) => void;
  analysisKey?: string;
}

// Get highlight color for error type
const getHighlightColor = (category: string, isSelected: boolean = false) => {
  const colors: Record<
    string,
    { bg: string; text: string; selectedBg: string }
  > = {
    grammar: {
      bg: "rgba(239, 68, 68, 0.35)",
      selectedBg: "rgba(239, 68, 68, 0.65)",
      text: "#991b1b",
    },
    capitalization: {
      bg: "rgba(59, 130, 246, 0.35)",
      selectedBg: "rgba(59, 130, 246, 0.65)",
      text: "#1e40af",
    },
    word_choice: {
      bg: "rgba(168, 85, 247, 0.35)",
      selectedBg: "rgba(168, 85, 247, 0.65)",
      text: "#6b21a8",
    },
    spelling: {
      bg: "rgba(249, 115, 22, 0.35)",
      selectedBg: "rgba(249, 115, 22, 0.65)",
      text: "#9a3412",
    },
    punctuation: {
      bg: "rgba(234, 179, 8, 0.35)",
      selectedBg: "rgba(234, 179, 8, 0.65)",
      text: "#854d0e",
    },
    structure: {
      bg: "rgba(34, 197, 94, 0.35)",
      selectedBg: "rgba(34, 197, 94, 0.65)",
      text: "#166534",
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
  selectedErrorKey,
  onErrorClick,
  analysisKey,
}: EssayTextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Process grammar errors and create text segments with highlights
  const textSegments = useMemo(() => {
    if (!originalText) {
      return {
        segments: [{ type: "text", text: originalText }],
        errors: [] as HighlightError[],
      };
    }

    if (grammarErrors.length === 0) {
      return {
        segments: [{ type: "text", text: originalText }],
        errors: [] as HighlightError[],
      };
    }

    // Deep clone errors array to validate types properly
    const clonedErrors = grammarErrors.map((error) => {
      const parsedOffset = Number(error.offset);
      const parsedErrorLength = Number(
        error.errorLength || (error as any).length,
      ); // Fallback to 'length' in case LLM used that
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
          console.log(
            "Filtered out (exceeds length):",
            error,
            "text length:",
            originalText.length,
          );
          return false;
        }
        const textAtOffset = originalText.slice(
          error.offset,
          error.offset + error.errorLength,
        );
        // Allow whitespace-only errors (e.g., multiple spaces, tabs) but ensure there's actual content
        if (textAtOffset.length === 0) {
          console.log("Filtered out (empty text at offset):", error);
          return false;
        }
        return true;
      })
      .sort((a, b) => a.offset - b.offset);

    if (validErrors.length === 0) {
      return { segments: [{ type: "text", text: originalText }], errors: [] };
    }

    // Create segments array with text and highlight segments
    const segments: Array<{
      type: "text" | "highlight";
      text: string;
      errorIndex?: number;
    }> = [];
    let cursor = 0;

    validErrors.forEach((error, index) => {
      const start = Math.max(error.offset, cursor);
      const end = Math.min(
        error.offset + error.errorLength,
        originalText.length,
      );

      if (start < cursor) return;

      // Add text before highlight
      if (start > cursor) {
        segments.push({
          type: "text",
          text: originalText.slice(cursor, start),
        });
      }

      // Add highlight segment
      const snippet = originalText.slice(start, end);
      // IMPORTANT: Some grammar errors intentionally target whitespace (e.g. excessive spaces/newlines
      // or structure transitions). Those ranges can be whitespace-only, and we still need to render
      // a <mark> so the user sees highlights and can click the issue details.
      if (snippet && snippet.length > 0) {
        segments.push({ type: "highlight", text: snippet, errorIndex: index });
      }

      cursor = end;
    });

    // Add remaining text
    if (cursor < originalText.length) {
      segments.push({ type: "text", text: originalText.slice(cursor) });
    }

    return { segments, errors: validErrors };
  }, [originalText, grammarErrors, analysisKey]);

  // Scroll to selected error when it changes
  useEffect(() => {
    if (selectedErrorKey !== null && containerRef.current) {
      const errorMark = document.getElementById(
        `error-mark-${selectedErrorKey}`,
      );
      if (errorMark) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          errorMark.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [selectedErrorKey]);

  const handleMarkActivate = useCallback(
    (errorIndex: number) => {
      if (errorIndex >= 0 && errorIndex < textSegments.errors.length) {
        onErrorClick(textSegments.errors[errorIndex]);
      }
    },
    [textSegments.errors, onErrorClick],
  );

  return (
    <div className="flex flex-col relative z-20">
      {/* Header - Institutional Transcript Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-neutral-900 tracking-tight uppercase tracking-widest text-xs flex items-center gap-2">
             <div className="w-1.5 h-6 bg-primary rounded-full" />
             Manuscript <span className="text-primary">Transcript</span>
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend - Premium glass pills */}
          <div className="hidden lg:flex items-center gap-2 p-1 bg-white/40 border border-white/60 rounded-2xl shadow-sm backdrop-blur-md">
            {[
              { type: "grammar", label: "Grammar", color: "bg-error-default", border: "border-error-200" },
              { type: "spelling", label: "Spelling", color: "bg-warning-default", border: "border-warning-200" },
              { type: "punctuation", label: "Punc.", color: "bg-info-default", border: "border-info-200" },
            ].map((item) => (
              <div key={item.type} className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl shadow-sm border border-neutral-100">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">{item.label}</span>
              </div>
            ))}
          </div>
          {textSegments.errors.length > 0 && (
            <Badge variant="error" size="sm" className="rounded-xl px-3 py-1 font-black text-[9px] uppercase tracking-widest bg-error-50/50">
              {textSegments.errors.length} Anomalies found
            </Badge>
          )}
        </div>
      </div>

      {/* Instructional HUD */}
      {textSegments.errors.length > 0 && (
        <div className="flex items-center gap-2 mb-4 bg-primary-50/30 p-3 rounded-2xl border border-white/40 backdrop-blur-sm">
           <Lightbulb className="w-3.5 h-3.5 text-primary" />
           <p className="text-[10px] font-black text-primary uppercase tracking-widest">Protocol: Interact with highlights for diagnostic depth</p>
        </div>
      )}

      {/* Manuscript Container */}
      <Card variant="glass" className="p-10 border-white/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
        <div
          ref={containerRef}
          className="relative z-10 leading-loose text-neutral-800 text-[16px] selection:bg-primary/20 font-serif"
        >
          <div className="whitespace-pre-wrap">
            {textSegments.segments.map((segment: any, idx) => {
              if (segment.type === "text") {
                return <span key={idx} className="font-medium opacity-90">{segment.text}</span>;
              } else {
                // Highlight segment
                const errorIndex = segment.errorIndex!;
                const error = textSegments.errors[errorIndex];
                const markKey = getGrammarErrorSelectionKey(error);
                const isSelected = selectedErrorKey === markKey;
                const color = getHighlightColor(
                  error.type || "grammar",
                  isSelected,
                );

                return (
                  <Fragment key={idx}>
                    <mark
                      id={`error-mark-${markKey}`}
                      onClick={() => handleMarkActivate(errorIndex)}
                      className={`cursor-pointer transition-all duration-300 rounded-md px-1 font-semibold ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:brightness-95'}`}
                      style={{
                        background: color.bg,
                        color: color.text,
                        boxShadow: isSelected
                          ? `0 10px 15px -3px rgba(0, 0, 0, 0.1)`
                          : "none",
                      }}
                      title={error.message || "Diagnostic anomaly"}
                    >
                      {segment.text}
                    </mark>
                    {/* Inline Detail Modal-like expansion */}
                    {isSelected && (
                      <InlineErrorDetails
                        error={error}
                        errorIndex={errorIndex}
                        onClose={() => handleMarkActivate(errorIndex)}
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

// Inline Error Details Component - Modernized HUD
interface InlineErrorDetailsProps {
  error: HighlightError;
  errorIndex: number;
  onClose: () => void;
}

function InlineErrorDetails({
  error,
  errorIndex,
  onClose,
}: InlineErrorDetailsProps) {
  return (
    <div
      id={`error-details-${errorIndex}`}
      className="block w-full mt-4 mb-4 relative z-30"
      style={{ animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden ring-4 ring-primary-50">
        {/* Detail Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <AlertTriangle className="w-5 h-5 text-error-default" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">Diagnostic Alert</p>
              <h4 className="text-sm font-black tracking-tight">{getErrorTypeLabel(error.type || "grammar")}</h4>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detail Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-lg font-black text-neutral-900 tracking-tight leading-snug">
              {error.message || "Manuscript anomaly detected"}
            </p>
            {error.context && (
              <p className="text-[11px] font-medium text-neutral-400 mt-2 p-2 bg-neutral-50 rounded-xl border border-neutral-100">
                <span className="font-black text-[9px] uppercase tracking-widest text-neutral-300 mr-2">Context Index:</span>
                "{error.context}"
              </p>
            )}
          </div>

          {/* AI Refinement Suggestion */}
          {error.suggestion && (
            <div className="flex items-start gap-4 p-5 bg-primary-50 rounded-2xl border border-primary-100 relative group overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-white/40 to-transparent pointer-events-none" />
               <div className="p-2 bg-white rounded-xl shadow-sm text-primary flex-shrink-0">
                  <Lightbulb className="w-5 h-5" />
               </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 leading-none">AI Resolution Protocol</p>
                <p className="text-sm font-bold text-primary-900 leading-relaxed">
                  {error.suggestion}
                </p>
              </div>
            </div>
          )}
          
          <div className="pt-2">
             <Button variant="ghost" size="sm" className="w-full rounded-xl text-neutral-400 hover:text-primary font-black text-[9px] uppercase tracking-widest bg-neutral-50/50" onClick={onClose}>Dismiss Diagnostic</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EssayTextDisplay;
