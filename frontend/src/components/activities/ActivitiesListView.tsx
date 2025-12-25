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
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
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
  getProgramLabel,
  getBlockLabel,
  getRubricLabel,
  getDueDateStatus,
} from "../../data/activityData";

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
  programs: { id: string; name: string }[];
  sections: { id: string; name: string; programId: string }[];
  rubrics: { id: string; name: string }[];
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
  programs,
  sections,
  rubrics,
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
          <h1 className="text-2xl text-neutral-900 font-semibold">
            Essay Activities
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Define essay assignments and track submissions
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary-300"
          onClick={onCreateActivity}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Activity
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Total Activities</p>
              <p className="text-2xl font-bold text-neutral-900">
                {totalActivities}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/20 rounded-lg">
              <FileText className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Total Submissions</p>
              <p className="text-2xl font-bold text-neutral-900">
                {totalSubmissions}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-warning-default/5 to-warning-default/10 border-warning-default/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-default/20 rounded-lg">
              <Clock className="w-5 h-5 text-warning-default" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">Due This Week</p>
              <p className="text-2xl font-bold text-neutral-900">
                {upcomingDue}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & View Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={onSearchChange}
              className="pl-10"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange("cards")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "cards"
                  ? "bg-white text-primary shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => onViewModeChange("table")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "table"
                  ? "bg-white text-primary shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <List className="w-4 h-4" />
              Table
            </button>
          </div>
        </div>
      </Card>

      {/* Activities Display */}
      {filteredActivities.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-700 mb-2">
            No activities found
          </h3>
          <p className="text-sm text-neutral-500 mb-4">
            {activities.length === 0
              ? "Get started by creating your first essay activity."
              : "Try adjusting your search query."}
          </p>
          {activities.length === 0 && (
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={onCreateActivity}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Activity
            </Button>
          )}
        </Card>
      ) : viewMode === "cards" ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  layout
                >
                  <Card
                    className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 h-full flex flex-col"
                    onClick={() => onActivityClick(activity.id)}
                  >
                    {/* Top color bar based on submissions */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        activity.submissionCount > 0
                          ? "bg-gradient-to-r from-success-default to-success-default/60"
                          : "bg-gradient-to-r from-neutral-300 to-neutral-200"
                      }`}
                    />

                    <div className="p-5 flex-1 flex flex-col">
                      {/* Header with title and actions */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-neutral-900 line-clamp-2 group-hover:text-primary transition-colors">
                            {activity.title}
                          </h3>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => onEditActivity(e, activity.id)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Activity
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => onDeleteActivity(e, activity.id)}
                              className="text-error-default"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Activity
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Description */}
                      {activity.description && (
                        <p className="text-sm text-neutral-500 line-clamp-2 mb-4">
                          {activity.description}
                        </p>
                      )}

                      {/* Metadata badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {getProgramLabel(
                            activity.programId,
                            programs.map((p) => ({ id: p.id, name: p.name }))
                          )}
                        </Badge>
                        <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-xs flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {getBlockLabel(
                            activity.blockId,
                            sections.map((s) => ({
                              id: s.id,
                              name: s.name,
                              programId: s.programId,
                            }))
                          )}
                        </Badge>
                        {rubricLabel && (
                          <Badge className="bg-info-default/10 text-info-default border-info-default/20 text-xs flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {rubricLabel}
                          </Badge>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-sm">
                            <FileText className="w-4 h-4 text-neutral-400" />
                            <span className="font-semibold text-neutral-900">
                              {activity.submissionCount}
                            </span>
                            <span className="text-neutral-500">
                              submissions
                            </span>
                          </div>
                        </div>

                        {dueDateStatus && (
                          <Badge
                            className={`${dueDateStatus.color} text-xs flex items-center gap-1`}
                          >
                            <Calendar className="w-3 h-3" />
                            {dueDateStatus.label}
                          </Badge>
                        )}
                      </div>

                      {/* Hover hint */}
                      <div className="flex items-center justify-end gap-1 mt-3 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>View details</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Table View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity Title</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Rubric</TableHead>
                <TableHead className="text-center">Due Date</TableHead>
                <TableHead className="text-center">Submissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => {
                const dueDateStatus = getDueDateStatus(activity.dueDate);
                const rubricLabel = getRubricLabel(
                  activity.rubricId,
                  rubrics.map((r) => ({ id: r.id, name: r.name }))
                );

                return (
                  <TableRow
                    key={activity.id}
                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => onActivityClick(activity.id)}
                  >
                    <TableCell>
                      <div className="font-medium text-neutral-900">
                        {activity.title}
                      </div>
                      {activity.description && (
                        <div className="text-xs text-neutral-500 truncate max-w-xs">
                          {activity.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        {getProgramLabel(
                          activity.programId,
                          programs.map((p) => ({ id: p.id, name: p.name }))
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-xs">
                        {getBlockLabel(
                          activity.blockId,
                          sections.map((s) => ({
                            id: s.id,
                            name: s.name,
                            programId: s.programId,
                          }))
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rubricLabel ? (
                        <Badge className="bg-info-default/10 text-info-default border-info-default/20 text-xs">
                          {rubricLabel}
                        </Badge>
                      ) : (
                        <span className="text-sm text-neutral-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {dueDateStatus ? (
                        <Badge className={`${dueDateStatus.color} text-xs`}>
                          {dueDateStatus.label}
                        </Badge>
                      ) : (
                        <span className="text-sm text-neutral-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={
                          activity.submissionCount > 0
                            ? "bg-success-default/10 text-success-default border-success-default/20"
                            : "bg-neutral-100 text-neutral-500 border-neutral-200"
                        }
                      >
                        {activity.submissionCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => onEditActivity(e, activity.id)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Activity
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => onDeleteActivity(e, activity.id)}
                            className="text-error-default"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Activity
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
