import React from "react";
import type { Essay } from "../types/Essay";

interface Props {
  essay: Essay;
}

const EssayCard: React.FC<Props> = ({ essay }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm mb-4">
      <h2 className="text-lg font-bold">{essay.title}</h2>
      <p className="text-sm text-gray-600">By: {essay.studentName}</p>
      <p className="mt-2">{essay.content.substring(0, 100)}...</p>

      <div className="mt-3 text-sm">
        <span className="mr-4">Grammar: {essay.grammarScore}/5</span>
        <span>Readability: {essay.readabilityScore}/5</span>
      </div>
    </div>
  );
};

export default EssayCard;
