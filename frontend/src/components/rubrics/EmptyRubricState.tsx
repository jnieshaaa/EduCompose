import { ClipboardList, Check } from "lucide-react";

interface EmptyRubricStateProps {
  handleCreateClick: () => void;
}

export function EmptyRubricState({ handleCreateClick }: EmptyRubricStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative p-6 bg-purple-50 rounded-full mb-6">
        <ClipboardList className="w-16 h-16 text-purple-400" />
        <Check className="w-6 h-6 text-green-500 absolute bottom-6 right-6 bg-white rounded-full p-0.5 border border-white" />
      </div>
      <p className="text-neutral-500 mb-2">
        You haven't created any rubrics yet.
      </p>
      <button
        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        onClick={handleCreateClick}
      >
        Create new rubric
      </button>
    </div>
  );
}
