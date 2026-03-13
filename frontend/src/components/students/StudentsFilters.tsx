import { Search, LayoutGrid, List } from "lucide-react";
import Card from "../ui/Card";
import Input from "../ui/Input";
import type { Program, Section } from "../../types/academic";

interface StudentsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  programFilter: string;
  sectionFilter: string;
  onProgramFilterChange: (value: string) => void;
  onSectionFilterChange: (value: string) => void;
  availablePrograms: Program[];
  availableSections: Section[];
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
  // programFilter,
  // sectionFilter,
  // onProgramFilterChange,
  // onSectionFilterChange,
  // availablePrograms,
  // availableSections,
  // urlProgramFilter,
  // urlSectionFilter,
  viewMode,
  onViewModeChange,
  loadError,
}: StudentsFiltersProps) {
  return (
    <Card className="p-4">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search by name, code..."
              value={searchQuery}
              onChange={onSearchChange}
              className="pl-10"
            />
          </div>
          
          {/* {!urlProgramFilter && (
            <select
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
              value={programFilter}
              onChange={(e) => onProgramFilterChange(e.target.value)}
            >
              <option value="All Programs">All Programs</option>
              {availablePrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.abbr}
                </option>
              ))}
            </select>
          )} */}

          {/* {!urlSectionFilter && (
            <select
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white"
              value={sectionFilter}
              onChange={(e) => onSectionFilterChange(e.target.value)}
            >
              <option value="All Sections">All Sections</option>
              {availableSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name} (Yr {section.year})
                </option>
              ))}
            </select>
          )} */}
        </div>

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
  );
}
