import React from "react";
import { motion } from "framer-motion";
import { Clock, BookOpen, User, TrendingUp } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import type { Essay } from "../../types/Essay";

interface RecentActivityProps {
  essays: Essay[];
  onEssayClick?: (essay: Essay) => void;
}

const RecentActivity: React.FC<RecentActivityProps> = ({
  essays,
  onEssayClick,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "warning";
      case "analyzed":
        return "info";
      case "reviewed":
        return "success";
      default:
        return "neutral";
    }
  };

  const getActivityIcon = (status: string) => {
    switch (status) {
      case "submitted":
        return BookOpen;
      case "analyzed":
        return TrendingUp;
      case "reviewed":
        return BookOpen;
      default:
        return BookOpen;
    }
  };

  return (
    <Card variant="glass" className="h-full border-primary-100/30">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-xl">
             <Clock className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 leading-none">
            Recent Engagement
          </h3>
        </div>
        <Badge variant="info" size="sm" className="rounded-full px-3">
          {essays.length} Submissions
        </Badge>
      </div>

      <div className="space-y-1">
        {essays.length === 0 ? (
          <div className="text-center py-12 bg-white/50 rounded-2xl border border-dashed border-neutral-200">
            <BookOpen className="w-16 h-16 text-neutral-300 mx-auto mb-4 opacity-50" />
            <p className="text-neutral-500 font-medium">Waiting for student activity...</p>
          </div>
        ) : (
          essays.slice(0, 5).map((essay, index) => {
            const ActivityIcon = getActivityIcon(essay.status);

            return (
              <motion.div
                key={essay.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center space-x-4 p-4 rounded-2xl hover:bg-white/80 transition-all duration-300 cursor-pointer group border border-transparent hover:border-primary-100/50 hover:shadow-sm ${
                  index !== essays.slice(0, 5).length - 1 ? "" : ""
                }`}
                onClick={() => onEssayClick?.(essay)}
              >
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${
                    status === 'analyzed' ? 'bg-info-50 text-info-default' : 
                    status === 'reviewed' ? 'bg-success-50 text-success-default' : 
                    'bg-primary-50 text-primary'
                  }`}>
                    <ActivityIcon className="w-6 h-6" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-base font-bold text-neutral-900 truncate group-hover:text-primary transition-colors">
                      {essay.title}
                    </p>
                    <Badge 
                      variant={getStatusColor(essay.status)} 
                      size="sm"
                      className="capitalize font-bold tracking-tight px-2 py-0.5 rounded-md"
                    >
                      {essay.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs font-semibold text-neutral-400">
                    <div className="flex items-center space-x-1 py-1 px-2 rounded-md bg-neutral-100/50">
                      <User className="w-3.5 h-3.5" />
                      <span>ID: {essay.student_id}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(essay.submitted_at)}</span>
                    </div>
                    {essay.overall_score !== undefined && (
                      <div className="flex items-center space-x-1 text-success-default">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Score: {Math.round(essay.overall_score)}/100</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-primary" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default RecentActivity;
