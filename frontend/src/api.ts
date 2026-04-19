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
        `Failed to connect to the server at ${API_BASE_URL}. Please ensure the backend is running and accessible.`,
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
      const normalizedEmail = email.trim().toLowerCase();
      
      // 1. Check users table (Teachers/Admins)
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (userError) throw userError;
      if (userData) return { exists: true, message: "Email already registered." };

      // 2. Check students table
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (studentError) throw studentError;
      if (studentData) return { exists: true, message: "Email already registered as a student account." };
      
      return {
        exists: false,
        message: "Email is available.",
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
  }) => {
    // Synced securely via backend
    return apiRequest<{
      message: string;
      user: {
        id: number;
        email: string;
        username: string;
        first_name: string;
        last_name: string;
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
    try {
      const tempPassword = payload.password || `Edu${Math.floor(100000 + Math.random() * 900000)}`;
      const normalizedEmail = payload.email.trim().toLowerCase();

      // Use the RPC function (SECURITY DEFINER) to bypass browser authorization restrictions
      const { data: authId, error: provisionError } = await supabase.rpc(
        "admin_provision_student",
        {
          p_email: normalizedEmail,
          p_password: tempPassword,
          p_first_name: payload.first_name,
          p_last_name: payload.last_name,
          p_student_code: payload.student_code,
          p_middle_name: payload.middle_name || null,
        }
      );

      if (provisionError) {
        throw new Error(`Provisioning Error: ${provisionError.message}`);
      }

      return {
        success: true,
        message: "Provisioned via Supabase RPC successfully.",
        created: true, // RPC handles creating or updating
        temp_password: tempPassword,
        email: normalizedEmail,
        student_code: payload.student_code,
        auth_id: authId as string
      };
    } catch (err: any) {
      console.error("Supabase provisioning error:", err);
      throw err;
    }
  },

  enrollStudentAtomic: async (payload: {
    email: string;
    student_code: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    password?: string;
    teacher_id: string;
    program_id: string;
    year: number;
    block_name: string;
    birthday?: string;
  }) => {
    try {
      const tempPassword = payload.password || `Edu${Math.floor(100000 + Math.random() * 900000)}`;
      const normalizedEmail = payload.email.trim().toLowerCase();

      const { data: authId, error: enrollError } = await supabase.rpc(
        "admin_enroll_student_v3",
        {
          p_email: normalizedEmail,
          p_password: tempPassword,
          p_first_name: payload.first_name,
          p_last_name: payload.last_name,
          p_student_code: payload.student_code,
          p_teacher_id: payload.teacher_id,
          p_program_id: payload.program_id,
          p_year: payload.year,
          p_block_name: payload.block_name,
          p_middle_name: payload.middle_name || null,
          p_birthday: payload.birthday || null,
        }
      );

      if (enrollError) {
        throw new Error(`Enrollment Error: ${enrollError.message}`);
      }

      return {
        success: true,
        student_id: authId as string, // Note: the RPC now returns students.id
        temp_password: tempPassword
      };
    } catch (err: any) {
      console.error("Supabase enrollment error:", err);
      throw err;
    }
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // In this system, "Blocks" are the equivalent of "Classes" for teachers
    const { data, error } = await supabase
      .from("blocks")
      .select(`
        id,
        name,
        year,
        teacher_id,
        created_at,
        is_active,
        teacher_program_loads (
          id,
          teacher_course_loads (
            id,
            courses_lookup (
              id,
              course_title,
              course_code
            )
          )
        )
      `)
      .eq("teacher_id", user.id);

    if (error) {
      console.error("Error fetching classes (blocks):", error);
      return [];
    }

    return (data || []).map((b: any) => ({
      id: b.id,
      name: `${b.teacher_program_loads?.teacher_course_loads?.courses_lookup?.course_code || ""} - ${b.name}`,
      description: `${b.teacher_program_loads?.teacher_course_loads?.courses_lookup?.course_title || ""} (Year ${b.year})`,
      user_id: b.teacher_id,
      created_at: b.created_at,
      is_active: b.is_active || true
    })) as Class[];
  },

  getClass: async (id: string | number) => {
    const { data, error } = await supabase
      .from("blocks")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Class;
  },

  createClass: async (classData: { name: string; description?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("blocks")
      .insert({
        name: classData.name,
        teacher_id: user.id,
        year: 1
      })
      .select()
      .single();

    if (error) throw error;
    return data as Class;
  },
};

// Student API
export const studentApi = {
  getStudentsByClass: async (classId: string | number) => {
    const { data, error } = await supabase
      .from("block_students")
      .select(`
        student_id,
        students (
          id,
          student_code,
          first_name,
          last_name,
          email,
          year,
          block_name,
          created_at,
          is_active
        )
      `)
      .eq("block_id", classId);

    if (error) {
      console.error("Error fetching students for block:", error);
      return [];
    }

    return (data || [])
      .map((item: any) => item.students)
      .filter(Boolean)
      .map((s: any) => ({
        ...s,
        class_id: classId
      })) as Student[];
  },

  createStudent: async (studentData: {
    student_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    class_id: string | number;
  }) => {
    return apiRequest<Student>("/students", {
      method: "POST",
      body: JSON.stringify(studentData),
    });
  },
};

// Essay API
export const essayApi = {
  getEssays: async (classId?: string | number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from("essays")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching essays:", error);
      return [];
    }

    return (data || []) as Essay[];
  },

  getEssay: async (id: string | number) => {
    const { data, error } = await supabase
      .from("essays")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Essay;
  },

  createEssay: async (essayData: {
    title: string;
    content: string;
    student_id: string | number;
    class_id: string | number;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("essays")
      .insert({
        ...essayData,
        user_id: user.id,
        status: "submitted",
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as Essay;
  },
};

// Essay Activity API (Assignments)
export const essayActivityApi = {
  getActivities: async (classId?: string | number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from("essay_activities")
      .select(`
        *,
        courses_lookup (
          course_title,
          course_code
        ),
        blocks (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (classId) {
      query = query.eq("block_id", classId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching activities:", error);
      return [];
    }

    return (data || []).map((a: any) => ({
      ...a,
      course_name: a.courses_lookup?.course_title,
      class_name: a.blocks?.name
    }));
  },

  getActivity: async (id: string | number) => {
    const { data, error } = await supabase
      .from("essay_activities")
      .select("*, courses_lookup(*), blocks(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },
};

// Knowledge Graph API
export const kgApi = {
  getKnowledgeGraph: async (essayId: string | number) => {
    return apiRequest<{
      essay_id: string | number;
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

  buildAndExportKG: async (essayId: string | number) => {
    return apiRequest<{
      success: boolean;
      data: {
        nodes: any[];
        edges: any[];
        metadata: any;
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
    essayId: string | number,
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
    essayIds: (string | number)[],
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
        essay_id: string | number;
        essay_title: string;
        student_id: string | number;
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

    const token = localStorage.getItem("auth_token");
    // Fix: Javascript doesn't have rstrip. Using replace for trailing slash removal.
    const baseUrl = API_BASE_URL.replace(/\/$/, "");
    
    // Add trailing slash to the endpoint to avoid redirects which can cause CORS issues
    const response = await fetch(`${baseUrl}/ocr/extract-text/`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.text && result.text.trim() && (!result.word_count || result.word_count === 0)) {
      result.word_count = result.text.trim().split(/\s+/).length;
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

// Rubric API
export const rubricApi = {
  generateRubrics: async (title: string, description?: string) => {
    return apiRequest<{
      suggestions: {
        name: string;
        description: string;
        grading_intensity: "Basic" | "Professional" | "Advanced" | "Technical";
        criteria: import("./components/rubrics/types").CriteriaRow[];
      }[];
    }>("/rubrics/generate", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    });
  },
};

// Dummy data fallback - no longer used by real features
export const dummyData = {
  essays: [] as Essay[],
  classes: [] as Class[],
  students: [] as Student[],
  users: [] as User[],
  dashboardStats: {
    total_essays: 0,
    total_classes: 0,
    total_students: 0,
    recent_essays: [],
    class_stats: []
  } as DashboardStats,
};
