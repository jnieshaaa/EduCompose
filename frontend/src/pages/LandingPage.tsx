import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

// Layout Components
import HeaderPublic from "../components/landing/HeaderPublic";
import AuthModal from "../components/LoginModal";
import Footer from "../components/landing/Footer";

// Section Components
import HeroSection from "../components/landing/HeroSection";
import ChallengeSection from "../components/landing/ChallengeSection";
import SolutionSection from "../components/landing/SolutionSection";
import TechnologySection from "../components/landing/TechnologySection";
import ImpactSection from "../components/landing/ImpactSection";
import { KnowledgeGraphSimulation } from "../components/landing/KnowledgeGraphSimulation";

/**
 * LandingPage
 * The main entryway for Laguna University students and faculty.
 * This page is modularized into specialized section components.
 */
const LandingPage: React.FC = () => {
  const location = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  const [activeTechStep, setActiveTechStep] = useState<"nlp" | "kg" | "llm" | null>(null);

  // Handle Login Modal state from navigation
  useEffect(() => {
    if (location.state?.from) setShowLogin(true);
  }, [location.state]);

  // Smooth scroll helper
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white selection:bg-primary selection:text-white">
      {/* Navigation Overlay */}
      <HeaderPublic onLoginClick={() => setShowLogin(true)} />
      {showLogin && <AuthModal onClose={() => setShowLogin(false)} />}

      <HeroSection 
        onGetStarted={() => setShowLogin(true)} 
        onLearnMore={() => scrollTo("challenge")}
      />

      <main className="relative">
        <ChallengeSection />

        <SolutionSection />

        <TechnologySection 
          activeStep={activeTechStep}
          onStepClick={setActiveTechStep}
        />

        {/* Visualizer Section */}
        <section id="visualization" className="py-24 bg-slate-50 border-y border-slate-100">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
                Visualizing Semantic Connections
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                EduCompose's underlying logic maps the relationships between 
                concepts, ensuring structural integrity in student writing.
              </p>
            </div>
            <div className="max-w-5xl mx-auto bg-white p-4 rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-white">
              <KnowledgeGraphSimulation />
            </div>
          </div>
        </section>

        <ImpactSection />

        <Footer />
      </main>
    </div>
  );
};

export default LandingPage;
