import React, { useState } from "react";
import { Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import HeaderPublic from "../components/HeaderPublic";
import AuthModal from "../components/LoginModal";

const EssayManagement: React.FC = () => {
  const [text, setText] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const charCount = text.length;

  const handleAnalyze = () => {
    if (!text.trim()) return;
    navigate("/Dashboard", { state: { essayText: text } });
  };

  return (
    <div className='flex flex-col h-screen overflow-hidden'>
      <HeaderPublic onLoginClick={() => setShowLogin(true)} />
      {showLogin && <AuthModal onClose={() => setShowLogin(false)} />}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className='flex flex-col flex-1 items-center justify-center overflow-hidden gap-8 p-4'
      >
        {/* Header Section */}
        <div className='text-center'>
          <h1 className='text-4xl font-bold text-neutral-900 mb-3'>
            Knowledge Graph Enhanced NLP
          </h1>
          <p className='text-xl text-neutral-600'>
            Knowledge Graph Enhanced NLP for Teacher Assisted Essay Evaluation
          </p>
        </div>

        {/* Textarea Container */}
        <div className='bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8'>
          <textarea
            placeholder='Enter text here or upload file to check'
            value={text}
            onChange={(e) => setText(e.target.value)}
            className='w-full h-96 border-none focus:ring-0 text-neutral-900 placeholder-neutral-400 resize-none outline-none'
          />

          <div className='flex justify-between items-center text-sm text-neutral-500 mt-4'>
            <span>
              {wordCount} Words {charCount} Characters
            </span>

            <div className='flex items-center gap-3'>
              <label className='flex items-center space-x-2 px-3 py-1 bg-white rounded-lg hover:bg-neutral-300/40 cursor-pointer transition'>
                <Upload size={16} />
                <span>Upload</span>
                <input
                  type='file'
                  accept='.txt'
                  className='hidden'
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const content = event.target?.result as string;
                      setText(content);
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>

              <button
                onClick={handleAnalyze}
                className='bg-primary hover:bg-primary-300 text-white font-medium px-4 py-2 rounded-full transition'
              >
                Analyze Essay
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EssayManagement;
