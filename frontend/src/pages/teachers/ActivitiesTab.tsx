import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from '../../components/ui/table';
import Modal from "../../components/ui/Modal";

type Program = { id: string; name: string };
type Block = { id: string; name: string; programId: string };
type Rubric = { id: string; name: string };

type EssayActivity = {
  id: string;
  title: string;
  programId: string | "all";
  blockId: string | "all";
  rubricId: string | null;
  dueDate?: string;
  description?: string;
  createdAt: string;
  submissionCount: number;
};

// Demo data
const demoPrograms: Program[] = [
  { id: "prog-1", name: "BS Computer Science" },
  { id: "prog-2", name: "BS Education" },
  { id: "prog-3", name: "BS Information Technology" },
];

const demoBlocks: Block[] = [
  { id: "block-1", name: "Block A", programId: "prog-1" },
  { id: "block-2", name: "Block B", programId: "prog-1" },
  { id: "block-3", name: "Block C", programId: "prog-2" },
  { id: "block-4", name: "Block A", programId: "prog-3" },
];

const demoRubrics: Rubric[] = [
  { id: "rubric-standard", name: "Standard Essay Rubric" },
  { id: "rubric-creative", name: "Creative Writing Rubric" },
  { id: "rubric-argument", name: "Argumentative Essay Rubric" },
];

// Sample activities for demonstration
const initialActivities: EssayActivity[] = [
  {
    id: "activity-1",
    title: "Argumentative Essay on Climate Change",
    programId: "prog-1",
    blockId: "all",
    rubricId: "rubric-argument",
    dueDate: "2025-12-20",
    description: "Write a 1000-word argumentative essay discussing climate change policies.",
    createdAt: "2025-12-10",
    submissionCount: 24,
  },
  {
    id: "activity-2",
    title: "Machine Learning Ethics Analysis",
    programId: "prog-1",
    blockId: "block-1",
    rubricId: "rubric-standard",
    dueDate: "2025-12-18",
    description: "Analyze the ethical implications of AI in healthcare.",
    createdAt: "2025-12-08",
    submissionCount: 15,
  },
  {
    id: "activity-3",
    title: "Creative Writing: Short Story",
    programId: "prog-2",
    blockId: "all",
    rubricId: "rubric-creative",
    dueDate: "2025-12-25",
    description: "Write an original short story (500-800 words) on any topic.",
    createdAt: "2025-12-05",
    submissionCount: 8,
  },
];

export function ActivitiesTab() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<EssayActivity[]>(initialActivities);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const [newActivity, setNewActivity] = useState<{
    title: string;
    programId: string | "all";
    blockId: string | "all";
    rubricId: string | "";
    dueDate: string;
    description: string;
  }>({
    title: "",
    programId: "all",
    blockId: "all",
    rubricId: "",
    dueDate: "",
    description: "",
  });

  const filteredBlocks = useMemo(
    () =>
      newActivity.programId === "all"
        ? demoBlocks
        : demoBlocks.filter((b) => b.programId === newActivity.programId),
    [newActivity.programId]
  );

  const filteredActivities = useMemo(
    () =>
      activities.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [activities, searchQuery]
  );

  // Stats
  const totalActivities = activities.length;
  const totalSubmissions = activities.reduce((acc, a) => acc + a.submissionCount, 0);
  const upcomingDue = activities.filter((a) => {
    if (!a.dueDate) return false;
    const due = new Date(a.dueDate);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return due >= now && due <= weekFromNow;
  }).length;

  const handleCreateActivity = () => {
    if (!newActivity.title.trim()) return;

    const id = `activity-${Date.now()}`;
    const activity: EssayActivity = {
      id,
      title: newActivity.title.trim(),
      programId: newActivity.programId,
      blockId: newActivity.blockId,
      rubricId: newActivity.rubricId || null,
      dueDate: newActivity.dueDate || undefined,
      description: newActivity.description || undefined,
      createdAt: new Date().toISOString().split("T")[0],
      submissionCount: 0,
    };

    setActivities((prev) => [activity, ...prev]);
    setNewActivity({
      title: "",
      programId: "all",
      blockId: "all",
      rubricId: "",
      dueDate: "",
      description: "",
    });
    setIsCreateModalOpen(false);
  };

  const handleActivityClick = (activityId: string) => {
    // Navigate to Essays tab with activity filter
    navigate(`/Teacher/Essays?activityId=${encodeURIComponent(activityId)}`);
  };

  const handleDeleteActivity = (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  };

  const getProgramLabel = (programId: string | "all") =>
    programId === "all"
      ? "All Programs"
      : demoPrograms.find((p) => p.id === programId)?.name ?? "Unknown";

  const getBlockLabel = (blockId: string | "all") =>
    blockId === "all"
      ? "All Sections"
      : demoBlocks.find((b) => b.id === blockId)?.name ?? "Unknown";

  const getRubricLabel = (rubricId: string | null) =>
    rubricId ? demoRubrics.find((r) => r.id === rubricId)?.name ?? "Unknown" : null;

  const getDueDateStatus = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: "Overdue", color: "bg-error-default/10 text-error-default border-error-default/20" };
    if (diffDays <= 3) return { label: `${diffDays}d left`, color: "bg-warning-default/10 text-warning-default border-warning-default/20" };
    if (diffDays <= 7) return { label: `${diffDays}d left`, color: "bg-info-default/10 text-info-default border-info-default/20" };
    return { label: dueDate, color: "bg-neutral-100 text-neutral-600 border-neutral-200" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 font-semibold">Essay Activities</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Define essay assignments and track submissions
          </p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary-300"
          onClick={() => setIsCreateModalOpen(true)}
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
              <p className="text-2xl font-bold text-neutral-900">{totalActivities}</p>
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
              <p className="text-2xl font-bold text-neutral-900">{totalSubmissions}</p>
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
              <p className="text-2xl font-bold text-neutral-900">{upcomingDue}</p>
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
              onChange={setSearchQuery}
              className="pl-10"
            />
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
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
          <h3 className="text-lg font-medium text-neutral-700 mb-2">No activities found</h3>
          <p className="text-sm text-neutral-500 mb-4">
            {activities.length === 0
              ? "Get started by creating your first essay activity."
              : "Try adjusting your search query."}
          </p>
          {activities.length === 0 && (
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Activity
            </Button>
          )}
        </Card>
      ) : viewMode === 'cards' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredActivities.map((activity, index) => {
              const dueDateStatus = getDueDateStatus(activity.dueDate);
              const rubricLabel = getRubricLabel(activity.rubricId);

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
                    onClick={() => handleActivityClick(activity.id)}
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
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Activity
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteActivity(e, activity.id)}
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
                          {getProgramLabel(activity.programId)}
                        </Badge>
                        <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-xs flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {getBlockLabel(activity.blockId)}
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
                            <span className="text-neutral-500">submissions</span>
                          </div>
                        </div>

                        {dueDateStatus && (
                          <Badge className={`${dueDateStatus.color} text-xs flex items-center gap-1`}>
                            <Calendar className="w-3 h-3" />
                            {dueDateStatus.label}
                          </Badge>
                        )}
                      </div>

                      {/* Hover hint */}
                      <div className="flex items-center justify-end gap-1 mt-3 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>View submissions</span>
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
                const rubricLabel = getRubricLabel(activity.rubricId);
                
                return (
                  <TableRow 
                    key={activity.id}
                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => handleActivityClick(activity.id)}
                  >
                    <TableCell>
                      <div className="font-medium text-neutral-900">{activity.title}</div>
                      {activity.description && (
                        <div className="text-xs text-neutral-500 truncate max-w-xs">
                          {activity.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        {getProgramLabel(activity.programId)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-xs">
                        {getBlockLabel(activity.blockId)}
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
                      <Badge className={
                        activity.submissionCount > 0
                          ? "bg-success-default/10 text-success-default border-success-default/20"
                          : "bg-neutral-100 text-neutral-500 border-neutral-200"
                      }>
                        {activity.submissionCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Activity
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteActivity(e, activity.id)}
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

      {/* Create Activity Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Essay Activity"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Essay Title"
            placeholder="e.g., Argumentative Essay on Climate Change"
            value={newActivity.title}
            onChange={(value) =>
              setNewActivity((prev) => ({ ...prev, title: value }))
            }
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Program
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
                value={newActivity.programId}
                onChange={(e) =>
                  setNewActivity((prev) => ({
                    ...prev,
                    programId: e.target.value as "all" | string,
                    blockId: "all",
                  }))
                }
              >
                <option value="all">All Programs</option>
                {demoPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Section / Block
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
                value={newActivity.blockId}
                onChange={(e) =>
                  setNewActivity((prev) => ({
                    ...prev,
                    blockId: e.target.value as "all" | string,
                  }))
                }
              >
                <option value="all">All Sections</option>
                {filteredBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Rubric
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
                value={newActivity.rubricId}
                onChange={(e) =>
                  setNewActivity((prev) => ({
                    ...prev,
                    rubricId: e.target.value,
                  }))
                }
              >
                <option value="">Select rubric (optional)</option>
                {demoRubrics.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Due Date (optional)
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
                value={newActivity.dueDate}
                onChange={(e) =>
                  setNewActivity((prev) => ({
                    ...prev,
                    dueDate: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <Input
            label="Instructions (optional)"
            placeholder="Provide instructions for students..."
            type="textarea"
            rows={3}
            value={newActivity.description}
            onChange={(value) =>
              setNewActivity((prev) => ({ ...prev, description: value }))
            }
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={handleCreateActivity}
              disabled={!newActivity.title.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Activity
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

