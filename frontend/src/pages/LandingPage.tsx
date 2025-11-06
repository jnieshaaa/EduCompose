import React, { useState } from "react";
import { Upload, FileText, Zap, Shield, Users } from "lucide-react";
import { motion } from "framer-motion";
import HeaderPublic from "../components/HeaderPublic";
import AuthModal from "../components/LoginModal";
import InlineAnalysisResults from "../components/essay/InlineAnalysisResults";
import { analysisApi } from "../api";
import type { AnalysisResponse } from "../types/Essay";

const LandingPage: React.FC = () => {
  const [text, setText] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [analysis, setAnalysis] = useState<Omit<AnalysisResponse, "essay_id"> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const charCount = text.length;

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError("Please enter some text to analyze");
      return;
    }
    
    const currentWordCount = text.trim().split(/\s+/).length;
    if (currentWordCount < 200) {
      setError(`Your essay has ${currentWordCount} words. Please add at least ${200 - currentWordCount} more words for analysis.`);
      return;
    }
    
    // Reset previous results
    setAnalysis(null);
    setError(null);
    setLoading(true);
    
    try {
      const result = await analysisApi.analyzeText(text, "Essay Analysis", "comprehensive");
      setAnalysis(result as any);
      
      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById("analysis-results");
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze essay";
      setError(errorMessage);
      console.error("Error analyzing essay:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    handleAnalyze();
  };

  const handleCloseResults = () => {
    setAnalysis(null);
    setError(null);
  };

  const features = [
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      title: "AI-Powered Analysis",
      description: "Advanced NLP algorithms analyze essays with precision",
    },
    {
      icon: <Shield className="w-8 h-8 text-primary" />,
      title: "Secure & Private",
      description: "Your data is protected with enterprise-grade security",
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Teacher-Friendly",
      description: "Designed specifically for educators and students",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <HeaderPublic onLoginClick={() => setShowLogin(true)} />
      {showLogin && <AuthModal onClose={() => setShowLogin(false)} />}

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="p-8 pb-20 mb-20 px-4"
      >
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <h1 className="mb-5">
              <span className="text-5xl md:text-6xl font-bold bg-primary-200 bg-clip-text text-transparent mb-6">
                Edu
              </span>
              <span className="text-5xl md:text-6xl font-bold bg-neutral-600 bg-clip-text text-transparent mb-6">
                Compose
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-neutral-600 max-w-3xl mx-auto mb-5 leading-relaxed">
              Transform your writing with AI-powered essay analysis and
              feedback. Perfect for educators and students.
            </p>
          </motion.div>

          {/* Main Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl mx-auto mb-12"
          >
            <div className="relative mb-4">
              <textarea
                placeholder="Paste your essay here to get started..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full min-h-[200px] max-h-[600px] border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-y outline-none text-lg leading-relaxed px-2 py-3"
                style={{ 
                  resize: 'vertical',
                  overflowY: 'auto'
                }}
              />
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-neutral-100">
              <div className="text-gray-500 px-3 py-2 rounded text-sm">
                {wordCount} Words {charCount} Characters
              </div>

              <div className="flex gap-3">
                <label className="bg-neutral-300/30 hover:bg-neutral-300/60 text-gray-700 font-semibold px-6 py-2.5 rounded-full transition-all duration-300 cursor-pointer flex items-center gap-2 text-sm">
                  <Upload className="w-4 h-4" />
                  Upload
                  <input
                    type="file"
                    accept=".txt,.doc,.docx"
                    className="hidden"
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
                  className="bg-primary text-white font-semibold px-6 py-2.5 rounded-full transition-all duration-300 transform hover:scale-105 hover:bg-primary-600 shadow-lg flex items-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Analyze Essay
                </button>
              </div>
            </div>
          </motion.div>

          {/* Analysis Results */}
          {(loading || analysis || error) && (
            <div id="analysis-results" className="w-full mt-12 mb-16">
              <InlineAnalysisResults
                analysis={analysis}
                loading={loading}
                error={error}
                onRetry={handleRetry}
                onClose={handleCloseResults}
              />
            </div>
          )}

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className={`grid md:grid-cols-3 gap-8 max-w-5xl mx-auto ${(loading || analysis || error) ? 'mt-0' : 'mt-12'}`}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                whileHover={{
                  y: -12,
                  transition: { type: "spring", stiffness: 400, damping: 20 },
                }}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col items-center text-center">
                  {feature.icon}
                  <h3 className="text-xl font-semibold text-neutral-600 mt-4 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white pt-8 pb-1">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">EduCompose</h3>
              <p className="text-neutral-400">
                AI-powered essay analysis for educators and students.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-neutral-400">
                <li>Essay Analysis</li>
                <li>Grammar Check</li>
                <li>Plagiarism Detection</li>
                <li>Feedback Generation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-neutral-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Documentation</li>
                <li>API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-neutral-400">
                <li>About</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Blog</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-600 mt-8 pt-1 text-center text-neutral-400">
            <p>&copy; 2025 EduCompose | Team Nonchalant.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
