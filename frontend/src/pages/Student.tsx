//Student.tsx

import { useState, useMemo, useEffect, useRef, type ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
} from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";

type Student = {
  id: string;
  name: string;
  blockId: string;
  activityId?: string | null;
};

type StudentFormState = {
  surname: string;
  firstName: string;
  middleInitial: string;
  blockId: string;
};

const hasMinimumLetterCount = (value: string, minimum = 3) => {
  return value.replace(/[^a-zA-Z]/g, "").length >= minimum;
};

const areNameSegmentsDifferent = (a: string, b: string) => {
  return a.trim().toLowerCase() !== b.trim().toLowerCase();
};

const getSortableNameParts = (fullName: string) => {
  if (!fullName) return { surname: "", given: "" };
  const [surnamePart, remainderPart] = fullName.split(",");
  return {
    surname: (surnamePart || "").trim().toLowerCase(),
    given: (remainderPart || "").trim().toLowerCase(),
  };
};

type BlockType = {
  id: string;
  name: string;
  programId: string;
};

interface BlockPageProps {
  programId: string;
  programName: string;
  blocks: BlockType[];
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

export default function BlockPage({
  programId,
  programName,
  blocks,
  students,
  setStudents,
}: BlockPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activityId = searchParams.get("activityId");
  const activityBlockId = searchParams.get("blockId") ?? undefined;
  const blockName = searchParams.get("blockName") ?? "";
  const activityTitle = searchParams.get("activityTitle") ?? "";
  const headerTitle = blockName || activityTitle || programName;
  const secondaryTitle =
    blockName && activityTitle && blockName !== activityTitle
      ? activityTitle
      : "";

  // State
  const [selectedBlock] = useState<string>(
    () => searchParams.get("blockId") ?? "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const createEmptyStudentForm = (): StudentFormState => ({
    surname: "",
    firstName: "",
    middleInitial: "",
    blockId: activityBlockId ?? "",
  });

  const openAddStudentModal = () => {
    setCsvImportResult(null);
    setStudentError("");
    setNewStudentForm(createEmptyStudentForm());
    setShowAddStudentModal(true);
  };

  // Keep URL in sync when a specific block filter is selected
  useEffect(() => {
    if (selectedBlock === "all") {
      return;
    }
    const block = blocks.find((b) => b.id === selectedBlock);
    if (!block) return;
    const currentBlockId = searchParams.get("blockId");
    const currentBlockName = searchParams.get("blockName");
    if (currentBlockId === selectedBlock && currentBlockName === block.name) {
      return;
    }
    const newParams = new URLSearchParams(searchParams);
    newParams.set("blockId", selectedBlock);
    newParams.set("blockName", block.name);
    setSearchParams(newParams, { replace: true });
  }, [selectedBlock, blocks, searchParams, setSearchParams]);

  useEffect(() => {
    setSelectedStudentIds((prev) =>
      prev.filter((id) => students.some((student) => student.id === id))
    );
  }, [students]);

  // Modals
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [newStudentForm, setNewStudentForm] = useState(createEmptyStudentForm);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingStudentForm, setEditingStudentForm] =
    useState<StudentFormState | null>(null);
  const [studentError, setStudentError] = useState("");
  const [editStudentError, setEditStudentError] = useState("");

  const [deleteId, setDeleteId] = useState<string>("");
  const [deleteName, setDeleteName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvImportResult, setCsvImportResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [pendingDeleteStudentIds, setPendingDeleteStudentIds] = useState<
    string[]
  >([]);

  // Filter blocks for this program
  const programBlocks = useMemo(() => {
    return blocks.filter((b) => b.programId === programId);
  }, [blocks, programId]);

  const resolveBlockIdFromCsv = (rawValue: string) => {
    if (!rawValue) return "";
    const normalized = rawValue.trim().toLowerCase();
    const byId = programBlocks.find(
      (block) => block.id.toLowerCase() === normalized
    );
    if (byId) return byId.id;
    const byName = programBlocks.find(
      (block) => block.name.trim().toLowerCase() === normalized
    );
    return byName ? byName.id : "";
  };

  const parseCsvLine = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    cells.push(current.trim());
    return cells;
  };

  const handleCsvImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleCsvFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    if (!activityId) {
      setCsvImportResult({
        type: "error",
        message: "Importing students requires an activity context.",
      });
      return;
    }

    try {
      const rawLines = await file.text();
      const lines = rawLines
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);

      if (lines.length < 2) {
        setCsvImportResult({
          type: "error",
          message:
            "The CSV file must include a header row and at least one data row.",
        });
        return;
      }

      const headerCells = parseCsvLine(lines[0]);
      const normalizeHeader = (header: string) =>
        header
          .replace(/\uFEFF/g, "")
          .replace(/[^a-z]/gi, "")
          .toLowerCase();

      const surnameHeaderAliases = new Set([
        "Surname",
        "surname",
        "SURNAME",
        "LastName",
        "lastName",
        "lastname",
        "LASTNAME",
        "Last_Name",
        "last_name",
        "LAST_NAME",
        "LAST NAME",
        "FamilyName",
        "familyName",
        "familyname",
        "FAMILYNAME",
        "Family_Name",
        "family_name",
        "FAMILY_NAME",
      ]);

      const firstNameHeaderAliases = new Set([
        "FirstName",
        "firstname",
        "FIRSTNAME",
        "First_Name",
        "first_name",
        "FIRST_NAME",
        "First Name",
        "first name",
        "FIRST NAME",
        "GivenName",
        "givenName",
        "givenname",
        "GIVENNAME",
        "Given_Name",
        "given_name",
        "GIVEN_NAME",
      ]);

      const middleHeaderAliases = new Set([
        "MiddleName",
        "middleName",
        "middlename",
        "Middlename",
        "MIDDLE NAME",
        "MIDDLE_NAME",
        "middle_name",
        "Middle Initial",
        "MI",
        "mi",
        "Middle_Initial",
        "middle_initial",
        "MIDDLE_INITIAL",
      ]);

      const findHeaderIndex = (aliases: Set<string>) =>
        headerCells.findIndex((cell) => aliases.has(normalizeHeader(cell)));

      const surnameIdx = findHeaderIndex(surnameHeaderAliases);
      const firstNameIdx = findHeaderIndex(firstNameHeaderAliases);
      const middleIdx = findHeaderIndex(middleHeaderAliases);
      const blockIdx = headerCells.findIndex((cell) => {
        const normalized = normalizeHeader(cell);
        return normalized.startsWith("block");
      });

      if (surnameIdx === -1 || firstNameIdx === -1) {
        setCsvImportResult({
          type: "error",
          message:
            "CSV header must include at least Surname and First Name columns.",
        });
        return;
      }

      if (!activityBlockId && blockIdx === -1) {
        setCsvImportResult({
          type: "error",
          message:
            "Include a Block column in the CSV when importing outside of a specific activity.",
        });
        return;
      }

      const existingNames = new Set(
        students
          .filter((s) => s.activityId === activityId)
          .map((s) => s.name.trim().toLowerCase())
      );
      const newStudents: Student[] = [];
      const pendingNames = new Set<string>();
      const rowErrors: string[] = [];

      lines.slice(1).forEach((line, index) => {
        const values = parseCsvLine(line);
        if (values.every((value) => value.trim().length === 0)) {
          return;
        }

        const surname = formatNameSegment(values[surnameIdx] ?? "");
        const firstName = formatNameSegment(values[firstNameIdx] ?? "");
        const middleInitial =
          middleIdx >= 0 ? formatMiddleInitial(values[middleIdx] ?? "") : "";

        if (!surname || !firstName) {
          rowErrors.push(
            `Row ${index + 2}: Missing surname or first name values.`
          );
          return;
        }

        if (!hasMinimumLetterCount(surname)) {
          rowErrors.push(
            `Row ${index + 2}: Surname must contain at least 3 letters.`
          );
          return;
        }

        if (!hasMinimumLetterCount(firstName)) {
          rowErrors.push(
            `Row ${index + 2}: First name must contain at least 3 letters.`
          );
          return;
        }

        if (!areNameSegmentsDifferent(surname, firstName)) {
          rowErrors.push(
            `Row ${index + 2}: Surname and first name must be different.`
          );
          return;
        }

        const fullName = buildStudentNameFromFields({
          surname,
          firstName,
          middleInitial,
        });
        const validationError = validateStudentName(fullName);
        if (validationError) {
          rowErrors.push(`Row ${index + 2}: ${validationError}`);
          return;
        }

        let blockId = activityBlockId ?? "";
        if (!blockId) {
          const rawBlockValue =
            blockIdx >= 0 ? (values[blockIdx] ?? "").trim() : "";
          blockId = resolveBlockIdFromCsv(rawBlockValue);
          if (!blockId) {
            rowErrors.push(
              `Row ${index + 2}: Block "${
                rawBlockValue || "(empty)"
              }" is not valid for this program.`
            );
            return;
          }
        }

        const normalizedName = fullName.trim().toLowerCase();
        if (
          existingNames.has(normalizedName) ||
          pendingNames.has(normalizedName)
        ) {
          rowErrors.push(
            `Row ${index + 2}: Duplicate student "${fullName}" detected.`
          );
          return;
        }

        pendingNames.add(normalizedName);
        newStudents.push({
          id: `student-${Date.now()}-${index}`,
          name: fullName,
          blockId,
          activityId,
        });
      });

      if (newStudents.length) {
        setStudents((prev) => [...prev, ...newStudents]);
      }

      if (newStudents.length && rowErrors.length === 0) {
        setCsvImportResult({
          type: "success",
          message: `Imported ${newStudents.length} student${
            newStudents.length === 1 ? "" : "s"
          } from ${file.name}.`,
        });
        return;
      }

      if (newStudents.length && rowErrors.length > 0) {
        const details = rowErrors.slice(0, 3).join(" ");
        setCsvImportResult({
          type: "success",
          message: `Imported ${newStudents.length} student${
            newStudents.length === 1 ? "" : "s"
          }, but ${rowErrors.length} row${
            rowErrors.length === 1 ? "" : "s"
          } were skipped. ${details}${
            rowErrors.length > 3
              ? ` (+${rowErrors.length - 3} more issues)`
              : ""
          }`,
        });
        return;
      }

      setCsvImportResult({
        type: "error",
        message:
          rowErrors.slice(0, 3).join(" ") ||
          "No valid student rows were found in the uploaded CSV.",
      });
    } catch (error) {
      console.error("Error importing CSV:", error);
      setCsvImportResult({
        type: "error",
        message: "Failed to read the CSV file. Please try again.",
      });
    }
  };

  // Filter students based on selected block and search query, and sort by surname
  const filteredStudents = useMemo(() => {
    const filtered = students.filter((student) => {
      const block = blocks.find((b) => b.id === student.blockId);
      if (!block || block.programId !== programId) return false;

      if (activityId && student.activityId !== activityId) {
        return false;
      }

      const matchesBlock =
        selectedBlock === "all" || student.blockId === selectedBlock;
      const matchesSearch = student.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesBlock && matchesSearch;
    });

    return filtered.sort((a, b) => {
      const nameA = getSortableNameParts(a.name);
      const nameB = getSortableNameParts(b.name);

      if (nameA.surname === nameB.surname) {
        return nameA.given.localeCompare(nameB.given);
      }

      return nameA.surname.localeCompare(nameB.surname);
    });
  }, [students, blocks, programId, selectedBlock, searchQuery, activityId]);

  const visibleStudentIds = useMemo(
    () => filteredStudents.map((student) => student.id),
    [filteredStudents]
  );

  const areAllVisibleSelected =
    visibleStudentIds.length > 0 &&
    visibleStudentIds.every((id) => selectedStudentIds.includes(id));

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const exitDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedStudentIds([]);
    setPendingDeleteStudentIds([]);
  };

  const handleSelectAllVisibleStudents = (visibleIds: string[]) => {
    if (visibleIds.length === 0) {
      setSelectedStudentIds([]);
      return;
    }

    const alreadySelected = visibleIds.every((id) =>
      selectedStudentIds.includes(id)
    );
    setSelectedStudentIds(alreadySelected ? [] : visibleIds);
  };

  const handleDeleteStudents = (studentIds: string[]) => {
    if (studentIds.length === 0) return;
    setStudents((prev) => prev.filter((s) => !studentIds.includes(s.id)));
  };

  const handleRemoveStudentsAction = () => {
    if (filteredStudents.length === 0) {
      return;
    }

    if (!isDeleteMode) {
      setIsDeleteMode(true);
      return;
    }

    if (selectedStudentIds.length === 0) {
      exitDeleteMode();
      return;
    }

    const selectedNames = students
      .filter((student) => selectedStudentIds.includes(student.id))
      .map((student) => student.name);

    setPendingDeleteStudentIds(selectedStudentIds);
    setDeleteId(selectedStudentIds[0] ?? "");
    setDeleteName(
      selectedNames.length === 1
        ? selectedNames[0]
        : `${selectedNames.length} selected students`
    );
    setShowDeleteConfirm(true);
  };

  const handleStudentRowInteraction = (student: Student) => {
    if (isDeleteMode) {
      toggleStudentSelection(student.id);
      return;
    }
    handleEditStudent(student);
  };

  const formatNameSegment = (value: string): string => {
    if (!value) return value;

    const formatted = value
      .split(/([\s'-]+)/)
      .map((part) => {
        if (/^[\s'-]+$/.test(part) || part.length === 0) {
          return part;
        }

        return part
          .split(/([-'])/)
          .map((chunk) => {
            if (/^[-']$/.test(chunk) || chunk.length === 0) {
              return chunk;
            }
            return chunk[0].toUpperCase() + chunk.slice(1).toLowerCase();
          })
          .join("");
      })
      .join("")
      .replace(/\s{2,}/g, " ");

    return formatted.trimStart();
  };

  const formatMiddleInitial = (value: string): string => {
    const cleaned = value.replace(/[^a-zA-Z]/g, "").slice(0, 1);
    return cleaned.toUpperCase();
  };

  const buildStudentNameFromFields = ({
    surname,
    firstName,
    middleInitial,
  }: Pick<StudentFormState, "surname" | "firstName" | "middleInitial">) => {
    const trimmedSurname = surname.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedMI = middleInitial.trim().replace(".", "");
    if (!trimmedSurname || !trimmedFirstName) {
      return "";
    }
    const formattedMI = trimmedMI ? `${trimmedMI[0].toUpperCase()}.` : "";
    return formattedMI
      ? `${trimmedSurname}, ${trimmedFirstName} ${formattedMI}`
      : `${trimmedSurname}, ${trimmedFirstName}`;
  };

  const parseStudentNameToForm = (
    fullName: string,
    blockId: string
  ): StudentFormState => {
    if (!fullName) {
      return {
        surname: "",
        firstName: "",
        middleInitial: "",
        blockId,
      };
    }

    const [surnamePart, ...restParts] = fullName.split(",");
    const surname = formatNameSegment(surnamePart ?? "");
    const remainder = restParts.join(",").trim();

    let firstName = "";
    let middleInitial = "";

    if (remainder) {
      const tokens = remainder.split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        const possibleMI = tokens[tokens.length - 1];
        if (/^[A-Za-z]\.?$/.test(possibleMI)) {
          middleInitial = formatMiddleInitial(possibleMI);
          tokens.pop();
        }
        firstName = formatNameSegment(tokens.join(" "));
      }
    }

    return {
      surname,
      firstName,
      middleInitial,
      blockId,
    };
  };

  const validateStudentName = (name: string): string | null => {
    const trimmed = name.trim();

    if (trimmed.length < 5) {
      return "Student name must be at least 5 characters long";
    }

    const allowedPattern = /^[a-zA-Z\s.,'-]+$/;
    if (!allowedPattern.test(trimmed)) {
      return "Student name can only contain letters, spaces, commas, periods, apostrophes, and hyphens";
    }

    const [rawSurname, ...restParts] = trimmed.split(",");
    if (!restParts.length) {
      return 'Use the format "Surname, First name M." (e.g., Dela Cruz, Juan A.).';
    }

    const surname = rawSurname.trim();
    const remainder = restParts.join(",").trim();

    if (!surname || !remainder) {
      return "Include a surname and first name (e.g., Dela Cruz, Juan A.).";
    }

    if (!hasMinimumLetterCount(surname)) {
      return "Surname must contain at least 3 letters.";
    }

    const remainderTokens = remainder.split(/\s+/).filter(Boolean);
    if (remainderTokens.length === 0) {
      return "Include the first name after the comma (e.g., Dela Cruz, Juan).";
    }

    let firstNameTokens = remainderTokens;
    let miToken = "";
    const potentialMi = remainderTokens[remainderTokens.length - 1];

    if (/^[A-Za-z]\.?$/.test(potentialMi)) {
      miToken = potentialMi.toUpperCase().replace(".", "") + ".";
      firstNameTokens = remainderTokens.slice(0, -1);
      if (firstNameTokens.length === 0) {
        return "Include the first name before the middle initial (e.g., Dela Cruz, Juan A.).";
      }
    }

    const firstName = firstNameTokens.join(" ");

    const isTitleCaseSegment = (segment: string) =>
      segment
        .split(/\s+/)
        .filter(Boolean)
        .every((word) => /^[A-Z][a-zA-Z'.-]*$/.test(word));

    if (!isTitleCaseSegment(surname)) {
      return "Surname must be in title case (e.g., Dela Cruz).";
    }

    if (!hasMinimumLetterCount(firstName)) {
      return "First name must contain at least 3 letters.";
    }

    if (!isTitleCaseSegment(firstName)) {
      return "First name must be in title case (e.g., Juan).";
    }

    if (!areNameSegmentsDifferent(surname, firstName)) {
      return "Surname and first name must be different.";
    }

    if (miToken && !/^[A-Z]\.?$/.test(miToken)) {
      return "Middle initial must be a single capital letter (optionally followed by a period).";
    }

    return null;
  };

  const handleNewStudentFieldChange = (
    field: keyof StudentFormState,
    value: string
  ) => {
    let formattedValue = value;
    if (field === "surname" || field === "firstName") {
      formattedValue = formatNameSegment(value);
    } else if (field === "middleInitial") {
      formattedValue = formatMiddleInitial(value);
    }
    setNewStudentForm((prev) => ({ ...prev, [field]: formattedValue }));
    setStudentError("");
  };

  const handleEditingStudentFieldChange = (
    field: keyof StudentFormState,
    value: string
  ) => {
    if (!editingStudentForm) return;
    let formattedValue = value;
    if (field === "surname" || field === "firstName") {
      formattedValue = formatNameSegment(value);
    } else if (field === "middleInitial") {
      formattedValue = formatMiddleInitial(value);
    }
    setEditingStudentForm((prev) =>
      prev ? { ...prev, [field]: formattedValue } : prev
    );
    setEditStudentError("");
  };

  const handleAddStudent = () => {
    if (!activityId) {
      setStudentError(
        "Missing activity context. Please open this view from an activity card."
      );
      return;
    }

    const trimmedSurname = newStudentForm.surname.trim();
    const trimmedFirstName = newStudentForm.firstName.trim();
    const requiredBlockId = activityBlockId ?? newStudentForm.blockId;
    if (!trimmedSurname || !trimmedFirstName || !requiredBlockId) {
      setStudentError(
        "Please provide the surname, first name, and block for the student."
      );
      return;
    }

    if (!hasMinimumLetterCount(trimmedSurname)) {
      setStudentError("Surname must contain at least 3 letters.");
      return;
    }

    if (!hasMinimumLetterCount(trimmedFirstName)) {
      setStudentError("First name must contain at least 3 letters.");
      return;
    }

    if (!areNameSegmentsDifferent(trimmedSurname, trimmedFirstName)) {
      setStudentError("Surname and first name must be different.");
      return;
    }

    const fullName = buildStudentNameFromFields(newStudentForm);

    // Validate student name format
    const nameValidationError = validateStudentName(fullName);
    if (nameValidationError) {
      setStudentError(nameValidationError);
      return;
    }

    // Check for duplicate student name (case-insensitive) within this activity
    const duplicateExists = students.some(
      (s) =>
        s.activityId === activityId &&
        s.name.trim().toLowerCase() === fullName.toLowerCase()
    );

    if (duplicateExists) {
      setStudentError(
        "A student with this name already exists in this activity!"
      );
      return;
    }

    const student: Student = {
      id: `student-${Date.now()}`,
      name: fullName,
      blockId: requiredBlockId,
      activityId,
    };
    setStudents((prev) => [...prev, student]);
    setNewStudentForm(createEmptyStudentForm());
    setStudentError("");
    setShowAddStudentModal(false);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setEditingStudentForm(
      parseStudentNameToForm(student.name, student.blockId)
    );
    setEditStudentError("");
    setShowEditStudentModal(true);
  };

  const handleUpdateStudent = () => {
    if (!editingStudent || !editingStudentForm) return;

    const trimmedSurname = editingStudentForm.surname.trim();
    const trimmedFirstName = editingStudentForm.firstName.trim();

    if (!trimmedSurname || !trimmedFirstName) {
      setEditStudentError("Surname and first name are required.");
      return;
    }

    if (!hasMinimumLetterCount(trimmedSurname)) {
      setEditStudentError("Surname must contain at least 3 letters.");
      return;
    }

    if (!hasMinimumLetterCount(trimmedFirstName)) {
      setEditStudentError("First name must contain at least 3 letters.");
      return;
    }

    if (!areNameSegmentsDifferent(trimmedSurname, trimmedFirstName)) {
      setEditStudentError("Surname and first name must be different.");
      return;
    }

    const fullName = buildStudentNameFromFields(editingStudentForm);

    // Validate student name format
    const nameValidationError = validateStudentName(fullName);
    if (nameValidationError) {
      setEditStudentError(nameValidationError);
      return;
    }

    // Check for duplicate student name (case-insensitive) within this activity, excluding current student
    const duplicateExists = students.some(
      (s) =>
        s.id !== editingStudent.id &&
        s.activityId === editingStudent.activityId &&
        s.name.trim().toLowerCase() === fullName.toLowerCase()
    );

    if (duplicateExists) {
      setEditStudentError(
        "A student with this name already exists in this activity!"
      );
      return;
    }

    setStudents((prev) =>
      prev.map((s) =>
        s.id === editingStudent.id ? { ...editingStudent, name: fullName } : s
      )
    );
    setEditingStudent(null);
    setEditingStudentForm(null);
    setEditStudentError("");
    setShowEditStudentModal(false);
  };

  const hasEditingChanges = (() => {
    if (!editingStudent || !editingStudentForm) return false;
    const parsedOriginal = parseStudentNameToForm(
      editingStudent.name,
      editingStudent.blockId
    );
    return (
      parsedOriginal.surname !== editingStudentForm.surname ||
      parsedOriginal.firstName !== editingStudentForm.firstName ||
      parsedOriginal.middleInitial !== editingStudentForm.middleInitial
    );
  })();

  const confirmDelete = (id: string, name: string) => {
    setPendingDeleteStudentIds([id]);
    setDeleteId(id);
    setDeleteName(name);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    const idsToDelete =
      pendingDeleteStudentIds.length > 0
        ? pendingDeleteStudentIds
        : deleteId
        ? [deleteId]
        : [];

    handleDeleteStudents(idsToDelete);
    setShowDeleteConfirm(false);
    setDeleteId("");
    setDeleteName("");
    setPendingDeleteStudentIds([]);
    setSelectedStudentIds((prev) =>
      prev.filter((id) => !idsToDelete.includes(id))
    );
    if (isDeleteMode) {
      exitDeleteMode();
    }
    if (editingStudent && idsToDelete.includes(editingStudent.id)) {
      setEditingStudent(null);
      setShowEditStudentModal(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
        <div className='flex items-center gap-4 flex-wrap'>
          <div className='min-w-0'>
            <h1
              className='text-3xl font-bold text-neutral-900 truncate'
              title={secondaryTitle || headerTitle}
            >
              {secondaryTitle}
            </h1>

            <p className='text-sm text-neutral-600'>
              Total Students:{" "}
              <span className='font-semibold'>{filteredStudents.length}</span>
            </p>
          </div>
        </div>

        <div className='flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:justify-end'>
          <div className='relative flex-1 min-w-[200px] sm:max-w-xs'>
            <Search className='w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search students...'
              className='pl-9 pr-4 py-2 rounded-rd border border-neutral-300 bg-white w-full focus:outline-none focus:ring-2 focus:ring-primary'
            />
          </div>
          <div className='flex flex-wrap gap-3 justify-end'>
            <Button
              variant='primary'
              size='sm'
              onClick={openAddStudentModal}
              disabled={programBlocks.length === 0 || isDeleteMode}
              className={isDeleteMode ? "opacity-70 cursor-not-allowed" : ""}
            >
              <UserPlus className='w-4 h-4 mr-2' />
              Add Student
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleRemoveStudentsAction}
              disabled={filteredStudents.length === 0}
              className={`text-error-default ${
                isDeleteMode
                  ? "border border-error-default/40 bg-error-default/10"
                  : ""
              } ${
                filteredStudents.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              Remove Student
              {isDeleteMode && selectedStudentIds.length > 0
                ? ` (${selectedStudentIds.length})`
                : ""}
            </Button>
            {isDeleteMode && (
              <>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() =>
                    handleSelectAllVisibleStudents(visibleStudentIds)
                  }
                  disabled={visibleStudentIds.length === 0}
                  aria-pressed={areAllVisibleSelected}
                  className='border border-primary/30 bg-primary/5 text-primary'
                >
                  Select All
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={exitDeleteMode}
                  className='text-neutral-600'
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {isDeleteMode && (
        <p className='text-sm text-error-default'>
          Select the students you want to remove, then press Remove Student
          again to confirm.
        </p>
      )}

      {/* Student List Card */}
      <Card>
        {/* Table Header */}
        <div className='hidden md:grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-neutral-500 border-b border-neutral-200 bg-neutral-50 rounded-t-rd'>
          <div className='col-span-8'>Name</div>
          <div className='col-span-4'>Essay</div>
        </div>

        {/* Student Rows */}
        <div className='divide-y divide-neutral-100'>
          <AnimatePresence>
            {filteredStudents.map((student, index) => {
              const isSelected = selectedStudentIds.includes(student.id);
              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-4 transition-colors ${
                    isDeleteMode
                      ? "hover:bg-primary/5 cursor-pointer"
                      : "hover:bg-neutral-50/50 cursor-pointer"
                  } ${
                    isDeleteMode && isSelected
                      ? "bg-primary/5 ring-1 ring-primary/30"
                      : ""
                  }`}
                  onClick={() => handleStudentRowInteraction(student)}
                >
                  <div className='col-span-8 flex items-center gap-3 group'>
                    {isDeleteMode && (
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-white"
                            : "border-neutral-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className='w-3 h-3' />}
                      </div>
                    )}
                    <div className='flex items-center gap-2'>
                      <p className='font-medium text-neutral-900 group-hover:text-primary transition-colors'>
                        {student.name}
                      </p>
                      {!isDeleteMode && (
                        <Pencil className='w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity' />
                      )}
                    </div>
                  </div>
                  <div className='col-span-4'>
                    <span className='text-sm text-neutral-500'>
                      No essay yet
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredStudents.length === 0 && (
          <div className='text-center py-12'>
            <Users className='w-16 h-16 text-neutral-300 mx-auto mb-4' />
            <h4 className='text-lg font-semibold text-neutral-900 mb-2'>
              {programBlocks.length === 0
                ? "No blocks available"
                : "No students found"}
            </h4>

            <p className='text-neutral-500 mb-4'>
              {programBlocks.length === 0
                ? "Create blocks from the Blocks view before adding students to this activity."
                : searchQuery || selectedBlock !== "all"
                ? "Try adjusting your filters or search query"
                : "Add your first student to get started"}
            </p>

            <Button
              variant='primary'
              onClick={openAddStudentModal}
              disabled={programBlocks.length === 0}
            >
              <UserPlus className='w-4 h-4 mr-2' />
              Add Student
            </Button>
          </div>
        )}
      </Card>

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddStudentModal}
        onClose={() => {
          setShowAddStudentModal(false);
          setStudentError("");
          setNewStudentForm(createEmptyStudentForm());
          setCsvImportResult(null);
        }}
        title='Add Student'
      >
        <div className='space-y-4'>
          <div className='rounded-rd border border-dashed border-neutral-300 bg-neutral-50 p-4 space-y-3'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <p className='text-sm font-semibold text-neutral-900'>
                  Import students from CSV
                </p>
                <p className='text-xs text-neutral-500'>
                  Include headers: Surname, First Name, Middle Initial
                  (optional)
                  {!activityBlockId ? ", Block" : ""}.
                </p>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleCsvImportClick}
              >
                Import .csv
              </Button>
            </div>
            {csvImportResult && (
              <p
                className={`text-xs ${
                  csvImportResult.type === "success"
                    ? "text-primary"
                    : "text-error-default"
                }`}
              >
                {csvImportResult.message}
              </p>
            )}
            <input
              ref={fileInputRef}
              type='file'
              accept='.csv'
              className='hidden'
              onChange={handleCsvFileChange}
            />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-neutral-700 mb-1'>
                Surname <span className='text-error-default'>*</span>
              </label>
              <input
                type='text'
                value={newStudentForm.surname}
                onChange={(e) =>
                  handleNewStudentFieldChange("surname", e.target.value)
                }
                placeholder='e.g., Dela Cruz'
                className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-neutral-700 mb-1'>
                First Name <span className='text-error-default'>*</span>
              </label>
              <input
                type='text'
                value={newStudentForm.firstName}
                onChange={(e) =>
                  handleNewStudentFieldChange("firstName", e.target.value)
                }
                placeholder='e.g., Juan'
                className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
              />
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-neutral-700 mb-1'>
                Middle Initial (optional)
              </label>
              <input
                type='text'
                value={newStudentForm.middleInitial}
                onChange={(e) =>
                  handleNewStudentFieldChange("middleInitial", e.target.value)
                }
                placeholder='e.g., A'
                maxLength={1}
                className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
              />
            </div>
            {!activityBlockId && (
              <div>
                <label className='block text-sm font-medium text-neutral-700 mb-1'>
                  Block
                </label>
                <select
                  value={newStudentForm.blockId}
                  onChange={(e) =>
                    handleNewStudentFieldChange("blockId", e.target.value)
                  }
                  className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
                >
                  <option value=''>Select a block...</option>
                  {programBlocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {!activityBlockId && (
            <p className='text-xs text-neutral-500 -mt-2'>
              Block is required when no activity context is selected.
            </p>
          )}
          {studentError && (
            <p className='text-error-default text-sm'>{studentError}</p>
          )}
          <div className='flex justify-end gap-3 pt-4'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowAddStudentModal(false);
                setStudentError("");
                setNewStudentForm(createEmptyStudentForm());
                setCsvImportResult(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleAddStudent}
              disabled={
                !newStudentForm.surname.trim() ||
                !newStudentForm.firstName.trim() ||
                !(activityBlockId ?? newStudentForm.blockId)
              }
            >
              <Plus className='w-4 h-4 mr-2' />
              Add Student
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={showEditStudentModal}
        onClose={() => {
          setShowEditStudentModal(false);
          setEditingStudent(null);
          setEditingStudentForm(null);
          setEditStudentError("");
        }}
        title='Edit Student'
      >
        {editingStudent && editingStudentForm && (
          <div className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-neutral-700 mb-1'>
                  Surname <span className='text-error-default'>*</span>
                </label>
                <input
                  type='text'
                  value={editingStudentForm.surname}
                  onChange={(e) =>
                    handleEditingStudentFieldChange("surname", e.target.value)
                  }
                  placeholder='e.g., Dela Cruz'
                  className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 mb-1'>
                  First Name <span className='text-error-default'>*</span>
                </label>
                <input
                  type='text'
                  value={editingStudentForm.firstName}
                  onChange={(e) =>
                    handleEditingStudentFieldChange("firstName", e.target.value)
                  }
                  placeholder='e.g., Juan'
                  className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
                />
              </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-neutral-700 mb-1'>
                  Middle Initial (optional)
                </label>
                <input
                  type='text'
                  value={editingStudentForm.middleInitial}
                  onChange={(e) =>
                    handleEditingStudentFieldChange(
                      "middleInitial",
                      e.target.value
                    )
                  }
                  placeholder='e.g., A'
                  maxLength={1}
                  className='w-full px-3 py-2 border border-neutral-300 rounded-rd focus:outline-none focus:ring-2 focus:ring-primary'
                />
              </div>
              <div className='flex items-end'>
                <p className='text-xs text-neutral-500'>
                  Use "Surname, First name M." format. Middle initial is
                  optional.
                </p>
              </div>
            </div>
            {editStudentError && (
              <p className='text-error-default text-sm'>{editStudentError}</p>
            )}
            <div className='flex justify-between pt-4'>
              <Button
                variant='ghost'
                onClick={() =>
                  confirmDelete(editingStudent.id, editingStudent.name)
                }
                className='group hover:bg-support-superlight/50 border-none'
              >
                <Trash2 className='w-4 h-4 mr-2 group-hover:text-error-default' />
              </Button>
              <div className='flex gap-3'>
                <Button
                  variant='ghost'
                  onClick={() => {
                    setShowEditStudentModal(false);
                    setEditingStudent(null);
                    setEditingStudentForm(null);
                    setEditStudentError("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant='primary'
                  onClick={handleUpdateStudent}
                  disabled={!hasEditingChanges}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteId("");
          setDeleteName("");
          setPendingDeleteStudentIds([]);
        }}
        title='Confirm Delete'
        size='sm'
      >
        <div className='space-y-4'>
          <div className='text-neutral-700 space-y-2'>
            <p>
              Are you sure you want to remove{" "}
              <span className='font-semibold'>{deleteName}</span>?
            </p>
            {pendingDeleteStudentIds.length > 1 && (
              <ul className='list-disc list-inside text-sm text-neutral-600'>
                {students
                  .filter((student) =>
                    pendingDeleteStudentIds.includes(student.id)
                  )
                  .map((student) => (
                    <li key={student.id}>{student.name}</li>
                  ))}
              </ul>
            )}
            <span className='block text-sm text-error-default'>
              This action cannot be undone.
            </span>
          </div>
          <div className='flex justify-end gap-3 pt-2'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteId("");
                setDeleteName("");
                setPendingDeleteStudentIds([]);
              }}
            >
              No, Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleConfirmDelete}
              className='bg-error-default hover:bg-error-dark'
            >
              Yes, Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
