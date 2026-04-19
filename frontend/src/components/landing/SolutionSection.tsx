import React from "react";
import { motion } from "framer-motion";

const SolutionSection: React.FC = () => {
  const cards = [
    {
      emoji: "🎯",
      title: "Augment, Not Automate",
      desc: "The system identifies potential areas for improvement. Final feedback and guidance always come from the teacher.",
      color: "bg-slate-50 border-slate-200"
    },
    {
      emoji: "🚀",
      title: "Enhance Efficiency",
      desc: "By automating mechanics, readability, and flow checks, EduCompose saves teachers hours of grading time.",
      color: "bg-primary/5 border-primary/20 ring-1 ring-primary/20"
    },
    {
      emoji: "🎓",
      title: "Educational Value",
      desc: "We ensure students receive authentic feedback, supporting the teacher-student relationship.",
      color: "bg-slate-50 border-slate-200"
    }
  ];

  return (
    <section id="solution" className="py-24 bg-slate-50/50">
      <div className="container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            Our Solution: A Teacher-Centered Approach
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto mb-16">
            EduCompose is an analytical partner for educators, designed to 
            enhance expertise and streamline the review workflow.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              className={`${card.color} p-8 rounded-3xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-2 text-left`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="text-4xl mb-6">{card.emoji}</div>
              <h3 className="text-xl font-bold text-slate-800 mb-4">
                {card.title}
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
