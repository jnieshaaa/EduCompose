import { Search, LayoutGrid, List } from "lucide-react";
import Card from "../ui/Card";
import Input from "../ui/Input";
// import Badge from "../ui/Badge";

interface StudentsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  programFilter: string;
  sectionFilter: string;
  onProgramFilterChange: (value: string) => void;
  onSectionFilterChange: (value: string) => void;
  availablePrograms: string[];
  availableSections: string[];
  urlProgramFilter: string | null;
  urlSectionFilter: string | null;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onClearProgramFilter: () => void;
  onClearSectionFilter: () => void;
  viewMode: "cards" | "table";
  onViewModeChange: (mode: "cards" | "table") => void;
  loadError: string | null;
}

export function StudentsFilters({
  searchQuery,
  onSearchChange,
  programFilter,
  sectionFilter,
  onProgramFilterChange,
  onSectionFilterChange,
  availablePrograms,
  availableSections,
  urlProgramFilter,
  urlSectionFilter,
  // hasActiveFilters,
  viewMode,
  onViewModeChange,
  loadError,
}: StudentsFiltersProps) {
  return (
    <>
      {/* Active filter summary (no inline clear buttons to avoid duplicate UX with breadcrumbs) */}
      {/* {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-neutral-500">Filtered by:</span>
          {programFilter !== "All Programs" && (
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 px-3 py-1"
            >
              Program: {programFilter}
            </Badge>
          )}
          {sectionFilter !== "All Sections" && (
            <Badge
              variant="outline"
              className="bg-secondary/10 text-secondary border-secondary/30 px-3 py-1"
            >
              Section: {sectionFilter}
            </Badge>
          )}
        </div>
      )} */}

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="search"
                placeholder="Search by name, ID, email..."
                value={searchQuery}
                onChange={onSearchChange}
                className="pl-10"
              />
            </div>
            {/* Hide program filter dropdown when filtered from URL */}
            {!urlProgramFilter && (
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
            {/* Hide section filter dropdown when filtered from URL */}
            {!urlSectionFilter && (
              <select
                className="px-3 py-2 border border-neutral-300 rounded-rd"
                value={sectionFilter}
                onChange={(e) => onSectionFilterChange(e.target.value)}
              >
                <option value="All Sections">All Sections</option>
                {availableSections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            )}
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
