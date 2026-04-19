import { BookOpen, Info, CheckCircle, Target, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const rubricData = {
  name: 'Standard Essay Guide',
  description: 'These rules help us score your essay fairly across different parts of your writing.',
  appliedTo: 'Computer Science 101 - Section A',
  criteria: [
    {
      name: 'Grammar',
      weight: 20,
      scoreRange: '0-100',
      description: 'Correct spelling, periods, and commas.',
      yourScore: 92,
      levels: [
        { range: '90-100', label: 'Amazing', description: 'Almost no mistakes at all!' },
        { range: '80-89', label: 'Great', description: 'Very few minor mistakes.' },
        { range: '70-79', label: 'Good', description: 'Some mistakes, but still easy to read.' },
        { range: '60-69', label: 'Fair', description: 'Many mistakes that make it hard to read.' },
        { range: '0-59', label: 'Needs Work', description: 'Too many mistakes to understand clearly.' },
      ]
    },
    {
      name: 'Smoothness',
      weight: 20,
      scoreRange: '0-100',
      description: 'How well your story flows from one idea to the next.',
      yourScore: 85,
      levels: [
        { range: '90-100', label: 'Amazing', description: 'Your ideas flow perfectly together.' },
        { range: '80-89', label: 'Great', description: 'Easy to follow with good transitions.' },
        { range: '70-79', label: 'Good', description: 'Most parts connect well.' },
        { range: '60-69', label: 'Fair', description: 'A bit jumpy; hard to follow sometimes.' },
        { range: '0-59', label: 'Needs Work', description: 'Ideas feel disconnected.' },
      ]
    },
    {
      name: 'Strong Ideas',
      weight: 25,
      scoreRange: '0-100',
      description: 'How clear and convincing your points are.',
      yourScore: 80,
      levels: [
        { range: '90-100', label: 'Amazing', description: 'Very strong points with great examples.' },
        { range: '80-89', label: 'Great', description: 'Clear points with good support.' },
        { range: '70-79', label: 'Good', description: 'Good points, but could use more details.' },
        { range: '60-69', label: 'Fair', description: 'Points are okay but a bit weak.' },
        { range: '0-59', label: 'Needs Work', description: 'No clear point or goal.' },
      ]
    },
    {
      name: 'Word Choice',
      weight: 15,
      scoreRange: '0-100',
      description: 'Using a good variety of different words.',
      yourScore: 88,
      levels: [
        { range: '90-100', label: 'Amazing', description: 'Used excellent, precise words.' },
        { range: '80-89', label: 'Great', description: 'Used a good variety of words.' },
        { range: '70-79', label: 'Good', description: 'Words are okay; a bit repetitive.' },
        { range: '60-69', label: 'Fair', description: 'Used very basic or simple words.' },
        { range: '0-59', label: 'Needs Work', description: 'Many repeated or wrong words.' },
      ]
    },
    {
      name: 'Order',
      weight: 15,
      scoreRange: '0-100',
      description: 'Having a clear start, middle, and end.',
      yourScore: 82,
      levels: [
        { range: '90-100', label: 'Amazing', description: 'Perfectly organized into sections.' },
        { range: '80-89', label: 'Great', description: 'Well-organized with clear parts.' },
        { range: '70-79', label: 'Good', description: 'Has a basic order.' },
        { range: '60-69', label: 'Fair', description: 'Order is a bit confusing.' },
        { range: '0-59', label: 'Needs Work', description: 'No clear order at all.' },
      ]
    },
    {
      name: 'Originality',
      weight: 5,
      scoreRange: '0-100',
      description: 'Using your own words and quoting fairly.',
      yourScore: 95,
      levels: [
        { range: '90-100', label: 'Amazing', description: 'Entirely your own work!' },
        { range: '80-89', label: 'Great', description: 'Mostly your own work.' },
        { range: '70-79', label: 'Good', description: 'Some parts feel like other work.' },
        { range: '60-69', label: 'Fair', description: 'Copied too many parts.' },
        { range: '0-59', label: 'Needs Work', description: 'Too much copying detected.' },
      ]
    },
  ]
};

export function RubricTab() {
  const getCriteriaColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 80) return 'text-primary';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 px-1">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">Grading Rules</h1>
          <p className="text-sm font-medium text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <BookOpen size={14} className="text-primary/50" />
            How your work is scored
          </p>
        </div>
      </div>

      {/* Main Intro Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-xl shadow-neutral-900/5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full translate-x-8 -translate-y-8" />
        <div className="flex items-start gap-4 relative z-10">
          <div className="p-4 bg-primary/10 rounded-2xl">
            <Info className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900 mb-1">{rubricData.name}</h2>
            <p className="text-sm font-medium text-neutral-500 leading-relaxed max-w-2xl mb-4">
              {rubricData.description}
            </p>
            <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-3 py-1 bg-neutral-50 w-fit rounded-lg">
               <Target size={12} className="text-primary/40" />
               For: {rubricData.appliedTo}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Criteria Overview List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rubricData.criteria.map((criterion, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-6 bg-white rounded-3xl border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group border-l-4 ${criterion.yourScore! >= 90 ? 'border-l-emerald-500' : 'border-l-primary/20'}`}
          >
            <div className="flex items-start justify-between mb-4">
               <div>
                 <div className="flex items-center gap-2 mb-1">
                   <h3 className="text-sm font-bold text-neutral-800 tracking-tight">{criterion.name}</h3>
                   <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-50 px-2 py-0.5 rounded">
                     {criterion.weight}%
                   </span>
                 </div>
                 <p className="text-xs text-neutral-400 font-medium">{criterion.description}</p>
               </div>
               <div className="text-right">
                  <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest mb-0.5">Your Score</p>
                  <p className={`text-2xl font-bold tracking-tighter ${getCriteriaColor(criterion.yourScore)}`}>
                    {criterion.yourScore}%
                  </p>
               </div>
            </div>
            
            <div className="h-1.5 w-full bg-neutral-50 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${criterion.yourScore}%` }}
                 transition={{ duration: 1, delay: 0.2 }}
                 className={`h-full rounded-full ${criterion.yourScore! >= 90 ? 'bg-emerald-500' : 'bg-primary'}`}
               />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detailed Levels Section */}
      <div className="space-y-8 pt-8 border-t border-neutral-100">
        <div className="px-1">
           <h3 className="text-xl font-bold text-neutral-900 tracking-tight">Score Details</h3>
           <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">See what counts for each score level</p>
        </div>

        <div className="space-y-12">
          {rubricData.criteria.map((criterion, idx) => (
            <div key={idx} className="space-y-5">
              <div className="flex items-end gap-3 px-1">
                 <h4 className="text-lg font-bold text-neutral-900 leading-none">{criterion.name}</h4>
                 <div className="h-px flex-1 bg-neutral-50" />
                 <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{criterion.weight}% Importance</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {criterion.levels.map((level, levelIdx) => {
                  const isUserLevel = criterion.yourScore && 
                                      parseInt(level.range.split('-')[0]) <= criterion.yourScore &&
                                      criterion.yourScore <= parseInt(level.range.split('-')[1]);
                  
                  return (
                    <motion.div
                      key={levelIdx}
                      whileHover={{ scale: 1.02 }}
                      className={`
                        p-5 rounded-3xl border-2 transition-all flex flex-col justify-between
                        ${isUserLevel 
                          ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5' 
                          : 'bg-white border-neutral-50 hover:border-neutral-200'}
                      `}
                    >
                      <div className="mb-4">
                        <div className={`flex items-center justify-between mb-2`}>
                           <span className={`text-[10px] font-bold uppercase tracking-widest ${isUserLevel ? 'text-primary' : 'text-neutral-300'}`}>
                             {level.range}%
                           </span>
                           {isUserLevel && <CheckCircle size={14} className="text-primary" />}
                        </div>
                        <h5 className={`text-xs font-bold uppercase tracking-tight mb-2 ${isUserLevel ? 'text-primary' : 'text-neutral-800'}`}>
                          {level.label}
                        </h5>
                        <p className={`text-[11px] leading-relaxed ${isUserLevel ? 'text-primary/70 font-medium' : 'text-neutral-500 font-medium italic'}`}>
                          {level.description}
                        </p>
                      </div>

                      {isUserLevel && (
                        <div className="mt-2 text-[8px] font-bold text-primary uppercase tracking-widest text-right">
                          You are here
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guide Box */}
      <div className="bg-neutral-900 p-8 rounded-[3rem] shadow-2xl shadow-neutral-900/20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] translate-x-20 -translate-y-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
           <div className="p-5 bg-white/10 rounded-[2rem] shrink-0">
             <Zap size={48} className="text-primary fill-primary/20" />
           </div>
           
           <div className="flex-1 space-y-4 text-center md:text-left">
              <h3 className="text-2xl font-bold tracking-tight">How to use these rules</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium opacity-70">
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0" />
                  Each part is scored alone then added up for your total.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0" />
                  Try to improve the parts with the lowest scores first.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0" />
                  The AI uses these same rules to give you tips.
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0" />
                  Your teacher will also check if you followed these rules.
                </li>
              </ul>
           </div>
           
           <button className="bg-white text-neutral-900 px-8 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl shadow-white/5 group shrink-0">
              Got it
              <ArrowRight size={14} className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    </div>
  );
}
