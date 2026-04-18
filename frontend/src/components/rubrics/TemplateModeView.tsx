import { useState } from "react";
import { Eye, Search, BookOpen } from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import type { PlatformRubric } from "../../types/rubricTypes";
import { getTypeBadgeColor } from "../../services/rubricService";
import { platformRubrics } from "../../components/rubrics/types";

interface TemplateModeViewProps {
  onCancel: () => void;
  onPreviewRubric: (rubric: PlatformRubric) => void;
}

export function TemplateModeView({
  onCancel,
  onPreviewRubric,
}: TemplateModeViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRubrics = platformRubrics.filter((rubric) =>
    rubric.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full mt-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-neutral-900">
            Platform Templates
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Select a rubric template to preview and customize
          </p>
        </div>
        <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2.5 py-1 rounded-md">
          {platformRubrics.length} available
        </span>
      </div>

      {/* ─── Search ─── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
        <input
          type="text"
          placeholder="Search rubrics…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 focus:bg-white transition-all placeholder:text-neutral-300"
        />
      </div>

      {/* ─── Rubric List ─── */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
        {filteredRubrics.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs text-neutral-400">No rubrics match your search</p>
          </div>
        ) : (
          filteredRubrics.map((rubric) => (
            <div
              key={rubric.id}
              className="flex items-center gap-3 p-3.5 bg-neutral-50 border border-neutral-100 rounded-xl hover:border-primary/20 hover:bg-primary/[0.02] cursor-pointer transition-all group"
              onClick={() => onPreviewRubric(rubric)}
            >
              {/* Icon */}
              <div className="w-9 h-9 bg-white border border-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:border-primary/20 transition-colors">
                <BookOpen className="w-4 h-4 text-neutral-400 group-hover:text-primary transition-colors" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-neutral-800 group-hover:text-primary transition-colors truncate">
                  {rubric.name}
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                  {rubric.criteria.length} criteria &middot; {rubric.description}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={`${getTypeBadgeColor(rubric.type)} border text-[10px] font-semibold`}>
                  {rubric.type}
                </Badge>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewRubric(rubric);
                  }}
                  className="p-1.5 text-neutral-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Footer ─── */}
      <div className="flex items-center justify-end pt-5 mt-5 border-t border-neutral-100">
        <Button variant="ghost" onClick={onCancel} className="text-sm">
          Cancel
        </Button>
      </div>
    </div>
  );
}
