import { useState, useMemo } from "react";
import { Plus, Loader2, LayoutGrid, Wand2, Check, Eye } from "lucide-react";
import { rubricApi } from "../../api";
import { fetchRubricById } from "../../services/rubricService";
import { RubricPreviewModal } from "../rubrics/RubricPreviewModal";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import type { NewActivityForm } from "../../types/activityTypes";


interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (activity: NewActivityForm) => Promise<void>;
  courses: { id: string; name: string }[];
  programLoads: {
    id: string;
    program_id: string;
    program_name: string;
    course_id: string;
  }[];
  sections: { id: string; name: string; courseId: string; programLoadId: string }[];
  rubrics: {
    platform: { id: string; name: string; description?: string; grading_intensity?: string }[];
    teacher: { id: string; name: string; description?: string; grading_intensity?: string }[];
  };
  isSubmitting: boolean;
}

export function CreateActivityModal({
  isOpen,
  onClose,
  onSubmit,
  courses,
  programLoads,
  sections,
  rubrics,
  isSubmitting,
}: CreateActivityModalProps) {
  const [formData, setFormData] = useState<NewActivityForm>({
    title: "",
    courseIds: [],
    sectionIds: [],
    rubricId: "",
    dueDate: "",
    description: "",
    minWordCount: 150,
  });

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedProgramLoadIds, setSelectedProgramLoadIds] = useState<string[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);

  // Preview Modal State
  const [previewRubric, setPreviewRubric] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);

  // Get current date and time in local timezone for min attribute (YYYY-MM-DDTHH:mm)
  const todayDateTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  const handleClose = () => {
    setFormData({
      title: "",
      courseIds: [],
      sectionIds: [],
      rubricId: "",
      dueDate: "",
      description: "",
      minWordCount: 150,
    });
    setSelectedCourseId("");
    setSelectedProgramLoadIds([]);
    setSelectedSectionIds([]);
    setAiSuggestions([]);
    setSelectedSuggestionIndex(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    // Convert back to plural format if needed by the backend, or just send the single one
    const submissionData = {
      ...formData,
      courseIds: selectedCourseId ? [selectedCourseId] : [],
      sectionIds: selectedSectionIds, // Multiple sections sent
      suggestedRubric: selectedSuggestionIndex !== null ? aiSuggestions[selectedSuggestionIndex] : undefined,
    };

    await onSubmit(submissionData);
    handleClose();
  };

  // Filter programs based on selected course
  const filteredPrograms = useMemo(() => {
    if (!selectedCourseId) return [];
    return programLoads.filter((p) => p.course_id === selectedCourseId);
  }, [selectedCourseId, programLoads]);

  // Filter sections based on selected program loads
  const filteredSections = useMemo(() => {
    if (selectedProgramLoadIds.length === 0) return [];
    return sections.filter((s) => selectedProgramLoadIds.includes(s.programLoadId));
  }, [selectedProgramLoadIds, sections]);

  // Reset dependent selections when parent changes
  const handleCourseChange = (id: string) => {
    setSelectedCourseId(id);
    setSelectedProgramLoadIds([]);
    setSelectedSectionIds([]);
  };

  const handleProgramToggle = (id: string) => {
    setSelectedProgramLoadIds((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        return prev.filter((pId) => pId !== id);
      }
      return [...prev, id];
    });
    // Optional: Reset sections when programs change
    setSelectedSectionIds([]);
  };

  const handleSectionToggle = (id: string) => {
    setSelectedSectionIds((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        return prev.filter((sId) => sId !== id);
      }
      return [...prev, id];
    });
  };
  
  const handleGenerateRubric = async () => {
    if (!formData.title.trim()) return;
    setIsGeneratingRubric(true);
    try {
      const response = await rubricApi.generateRubrics(formData.title, formData.description);
      setAiSuggestions(response.suggestions);
      // Automatically select the first one
      if (response.suggestions.length > 0) {
        setSelectedSuggestionIndex(0);
        setFormData(prev => ({ ...prev, rubricId: "ai-suggestion" }));
      }
    } catch (error) {
      console.error("Failed to generate rubrics:", error);
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  const handlePreviewSuggestion = (idx: number) => {
    const suggestion = aiSuggestions[idx];
    if (!suggestion) return;
    
    setPreviewRubric({
      id: idx,
      name: suggestion.name,
      description: suggestion.description,
      type: suggestion.grading_intensity,
      criteria: suggestion.criteria,
      programs: 0,
      lastUpdated: new Date().toISOString().split('T')[0]
    });
    setIsPreviewOpen(true);
  };

  const handlePreviewExisting = async (id: string) => {
    setIsFetchingPreview(true);
    try {
      const rubric = await fetchRubricById(parseInt(id));
      if (rubric && rubric.fullData) {
        setPreviewRubric(rubric.fullData);
        setIsPreviewOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch rubric for preview:", error);
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const isFormValid = formData.title.trim() && selectedCourseId && selectedSectionIds.length > 0;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Activity"
      size="lg"
    >
      <div className="space-y-6">

        {/* ─── Section 1: Title ─── */}
        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-1.5 block">
            Title <span className="text-tertiary">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Argumentative Essay on Climate Change"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 focus:bg-white transition-all placeholder:text-neutral-300"
          />
        </div>

        {/* ─── Section 2: Targeting (Course → Program → Section) ─── */}
        <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em]">
              Assign To <span className="text-tertiary">*</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Course */}
            <div>
              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1 block">
                Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-primary/10 transition-all"
              >
                <option value="">Select…</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Programs */}
            <div>
              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1 block">
                Programs
              </label>
              <div className="border border-neutral-200 rounded-lg bg-white overflow-y-auto max-h-32 p-1.5">
                {filteredPrograms.length === 0 ? (
                  <p className="text-[11px] text-neutral-300 p-1.5 text-center italic">
                    {selectedCourseId ? "No programs" : "Select a course first"}
                  </p>
                ) : (
                  filteredPrograms.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer px-2 py-1.5 hover:bg-primary/[0.03] rounded-md transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedProgramLoadIds.includes(p.id)}
                        onChange={() => handleProgramToggle(p.id)}
                        className="w-3.5 h-3.5 text-primary border-neutral-300 rounded focus:ring-primary accent-primary"
                      />
                      <span className="text-neutral-700">{p.program_name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Sections */}
            <div>
              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1 block">
                Classes
              </label>
              <div className="border border-neutral-200 rounded-lg bg-white overflow-y-auto max-h-32 p-1.5">
                {filteredSections.length === 0 ? (
                  <p className="text-[11px] text-neutral-300 p-1.5 text-center italic">
                    {selectedProgramLoadIds.length > 0 ? "No sections" : "Select programs first"}
                  </p>
                ) : (
                  filteredSections.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer px-2 py-1.5 hover:bg-primary/[0.03] rounded-md transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedSectionIds.includes(s.id)}
                        onChange={() => handleSectionToggle(s.id)}
                        className="w-3.5 h-3.5 text-primary border-neutral-300 rounded focus:ring-primary accent-primary"
                      />
                      <span className="text-neutral-700">{s.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Section 3: Rubric Selection ─── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em] block">
              Grading Rubric
            </label>
            <button
              type="button"
              onClick={handleGenerateRubric}
              disabled={isGeneratingRubric || !formData.title.trim()}
              className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary-600 disabled:text-neutral-300 flex items-center gap-1.5 transition-colors group"
            >
              {isGeneratingRubric ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3 group-hover:rotate-12 transition-transform" />
              )}
              {aiSuggestions.length > 0 ? "Regenerate AI" : "Generate with AI"}
            </button>
          </div>

          {/* AI Suggestions Section */}
          {aiSuggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-100 to-transparent"></div>
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">AI Suggested Rubrics</span>
                <div className="h-px flex-1 bg-gradient-to-r from-neutral-100 via-neutral-100 to-transparent"></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {aiSuggestions.map((suggestion, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      setSelectedSuggestionIndex(idx);
                      setFormData(prev => ({ ...prev, rubricId: "ai-suggestion" }));
                    }}
                    className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer group/card ${
                      selectedSuggestionIndex === idx 
                        ? "border-primary bg-primary/5 ring-4 ring-primary/5" 
                        : "border-neutral-100 bg-white hover:border-neutral-200"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight truncate group-hover/card:text-primary transition-colors">AI Suggestion {idx + 1}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewSuggestion(idx);
                          }}
                          className="p-1 hover:bg-neutral-100 rounded-md text-neutral-400 hover:text-primary transition-all group-hover/card:scale-110 active:scale-95"
                          title="Preview Rubric"
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                      {selectedSuggestionIndex === idx && (
                        <div className="bg-primary rounded-full p-0.5 shadow-sm">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-neutral-700 line-clamp-1">{suggestion.name}</h4>
                    <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1 leading-tight">{suggestion.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cards container for platform and teacher rubrics */}
          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {/* Platform Rubrics */}
            {rubrics.platform.length > 0 && (
              <div className="space-y-2">
                <div className="px-1">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Platform Library</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {rubrics.platform.map((rubric) => (
                    <div 
                      key={rubric.id}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, rubricId: rubric.id }));
                        setSelectedSuggestionIndex(null);
                      }}
                      className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer group/card ${
                        formData.rubricId === rubric.id && selectedSuggestionIndex === null
                          ? "border-primary bg-primary/5 ring-4 ring-primary/5" 
                          : "border-neutral-100 bg-white hover:border-neutral-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight truncate group-hover/card:text-primary transition-colors">
                            {rubric.grading_intensity || "General"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewExisting(rubric.id);
                            }}
                            disabled={isFetchingPreview}
                            className="p-1 hover:bg-neutral-100 rounded-md text-neutral-400 hover:text-primary transition-all group-hover/card:scale-110 active:scale-95"
                            title="Preview Rubric"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                        {formData.rubricId === rubric.id && selectedSuggestionIndex === null && (
                          <div className="bg-primary rounded-full p-0.5 shadow-sm">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-neutral-700 line-clamp-1">{rubric.name}</h4>
                      <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1 leading-tight">
                        {rubric.description || "A comprehensive grading rubric for your activity."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teacher Rubrics */}
            {rubrics.teacher.length > 0 && (
              <div className="space-y-2">
                <div className="px-1 pt-2 border-t border-neutral-50">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Your Private Rubrics</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {rubrics.teacher.map((rubric) => (
                    <div 
                      key={rubric.id}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, rubricId: rubric.id }));
                        setSelectedSuggestionIndex(null);
                      }}
                      className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer group/card ${
                        formData.rubricId === rubric.id && selectedSuggestionIndex === null
                          ? "border-primary bg-primary/5 ring-4 ring-primary/5" 
                          : "border-neutral-100 bg-white hover:border-neutral-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight truncate group-hover/card:text-primary transition-colors">
                            {rubric.grading_intensity || "Custom"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewExisting(rubric.id);
                            }}
                            disabled={isFetchingPreview}
                            className="p-1 hover:bg-neutral-100 rounded-md text-neutral-400 hover:text-primary transition-all group-hover/card:scale-110 active:scale-95"
                            title="Preview Rubric"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                        {formData.rubricId === rubric.id && selectedSuggestionIndex === null && (
                          <div className="bg-primary rounded-full p-0.5 shadow-sm">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-neutral-700 line-clamp-1">{rubric.name}</h4>
                      <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1 leading-tight">
                        {rubric.description || "Your personalized grading criteria."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rubrics.platform.length === 0 && rubrics.teacher.length === 0 && !isGeneratingRubric && (
              <div className="text-center py-6 border-2 border-dashed border-neutral-100 rounded-2xl">
                <p className="text-xs text-neutral-400 font-medium">No rubrics found. Try generating one with AI!</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Section 4: Due Date & Word Count (Side by Side) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Due Date */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-1.5 block">
              Due Date & Time
              <span className="text-neutral-300 ml-1 font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                min={todayDateTime.split("T")[0]}
                className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
                value={formData.dueDate ? formData.dueDate.split("T")[0] : ""}
                onChange={(e) => {
                  const dateStr = e.target.value;
                  if (!dateStr) {
                    setFormData((prev) => ({ ...prev, dueDate: "" }));
                  } else {
                    const timeStr = formData.dueDate && formData.dueDate.includes("T") 
                      ? formData.dueDate.split("T")[1].slice(0, 5) 
                      : "23:59";
                    setFormData((prev) => ({ ...prev, dueDate: `${dateStr}T${timeStr}` }));
                  }
                }}
              />
              <input
                type="time"
                className="w-[100px] px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                value={formData.dueDate && formData.dueDate.includes("T") ? formData.dueDate.split("T")[1].slice(0, 5) : ""}
                onChange={(e) => {
                  const timeStr = e.target.value;
                  const dateStr = formData.dueDate ? formData.dueDate.split("T")[0] : "";
                  if (dateStr) {
                    setFormData((prev) => ({ ...prev, dueDate: `${dateStr}T${timeStr || "23:59"}` }));
                  }
                }}
                disabled={!formData.dueDate}
              />
            </div>
            <p className="text-[10px] text-neutral-300 mt-1.5 ml-0.5">
              Future dates only. Defaults to 11:59 PM.
            </p>
          </div>

          {/* Min Word Count */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-1.5 block">
              Min. Word Count
            </label>
            <input
              type="number"
              min="10"
              max="10000"
              value={formData.minWordCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setFormData((prev) => ({ ...prev, minWordCount: isNaN(val) ? 0 : val }));
              }}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
            />
            <p className="text-[10px] text-neutral-300 mt-1.5 ml-0.5">
              Essays below this count won't auto-grade.
            </p>
          </div>
        </div>

        {/* ─── Section 5: Instructions ─── */}
        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-1.5 block">
            Instructions
            <span className="text-neutral-300 ml-1 font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            placeholder="Provide instructions or guidelines for students…"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-xs bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 focus:bg-white transition-all placeholder:text-neutral-300 resize-none leading-relaxed"
          />
        </div>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
          {/* Selection summary */}
          <div className="flex items-center gap-2">
            {selectedSectionIds.length > 0 && (
              <span className="text-[10px] font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                {selectedSectionIds.length} section{selectedSectionIds.length !== 1 ? "s" : ""}
              </span>
            )}
            {formData.rubricId && (
              <span className="text-[10px] font-semibold text-secondary-500 bg-secondary/10 px-2 py-0.5 rounded-md border border-secondary/10">
                Rubric set
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" onClick={handleClose} className="text-sm">
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-10 px-5 shadow-md shadow-primary/15"
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Activity
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>

    {/* Rubric Preview Modal */}
    {previewRubric && (
      <RubricPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewRubric(null);
        }}
        rubric={previewRubric}
      />
    )}

    {/* Global Fetching Overlay */}
    {isFetchingPreview && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-neutral-100 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-xs font-bold text-neutral-600 uppercase tracking-widest">Loading Rubric...</span>
        </div>
      </div>
    )}
    </>
  );
}
