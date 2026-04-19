import React from "react";
import { motion } from "framer-motion";

const ImpactSection: React.FC = () => {
  return (
    <section id="impact" className="bg-slate-50/50 py-24">
      <div className="container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Overall Impact</h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto mb-16">
            EduCompose aims to make a meaningful contribution to **Laguna University's** 
            academic excellence by bridging the gap between advanced AI and the practical needs of our classrooms.
          </p>
        </motion.div>

        <motion.div
          className="max-w-4xl mx-auto bg-white p-12 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden mb-12"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px]"></div>

          <p className="text-xl md:text-2xl leading-relaxed text-slate-700 italic font-medium">
            "By empowering teachers with deeper insights into student
            writing, we foster a future where technology serves as a 
            powerful assistant to educators—enhancing their ability to provide the 
            personalized, high-quality feedback essential for student growth."
          </p>
        </motion.div>

        {/* Target Respondents */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-sm text-slate-400 max-w-2xl mx-auto grid grid-cols-2 gap-8 pt-8 border-t border-slate-100"
        >
        </motion.div>
      </div>
    </section>
  );
};

export default ImpactSection;
