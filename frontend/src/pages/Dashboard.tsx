import React from "react";
import { useLocation } from "react-router-dom";

const Dashboard: React.FC = () => {
  const location = useLocation();
  const essayText = (location.state as { essayText?: string })?.essayText || "";

  const wordCount =
    essayText.trim() === "" ? 0 : essayText.trim().split(/\s+/).length;
  const charCount = essayText.length;

  return (
    <div className='p-6'>
      {essayText ? (
        <div className='bg-white p-6 rounded-xl shadow-md'>
          <h2 className='font-semibold mb-2'>Essay Text:</h2>
          <p className='mb-4 whitespace-pre-wrap'>{essayText}</p>

          <div className='text-sm text-neutral-700'>
            <p>{wordCount} Word</p>
            <p>{charCount} Character</p>
          </div>
        </div>
      ) : (
        <p>No essay provided. Go back to Essay Management to submit one.</p>
      )}
    </div>
  );
};

export default Dashboard;
