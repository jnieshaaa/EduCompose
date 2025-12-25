import { Search, LayoutGrid, List, X } from "lucide-react";
import Card from "../ui/Card";
import Input from "../ui/Input";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

interface SectionsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  programFilter: string;
  termFilter: string;
  onProgramFilterChange: (value: string) => void;
  onTermFilterChange: (value: string) => void;
  availablePrograms: string[];
  isDrillDown: boolean;
  onClearProgramFilter: () => void;
  viewMode: "cards" | "table";
  onViewModeChange: (mode: "cards" | "table") => void;
  loadError: string | null;
  urlProgramFilter: string | null;
}

export function SectionsFilters({
  searchQuery,
  onSearchChange,
  programFilter,
  termFilter,
  onProgramFilterChange,
  onTermFilterChange,
  availablePrograms,
  isDrillDown,
  onClearProgramFilter,
  viewMode,
  onViewModeChange,
  loadError,
  urlProgramFilter,
}: SectionsFiltersProps) {
  return (
    <>
      {/* Active filter indicator when in drill-down mode */}
      {isDrillDown && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">Filtered by:</span>
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/30 px-3 py-1 flex items-center gap-2"
          >
            {urlProgramFilter}
            <button
              onClick={onClearProgramFilter}
              className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="search"
                placeholder="Search sections..."
                value={searchQuery}
                onChange={onSearchChange}
                className="pl-10"
              />
            </div>
            {/* PROGRAM FILTER INTEGRATION - Hide when in drill-down mode */}
            {!isDrillDown && (
              <select
                className="px-3 py-2 border border-neutral-300 rounded-rd"
                value={programFilter}
                onChange={(e) => onProgramFilterChange(e.target.value)}
              >
                <option value="All Programs">All Programs</option>
                {availablePrograms.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </select>
            )}
            <select
              className="px-3 py-2 border border-neutral-300 rounded-rd"
              value={termFilter}
              onChange={(e) => onTermFilterChange(e.target.value)}
            >
              <option value="All Terms">All Terms</option>
              <option value="Fall 2025">Fall 2025</option>
              <option value="Spring 2025">Spring 2025</option>
              <option value="Summer 2025">Summer 2025</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange("cards")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "cards"
                  ? "bg-white text-primary shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => onViewModeChange("table")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "table"
                  ? "bg-white text-primary shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <List className="w-4 h-4" />
              Table
            </button>
          </div>
        </div>
        {loadError && (
          <p className="mt-3 text-xs text-warning-default">{loadError}</p>
        )}
      </Card>
    </>
  );
}

