import React, { useEffect, useState } from "react";
import { fetchEssays } from "../services/essayService";
import type { Essay } from "../types/Essay";
import EssayCard from "../components/EssayCard";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const TeacherDashboard: React.FC = () => {
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadEssays() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEssays();
        setEssays(data);
      } catch (err) {
        console.error("Failed to fetch essays:", err);
        setError("⚠️ Failed to load essays. Try again later.");
      } finally {
        setLoading(false);
      }
    }
    loadEssays();
  }, []);

  // const handleViewEssay = (essayId: string) => {
  //   navigate(`/essay/${essayId}`);
  // };

  // Loading State Check
  if (loading) {
    return (
      <div className='p-8 bg-gradient-to-b from-gray-50 to-gray-100 text-center py-20'>
        <p className='text-4xl font-bold text-green-400'>Loading Essay</p>
      </div>
    );
  }

  // Error State Check
  if (error) {
    return (
      <div className='p-8 bg-gradient-to-b from-gray-50 to-gray-100 text-center py-20'>
        <div className='text-red-600 font-semibold border-2 border-red-200 p-6 rounded-lg bg-red-50 inline-block'>
          {error}
        </div>
      </div>
    );
  }

  const hasEssays = essays.length > 0;

  return (
    <div className='p-8 bg-gradient-to-b from-gray-50 to-gray-100'>
      <div className='text-center'>
        <header>
          <motion.h1
            className='text-3xl font-extrabold text-primary tracking-tight'
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Teacher Dashboard
          </motion.h1>

          <motion.p
            className='text-gray-500 mt-2 mb-10'
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Monitor class progress and learning objectives.
          </motion.p>
        </header>
      </div>

      {/* Empty State Check */}
      {!hasEssays && (
        <div className='text-center py-10 text-gray-500 text-lg'>
          No essays have been submitted yet. Keep an eye out! 👀
        </div>
      )}

      {/* Essay list */}
      {hasEssays && (
        <AnimatePresence>
          <motion.div
            className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {essays.map((essay, index) => (
              <motion.div
                key={essay.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className='hover:shadow-lg transition-shadow'
                onClick={() => navigate(`/essay/${essay.id}`)}
              >
                <EssayCard essay={essay} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default TeacherDashboard;
