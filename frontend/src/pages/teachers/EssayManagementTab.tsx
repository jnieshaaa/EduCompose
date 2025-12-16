import { useMemo, useState } from "react";
import {
  Plus,
  Upload,
  FileText,
  Users,
  BookOpen,
  Layers,
  ClipboardList,
  MoreVertical,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import Modal from "../../components/ui/Modal";

type Program = { id: string; name: string };
type Block = { id: string; name: string; programId: string };
type Rubric = { id: string; name: string };
type Student = { id: string; name: string; programId: string; blockId: string };

type EssayActivity = {
  id: string;
  title: string;
  programId: string | "all";
  blockId: string | "all";
  rubricId: string | null;
  dueDate?: string;
  description?: string;
};

type EssaySubmission = {
  id: string;
  activityId: string;
  studentId: string;
  studentName: string;
  fileName: string;
  status: "submitted";
};

type PendingUpload = {
  id: string;
  file: File;
  studentId: string | "";
};

// Simple in-memory demo data. Replace with real API data later.
const demoPrograms: Program[] = [
  { id: "prog-1", name: "BS Computer Science" },
  { id: "prog-2", name: "BS Education" },
];

const demoBlocks: Block[] = [
  { id: "block-1", name: "Block A", programId: "prog-1" },
  { id: "block-2", name: "Block B", programId: "prog-1" },
  { id: "block-3", name: "Block C", programId: "prog-2" },
];

const demoRubrics: Rubric[] = [
  { id: "rubric-standard", name: "Standard Essay Rubric" },
  { id: "rubric-creative", name: "Creative Writing Rubric" },
  { id: "rubric-argument", name: "Argumentative Essay Rubric" },
];

const demoStudents: Student[] = [
  { id: "stu-1", name: "Emma Wilson", programId: "prog-1", blockId: "block-1" },
  { id: "stu-2", name: "James Lee", programId: "prog-1", blockId: "block-1" },
  { id: "stu-3", name: "Sarah Martinez", programId: "prog-1", blockId: "block-2" },
  { id: "stu-4", name: "Michael Chen", programId: "prog-2", blockId: "block-3" },
];

export function EssayManagementTab() {
  const [activities, setActivities] = useState<EssayActivity[]>([]);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([]);

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

  const [selectedActivityForUpload, setSelectedActivityForUpload] = useState<
    string | ""
  >("");
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  // State for "Submit to" modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitUploadId, setSubmitUploadId] = useState<string | null>(null);
  const [submitProgramId, setSubmitProgramId] = useState<string | "all">("all");
  const [submitBlockId, setSubmitBlockId] = useState<string | "all">("all");
  const [submitStudentQuery, setSubmitStudentQuery] = useState("");
  const [submitStudentId, setSubmitStudentId] = useState<string | null>(null);

  const filteredBlocks = useMemo(
    () =>
      newActivity.programId === "all"
        ? demoBlocks
        : demoBlocks.filter((b) => b.programId === newActivity.programId),
    [newActivity.programId]
  );

  const activityStudents = useMemo(() => {
    const activity = activities.find((a) => a.id === activeActivityId);
    if (!activity) return [];

    return demoStudents.filter((s) => {
      const programMatch =
        activity.programId === "all" || s.programId === activity.programId;
      const blockMatch =
        activity.blockId === "all" || s.blockId === activity.blockId;
      return programMatch && blockMatch;
    });
  }, [activities, activeActivityId]);

  const activitySubmissions = useMemo(
    () =>
      submissions.filter((s) => s.activityId === (activeActivityId ?? "")),
    [submissions, activeActivityId]
  );

  const submitModalBlocks = useMemo(
    () =>
      submitProgramId === "all"
        ? demoBlocks
        : demoBlocks.filter((b) => b.programId === submitProgramId),
    [submitProgramId]
  );

  const submitModalStudentSuggestions = useMemo(() => {
    const byProgramBlock = demoStudents.filter((s) => {
      const programMatch =
        submitProgramId === "all" || s.programId === submitProgramId;
      const blockMatch =
        submitBlockId === "all" || s.blockId === submitBlockId;
      return programMatch && blockMatch;
    });

    if (!submitStudentQuery.trim()) {
      return byProgramBlock.slice(0, 8);
    }

    const q = submitStudentQuery.toLowerCase();
    return byProgramBlock
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [submitProgramId, submitBlockId, submitStudentQuery]);

  const handleCreateActivity = () => {
    if (!newActivity.title.trim()) return;

    const id = `activity-${activities.length + 1}`;
    const activity: EssayActivity = {
      id,
      title: newActivity.title.trim(),
      programId: newActivity.programId,
      blockId: newActivity.blockId,
      rubricId: newActivity.rubricId || null,
      dueDate: newActivity.dueDate || undefined,
      description: newActivity.description || undefined,
    };

    setActivities((prev) => [activity, ...prev]);
    setActiveActivityId(id);

    setNewActivity({
      title: "",
      programId: "all",
      blockId: "all",
      rubricId: "",
      dueDate: "",
      description: "",
    });
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const newItems: PendingUpload[] = files.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      file,
      studentId: "",
    }));
    setPendingUploads((prev) => [...prev, ...newItems]);
    event.target.value = "";
  };

  const handleAssignStudent = (uploadId: string, studentId: string) => {
    setPendingUploads((prev) =>
      prev.map((u) =>
        u.id === uploadId
          ? {
              ...u,
              studentId,
            }
          : u
      )
    );
  };

  const openSubmitModalForUpload = (uploadId: string) => {
    if (!selectedActivityForUpload) return;

    const upload = pendingUploads.find((u) => u.id === uploadId);
    if (!upload) return;

    // Pre-fill program/block from the selected activity where possible
    const activity = activities.find(
      (a) => a.id === selectedActivityForUpload
    );
    const initialProgram =
      activity && activity.programId !== "all" ? activity.programId : "all";
    const initialBlock =
      activity && activity.blockId !== "all" ? activity.blockId : "all";

    setSubmitUploadId(uploadId);
    setSubmitProgramId(initialProgram);
    setSubmitBlockId(initialBlock);
    setSubmitStudentQuery("");
    setSubmitStudentId(null);
    setIsSubmitModalOpen(true);
  };

  const handleConfirmSubmitModal = () => {
    if (!selectedActivityForUpload || !submitUploadId || !submitStudentId) {
      return;
    }

    const activityId = selectedActivityForUpload;
    const upload = pendingUploads.find((u) => u.id === submitUploadId);
    const student = demoStudents.find((s) => s.id === submitStudentId);
    if (!upload || !student) return;

    const newSubmission: EssaySubmission = {
      id: `sub-${Date.now()}-${upload.id}`,
      activityId,
      studentId: student.id,
      studentName: student.name,
      fileName: upload.file.name,
      status: "submitted",
    };

    setSubmissions((prev) => [newSubmission, ...prev]);
    setPendingUploads((prev) => prev.filter((u) => u.id !== submitUploadId));

    if (!activeActivityId) {
      setActiveActivityId(activityId);
    }

    setIsSubmitModalOpen(false);
    setSubmitUploadId(null);
  };

  const handleRemoveUpload = (uploadId: string) => {
    setPendingUploads((prev) => prev.filter((u) => u.id !== uploadId));
  };

  const handleConfirmUploads = () => {
    if (!selectedActivityForUpload) return;

    const activityId = selectedActivityForUpload;
    const uploadsToSave = pendingUploads.filter((u) => u.studentId);
    if (!uploadsToSave.length) return;

    const newSubs: EssaySubmission[] = uploadsToSave.map((u) => {
      const student = demoStudents.find((s) => s.id === u.studentId)!;
      return {
        id: `sub-${Date.now()}-${u.id}`,
        activityId,
        studentId: u.studentId,
        studentName: student.name,
        fileName: u.file.name,
        status: "submitted",
      };
    });

    setSubmissions((prev) => [...newSubs, ...prev]);
    setPendingUploads((prev) =>
      prev.filter((u) => !uploadsToSave.some((s) => s.id === u.id))
    );

    if (!activeActivityId) {
      setActiveActivityId(activityId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">Essay Management</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Create essay activities and manage batch uploads mapped to students.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Create Activity */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-neutral-900">
                Create Essay Activity
              </h2>
            </div>

            <Input
              label="Essay Title"
              placeholder="e.g. Argumentative Essay on Climate Change"
              value={newActivity.title}
              onChange={(value) =>
                setNewActivity((prev) => ({ ...prev, title: value }))
              }
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  Block / Section
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
                  <option value="all">All Blocks</option>
                  {filteredBlocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleCreateActivity}
                disabled={!newActivity.title.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Activity
              </Button>
            </div>
          </Card>

          {/* Batch Upload */}
          <Card className="space-y-4 mt-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Upload className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-neutral-900">
                Batch Upload Essays
              </h2>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Target Activity
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
                value={selectedActivityForUpload}
                onChange={(e) =>
                  setSelectedActivityForUpload(e.target.value as string)
                }
              >
                <option value="">Select an activity</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">
                  Files (PDF / Images)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={handleFilesSelected}
                  className="block w-full text-sm text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-rd file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-300"
                  disabled={!selectedActivityForUpload}
                />
                <p className="text-xs text-neutral-500">
                  After selecting files, assign each one to the correct student
                  below, then either use the Actions menu per file or
                  "Submit all assigned".
                </p>
              </div>
            </div>

            {pendingUploads.length > 0 && (
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-800">
                    Pending files ({pendingUploads.length})
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-rd">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Submit to (student)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUploads.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-neutral-500" />
                              <span className="truncate max-w-[140px]">
                                {u.file.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <select
                              className="w-full px-2 py-1 border border-neutral-300 rounded-rd text-sm"
                              value={u.studentId}
                              onChange={(e) =>
                                handleAssignStudent(u.id, e.target.value)
                              }
                            >
                              <option value="">Select student</option>
                              {demoStudents.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openSubmitModalForUpload(u.id)}
                                  disabled={!selectedActivityForUpload}
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Submit to…
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRemoveUpload(u.id)}
                                >
                                  Remove from list
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleConfirmUploads}
                    disabled={
                      !selectedActivityForUpload ||
                      !pendingUploads.some((u) => u.studentId)
                    }
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Submit all assigned
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Activities list & details */}
        <div className="xl:col-span-2 space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-neutral-900">
                Essay Activities
              </h2>
            </div>

            {activities.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-500">
                No activities yet. Create your first essay activity on the left.
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((activity) => {
                  const isActive = activity.id === activeActivityId;
                  const programLabel =
                    activity.programId === "all"
                      ? "All programs"
                      : demoPrograms.find((p) => p.id === activity.programId)
                          ?.name ?? "Program";
                  const blockLabel =
                    activity.blockId === "all"
                      ? "All blocks"
                      : demoBlocks.find((b) => b.id === activity.blockId)
                          ?.name ?? "Block";

                  const countForActivity = submissions.filter(
                    (s) => s.activityId === activity.id
                  ).length;

                  return (
                    <button
                      key={activity.id}
                      className={`w-full text-left border rounded-rd px-3 py-2 text-sm flex items-center justify-between gap-2 ${
                        isActive
                          ? "border-primary bg-primary-50"
                          : "border-neutral-200 hover:bg-neutral-50"
                      }`}
                      onClick={() => setActiveActivityId(activity.id)}
                    >
                      <div className="flex items-start gap-2">
                        <Layers className="w-4 h-4 mt-[2px] text-primary" />
                        <div>
                          <div className="font-medium text-neutral-900">
                            {activity.title}
                          </div>
                          <div className="text-xs text-neutral-500 mt-0.5 flex flex-wrap gap-2">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {programLabel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {blockLabel}
                            </span>
                            {activity.rubricId && (
                              <span className="flex items-center gap-1">
                                <ClipboardList className="w-3 h-3" />
                                {
                                  demoRubrics.find(
                                    (r) => r.id === activity.rubricId
                                  )?.name
                                }
                              </span>
                            )}
                            {activity.dueDate && (
                              <span>Due: {activity.dueDate}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-neutral-600">
                        {countForActivity} submission
                        {countForActivity === 1 ? "" : "s"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Activity details: students & submissions */}
          <Card className="space-y-4">
            {activeActivityId ? (
              <>
                <div className="flex items-center gap-2 border-b pb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Student submissions
                  </h2>
                </div>

                {activityStudents.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    No students matched the selected program/block for this
                    activity yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">
                          Submission
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityStudents.map((student) => {
                        const sub = activitySubmissions.find(
                          (s) => s.studentId === student.id
                        );
                        return (
                          <TableRow key={student.id}>
                            <TableCell className="text-sm text-neutral-900">
                              {student.name}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {sub ? (
                                <span className="inline-flex items-center gap-1 text-success-default">
                                  <FileText className="w-4 h-4" />
                                  {sub.fileName}
                                </span>
                              ) : (
                                <span className="text-neutral-400">
                                  Not yet submitted
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </>
            ) : (
              <div className="py-10 text-center text-sm text-neutral-500">
                Select an activity above to see all students and their
                submissions.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Submit-to modal for assigning a single uploaded file */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit uploaded essay to student"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Choose the program, block, and student this uploaded essay should be
            submitted for. Student suggestions will filter as you type.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Program
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
                value={submitProgramId}
                onChange={(e) => {
                  setSubmitProgramId(e.target.value as "all" | string);
                  setSubmitBlockId("all");
                  setSubmitStudentId(null);
                }}
              >
                <option value="all">All programs</option>
                {demoPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Block / Section
              </label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-rd text-sm"
                value={submitBlockId}
                onChange={(e) => {
                  setSubmitBlockId(e.target.value as "all" | string);
                  setSubmitStudentId(null);
                }}
              >
                <option value="all">All blocks</option>
                {submitModalBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Student (search & auto-suggest)
            </label>
            <Input
              placeholder="Start typing a student name..."
              value={submitStudentQuery}
              onChange={(value) => {
                setSubmitStudentQuery(value);
                setSubmitStudentId(null);
              }}
            />
            <div className="mt-2 max-h-40 overflow-y-auto border border-neutral-200 rounded-rd">
              {submitModalStudentSuggestions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-neutral-500">
                  No students found for this program/block and search.
                </div>
              ) : (
                submitModalStudentSuggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSubmitStudentId(s.id);
                      setSubmitStudentQuery(s.name);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 ${
                      submitStudentId === s.id
                        ? "bg-primary-50 text-primary"
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    {s.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmSubmitModal}
              disabled={!submitStudentId || !selectedActivityForUpload}
            >
              <Upload className="w-4 h-4 mr-2" />
              Submit to selected student
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


