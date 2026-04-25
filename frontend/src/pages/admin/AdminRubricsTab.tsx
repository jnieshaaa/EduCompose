import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  ClipboardCheck, 
  Search, 
  Loader2, 
  ArrowRight,
  Lock,
  Globe,
  Settings,
  ArrowLeft
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import { useNotification } from "../../contexts/NotificationContext";
import type { BuilderMode, RubricFormData, PlatformRubric } from "../../types/rubricTypes";
import { logActivity } from "../../utils/logger";
import { motion } from "framer-motion";
import { RubricCreationOptionsView } from "../../components/rubrics/RubricCreationOptionsView";
import { UploadModeView } from "../../components/rubrics/UploadModeView";
import { TemplateModeView } from "../../components/rubrics/TemplateModeView";
import { ScratchModeView } from "../../components/rubrics/ScratchModeView";
import { RubricPreviewModal } from "../../components/rubrics/RubricPreviewModal";
import { defaultRubricFormData, initialCriteria } from "../../components/rubrics/types";

export function AdminRubricsTab() {
  const [platformRubrics, setPlatformRubrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<"list" | "options">("list");
  const [selectedMode, setSelectedMode] = useState<BuilderMode>(null);
  const [rubricFormData, setRubricFormData] = useState<RubricFormData>(defaultRubricFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const { showNotification } = useNotification();

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedPreviewRubric, setSelectedPreviewRubric] = useState<PlatformRubric | null>(null);

  useEffect(() => {
    loadPlatformRubrics();
  }, []);

  const loadPlatformRubrics = async () => {
    try {
      setLoading(true);
      
      // 1. Get all auth IDs that have the 'admin' role
      const { data: admins } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin");
      
      const adminIds = admins?.map(a => a.id).filter(Boolean) || [];

      if (adminIds.length === 0) {
        setPlatformRubrics([]);
        return;
      }

      // 2. Query rubrics that belong to any admin (using user_id as the standard UUID column)
      const { data, error } = await supabase
        .from("rubrics")
        .select("*")
        .in("user_id", adminIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlatformRubrics(data || []);
    } catch (err: any) {
      console.error("Error loading rubrics:", err);
      showNotification('error', "Failed to load rubrics.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlatformRubric = async (rubricData: RubricFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("rubrics")
        .insert({
          name: rubricData.name,
          criteria: rubricData.criteria,
          programs: rubricData.programs,
          grading_intensity: rubricData.gradingIntensity,
          user_id: user.id, // Reference to auth.users.id (UUID)
        })
        .select()
        .single();

      if (error) throw error;

      await logActivity(user.id, "create_rubric", `Created admin rubric: ${rubricData.name}`);

      showNotification('success', "Rubric created successfully.");
      await loadPlatformRubrics();
      setCurrentView("list");
      setSelectedMode(null);
      setRubricFormData(defaultRubricFormData);
    } catch (err: any) {
      console.error("Create rubric error:", err);
      showNotification('error', "Failed to create rubric.");
    }
  };

  const handleDeletePlatformRubric = async (rubricId: number) => {
    if (!confirm("Are you sure you want to delete this rubric? This action cannot be undone.")) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("rubrics")
        .delete()
        .eq("id", rubricId);

      if (error) throw error;

      showNotification('success', "Rubric deleted.");
      await loadPlatformRubrics();
    } catch (err: any) {
      showNotification('error', "Failed to delete rubric.");
    }
  };

  const handlePreviewRubric = (rubric: PlatformRubric) => {
    setSelectedPreviewRubric(rubric);
    setPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setSelectedPreviewRubric(null);
  };

  const handleUseTemplate = (rubric: PlatformRubric) => {
    setRubricFormData({
      name: rubric.name,
      gradingIntensity: rubric.type, // PlatformRubric uses 'type'
      programs: [],
      criteria: rubric.criteria
    });
    setSelectedMode("scratch");
    handleClosePreview();
  };

  const filteredRubrics = platformRubrics.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateClick = () => {
    setCurrentView("options");
    setSelectedMode(null);
    setRubricFormData({
      ...defaultRubricFormData,
      criteria: [
        ...initialCriteria.map((c) => ({
          ...c,
          scores: c.scores.map((s) => ({ ...s })),
        })),
      ],
    });
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedMode(null);
  };

  const handleModeSelection = (mode: BuilderMode) => {
    setSelectedMode(mode);
  };

  const handleFormChange = (updates: Partial<RubricFormData>) => {
    setRubricFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleCancelMode = () => {
    setSelectedMode(null);
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Premium Integrated Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div className="flex items-center gap-3">
          {currentView === "options" && (
            <button
              onClick={handleBackToList}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">
              {currentView === "options" ? "Add Rubric" : "Rubrics"}
            </h1>
            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
              <Lock size={14} className="text-primary/50" />
              Grading Rubrics
            </p>
          </div>
        </div>
        
        {currentView === "list" && (
          <Button
            onClick={handleCreateClick}
          className="rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.05] transition-all px-6 h-10 flex items-center gap-2 border-none group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
          <span className="text-[10px] font-medium uppercase tracking-widest">Create Rubric</span>
        </Button>
        )}
      </div>

      {currentView === "options" && (
        <div className="space-y-0">
          <RubricCreationOptionsView
            selectedMode={selectedMode}
            onModeSelect={handleModeSelection}
          />

          {selectedMode === "upload" && (
            <UploadModeView
              onCancel={handleCancelMode}
              onImportSuccess={(rubricData) => {
                setRubricFormData(rubricData);
                setSelectedMode("scratch");
              }}
            />
          )}

          {selectedMode === "template" && (
            <TemplateModeView
              onCancel={handleCancelMode}
              onPreviewRubric={handlePreviewRubric}
            />
          )}

          {selectedMode === "scratch" && (
            <ScratchModeView
              formData={rubricFormData}
              onFormChange={handleFormChange}
              onSave={() => handleCreatePlatformRubric(rubricFormData)}
              onCancel={handleCancelMode}
              hidePrograms={true}
            />
          )}
        </div>
      )}

      {currentView === "list" && (
        <>
          {/* Telemetry Filter */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={18} />
          <input
            placeholder="Search rubrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-sm font-medium placeholder:text-neutral-300 focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
          />
        </div>
        <div className="hidden lg:flex items-center gap-4 px-6 border-l border-neutral-100">
           <div className="text-right">
              <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Global List</p>
              <p className="text-sm font-semibold text-neutral-900">{platformRubrics.length} Available</p>
           </div>
           <Globe size={20} className="text-neutral-200" />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[3rem] border border-neutral-100 shadow-sm">
          <Loader2 className="animate-spin text-primary/30 w-12 h-12 mb-6" />
          <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400 animate-pulse">Loading rubrics...</p>
        </div>
      ) : filteredRubrics.length === 0 ? (
        <div className="bg-white p-20 rounded-[3.5rem] border border-neutral-100 text-center flex flex-col items-center shadow-sm">
          <div className="w-20 h-20 bg-neutral-50 rounded-[2rem] flex items-center justify-center mb-6 border border-neutral-100">
            <ClipboardCheck className="w-10 h-10 text-neutral-200" />
          </div>
          <h3 className="text-xl font-semibold text-neutral-900 tracking-tight">No rubrics found</h3>
          <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest mt-2 max-w-sm mx-auto">
            You haven't created any global rubrics yet.
          </p>
          <Button
            onClick={handleCreateClick}
            className="mt-8 rounded-xl bg-primary text-white text-[10px] font-medium uppercase tracking-widest px-6 h-10"
          >
            Add New Rubric
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRubrics.map((rubric, i) => (
            <motion.div
              key={rubric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden outline-none flex flex-col h-full"
            >
              <div className="p-8 space-y-6 flex-1">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm border border-primary/5">
                    <ClipboardCheck size={24} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {}}
                      className="p-2.5 text-neutral-300 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-all"
                    >
                      <Settings size={16} />
                    </button>
                    <button
                      onClick={() => handleDeletePlatformRubric(rubric.id)}
                      className="p-2.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-neutral-900 tracking-tight leading-tight group-hover:text-primary transition-colors">
                    {rubric.name}
                  </h3>
                  {rubric.description && (
                    <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-widest line-clamp-2 leading-relaxed">
                      {rubric.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_-1px_rgba(16,185,129,0.5)]" />
                      <span className="text-[9px] font-medium uppercase tracking-widest text-neutral-400">Standard</span>
                    </div>
                    {(rubric.grading_intensity || (rubric as any).type) && (
                      <span className="text-[9px] font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-md uppercase tracking-tighter border border-primary/10">
                        {rubric.grading_intensity || (rubric as any).type} Depth
                      </span>
                    )}
                </div>
              </div>
              
               <button className="w-full py-5 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-center gap-3 group/btn transition-colors hover:bg-primary hover:text-white group-hover:border-primary/20">
                  <span className="text-[10px] font-medium uppercase tracking-widest">View Rubric</span>
                  <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
               </button>
            </motion.div>
          ))}
        </div>
      )}
    </>
  )}

    {/* Preview Modal for Platform Rubrics */}
    {selectedPreviewRubric && (
      <RubricPreviewModal
        rubric={selectedPreviewRubric}
        isOpen={previewModalOpen}
        onClose={handleClosePreview}
        onUseTemplate={handleUseTemplate}
      />
    )}
  </div>
  );
}


