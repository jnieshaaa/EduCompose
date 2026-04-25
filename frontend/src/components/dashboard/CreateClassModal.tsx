import React, { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { classApi } from "../../api";
import type { Class } from "../../types/Essay";

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newClass: Class) => void;
}

const CreateClassModal: React.FC<CreateClassModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Class name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
    };

    try {
      const createdClass = await classApi.createClass(payload);
      onCreated(createdClass);
      onClose();
    } catch (apiError) {
      console.error(
        "Error creating class via API, using local fallback:",
        apiError,
      );
      const fallbackClass: Class = {
        id: String(Date.now()),
        name: payload.name,
        description: payload.description,
        user_id: '1',
        created_at: new Date().toISOString(),
        is_active: true,
      };
      onCreated(fallbackClass);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Class" size="md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Class Name"
          value={name}
          onChange={(value) => {
            setName(value);
            setError(null);
          }}
          placeholder="Enter class name..."
          required
        />

        <Input
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Enter class description..."
          type="textarea"
          rows={3}
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
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? "Creating..." : "Create Class"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateClassModal;
