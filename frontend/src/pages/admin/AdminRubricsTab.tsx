import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import type { CriteriaRow } from "../../types/rubricTypes";
import { logActivity } from "../../utils/logger";

export function AdminRubricsTab() {
  const [platformRubrics, setPlatformRubrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPlatformRubrics();
  }, []);

  const loadPlatformRubrics = async () => {
    try {
      const { data, error } = await supabase
        .from("rubrics")
        .select("*")
        .is("created_by", null) // Platform rubrics have created_by = null
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading platform rubrics:", error);
        return;
      }

      setPlatformRubrics(data || []);
    } catch (err) {
      console.error("Unexpected error:", err);
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
          created_by: null, // Platform rubric
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log the action
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dbUser } = await supabase.from("users").select("id").eq("auth_user_id", user.id).single();
          if (dbUser) {
            await logActivity(dbUser.id, "create_rubric", `Created platform rubric: ${rubricData.name}`);
          }
        }
      } catch (logErr) {
        console.warn("Logging failed, but action succeeded:", logErr);
      }

      await loadPlatformRubrics();
      setShowCreateModal(false);
    } catch (err) {
      console.error("Error creating platform rubric:", err);
      throw err;
    }
  };

  const handleDeletePlatformRubric = async (rubricId: number) => {
    if (!confirm("Are you sure you want to delete this platform rubric? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("rubrics")
        .delete()
        .eq("id", rubricId)
        .is("created_by", null);

      if (error) {
        throw error;
      }

      await loadPlatformRubrics();
    } catch (err) {
      console.error("Error deleting platform rubric:", err);
      alert("Failed to delete platform rubric. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Platform Rubrics</h1>
          <p className="text-neutral-600 mt-1">
            Manage platform-wide rubrics that are available to all teachers
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Platform Rubric
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-neutral-600 mt-4">Loading platform rubrics...</p>
        </div>
      ) : platformRubrics.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-neutral-600 mb-4">No platform rubrics created yet.</p>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Platform Rubric
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platformRubrics.map((rubric) => (
            <Card key={rubric.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                    {rubric.name}
                  </h3>
                  {rubric.description && (
                    <p className="text-sm text-neutral-600 mb-2">
                      {rubric.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span>Platform Rubric</span>
                    {rubric.grading_intensity && (
                      <span>• {rubric.grading_intensity}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeletePlatformRubric(rubric.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
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

// Simple modal for creating platform rubrics
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
      setError("Rubric name is required");
      return;
    }

    setIsLoading(true);
    try {
      // For now, create a basic rubric structure
      // In a full implementation, you'd use the full rubric builder
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        criteria: [], // Empty criteria - admin can edit later
        gradingIntensity: "Basic",
        programs: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rubric");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">
          Create Platform Rubric
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Rubric Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Rubric"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

