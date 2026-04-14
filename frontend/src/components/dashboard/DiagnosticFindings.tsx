import React from "react";
import { 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  GraduationCap
} from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { motion } from "framer-motion";

interface Finding {
  id: string;
  type: "performance" | "deadline" | "system" | "plagiarism";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  timestamp: string;
}

const DiagnosticFindings: React.FC = () => {
  // Mock findings for UI demonstration - in real app, derived from essays/stats
  const findings: Finding[] = [
    {
      id: "1",
      type: "performance",
      title: "Student Score Decline",
      description: "Mikaela Vance's average score dropped by 15% in the last 3 essays.",
      priority: "high",
      timestamp: "2 hours ago"
    },
    {
      id: "2",
      type: "plagiarism",
      title: "High Similarity Detected",
      description: "Essay 'Environmental Ethics' showed 45% AI generation probability.",
      priority: "high",
      timestamp: "5 hours ago"
    },
    {
      id: "3",
      type: "deadline",
      title: "Unsubmitted Work",
      description: "12 students in Block 1A have not submitted the 'Midterm Analysis'.",
      priority: "medium",
      timestamp: "1 day ago"
    }
  ];

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-error-50 text-error-default border-error-100";
      case "medium":
        return "bg-warning-50 text-warning-default border-warning-100";
      default:
        return "bg-info-50 text-info-default border-info-100";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "performance": return <TrendingDown className="w-5 h-5" />;
      case "plagiarism": return <ShieldAlert className="w-5 h-5" />;
      case "deadline": return <Clock className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  return (
    <Card variant="glass" className="overflow-hidden border-primary-100/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-100 rounded-lg">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-neutral-900 leading-none">Diagnostic Findings</h3>
            <p className="text-sm text-neutral-500 mt-1">AI-driven actionable insights</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:bg-primary-50">
          View All <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-4">
        {findings.map((finding, index) => (
          <motion.div
            key={finding.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl border flex gap-4 transition-all hover:shadow-md cursor-pointer ${getPriorityStyles(finding.priority)} bg-white`}
          >
            <div className={`p-3 rounded-xl h-fit ${getPriorityStyles(finding.priority)} border-none shadow-sm`}>
              {getIcon(finding.type)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-neutral-900">{finding.title}</h4>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/50 px-2 py-0.5 rounded-full">
                  {finding.priority}
                </span>
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed mb-2">
                {finding.description}
              </p>
              <div className="flex items-center text-[10px] text-neutral-400 font-medium italic">
                <Clock className="w-3 h-3 mr-1" />
                {finding.timestamp}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};

export default DiagnosticFindings;
