import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileText,
  Users,
  BookOpen,
  Layers,
  ClipboardList,
  Calendar,
  ArrowRight,
  MoreVertical,
  Edit,
  Trash2,
  Search,
  Clock,
  Target,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import type { EssayActivity } from "../../types/activityTypes";
import {
  getRubricLabel,
  getDueDateStatus,
  getCoursesLabel,
  getBlocksLabel,
} from "../../utils/activityUtils";

interface ActivitiesListViewProps {
  activities: EssayActivity[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "cards" | "table";
  onViewModeChange: (mode: "cards" | "table") => void;
  onActivityClick: (activityId: string) => void;
  onEditActivity: (e: React.MouseEvent, activityId: string) => void;
  onDeleteActivity: (e: React.MouseEvent, activityId: string) => void;
  onCreateActivity: () => void;
  totalActivities: number;
  totalSubmissions: number;
  upcomingDue: number;
  courses: { id: string; name: string }[];
  sections: { id: string; name: string; courseId: string }[];
  rubrics: { id: string; name: string }[];
  isReadOnly?: boolean;
}

export function ActivitiesListView({
  activities,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onActivityClick,
  onEditActivity,
  onDeleteActivity,
  onCreateActivity,
  totalActivities,
  totalSubmissions,
  upcomingDue,
  courses,
  sections,
  rubrics,
  isReadOnly = false,
}: ActivitiesListViewProps) {
  const filteredActivities = activities.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Activities</h1>
          <p className="text-sm text-neutral-500 mt-1 font-medium">Create and manage your student assignments</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={onCreateActivity}
            className="flex items-center gap-2 bg-primary text-sm font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={18} /> New Activity
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Activities", value: totalActivities, icon: ClipboardList, color: "text-primary", bg: "bg-primary/5" },
          { label: "Essays Submitted", value: totalSubmissions, icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Due Soon", value: upcomingDue, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" }
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 ${stat.bg} ${stat.color} rounded-xl`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-300">{stat.label}</p>
              <p className="text-xl font-bold text-neutral-900 leading-none mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white p-3 rounded-2xl border border-neutral-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
          <input
            type="text"
            placeholder="Search activities by name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-neutral-50/50 border border-neutral-100 rounded-xl text-sm placeholder:text-neutral-300 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-xl border border-neutral-100/50">
          <button
            onClick={() => onViewModeChange("cards")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              viewMode === "cards"
                ? "bg-white text-primary shadow-sm ring-1 ring-neutral-100"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <LayoutGrid size={16} />
            Cards
          </button>
          <button
            onClick={() => onViewModeChange("table")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              viewMode === "table"
                ? "bg-white text-primary shadow-sm ring-1 ring-neutral-100"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <List size={16} />
            Table
          </button>
        </div>
      </div>

      {/* Activities Display */}
      {filteredActivities.length === 0 ? (
        <div className="p-20 text-center bg-white rounded-3xl border border-neutral-50 shadow-sm">
          <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-neutral-100" />
          </div>
          <h3 className="text-base font-bold text-neutral-800 mb-2">No Activities Found</h3>
          <p className="text-sm text-neutral-400 max-w-[280px] mx-auto mb-8 leading-relaxed">
            {activities.length === 0
              ? "Start by creating your first student assignment."
              : "No activities match your search."}
          </p>
          {activities.length === 0 && !isReadOnly && (
            <button 
              onClick={onCreateActivity}
              className="text-sm font-bold uppercase tracking-widest text-primary hover:bg-primary/5 px-8 py-3 rounded-full transition-all border border-primary/20"
            >
              Get Started
            </button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filteredActivities.map((activity, index) => {
              const dueDateStatus = getDueDateStatus(activity.dueDate);
              const rubricLabel = getRubricLabel(
                activity.rubricId,
                rubrics.map((r) => ({ id: r.id, name: r.name }))
              );

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                  onClick={() => onActivityClick(activity.id)}
                  className="group relative bg-white border border-neutral-100 rounded-2xl p-5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer overflow-hidden flex flex-col"
                >
                  {/* Status Indicator Bar */}
                  <div className={`absolute top-0 left-0 w-full h-[3px] transition-transform ${activity.submissionCount > 0 ? 'bg-success-default scale-x-100' : 'bg-neutral-100'}`} />

                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-neutral-800 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {activity.title}
                      </h3>
                    </div>
                    {!isReadOnly && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="p-1.5 text-neutral-300 hover:text-neutral-500 hover:bg-neutral-50 rounded-lg transition-all">
                            <MoreVertical size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 shadow-xl">
                          <DropdownMenuItem className="text-xs font-medium cursor-pointer" onClick={(e) => onEditActivity(e, activity.id)}>
                            <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs font-medium text-error-default cursor-pointer" onClick={(e) => onDeleteActivity(e, activity.id)}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Description */}
                  {activity.description && (
                    <p className="text-sm text-neutral-500 line-clamp-3 mb-5 leading-relaxed">
                      {activity.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="space-y-4 mb-7 flex-1">
                    <div className="flex flex-wrap gap-2 tracking-tight font-bold text-[13px] uppercase text-neutral-400">
                      <div className="flex items-center gap-2 px-3.5 py-1.5 border border-neutral-50 rounded-lg bg-neutral-50/50">
                        <Users size={14} className="text-neutral-300" />
                        <span className="truncate max-w-[120px]">
                          {getCoursesLabel(activity.courseIds, courses.map((c) => ({ id: c.id, name: c.name })))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3.5 py-1.5 border border-neutral-50 rounded-lg bg-neutral-50/50">
                        <Layers size={14} className="text-neutral-300" />
                        <span className="truncate max-w-[100px]">
                          {getBlocksLabel(activity.blockIds, sections.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId })))}
                        </span>
                      </div>
                    </div>
                    {rubricLabel && (
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                        <Target size={14} className="text-primary/40" />
                        <span className="truncate">{rubricLabel}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-neutral-50 flex items-center justify-between">
                    {dueDateStatus && (
                      <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] ${dueDateStatus.label.includes('Overdue') ? 'text-error-default' : 'text-neutral-500'}`}>
                        <Calendar size={13} className="opacity-40" />
                        {dueDateStatus.label}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] font-bold text-primary sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>OPEN</span>
                      <ArrowRight size={10} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-neutral-50/50">
              <TableRow>
                <TableHead className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Activity Name</TableHead>
                <TableHead className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Course</TableHead>
                <TableHead className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Block</TableHead>
                <TableHead className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest text-center">Due Date</TableHead>
                <TableHead className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-neutral-50">
              {filteredActivities.map((activity) => {
                const dueDateStatus = getDueDateStatus(activity.dueDate);
                const rubricLabel = getRubricLabel(
                  activity.rubricId,
                  rubrics.map((r) => ({ id: r.id, name: r.name }))
                );

                return (
                  <TableRow
                    key={activity.id}
                    className="cursor-pointer hover:bg-neutral-50/30 transition-colors"
                    onClick={() => onActivityClick(activity.id)}
                  >
                    <TableCell className="py-5">
                      <div className="text-sm font-bold text-neutral-800 leading-tight mb-1">
                        {activity.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        <Target size={12} className="opacity-50" />
                        {rubricLabel || "No Rubric"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-3 py-1.5 bg-neutral-50 border border-neutral-100 rounded-lg">
                        {getCoursesLabel(activity.courseIds, courses.map((c) => ({ id: c.id, name: c.name })))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-3 py-1.5 bg-neutral-50 border border-neutral-100 rounded-lg">
                        {getBlocksLabel(activity.blockIds, sections.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId })))}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {dueDateStatus ? (
                        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${
                          dueDateStatus.label.includes('Overdue') ? 'bg-error-default/5 border-error-default/20 text-error-default' : 'bg-neutral-50 border-neutral-100 text-neutral-500'
                        }`}>
                          {dueDateStatus.label}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isReadOnly && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="p-2 text-neutral-300 hover:text-neutral-500 rounded-xl transition-all">
                              <MoreVertical size={14} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-neutral-100 shadow-xl">
                            <DropdownMenuItem className="text-xs font-medium cursor-pointer" onClick={(e) => onEditActivity(e, activity.id)}>
                              <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs font-medium text-error-default cursor-pointer" onClick={(e) => onDeleteActivity(e, activity.id)}>
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
