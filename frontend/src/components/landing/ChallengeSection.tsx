import React, { useRef, useEffect } from "react";
import { motion, useInView, useAnimation } from "framer-motion";
import Chart from "chart.js/auto";

interface ChallengeSectionProps {}

const ChallengeSection: React.FC<ChallengeSectionProps> = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart<"doughnut"> | null>(null);
  
  // Animation Controls
  const containerRef = useRef<HTMLDivElement>(null);
  const isChallengeInView = useInView(containerRef, { amount: 0.3 });
  
  const titleControls = useAnimation();
  const item1Controls = useAnimation();
  const item2Controls = useAnimation();
  const item3Controls = useAnimation();
  const chartScaleControls = useAnimation();

  useEffect(() => {
    if (isChallengeInView) {
      titleControls.start({ opacity: 1, x: 0 });
      item1Controls.start({ opacity: 1, x: 0, transition: { delay: 0.1 } });
      item2Controls.start({ opacity: 1, x: 0, transition: { delay: 0.2 } });
      item3Controls.start({ opacity: 1, x: 0, transition: { delay: 0.3 } });
      chartScaleControls.start({ scale: 1, opacity: 1, transition: { duration: 0.4 } });
    } else {
      titleControls.set({ opacity: 0, x: -50 });
      item1Controls.set({ opacity: 0, x: -30 });
      item2Controls.set({ opacity: 0, x: -30 });
      item3Controls.set({ opacity: 0, x: -30 });
      chartScaleControls.set({ scale: 0.9, opacity: 0 });
    }
  }, [isChallengeInView, titleControls, item1Controls, item2Controls, item3Controls, chartScaleControls]);

  useEffect(() => {
    const ctx = chartRef.current?.getContext("2d");
    if (!ctx || !isChallengeInView) return;

    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    chartInstanceRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Grading & Feedback", "Lesson Planning", "Instruction", "Administrative"],
        datasets: [{
          data: [45, 25, 20, 10],
          backgroundColor: ["#0791b2", "#0e7490", "#67e8f9", "#a5f3fc"],
          borderColor: "#FFFFFF",
          borderWidth: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { position: "bottom", labels: { font: { family: "'Inter', sans-serif", size: 10 } } },
        },
      },
    });

    return () => chartInstanceRef.current?.destroy();
  }, [isChallengeInView]);

  return (
    <section id="challenge" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            The LU Challenge: An Unsustainable Workload
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Essay evaluation is crucial for student growth at Laguna University, but the 
            immense workload on faculty makes personalized feedback a significant challenge.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div ref={containerRef}>
            <motion.h3
              className="text-2xl font-bold text-slate-800 mb-8"
              animate={titleControls}
            >
              The Gap in Current Tools
            </motion.h3>
            <ul className="space-y-6">
              {[
                {
                  title: "Student-Facing Focus",
                  desc: "Tools like Grammarly can risk over-reliance, bypassing the teacher's instructional role.",
                  controls: item1Controls,
                },
                {
                  title: "Surface-Level Feedback",
                  desc: "Most tools fail to analyze higher-order skills like argument strength and coherence.",
                  controls: item2Controls,
                },
                {
                  title: "Lack of Insight",
                  desc: "Existing software doesn't provide class-wide analytics for targeted instruction.",
                  controls: item3Controls,
                },
              ].map((item, i) => (
                <motion.li
                  key={i}
                  className="flex gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/30 transition-colors"
                  animate={item.controls}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <strong className="block text-slate-800 mb-1">{item.title}</strong>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>

          <motion.div
            animate={chartScaleControls}
            className="relative"
          >
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 text-center mb-6">
                Teacher Time Allocation per Essay Batch
              </h3>
              <div className="relative h-[350px] w-full">
                <canvas ref={chartRef}></canvas>
              </div>
              <p className="text-center text-sm text-slate-500 mt-8 italic">
                EduCompose allows LU teachers to shift focus from repetitive 
                error-checking to high-impact mentoring.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ChallengeSection;
