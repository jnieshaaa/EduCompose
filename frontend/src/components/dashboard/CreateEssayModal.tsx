import React, { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { essayApi } from "../../api";
import type { Essay } from "../../types/Essay";

interface CreateEssayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newEssay: Essay) => void;
}

interface FormState {
  title: string;
  content: string;
  studentId: string;
  classId: string;
}

const initialFormState: FormState = {
  title: "",
  content: "",
  studentId: "",
  classId: "",
};

const CreateEssayModal: React.FC<CreateEssayModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormState(initialFormState);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleChange = (field: keyof FormState) => (value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { title, content, studentId, classId } = formState;

    if (
      !title.trim() ||
      !content.trim() ||
      !studentId.trim() ||
      !classId.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    const parsedStudentId = studentId;
    const parsedClassId = classId;

    if (!parsedStudentId || !parsedClassId) {
      setError("Student ID and Class ID are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      content: content.trim(),
      student_id: parsedStudentId,
      class_id: parsedClassId,
    };

    try {
      const createdEssay = await essayApi.createEssay(payload);
      onCreated(createdEssay);
      onClose();
    } catch (apiError) {
      console.error(
        "Error creating essay via API, using local fallback:",
        apiError,
      );
      const fallbackEssay: Essay = {
        id: String(Date.now()),
        student_id: parsedStudentId,
        user_id: "1",
        class_id: parsedClassId,
        title: payload.title,
        content: payload.content,
        submitted_at: new Date().toISOString(),
        status: "submitted",
      };
      onCreated(fallbackEssay);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Essay" size="lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Essay Title"
            value={formState.title}
            onChange={handleChange("title")}
            placeholder="Enter essay title..."
            required
          />
          <Input
            label="Student ID"
            value={formState.studentId}
            onChange={handleChange("studentId")}
            placeholder="Enter student ID..."
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Class ID"
            value={formState.classId}
            onChange={handleChange("classId")}
            placeholder="Enter class ID..."
            required
          />
          2
        </div>

        <Input
          label="Essay Content"
          value={formState.content}
          onChange={handleChange("content")}
          placeholder="Paste or type the essay content..."
          type="textarea"
          rows={6}
          required
        />

        {error && (
          <p className="text-sm text-error-default bg-error-50 border border-error-default/20 rounded-rd px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              isSubmitting ||
              !formState.title.trim() ||
              !formState.content.trim() ||
              !formState.studentId.trim() ||
              !formState.classId.trim()
            }
          >
            {isSubmitting ? "Adding..." : "Add Essay"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateEssayModal;
