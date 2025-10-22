import React, { useState } from "react";
import { Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EssayManagement: React.FC = () => {
  const [text, setText] = useState("");
  const navigate = useNavigate();

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const charCount = text.length;

  const handleAnalyze = () => {
    if (!text.trim()) return;
    navigate("/Dashboard", { state: { essayText: text } });
  };

  return (
    <div className='flex flex-col bg-neutral-300/30 min-h-screen items-center justify-center'>
      <div className='text-center mb-6'>
        <h1 className='text-4xl font-bold text-neutral-900 mb-3'>
          Knowledge Graph Enhanced NLP
        </h1>
        <p className='text-xl text-neutral-600'>
          Knowledge Graph Enhanced NLP for Teacher Assisted Essay Evaluation
        </p>
      </div>

      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8'>
        <textarea
          placeholder='Enter text here or upload file to check'
          value={text}
          onChange={(e) => setText(e.target.value)}
          className='w-full h-96 border-none focus:ring-0 neutral-900 placeholder-neutral-400 resize-none outline-none'
        />

        <div className='flex justify-between items-center text-sm text-neutral-500'>
          <span>
            {wordCount} Words {charCount} Characters
          </span>

          <div className='flex items-center gap-3'>
            <button className='flex items-center space-x-2 px-3 py-1 bg-white rounded-lg hover:bg-neutral-300/40 cursor-pointer transition'>
              <Upload size={16} />
              <span>Upload</span>
            </button>

            <button
              onClick={handleAnalyze}
              className='bg-primary hover:bg-primary-300 text-white font-medium px-4 py-2 rounded-full transition'
            >
              Analyze Essay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EssayManagement;
