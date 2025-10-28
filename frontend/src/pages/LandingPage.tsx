import React, { useState } from "react";
import { Upload, FileText, Zap, Shield, Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import HeaderPublic from "../components/HeaderPublic";
import AuthModal from "../components/LoginModal";

const LandingPage: React.FC = () => {
  const [text, setText] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const charCount = text.length;

  const handleAnalyze = () => {
    if (!text.trim()) return;
    navigate("/Dashboard", { state: { essayText: text } });
  };

  const features = [
    {
      icon: <Zap className="w-8 h-8 text-purple-600" />,
      title: "AI-Powered Analysis",
      description: "Advanced NLP algorithms analyze essays with precision",
    },
    {
      icon: <Shield className="w-8 h-8 text-blue-600" />,
      title: "Secure & Private",
      description: "Your data is protected with enterprise-grade security",
    },
    {
      icon: <Users className="w-8 h-8 text-green-600" />,
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
        className="pt-20 pb-16 px-4"
      >
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
              EduCompose
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Transform your writing with AI-powered essay analysis and
              feedback. Perfect for educators and students.
            </p>
          </motion.div>

          {/* Main Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto mb-12"
          >
            <div className="relative">
              <textarea
                placeholder="Paste your essay here to get started..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-64 border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none outline-none text-lg leading-relaxed"
              />

              {/* Word Count */}
              <div className="absolute bottom-4 left-4 text-sm text-gray-500 bg-white px-2 py-1 rounded">
                {wordCount} words • {charCount} characters
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <button
                onClick={handleAnalyze}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Analyze Essay
                <ArrowRight className="w-4 h-4" />
              </button>

              <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-8 py-3 rounded-full transition-all duration-300 cursor-pointer flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload File
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
            </div>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex flex-col items-center text-center">
                  {feature.icon}
                  <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="bg-white py-16"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">
                10K+
              </div>
              <div className="text-gray-600">Essays Analyzed</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                500+
              </div>
              <div className="text-gray-600">Teachers</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">
                95%
              </div>
              <div className="text-gray-600">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2">
                24/7
              </div>
              <div className="text-gray-600">Support</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="bg-gradient-to-r from-purple-600 to-blue-600 py-16"
      >
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to transform your writing?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join thousands of educators using EduCompose to enhance their
            teaching.
          </p>
          <button
            onClick={() => setShowLogin(true)}
            className="bg-white text-purple-600 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Get Started Free
          </button>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">EduCompose</h3>
              <p className="text-gray-400">
                AI-powered essay analysis for educators and students.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Essay Analysis</li>
                <li>Grammar Check</li>
                <li>Plagiarism Detection</li>
                <li>Feedback Generation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Documentation</li>
                <li>API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Blog</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 EduCompose. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
