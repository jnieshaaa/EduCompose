import { useState } from "react";
import { Eye } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Input from "../ui/Input";
import type { PlatformRubric } from "../../types/rubricTypes";
import { getTypeBadgeColor } from "../../data/rubricData";
import { platformRubrics } from "../../data/rubricData";

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
    <div className="w-full mt-6 p-6 border rounded-lg shadow-md bg-white">
      <h3 className="text-2xl font-semibold text-neutral-900 mb-6">
        Select Template
      </h3>
      <div className="space-y-6">
        <p className="text-neutral-600">
          Select an existing template from the library. Click to preview and
          use.
        </p>
        <div className="border p-4 rounded-lg">
          <Input
            type="search"
            placeholder="Search rubrics..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="mb-4"
          />
          <div className="space-y-3">
            {filteredRubrics.map((rubric) => (
              <Card
                key={rubric.id}
                className="p-4 flex justify-between items-center bg-neutral-50 hover:bg-neutral-100 cursor-pointer transition-colors"
                onClick={() => onPreviewRubric(rubric)}
              >
                <div className="flex-1">
                  <h4 className="text-base font-medium text-neutral-900">
                    {rubric.name}
                  </h4>
                  <p className="text-sm text-neutral-500 mt-1">
                    {rubric.criteria.length} Criteria • {rubric.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getTypeBadgeColor(rubric.type)} border`}>
                    {rubric.type}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e?.stopPropagation();
                      onPreviewRubric(rubric);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-6 border-t mt-8">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
