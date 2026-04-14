import React from "react";
import { motion } from "framer-motion";
import { Clock, BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import ProgressBar from "../ui/ProgressBar";
import type { Essay } from "../../types/Essay";

interface EssayCardProps {
  essay: Essay;
  onClick?: () => void;
  onAnalyze?: () => void;
  showStudent?: boolean;
}

const EssayCard: React.FC<EssayCardProps> = ({
  essay,
  onClick,
  onAnalyze,
  showStudent = true,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted": return "warning";
      case "analyzed": return "info";
      case "reviewed": return "success";
      default: return "neutral";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "error";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card 
        variant="glass" 
        hover={!!onClick} 
        onClick={onClick} 
        className="h-full border-white/40 flex flex-col p-0 overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-500"
      >
        <div className="p-6 flex flex-col h-full space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-neutral-900 truncate tracking-tight group-hover:text-primary transition-colors">
                {essay.title}
              </h3>
              {showStudent && (
                <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                  <div className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-black text-neutral-500 flex-shrink-0">ID</div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest truncate">
                    {essay.student_id}
                  </p>
                </div>
              )}
            </div>
            <Badge 
              variant={getStatusColor(essay.status)} 
              size="sm" 
              className="rounded-lg px-2.5 py-1 font-black text-[10px] uppercase tracking-widest shadow-sm"
            >
              {essay.status}
            </Badge>
          </div>

          {/* Content Preview */}
          <div className="text-[13px] text-neutral-500 font-medium line-clamp-3 leading-relaxed flex-1">
            {essay.content.substring(0, 150)}...
          </div>

          {/* Scores - Prominent View */}
          {essay.overall_score !== undefined ? (
            <div className="space-y-3 bg-white/40 rounded-2xl p-4 border border-white/50 shadow-inner">
               <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  Academic Quotient
                </span>
                <span className="text-xl font-black text-neutral-900 leading-none">
                  {Math.round(essay.overall_score)}<span className="text-sm text-neutral-400 ml-0.5">%</span>
                </span>
              </div>
              <ProgressBar
                value={essay.overall_score}
                color={getScoreColor(essay.overall_score)}
                size="sm"
                className="h-1.5 rounded-full"
              />
              
              {essay.status === "analyzed" && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {essay.grammar_score !== undefined && (
                    <div className="flex items-center gap-2">
                       <BookOpen className="w-3.5 h-3.5 text-primary/60" />
                       <div className="min-w-0">
                          <p className="text-[9px] font-black text-neutral-400 uppercase leading-none">Grammar</p>
                          <p className="text-[11px] font-black">{Math.round(essay.grammar_score)}</p>
                       </div>
                    </div>
                  )}
                  {essay.readability_score !== undefined && (
                    <div className="flex items-center gap-2">
                       <TrendingUp className="w-3.5 h-3.5 text-success-default/60" />
                       <div className="min-w-0">
                          <p className="text-[9px] font-black text-neutral-400 uppercase leading-none">Readability</p>
                          <p className="text-[11px] font-black">{Math.round(essay.readability_score)}</p>
                       </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
             <div className="p-4 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200 text-center">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Awaiting Analysis</p>
             </div>
          )}

          {/* Issues Count */}
          {essay.grammar_errors && essay.grammar_errors.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-error-50/50 border border-error-100/50 rounded-xl w-fit">
              <AlertCircle className="w-3.5 h-3.5 text-error-default" />
              <span className="text-[10px] font-black text-error-default uppercase tracking-tight">
                {essay.grammar_errors.length} Anomalies Detected
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100/60">
            <div className="flex items-center gap-2 text-neutral-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-tight">{formatDate(essay.submitted_at)}</span>
            </div>

            {essay.status === "submitted" && onAnalyze ? (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyze();
                }}
                className="px-5 py-2 text-[10px] font-black text-primary bg-primary-50 rounded-xl hover:bg-primary-600 hover:text-white transition-all duration-300 uppercase tracking-widest shadow-sm hover:shadow-lg hover:shadow-primary/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Launch Analysis
              </motion.button>
            ) : (
                <div className="p-1 px-3 bg-neutral-100 rounded-lg">
                   <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Verified</p>
                </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default EssayCard;
