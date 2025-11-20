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
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">
          Recent Activity
        </h3>
        <Badge variant="info" size="sm">
          {essays.length} essays
        </Badge>
      </div>

      <div className="space-y-3">
        {essays.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">No essays submitted yet</p>
          </div>
        ) : (
          essays.map((essay, index) => {
            const ActivityIcon = getActivityIcon(essay.status);

            return (
              <motion.div
                key={essay.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-3 p-3 rounded-rd hover:bg-neutral-50 transition-colors duration-200 cursor-pointer"
                onClick={() => onEssayClick?.(essay)}
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary-100 rounded-rs flex items-center justify-center">
                    <ActivityIcon className="w-5 h-5 text-primary" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {essay.title}
                    </p>
                    <Badge variant={getStatusColor(essay.status)} size="sm">
                      {essay.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-neutral-500">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>Student {essay.student_id}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(essay.submitted_at)}</span>
                    </div>
                    {essay.overall_score !== undefined && (
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>{Math.round(essay.overall_score)}/100</span>
                      </div>
                    )}
                  </div>
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
