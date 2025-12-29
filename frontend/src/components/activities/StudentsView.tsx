import { useState, useMemo } from "react";
import {
  ArrowLeft,
  FileText,
  Edit,
  MoreVertical,
  Upload,
  X,
} from "lucide-react";
import { ViewEssayModal } from "./ViewEssayModal";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
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
import { CheckCircle2, XCircle, Trash2, RefreshCw } from "lucide-react";
import type { EssayActivity, Student } from "../../types/activityTypes";
import {
  uploadEssayFile,
  updateEssayFile,
  deleteEssay,
} from "../../services/activityService";

interface StudentsViewProps {
  activity: EssayActivity;
  students: Student[];
  programName: string;
  programSection: string;
  onBack: () => void;
  isLoading?: boolean;
}

interface PendingUpload {
  id: string;
  file: File;
  studentId: string;
}

export function StudentsView({
  activity,
  students,
  programName,
  programSection,
  onBack,
  isLoading = false,
}: StudentsViewProps) {
  const [isSingleUploadModalOpen, setIsSingleUploadModalOpen] = useState(false);
  const [isBatchUploadModalOpen, setIsBatchUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isStudentSelectionModalOpen, setIsStudentSelectionModalOpen] =
    useState(false);
  const [currentUploadIdForSelection, setCurrentUploadIdForSelection] =
    useState<string | null>(null);
  const [isViewEssayModalOpen, setIsViewEssayModalOpen] = useState(false);
  const [selectedStudentForView, setSelectedStudentForView] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudentForUpdate, setSelectedStudentForUpdate] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedStudentForDelete, setSelectedStudentForDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter out students who have already submitted
  const availableStudents = useMemo(() => {
    return students.filter((student) => student.status !== "submitted");
  }, [students]);

  // Get already assigned student IDs (excluding the current upload being edited)
  const getAssignedStudentIds = (excludeUploadId: string | null) => {
    const batchUploadIds = pendingUploads
      .filter((upload) => upload.id !== excludeUploadId && upload.studentId)
      .map((upload) => upload.studentId);

    // For single upload, exclude it if we're editing the single upload
    const singleUploadId =
      excludeUploadId === "single-upload"
        ? []
        : selectedStudentId
        ? [selectedStudentId]
        : [];

    return [...batchUploadIds, ...singleUploadId];
  };

  const handleOpenStudentSelection = (uploadId: string) => {
    setCurrentUploadIdForSelection(uploadId);
    setIsStudentSelectionModalOpen(true);
  };

  const handleSelectStudentFromModal = (studentId: string) => {
    if (currentUploadIdForSelection) {
      if (currentUploadIdForSelection === "single-upload") {
        // Handle single upload student selection
        setSelectedStudentId(studentId);
      } else {
        // Handle batch upload student selection
        handleAssignStudent(currentUploadIdForSelection, studentId);
      }
      setIsStudentSelectionModalOpen(false);
      setCurrentUploadIdForSelection(null);
    }
  };

  const handleCloseStudentSelectionModal = () => {
    setIsStudentSelectionModalOpen(false);
    setCurrentUploadIdForSelection(null);
  };

  const handleSingleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isValidFile =
      file.type === "application/pdf" || file.type.startsWith("image/");
    if (!isValidFile) {
      alert("Please select a PDF or image file");
      event.target.value = "";
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    event.target.value = "";
  };

  const handleBatchFilesSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const validFiles: File[] = [];
    files.forEach((file) => {
      const isValidFile =
        file.type === "application/pdf" || file.type.startsWith("image/");
      if (!isValidFile) {
        alert(`${file.name} is not a valid PDF or image file. Skipping.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} exceeds 10MB. Skipping.`);
        return;
      }
      validFiles.push(file);
    });

    const newItems: PendingUpload[] = validFiles.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      file,
      studentId: "",
    }));

    setPendingUploads((prev) => [...prev, ...newItems]);
    event.target.value = "";
  };

  const handleAssignStudent = (uploadId: string, studentId: string) => {
    setPendingUploads((prev) =>
      prev.map((u) => (u.id === uploadId ? { ...u, studentId } : u))
    );
  };

  const handleRemoveUpload = (uploadId: string) => {
    setPendingUploads((prev) => prev.filter((u) => u.id !== uploadId));
  };

  const handleSingleUpload = async () => {
    if (!selectedFile || !selectedStudentId) {
      alert("Please select a file and assign it to a student");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadEssayFile(
        selectedFile,
        selectedStudentId,
        activity.id,
        programName,
        programSection
      );

      if (result.success) {
        alert("File uploaded successfully!");
        setIsSingleUploadModalOpen(false);
        setSelectedFile(null);
        setSelectedStudentId("");
        // Optionally refresh the page or reload students list
        window.location.reload();
      } else {
        alert(`Failed to upload file: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBatchUpload = async () => {
    const uploadsToSubmit = pendingUploads.filter((u) => u.studentId);
    if (uploadsToSubmit.length === 0) {
      alert("Please assign at least one file to a student");
      return;
    }

    setIsUploading(true);
    try {
      const results = await Promise.all(
        uploadsToSubmit.map((upload) =>
          uploadEssayFile(
            upload.file,
            upload.studentId,
            activity.id,
            programName,
            programSection
          )
        )
      );

      const successCount = results.filter(
        (r: { success: boolean }) => r.success
      ).length;
      const failedCount = results.filter(
        (r: { success: boolean }) => !r.success
      ).length;

      if (failedCount === 0) {
        alert(`${successCount} file(s) uploaded successfully!`);
        setIsBatchUploadModalOpen(false);
        setPendingUploads([]);
        // Optionally refresh the page or reload students list
        window.location.reload();
      } else {
        const errors = results
          .filter((r: { success: boolean }) => !r.success)
          .map((r: { error?: string }) => r.error)
          .join(", ");
        alert(
          `${successCount} file(s) uploaded successfully, ${failedCount} failed. Errors: ${errors}`
        );
        // Remove successful uploads from pending list
        const failedIndices = results
          .map((r: { success: boolean }, i: number) => (!r.success ? i : -1))
          .filter((i: number) => i !== -1);
        setPendingUploads((prev) =>
          prev.filter((_, index) => {
            const uploadIndex = uploadsToSubmit.findIndex(
              (u) => u.id === prev[index]?.id
            );
            return uploadIndex === -1 || !failedIndices.includes(uploadIndex);
          })
        );
      }
    } catch (error) {
      console.error("Batch upload error:", error);
      alert("Failed to upload files. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isValidFile =
      file.type === "application/pdf" || file.type.startsWith("image/");
    if (!isValidFile) {
      alert("Please select a PDF or image file");
      event.target.value = "";
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      event.target.value = "";
      return;
    }

    setUpdateFile(file);
    event.target.value = "";
  };

  const handleUpdateEssay = async () => {
    if (!updateFile || !selectedStudentForUpdate) {
      alert("Please select a file to update");
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateEssayFile(
        updateFile,
        selectedStudentForUpdate.id,
        activity.id,
        programName,
        programSection
      );

      if (result.success) {
        alert("Essay updated successfully!");
        setIsUpdateModalOpen(false);
        setUpdateFile(null);
        setSelectedStudentForUpdate(null);
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        alert(`Failed to update essay: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update essay. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteEssay = async () => {
    if (!selectedStudentForDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteEssay(
        selectedStudentForDelete.id,
        activity.id
      );

      if (result.success) {
        alert("Essay deleted successfully!");
        setIsDeleteModalOpen(false);
        setSelectedStudentForDelete(null);
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        alert(`Failed to delete essay: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete essay. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header with Back Button and Upload Buttons */}
      <div className='flex items-center justify-between gap-4'>
        <Button
          variant='ghost'
          onClick={onBack}
          className='flex items-center gap-2'
        >
          <ArrowLeft className='w-4 h-4' />
          Back to Sections
        </Button>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            onClick={() => setIsSingleUploadModalOpen(true)}
            className='flex items-center gap-2'
          >
            <Upload className='w-4 h-4' />
            Upload Activity
          </Button>
          <Button
            onClick={() => setIsBatchUploadModalOpen(true)}
            className='flex items-center gap-2'
          >
            <Upload className='w-4 h-4' />
            Batch Upload
          </Button>
        </div>
      </div>

      {/* Activity Header */}
      <Card className='p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20'>
        <h1 className='text-2xl font-bold text-neutral-900 mb-2'>
          {activity.title}
        </h1>
        <p className='text-neutral-600 mb-2'>
          {programName} - {programSection}
        </p>
        {activity.description && (
          <p className='text-sm text-neutral-500'>{activity.description}</p>
        )}
      </Card>

      {/* Students Table */}
      <Card>
        <div className='p-4 border-b'>
          <h2 className='text-lg font-semibold text-neutral-900'>Students</h2>
          <p className='text-sm text-neutral-500'>
            {isLoading
              ? "Loading students..."
              : `${students.length} students in this section`}
          </p>
        </div>
        {isLoading ? (
          <div className='p-8 text-center text-neutral-500'>
            Loading students...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead className='text-center'>Status</TableHead>
                <TableHead className='text-center'>Coherence</TableHead>
                <TableHead className='text-center'>Readability</TableHead>
                <TableHead className='text-center'>Argumentative</TableHead>
                <TableHead className='text-center'>Grammar</TableHead>
                <TableHead className='text-center'>Score</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className='font-medium'>{student.name}</TableCell>
                  <TableCell className='text-center'>
                    {student.status === "submitted" ? (
                      <Badge className='bg-success-default/10 text-success-default border-success-default/20'>
                        <CheckCircle2 className='w-3 h-3 mr-1 inline' />
                        Submitted
                      </Badge>
                    ) : (
                      <Badge className='bg-neutral-100 text-neutral-600 border-neutral-200'>
                        <XCircle className='w-3 h-3 mr-1 inline' />
                        Not Submitted
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className='text-center'>
                    {student.coherence !== undefined ? (
                      <span className='font-medium'>{student.coherence}%</span>
                    ) : (
                      <span className='text-neutral-400'>—</span>
                    )}
                  </TableCell>
                  <TableCell className='text-center'>
                    {student.readability !== undefined ? (
                      <span className='font-medium'>
                        {student.readability}%
                      </span>
                    ) : (
                      <span className='text-neutral-400'>—</span>
                    )}
                  </TableCell>
                  <TableCell className='text-center'>
                    {student.argumentative !== undefined ? (
                      <span className='font-medium'>
                        {student.argumentative}%
                      </span>
                    ) : (
                      <span className='text-neutral-400'>—</span>
                    )}
                  </TableCell>
                  <TableCell className='text-center'>
                    {student.grammar !== undefined ? (
                      <span className='font-medium'>{student.grammar}%</span>
                    ) : (
                      <span className='text-neutral-400'>—</span>
                    )}
                  </TableCell>
                  <TableCell className='text-center'>
                    {student.score !== undefined ? (
                      <Badge
                        className={
                          student.score >= 90
                            ? "bg-green-600 text-white"
                            : student.score >= 80
                            ? "bg-blue-600 text-white"
                            : "bg-amber-600 text-white"
                        }
                      >
                        {student.score}%
                      </Badge>
                    ) : (
                      <span className='text-neutral-400'>—</span>
                    )}
                  </TableCell>
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='sm'>
                          <MoreVertical className='w-4 h-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            if (student.status === "submitted") {
                              setSelectedStudentForView({
                                id: student.id,
                                name: student.name,
                              });
                              setIsViewEssayModalOpen(true);
                            } else {
                              alert(
                                "This student has not submitted an essay yet."
                              );
                            }
                          }}
                          disabled={student.status !== "submitted"}
                        >
                          <FileText className='w-4 h-4 mr-2' />
                          View Essay
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            // Grade Essay functionality - placeholder for future implementation
                            alert("Grade Essay feature coming soon!");
                          }}
                          disabled={student.status !== "submitted"}
                        >
                          <Edit className='w-4 h-4 mr-2' />
                          Grade Essay
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            if (student.status === "submitted") {
                              setSelectedStudentForUpdate({
                                id: student.id,
                                name: student.name,
                              });
                              setIsUpdateModalOpen(true);
                            } else {
                              alert(
                                "This student has not submitted an essay yet."
                              );
                            }
                          }}
                          disabled={student.status !== "submitted"}
                        >
                          <RefreshCw className='w-4 h-4 mr-2' />
                          Update Essay
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            if (student.status === "submitted") {
                              setSelectedStudentForDelete({
                                id: student.id,
                                name: student.name,
                              });
                              setIsDeleteModalOpen(true);
                            } else {
                              alert(
                                "This student has not submitted an essay yet."
                              );
                            }
                          }}
                          disabled={student.status !== "submitted"}
                          className='text-error-default focus:text-error-default focus:bg-error-default/10'
                        >
                          <Trash2 className='w-4 h-4 mr-2' />
                          Delete Essay
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Single Upload Modal */}
      <Modal
        isOpen={isSingleUploadModalOpen}
        onClose={() => {
          setIsSingleUploadModalOpen(false);
          setSelectedFile(null);
          setSelectedStudentId("");
        }}
        title='Upload Activity File'
        size='md'
      >
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-neutral-700 mb-1'>
              Select File (PDF / Images)
            </label>
            <input
              type='file'
              accept='.pdf,image/*'
              onChange={handleSingleFileSelect}
              className='block w-full text-sm text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-rd file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-300'
            />
            {selectedFile && (
              <p className='mt-2 text-sm text-neutral-600'>
                Selected:{" "}
                <span className='font-medium'>{selectedFile.name}</span> (
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            <p className='mt-1 text-xs text-neutral-500'>
              Maximum file size: 10MB. Supported formats: PDF, JPG, PNG, GIF
            </p>
          </div>

          <div>
            <label className='block text-sm font-medium text-neutral-700 mb-1'>
              Assign to Student
            </label>
            <Button
              variant='outline'
              onClick={() => handleOpenStudentSelection("single-upload")}
              className='w-full justify-start text-left'
            >
              {selectedStudentId
                ? students.find((s) => s.id === selectedStudentId)?.name ||
                  "Select a student"
                : "Select a student"}
            </Button>
            {availableStudents.length === 0 && (
              <p className='mt-1 text-xs text-neutral-500'>
                All students have already submitted their work.
              </p>
            )}
          </div>

          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button
              variant='outline'
              onClick={() => {
                setIsSingleUploadModalOpen(false);
                setSelectedFile(null);
                setSelectedStudentId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSingleUpload}
              disabled={!selectedFile || !selectedStudentId || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Upload Modal */}
      <Modal
        isOpen={isBatchUploadModalOpen}
        onClose={() => {
          setIsBatchUploadModalOpen(false);
          setPendingUploads([]);
        }}
        title='Batch Upload Activity Files'
        size='lg'
      >
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-neutral-700 mb-1'>
              Select Files (PDF / Images)
            </label>
            <input
              type='file'
              multiple
              accept='.pdf,image/*'
              onChange={handleBatchFilesSelect}
              className='block w-full text-sm text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-rd file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-300'
            />
            <p className='mt-1 text-xs text-neutral-500'>
              Maximum file size: 10MB per file. Supported formats: PDF, JPG,
              PNG, GIF. After selecting files, assign each one to the correct
              student below.
            </p>
          </div>

          {pendingUploads.length > 0 && (
            <div className='border rounded-rd overflow-hidden'>
              <div className='bg-neutral-50 px-4 py-2 border-b'>
                <span className='text-sm font-medium text-neutral-700'>
                  Pending Files ({pendingUploads.length})
                </span>
              </div>
              <div className='max-h-60 overflow-y-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Assign to Student</TableHead>
                      <TableHead className='text-right'>Remove</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUploads.map((upload) => (
                      <TableRow key={upload.id}>
                        <TableCell className='text-sm'>
                          <div className='flex items-center gap-2'>
                            <FileText className='w-4 h-4 text-neutral-500' />
                            <span
                              className='truncate max-w-[200px]'
                              title={upload.file.name}
                            >
                              {upload.file.name}
                            </span>
                            <span className='text-xs text-neutral-500'>
                              ({(upload.file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              handleOpenStudentSelection(upload.id)
                            }
                            className='w-full justify-start text-left'
                          >
                            {upload.studentId
                              ? students.find((s) => s.id === upload.studentId)
                                  ?.name || "Select student"
                              : "Select student"}
                          </Button>
                        </TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleRemoveUpload(upload.id)}
                          >
                            <X className='w-4 h-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button
              variant='outline'
              onClick={() => {
                setIsBatchUploadModalOpen(false);
                setPendingUploads([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchUpload}
              disabled={
                pendingUploads.filter((u) => u.studentId).length === 0 ||
                isUploading
              }
            >
              {isUploading
                ? "Uploading..."
                : `Upload ${
                    pendingUploads.filter((u) => u.studentId).length
                  } File(s)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Student Selection Modal for Batch Upload */}
      <Modal
        isOpen={isStudentSelectionModalOpen}
        onClose={handleCloseStudentSelectionModal}
        title='Select Student'
        size='md'
      >
        <div className='space-y-4'>
          <p className='text-sm text-neutral-600'>
            Select a student to assign to this file. Students who have already
            submitted or are already assigned are disabled.
          </p>

          <div className='border border-neutral-300 rounded-lg overflow-hidden max-h-96 overflow-y-auto'>
            {students.map((student) => {
              const isSubmitted = student.status === "submitted";
              const assignedStudentIds = getAssignedStudentIds(
                currentUploadIdForSelection
              );
              const isAlreadyAssigned = assignedStudentIds.includes(student.id);
              const isDisabled = isSubmitted || isAlreadyAssigned;

              // Check if currently selected - handle both single and batch upload
              let isCurrentlySelected = false;
              if (currentUploadIdForSelection === "single-upload") {
                isCurrentlySelected = selectedStudentId === student.id;
              } else {
                const currentUpload = pendingUploads.find(
                  (u) => u.id === currentUploadIdForSelection
                );
                isCurrentlySelected = currentUpload?.studentId === student.id;
              }

              return (
                <button
                  key={student.id}
                  onClick={() => {
                    if (!isDisabled) {
                      handleSelectStudentFromModal(student.id);
                    }
                  }}
                  disabled={isDisabled}
                  className={`w-full px-4 py-3 text-left border-b border-neutral-200 last:border-b-0 transition-colors ${
                    isCurrentlySelected
                      ? "bg-primary/10 border-l-4 border-l-primary"
                      : isDisabled
                      ? "bg-neutral-50 text-neutral-400 cursor-not-allowed"
                      : "hover:bg-neutral-50 cursor-pointer"
                  }`}
                >
                  <div className='flex items-center justify-between'>
                    <span
                      className={`font-medium ${
                        isDisabled ? "text-neutral-400" : "text-neutral-900"
                      }`}
                    >
                      {student.name}
                    </span>
                    <div className='flex items-center gap-2'>
                      {isSubmitted && (
                        <Badge className='bg-yellow-100 text-yellow-800 border-yellow-300 text-xs'>
                          Already Submitted
                        </Badge>
                      )}
                      {isAlreadyAssigned && !isSubmitted && (
                        <Badge className='bg-neutral-200 text-neutral-600 border-neutral-300 text-xs'>
                          Already Assigned
                        </Badge>
                      )}
                      {isCurrentlySelected && (
                        <Badge className='bg-primary/20 text-primary border-primary/30 text-xs'>
                          Selected
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button
              variant='outline'
              onClick={handleCloseStudentSelectionModal}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Essay Modal */}
      {selectedStudentForView && (
        <ViewEssayModal
          isOpen={isViewEssayModalOpen}
          onClose={() => {
            setIsViewEssayModalOpen(false);
            setSelectedStudentForView(null);
          }}
          studentId={selectedStudentForView.id}
          studentName={selectedStudentForView.name}
          activityId={activity.id}
        />
      )}

      {/* Update Essay Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setUpdateFile(null);
          setSelectedStudentForUpdate(null);
        }}
        title={`Update Essay - ${selectedStudentForUpdate?.name}`}
        size='md'
      >
        <div className='space-y-4'>
          <div>
            <p className='text-sm text-neutral-600 mb-4'>
              Select a new file to replace the existing submission. This will
              remove the current file and reset all analysis scores.
            </p>
            <label className='block text-sm font-medium text-neutral-700 mb-1'>
              Select New File (PDF / Images)
            </label>
            <input
              type='file'
              accept='.pdf,image/*'
              onChange={handleUpdateFileSelect}
              className='block w-full text-sm text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-rd file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-300'
            />
            {updateFile && (
              <p className='mt-2 text-sm text-neutral-600'>
                Selected: <span className='font-medium'>{updateFile.name}</span>{" "}
                ({(updateFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            <p className='mt-1 text-xs text-neutral-500'>
              Maximum file size: 10MB. Supported formats: PDF, JPG, PNG, GIF
            </p>
          </div>

          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button
              variant='outline'
              onClick={() => {
                setIsUpdateModalOpen(false);
                setUpdateFile(null);
                setSelectedStudentForUpdate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateEssay}
              disabled={!updateFile || isUpdating}
            >
              {isUpdating ? "Updating..." : "Update Essay"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Essay Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedStudentForDelete(null);
        }}
        title='Delete Essay Submission'
        size='md'
      >
        <div className='space-y-4'>
          <p className='text-sm text-neutral-600'>
            Are you sure you want to delete the essay submission for{" "}
            <span className='font-semibold text-neutral-900'>
              {selectedStudentForDelete?.name}
            </span>
            ? This action cannot be undone and will permanently remove the file
            and all associated analysis data.
          </p>

          <div className='bg-warning-default/10 border border-warning-default/20 rounded-md p-3'>
            <p className='text-sm text-warning-default font-medium'>
              ⚠️ Warning: This will delete the essay file and all analysis
              results permanently.
            </p>
          </div>

          <div className='flex justify-end gap-2 pt-4 border-t'>
            <Button
              variant='outline'
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedStudentForDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteEssay}
              disabled={isDeleting}
              className='bg-error-default hover:bg-error-dark text-white'
            >
              {isDeleting ? "Deleting..." : "Delete Essay"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
