import React, { useEffect, useState } from "react";
import { fetchEssays } from "../services/essayService";
import type { Essay } from "../types/Essay";
import EssayCard from "../components/EssayCard";

const TeacherDashboard: React.FC = () => {
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEssays() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchEssays();
        setEssays(data);
      } catch (err) {
        console.error("Failed to fetch essays:", err);
        setError("Failed to load essays. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    loadEssays();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl text-primary font-bold mb-4">
        Teacher Dashboard
      </h1>

      {/* Loading state */}
      {loading && <p className="text-gray-500">Loading essays...</p>}

      {/* Error state */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Empty state */}
      {!loading && essays.length === 0 && !error && (
        <p className="text-gray-600">No essays submitted yet.</p>
      )}

      {/* Essays list */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {essays.map((essay) => (
          <EssayCard key={essay.id} essay={essay} />
        ))}
      </div>
    </div>
  );
};

export default TeacherDashboard;
