import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_KEY = "";
const MAX_RETRIES = 5;

declare const __firebase_config: string | undefined;
const firebaseConfig =
  typeof __firebase_config !== "undefined"
    ? JSON.parse(__firebase_config || "null")
    : null;

const promptRecipes = {
  verbatim: {
    title: "1. Detect Rote Output (Verbatim/Structure)",
    prompt:
      "Scan the STUDENT ESSAY for any phrases longer than seven words that are verbatim matches to the GROUND TRUTH SOURCE content...",
  },
  hallucination: {
    title: "2. Detect Unverified Hallucination/Flaw",
    prompt:
      "Identify all factual claims, data points, or external references in the STUDENT ESSAY that are not present in the GROUND TRUTH SOURCE...",
  },
  voice: {
    title: "3. Detect Style Inconsistency (Over-Dependence)",
    prompt:
      "Analyze the writing style of the STUDENT ESSAY. Identify three distinct sentences or phrases that are significantly more verbose...",
  },
} as const;

type PromptKey = keyof typeof promptRecipes;

const exponentialBackoffFetch = async (
  url: string,
  options: RequestInit,
  retries = 0
): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429 && retries < MAX_RETRIES) {
        const delay = Math.pow(2, retries) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        return exponentialBackoffFetch(url, options, retries + 1);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      const delay = Math.pow(2, retries) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return exponentialBackoffFetch(url, options, retries + 1);
    }
    throw new Error("API call failed after multiple retries.");
  }
};

const Essay: React.FC = () => {
  const [groundTruth, setGroundTruth] = useState("");
  const [studentEssay, setStudentEssay] = useState("");
  const [promptKey, setPromptKey] = useState<PromptKey | "">("");
  const [output, setOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const wordCountGT = groundTruth.trim().split(/\s+/).filter(Boolean).length;
  const charCountGT = groundTruth.length;
  const wordCountSE = studentEssay.trim().split(/\s+/).filter(Boolean).length;
  const charCountSE = studentEssay.length;

  useEffect(() => {
    if (firebaseConfig) console.log("Firebase config detected.");
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!groundTruth || !studentEssay || !promptKey) {
      setOutput(
        `<div class="p-4 bg-red-100 text-red-700 rounded-lg">
          Please provide both texts and select an analysis type.
        </div>`
      );
      return;
    }

    setIsLoading(true);
    setOutput(null);

    const selectedPrompt = promptRecipes[promptKey].prompt;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

    const fullPrompt = `
You are an academic verifier. Compare:
--- SOURCE ---
${groundTruth}
--- ESSAY ---
${studentEssay}
--- TASK ---
${selectedPrompt}`;

    const payload = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      systemInstruction: {
        parts: [{ text: "Be concise but academically detailed." }],
      },
      config: { temperature: 0.1 },
    };

    try {
      const response = await exponentialBackoffFetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      const text =
        result.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Error: No analysis returned.";

      setOutput(
        `<h3 class="text-xl font-semibold mb-2 text-primary">${promptRecipes[promptKey].title}</h3>
         <div class="p-4 bg-white border border-gray-200 rounded-lg whitespace-pre-wrap">${text}</div>`
      );
    } catch (error: unknown) {
      console.error("Analysis failed:", error);
      setOutput(
        `<div class="p-4 bg-red-100 text-red-700 rounded-lg">
          Failed to run analysis.
        </div>`
      );
    } finally {
      setIsLoading(false);
    }
  }, [groundTruth, studentEssay, promptKey]);

  const handleUpload =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setter(reader.result as string);
      reader.readAsText(file);
    };

  const renderOutput = () => (
    <AnimatePresence mode='wait'>
      {output ? (
        <motion.div
          key='output'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className='mt-8'
          dangerouslySetInnerHTML={{ __html: output }}
        />
      ) : (
        <motion.div
          key='placeholder'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='p-6 mt-10 bg-primary/10 rounded-xl text-center border-dashed border-2 border-primary'
        >
          Analysis results will appear here after execution.
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className='p-8 bg-gradient-to-b from-gray-50 to-gray-100 full-h-screen flex flex-col'>
      <div className='text-center'>
        <motion.h1
          className='text-3xl font-extrabold text-primary tracking-tight'
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Essay Management
        </motion.h1>
      </div>

      <motion.div
        className='mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {[
          {
            label: "1. Ground Truth Source",
            value: groundTruth,
            setter: setGroundTruth,
            id: "groundTruth",
          },
          {
            label: "2. Student Essay",
            value: studentEssay,
            setter: setStudentEssay,
            id: "studentEssay",
          },
        ].map((field) => (
          <motion.div
            key={field.id}
            className='bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <label
              htmlFor={field.id}
              className='text-sm font-semibold text-gray-700 mb-2'
            >
              {field.label}
            </label>
            <textarea
              id={field.id}
              rows={8}
              className='flex-grow p-3 rounded-lg text-sm leading-relaxed resize-none mb-2 outline-none transition'
              placeholder='Type or paste your text here...'
              value={field.value}
              onChange={(e) => field.setter(e.target.value)}
            />
            <div className='flex justify-between items-center text-sm text-gray-500 mb-2'>
              <span>
                {field.id === "groundTruth"
                  ? `${wordCountGT} Words ${charCountGT} Characters`
                  : `${wordCountSE} Words ${charCountSE} Characters`}
              </span>

              <label className='flex items-center space-x-2 px-3 py-1 bg-white rounded-lg hover:bg-gray-100 cursor-pointer transition'>
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'
                  />
                </svg>
                <span>Upload</span>
                <input
                  type='file'
                  accept='.txt'
                  className='hidden'
                  onChange={handleUpload(field.setter)}
                />
              </label>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className='mt-4 flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-lg shadow-lg'
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className='w-full sm:w-2/3 mb-2 sm:mb-0'>
          <label
            htmlFor='promptSelect'
            className='block text-sm font-bold text-gray-700 mb-1'
          >
            3. Select Verification Prompt
          </label>
          <select
            id='promptSelect'
            className='w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm outline-none'
            value={promptKey}
            onChange={(e) => setPromptKey(e.target.value as PromptKey)}
          >
            <option value='' disabled>
              Choose analysis type...
            </option>
            {Object.keys(promptRecipes).map((key) => (
              <option key={key} value={key}>
                {promptRecipes[key as PromptKey].title}
              </option>
            ))}
          </select>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.9 }}
          onClick={runAnalysis}
          disabled={isLoading}
          className='w-full sm:w-1/3 px-4 py-3 bg-primary text-white font-semibold rounded-lg shadow hover:bg-primary-200 transition disabled:opacity-50 sm:ml-4'
        >
          {isLoading ? "Analyzing..." : "Run Analysis"}
        </motion.button>
      </motion.div>
      <div className='flex-grow'>{renderOutput()}</div>
    </div>
  );
};

export default Essay;
