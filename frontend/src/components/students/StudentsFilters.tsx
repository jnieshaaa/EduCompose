import { Search, Layers } from "lucide-react";
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
  loadError: string | null;
}

export function StudentsFilters({
  searchQuery,
  onSearchChange,
  sectionFilter,
  onSectionFilterChange,
  availableSections,
  hasActiveFilters,
  onClearFilters,
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
              className="pl-10 h-10"
            />
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-100">
                <Layers className="w-3.5 h-3.5 text-neutral-400" />
                <select 
                  className="bg-transparent text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer text-neutral-600"
                  value={sectionFilter}
                  onChange={(e) => onSectionFilterChange(e.target.value)}
                >
                  <option value="">All Blocks</option>
                  {availableSections.map(s => (
                    <option key={s.id} value={s.id}>Block {s.name}</option>
                  ))}
                </select>
             </div>
             
             {hasActiveFilters && (
               <button 
                onClick={onClearFilters}
                className="text-[10px] font-bold text-error-default uppercase tracking-widest hover:underline"
               >
                 Clear
               </button>
             )}
          </div>
        </div>
      </div>
      {loadError && (
        <p className="mt-3 text-xs text-warning-default">{loadError}</p>
      )}
    </Card>
  );
}
