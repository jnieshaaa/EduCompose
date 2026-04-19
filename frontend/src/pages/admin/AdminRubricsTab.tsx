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
  Settings
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import { useNotification } from "../../context/NotificationContext";
import type { CriteriaRow } from "../../types/rubricTypes";
import { logActivity } from "../../utils/logger";
import { motion } from "framer-motion";

export function AdminRubricsTab() {
  const [platformRubrics, setPlatformRubrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { showNotification } = useNotification();

  useEffect(() => {
    loadPlatformRubrics();
  }, []);

  const loadPlatformRubrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("rubrics")
        .select("*")
        .is("created_by", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlatformRubrics(data || []);
    } catch (err: any) {
      showNotification('error', "Failed to load rubrics.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlatformRubric = async (rubricData: {
    name: string;
    description: string;
    criteria: CriteriaRow[];
    gradingIntensity: string;
    programs: string[];
  }) => {
    try {
      const { error } = await supabase
        .from("rubrics")
        .insert({
          name: rubricData.name,
          description: rubricData.description,
          criteria: rubricData.criteria,
          programs: rubricData.programs,
          grading_intensity: rubricData.gradingIntensity,
          created_by: null,
        })
        .select()
        .single();

      if (error) throw error;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dbUser } = await supabase.from("users").select("id").eq("auth_user_id", user.id).single();
          if (dbUser) {
            await logActivity(dbUser.id, "create_rubric", `Created platform protocol: ${rubricData.name}`);
          }
        }
      } catch (logErr) {}

      showNotification('success', "Rubric created successfully.");
      await loadPlatformRubrics();
      setShowCreateModal(false);
    } catch (err: any) {
      showNotification('error', "Failed to create rubric.");
    }
  };

  const handleDeletePlatformRubric = async (rubricId: number) => {
    if (!confirm("Are you sure you want to delete this rubric? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("rubrics")
        .delete()
        .eq("id", rubricId)
        .is("created_by", null);

      if (error) throw error;

      showNotification('success', "Rubric deleted.");
      await loadPlatformRubrics();
    } catch (err: any) {
      showNotification('error', "Failed to delete rubric.");
    }
  };

  const filteredRubrics = platformRubrics.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20">
      {/* Premium Integrated Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Platform Rubrics</h1>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <Lock size={14} className="text-primary/50" />
            Standard Grading Criteria
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="rounded-2xl bg-primary text-white shadow-2xl shadow-primary/20 hover:scale-[1.05] transition-all px-8 h-14 flex items-center gap-3 border-none group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Create Rubric</span>
        </Button>
      </div>

      {/* Telemetry Filter */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={18} />
          <input
            placeholder="Search platform protocols by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-sm font-bold placeholder:text-neutral-300 focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
          />
        </div>
        <div className="hidden lg:flex items-center gap-4 px-6 border-l border-neutral-100">
           <div className="text-right">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Global Rubrics</p>
              <p className="text-sm font-bold text-neutral-900">{platformRubrics.length} Available</p>
           </div>
           <Globe size={20} className="text-neutral-200" />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[3rem] border border-neutral-100 shadow-sm">
          <Loader2 className="animate-spin text-primary/30 w-12 h-12 mb-6" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 animate-pulse">Loading rubrics...</p>
        </div>
      ) : filteredRubrics.length === 0 ? (
        <div className="bg-white p-20 rounded-[3.5rem] border border-neutral-100 text-center flex flex-col items-center shadow-sm">
          <div className="w-20 h-20 bg-neutral-50 rounded-[2rem] flex items-center justify-center mb-6 border border-neutral-100">
            <ClipboardCheck className="w-10 h-10 text-neutral-200" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 tracking-tight">No rubrics found</h3>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-2 max-w-sm mx-auto">
            You haven't created any global rubrics yet.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="mt-8 rounded-xl bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-6 h-10"
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
                  <h3 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight group-hover:text-primary transition-colors">
                    {rubric.name}
                  </h3>
                  {rubric.description && (
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest line-clamp-2 leading-relaxed">
                      {rubric.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-50 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_-1px_rgba(16,185,129,0.5)]" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Platform Standard</span>
                   </div>
                   {rubric.grading_intensity && (
                      <span className="text-[9px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-md uppercase tracking-tighter border border-primary/10">
                         {rubric.grading_intensity} Depth
                      </span>
                   )}
                </div>
              </div>
              
              <button className="w-full py-5 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-center gap-3 group/btn transition-colors hover:bg-primary hover:text-white group-hover:border-primary/20">
                 <span className="text-[10px] font-bold uppercase tracking-widest">View Rubric</span>
                 <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <PlatformRubricModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePlatformRubric}
        />
      )}
    </div>
  );
}

function PlatformRubricModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    criteria: CriteriaRow[];
    gradingIntensity: string;
    programs: string[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a name for the rubric.");
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        criteria: [],
        gradingIntensity: "Basic",
        programs: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Protocol injection failure.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6 bg-black/5 backdrop-blur-sm z-[100]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-neutral-100 p-10 overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-primary/5 rounded-full blur-3xl opacity-50" />
        
        <div className="relative z-10 space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Add New Rubric</h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest opacity-80">Set up a new grading rubric</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                Rubric Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g., Global Essay Assessment V1"
                className="w-full h-12 px-5 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this rubric used for?"
                className="w-full h-32 px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none resize-none"
                rows={3}
              />
            </div>
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                <Trash2 size={12} />
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl h-12 text-[10px] font-bold uppercase tracking-widest px-6 hover:bg-neutral-50">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading} className="rounded-xl h-12 text-[10px] font-bold uppercase tracking-widest px-8 shadow-xl shadow-primary/20">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Rubric"}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
