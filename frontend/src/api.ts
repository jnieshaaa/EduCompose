import type {
  Essay,
  Student,
  Class,
  User,
  AnalysisResponse,
  TextAnalysisResponse,
  DashboardStats,
} from "./types/Essay";
import dummyDataJson from "./data/dummyData.json";

// Get API base URL from environment variable, fallback to localhost for development
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = localStorage.getItem("auth_token");

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `API Error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
      }
      const error = new ApiError(response.status, errorMessage);
      throw error;
    }

    return response.json();
  } catch (err: unknown) {
    // Handle network errors (backend not running, connection failed, etc.)
    const isTypeError = err instanceof TypeError;
    const errMessage = err instanceof Error ? err.message : String(err);
    const messageContainsFetch = errMessage.includes("fetch");

    if (isTypeError || messageContainsFetch) {
      const networkError = new ApiError(
        0,
        "Failed to connect to server. Please make sure the backend server is running on http://localhost:8000",
      );
      throw networkError;
    }
    // Re-throw other errors (ApiError instances, etc.)
    throw err;
  }
};

// Auth API
export const authApi = {
  login: async (
    identifier: { email?: string; username?: string },
    password: string,
  ) => {
    return apiRequest<{
      access_token: string;
      token_type: string;
      user?: {
        id: number;
        email: string;
        username: string;
        full_name: string;
        role: string;
        is_active: boolean;
      };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: identifier.email,
        username: identifier.username,
        password,
      }),
    });
  },

  register: async (userData: {
    email: string;
    password: string;
    confirm_password?: string;
  }) => {
    return apiRequest<{
      message: string;
      user: User;
      verification_code: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  verifySignup: async (email: string, code: string, password?: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      "/auth/verify-signup",
      {
        method: "POST",
        body: JSON.stringify({ email, code, ...(password && { password }) }),
      },
    );
  },

  resendSignupCode: async (email: string) => {
    return apiRequest<{ verification_code: string }>(
      "/auth/resend-signup-code",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
  },

  updatePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest<{ message: string }>("/auth/update-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  },

  requestDeleteCode: async () => {
    return apiRequest<{ message: string }>("/auth/request-delete-code", {
      method: "POST",
    });
  },

  deleteAccount: async (verificationCode: string) => {
    return apiRequest<{ message: string }>("/auth/delete-account", {
      method: "POST",
      body: JSON.stringify({ verification_code: verificationCode }),
    });
  },

  checkEmail: async (email: string) => {
    return apiRequest<{ exists: boolean; message: string }>(
      "/auth/check-email",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
  },

  resetPassword: async (email: string, newPassword: string) => {
    return apiRequest<{ message: string; success: boolean }>(
      "/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({ email, new_password: newPassword }),
      },
    );
  },

  createUser: async (userData: {
    email: string;
    password: string;
    role: "admin" | "teacher" | "student";
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    username?: string;
    full_name?: string;
  }) => {
    return apiRequest<{
      message: string;
      user: {
        id: number;
        email: string;
        username: string;
        full_name: string;
        role: string;
        email_verified: boolean;
        supabase_user_id?: string;
      };
    }>("/auth/admin/create-user", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },
};

// User API
export const userApi = {
  getCurrentUser: async () => {
    return apiRequest<User>("/users/me");
  },

  getUsers: async () => {
    return apiRequest<User[]>("/users");
  },

  updateProfile: async (payload: { username?: string; email?: string }) => {
    return apiRequest<User>("/users/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};

// Class API
export const classApi = {
  getClasses: async () => {
    return apiRequest<Class[]>("/classes");
  },

  getClass: async (id: number) => {
    return apiRequest<Class>(`/classes/${id}`);
  },

  createClass: async (classData: { name: string; description?: string }) => {
    return apiRequest<Class>("/classes", {
      method: "POST",
      body: JSON.stringify(classData),
    });
  },
};

// Student API
export const studentApi = {
  getStudentsByClass: async (classId: number) => {
    return apiRequest<Student[]>(`/students/class/${classId}`);
  },

  createStudent: async (studentData: {
    student_id: string;
    full_name: string;
    email?: string;
    class_id: number;
  }) => {
    return apiRequest<Student>("/students", {
      method: "POST",
      body: JSON.stringify(studentData),
    });
  },
};

// Essay API
export const essayApi = {
  getEssays: async (classId?: number) => {
    const params = classId ? `?class_id=${classId}` : "";
    return apiRequest<Essay[]>(`/essays${params}`);
  },

  getEssay: async (id: number) => {
    return apiRequest<Essay>(`/essays/${id}`);
  },

  createEssay: async (essayData: {
    title: string;
    content: string;
    student_id: number;
    class_id: number;
  }) => {
    return apiRequest<Essay>("/essays", {
      method: "POST",
      body: JSON.stringify(essayData),
    });
  },
};

// Knowledge Graph API
export const kgApi = {
  getKnowledgeGraph: async (essayId: number) => {
    return apiRequest<{
      essay_id: number;
      nodes: Array<{
        id: string;
        label: string;
        type?: string;
        properties?: Record<string, unknown>;
      }>;
      edges: Array<{
        source: string;
        target: string;
        type?: string;
        properties?: Record<string, unknown>;
      }>;
      source: string;
      stats?: {
        node_count: number;
        edge_count: number;
      };
    }>(`/kg/essay/${essayId}/knowledge-graph`);
  },

  buildAndExportGraph: async (essayId: number) => {
    return apiRequest<{
      essay_id: number;
      nodes: Array<{
        id: string;
        label: string;
        type?: string;
        properties?: Record<string, unknown>;
      }>;
      edges: Array<{
        source: string;
        target: string;
        type?: string;
        properties?: Record<string, unknown>;
      }>;
      export_stats: {
        nodes_created: number;
        edges_created: number;
        status: string;
      };
      stats: {
        node_count: number;
        edge_count: number;
        nodes_exported: number;
        edges_exported: number;
      };
    }>(`/kg/essay/${essayId}/build-and-export`, {
      method: "POST",
    });
  },
};

// Analysis API
export const analysisApi = {
  analyzeEssay: async (
    essayId: number,
    analysisType:
      | "grammar"
      | "readability"
      | "coherence"
      | "argument"
      | "comprehensive" = "comprehensive",
  ) => {
    return apiRequest<AnalysisResponse>("/analysis/analyze", {
      method: "POST",
      body: JSON.stringify({ essay_id: essayId, analysis_type: analysisType }),
    });
  },

  batchAnalyze: async (
    essayIds: number[],
    analysisType:
      | "grammar"
      | "readability"
      | "coherence"
      | "argument"
      | "comprehensive" = "comprehensive",
  ) => {
    return apiRequest<{
      total_analyzed: number;
      results: Array<{
        essay_id: number;
        essay_title: string;
        student_id: number;
        analysis: AnalysisResponse;
        error?: string;
      }>;
    }>("/analysis/batch-analyze", {
      method: "POST",
      body: JSON.stringify({
        essay_ids: essayIds,
        analysis_type: analysisType,
      }),
    });
  },

  getDashboardStats: async () => {
    return apiRequest<DashboardStats>("/analysis/dashboard-stats");
  },

  analyzeText: async (
    text: string,
    title: string = "Untitled Essay",
    analysisType:
      | "grammar"
      | "readability"
      | "coherence"
      | "argument"
      | "comprehensive" = "comprehensive",
    rubricId?: string,
  ): Promise<TextAnalysisResponse> => {
    // This endpoint doesn't require authentication, so we make a direct fetch call
    const response = await fetch(`${API_BASE_URL}/analysis/analyze-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        title,
        analysis_type: analysisType,
        rubric_id: rubricId || null,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<TextAnalysisResponse>;
  },
};

// OCR API
export const ocrApi = {
  extractTextFromFile: async (
    file: File,
  ): Promise<{
    text: string;
    word_count: number;
    confidence: number;
    page_count: number;
    filename: string;
  }> => {
    const formData = new FormData();
    formData.append("file", file);

    // Debug: Log file info
    console.log("Uploading file:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const response = await fetch(`${API_BASE_URL}/ocr/extract-text`, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    // Debug: Log the response to check what we're receiving
    console.log("OCR API Response:", result);

    // Ensure word_count is valid - calculate if missing
    if (
      result.text &&
      result.text.trim() &&
      (!result.word_count || result.word_count === 0)
    ) {
      result.word_count = result.text.trim().split(/\s+/).length;
      console.log("Calculated word_count:", result.word_count);
    }

    return result;
  },
};

// Plagiarism Check API
export interface PlagiarismMatch {
  url: string;
  title?: string;
  minwords?: number;
  maxwords?: number;
  words?: number;
  percent: number;
}

export interface PlagiarismCheckResponse {
  is_plagiarized: boolean;
  plagiarism_percentage: number;
  match_count: number;
  matches: PlagiarismMatch[];
  text_length: number;
  checked: boolean;
  error?: string;
  message?: string;
}

export const plagiarismApi = {
  checkPlagiarism: async (text: string): Promise<PlagiarismCheckResponse> => {
    const response = await fetch(`${API_BASE_URL}/analysis/check-plagiarism`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<PlagiarismCheckResponse>;
  },
};

// Admin API
export const adminApi = {
  getUsers: async (params?: {
    skip?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append("skip", params.skip.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.role) queryParams.append("role", params.role);
    if (params?.search) queryParams.append("search", params.search);

    const query = queryParams.toString();
    return apiRequest<any[]>(`/admin/users${query ? `?${query}` : ""}`);
  },

  updateUser: async (
    userId: string,
    data: {
      email?: string;
      full_name?: string;
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      role?: string;
      is_active?: boolean;
    },
  ) => {
    return apiRequest<{ message: string; user: any }>(
      `/admin/users/${userId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  },

  deleteUser: async (userId: string) => {
    return apiRequest<{ message: string }>(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  },

  resetUserPassword: async (userId: string, newPassword: string) => {
    return apiRequest<{ message: string }>(
      `/admin/users/${userId}/reset-password`,
      {
        method: "POST",
        body: JSON.stringify({ new_password: newPassword }),
      },
    );
  },

  getSystemStats: async () => {
    return apiRequest<{
      total_users: number;
      total_teachers: number;
      total_students: number;
      total_admins: number;
      total_programs: number;
      total_sections: number;
      total_activities: number;
      total_essays: number;
      total_rubrics: number;
      platform_rubrics: number;
    }>("/admin/stats");
  },

  getAllPrograms: async () => {
    return apiRequest<any[]>("/admin/content/programs");
  },

  getAllActivities: async () => {
    return apiRequest<any[]>("/admin/content/activities");
  },

  getAllRubrics: async () => {
    return apiRequest<any[]>("/admin/content/rubrics");
  },
};

// Dummy data for development - loaded from JSON file
export const dummyData = dummyDataJson as {
  essays: Essay[];
  classes: Class[];
  students: Student[];
  users: User[];
  dashboardStats: DashboardStats;
};
