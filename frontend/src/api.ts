import type {
  Essay,
  Student,
  Class,
  User,
  AnalysisResponse,
  TextAnalysisResponse,
  DashboardStats,
  SystemStatsResponse,
} from "./types/Essay";
import dummyDataJson from "./data/dummyData.json";
import { supabase, supabaseAdmin } from "./lib/supabaseClient";

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
  checkEmail: async (email: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (error) throw error;
      
      return {
        exists: !!data,
        message: data ? "Email exists." : "No account found with this email address.",
      };
    } catch (err: unknown) {
      console.error("Check email error:", err);
      return { exists: false, message: "Error checking email." };
    }
  },

  resetPassword: async (email: string, newPassword: string) => {
    try {
      // First, get the user's auth ID from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("auth_user_id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (userError || !userData?.auth_user_id) {
        return { success: false, message: "User not found." };
      }

      // Use supabaseAdmin to update password
      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
        userData.auth_user_id,
        { password: newPassword.trim() }
      );

      if (resetError) throw resetError;

      return { success: true, message: "Password reset successfully!" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password.";
      return { success: false, message };
    }
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

  // Note: Most auth functions moved to direct Supabase calls in useAuthModal

  createUser: async (userData: {
    email: string;
    password: string;
    role: "admin" | "teacher" | "student";
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    title?: string;
    nickname?: string;
    username?: string;
    full_name?: string;
  }) => {
    // Synced securely via backend
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

  provisionStudentAccount: async (payload: {
    email: string;
    student_code: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    password?: string;
  }) => {
    // Backend will handle Supabase creation and syncing securely
    return apiRequest<{
      success: boolean;
      message: string;
      created: boolean;
      temp_password?: string;
      email: string;
      student_code: string;
    }>("/auth/teacher/provision-student-account", {
      method: "POST",
      body: JSON.stringify(payload),
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

export interface AIDetectionResponse {
  checked: boolean;
  is_ai_generated: boolean;
  ai_score: number;
  confidence?: number;
  verdict?: string;
  provider: string;
  details?: Record<string, unknown>;
  error?: string;
  message?: string;
}

export const aiDetectionApi = {
  checkAIDetection: async (text: string): Promise<AIDetectionResponse> => {
    const response = await fetch(`${API_BASE_URL}/analysis/check-ai-detection`, {
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

    return response.json() as Promise<AIDetectionResponse>;
  },
};

// Admin API (uses Supabase)
export const adminApi = {
  getUsers: async (params?: {
    skip?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) => {
    let query = supabase
      .from("users")
      .select(
        "id, email, first_name, middle_name, last_name, title, nickname, role, is_active, created_at, auth_user_id",
      )
      .order("created_at", { ascending: false });

    // Apply filters
    if (params?.role) {
      query = query.eq("role", params.role);
    } else {
      // If role is not specified (e.g., 'all'), exclude admins
      query = query.neq("role", "admin");
    }

    if (params?.search) {
      query = query.or(
        `email.ilike.%${params.search}%,first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%`,
      );
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Map to include email_verified from auth.users if needed
    return data.map((user) => ({
      ...user,
      email_verified: true, // Default to true, can be enhanced later
    }));
  },

  updateUser: async (
    userId: string,
    data: {
      email?: string;
      full_name?: string;
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      title?: string;
      nickname?: string;
      role?: string;
      is_active?: boolean;
    },
  ) => {
    const { error } = await supabase
      .from("users")
      .update(data)
      .eq("id", userId);

    if (error) {
      throw new Error(error.message);
    }

    return { message: "User updated successfully", user: data };
  },

  deleteUser: async (userId: string) => {
    // First get the auth_user_id
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("auth_user_id")
      .eq("id", userId)
      .single();

    if (fetchError || !user?.auth_user_id) {
      throw new Error("User not found");
    }

    // Delete from auth.users (this will cascade to users table)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.auth_user_id);

    if (error) {
      throw new Error(error.message);
    }

    return { message: "User deleted successfully" };
  },

  resetUserPassword: async (userId: string, newPassword: string) => {
    // First get the auth_user_id
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("auth_user_id")
      .eq("id", userId)
      .single();

    if (fetchError || !user?.auth_user_id) {
      throw new Error("User not found");
    }

    // Update password using admin client
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      user.auth_user_id,
      { password: newPassword },
    );

    if (error) {
      throw new Error(error.message);
    }

    return { message: "Password reset successfully" };
  },

  getActivityLogs: async (params?: { 
    userId?: string; 
    studentId?: string;
    search?: string; 
    limit?: number; 
    offset?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    let query = supabase
      .from("activity_logs")
      .select("*, users(first_name, last_name, email, role), students(first_name, last_name, email, student_code)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (params?.userId) {
      query = query.eq("user_id", params.userId);
    }

    if (params?.studentId) {
      query = query.eq("student_id", params.studentId);
    }

    if (params?.search) {
      query = query.or(`description.ilike.%${params.search}%,action_type.ilike.%${params.search}%`);
    }

    if (params?.startDate) {
      query = query.gte("created_at", params.startDate);
    }
    
    if (params?.endDate) {
      const end = params.endDate.includes("T") ? params.endDate : `${params.endDate}T23:59:59.999Z`;
      query = query.lte("created_at", end);
    }

    if (params?.limit) {
      const start = params.offset || 0;
      const endOffset = start + params.limit - 1;
      query = query.range(start, endOffset);
    }

    const { data: logs, error, count } = await query;
    if (error) throw new Error(error.message);
    
    return { 
      logs: logs || [], 
      total: count || 0 
    };
  },

  getSystemStats: async (): Promise<SystemStatsResponse> => {
    // We use Supabase directly to bypass the 403 error from the backend.
    // Note: This relies on Supabase RLS policies allowing the current user to count these records.
    try {
      const [
        { count: totalUsers },
        { count: totalTeachers },
        { count: totalStudents },
        { count: totalAdmins },
        { count: totalPrograms },
        { count: totalSections },
        { count: totalActivities },
        { count: totalEssays },
        { count: totalRubrics },
        { count: platformRubrics }
      ] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "admin"),
        supabase.from("programs_lookup").select("id", { count: "exact", head: true }),
        supabase.from("blocks").select("id", { count: "exact", head: true }),
        supabase.from("essay_activities").select("id", { count: "exact", head: true }),
        supabase.from("essays").select("id", { count: "exact", head: true }),
        supabase.from("rubrics").select("id", { count: "exact", head: true }),
        supabase.from("rubrics").select("id", { count: "exact", head: true }).is("created_by", null)
      ]);

      return {
        total_users: totalUsers || 0,
        total_teachers: totalTeachers || 0,
        total_students: totalStudents || 0,
        total_admins: totalAdmins || 0,
        total_programs: totalPrograms || 0,
        total_sections: totalSections || 0,
        total_activities: totalActivities || 0,
        total_essays: totalEssays || 0,
        total_rubrics: totalRubrics || 0,
        platform_rubrics: platformRubrics || 0,
      };
    } catch (error) {
      console.error("Error fetching system stats from Supabase:", error);
      throw error;
    }
  },

  getAllPrograms: async () => {
    const { data, error } = await supabase
      .from("programs_lookup")
      .select("*, departments(name, school_id, schools(name))")
      .order("created_at", { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  getAllActivities: async () => {
    const { data, error } = await supabase
      .from("essay_activities")
      .select("*, courses_lookup(name), blocks(name)")
      .order("created_at", { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  getAllRubrics: async () => {
    const { data, error } = await supabase
      .from("rubrics")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  getStudents: async (params?: { search?: string; limit?: number }) => {
    let query = supabase
      .from("students")
      .select(
        `id, student_code, first_name, middle_name, last_name, email, year, block_name, program_id, created_at, programs_lookup (id, name, abbr)`,
      )
      .order("created_at", { ascending: false });

    if (params?.search) {
      query = query.or(
        `student_code.ilike.%${params.search}%,first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%`,
      );
    }

    if (params?.limit) query = query.limit(params.limit);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as unknown as {
      id: string;
      student_code: string;
      first_name: string;
      last_name: string;
      middle_name?: string;
      email: string;
      year?: number;
      block_name?: string;
      enrollment_status: string;
      is_active: boolean;
      programs_lookup?: {
        id: string;
        name: string;
        abbr: string;
      };
    }[];
  },
};

// Dummy data for development - loaded from JSON file
export const dummyData = dummyDataJson as unknown as {
  essays: Essay[];
  classes: Class[];
  students: Student[];
  users: User[];
  dashboardStats: DashboardStats;
};
