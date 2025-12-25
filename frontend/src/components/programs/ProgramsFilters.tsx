import { Search, LayoutGrid, List } from "lucide-react";
import Card from "../ui/Card";
import Input from "../ui/Input";

interface ProgramsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  viewMode: "cards" | "table";
  onViewModeChange: (mode: "cards" | "table") => void;
  loadError: string | null;
}

export function ProgramsFilters({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  loadError,
}: ProgramsFiltersProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            type="search"
            placeholder="Search programs..."
            value={searchQuery}
            onChange={onSearchChange}
            className="pl-10"
          />
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
  );
}

