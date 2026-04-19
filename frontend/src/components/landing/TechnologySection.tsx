import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView, useAnimation } from "framer-motion";

interface TechDetailsProps {
  activeStep: "nlp" | "kg" | "llm" | null;
  onStepClick: (step: "nlp" | "kg" | "llm") => void;
}

const TechnologySection: React.FC<TechDetailsProps> = ({
  activeStep,
  onStepClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isTechStepsInView = useInView(containerRef, { amount: 0.3 });
  
  const techStep1Controls = useAnimation();
  const techStep2Controls = useAnimation();
  const techStep3Controls = useAnimation();
  const techStep4Controls = useAnimation();

  useEffect(() => {
    if (isTechStepsInView) {
      techStep1Controls.start({ scale: 1, opacity: 1, transition: { delay: 0 } });
      techStep2Controls.start({ scale: 1, opacity: 1, transition: { delay: 0.1 } });
      techStep3Controls.start({ scale: 1, opacity: 1, transition: { delay: 0.2 } });
      techStep4Controls.start({ scale: 1, opacity: 1, transition: { delay: 0.3 } });
    } else {
      const reset = { scale: 1.1, opacity: 0 };
      techStep1Controls.set(reset);
      techStep2Controls.set(reset);
      techStep3Controls.set(reset);
      techStep4Controls.set(reset);
    }
  }, [isTechStepsInView, techStep1Controls, techStep2Controls, techStep3Controls, techStep4Controls]);

  const steps = [
    { id: "nlp", title: "1. NLP Analysis", sub: "Grammar & Readability", controls: techStep1Controls },
    { id: "kg", title: "2. Knowledge Graph", sub: "Coherence & Argument", controls: techStep2Controls },
    { id: "llm", title: "3. Insight Generation", sub: "Synthesis with LLMs", controls: techStep3Controls },
    { id: "report", title: "4. Teacher Report", sub: "Actionable Insights", controls: techStep4Controls, dashed: true },
  ];

  return (
    <section id="tech" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            How It Works: The Technology Stack
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            EduCompose integrates multiple AI layers to perform a 
            multi-dimensional analysis of student essays.
          </p>
        </div>

        <div
          ref={containerRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 max-w-6xl mx-auto"
        >
          {steps.map((step) => (
            <motion.div
              key={step.id}
              onClick={() => step.id !== "report" && onStepClick(step.id as any)}
              animate={step.controls}
              className={`p-6 border-2 rounded-2xl transition-all duration-300 ${
                step.dashed ? "border-dashed border-slate-200 bg-slate-50 opacity-60" : 
                activeStep === step.id 
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]" 
                  : "border-slate-100 hover:border-primary/30 cursor-pointer"
              }`}
            >
              <h4 className="font-bold text-slate-800">{step.title}</h4>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">
                {step.sub}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 max-w-5xl mx-auto border border-slate-100 min-h-[400px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <AnimatePresence mode="wait">
            {!activeStep ? (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center py-12"
              >
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                  👆
                </div>
                <p className="text-slate-400 font-medium italic">Click a step above to explore the technology</p>
              </motion.div>
            ) : (
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeStep === "nlp" && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-slate-900 border-l-4 border-primary pl-4">
                      Foundational NLP Layer
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-lg">
                      We use established libraries to perform "surface-level" checks, 
                      identifying objective issues in writing mechanics.
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="font-bold text-slate-800 mb-2">Grammar & Syntax</h4>
                        <p className="text-sm text-slate-500">Identifying complex phrasing issues and grammatical inconsistencies.</p>
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="font-bold text-slate-800 mb-2">Readability Metrics</h4>
                        <p className="text-sm text-slate-500">Calculating Flesch-Kincaid and other complexity scores.</p>
                      </div>
                    </div>
                  </div>
                )}
                {activeStep === "kg" && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-slate-900 border-l-4 border-primary pl-4">
                      Knowledge Graph & Logic
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-lg">
                      This layer moves beyond surface-level text to understand the 
                      logical structure and semantic connections within the essay.
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="font-bold text-slate-800 mb-2">Entity Mapping</h4>
                        <p className="text-sm text-slate-500">Visualizing how concepts are linked throughout the student's argument.</p>
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="font-bold text-slate-800 mb-2">Coherence Detection</h4>
                        <p className="text-sm text-slate-500">Measuring how effectively the student transitions between different points.</p>
                      </div>
                    </div>
                  </div>
                )}
                {activeStep === "llm" && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-slate-900 border-l-4 border-primary pl-4">
                      LLM-Driven Insights
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-lg">
                      Our final processing stage uses Large Language Models to 
                      synthesize lower-level findings into human-readable insights.
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="font-bold text-slate-800 mb-2">Feedback Synthesis</h4>
                        <p className="text-sm text-slate-500">Transforming technical data into narrative points the teacher can use.</p>
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="font-bold text-slate-800 mb-2">Dimension Analysis</h4>
                        <p className="text-sm text-slate-500">Evaluating the essay against specific rubric criteria you define.</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default TechnologySection;
