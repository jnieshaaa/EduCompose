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
import { supabase } from "./lib/supabaseClient";

// Get API base URL from environment variable, fallback to localhost for development
let API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// Force HTTPS for railway domains to prevent Mixed Content errors in production
if (API_BASE_URL.includes("railway.app") && API_BASE_URL.startsWith("http://")) {
  API_BASE_URL = API_BASE_URL.replace("http://", "https://");
}

// Remove trailing slash globally to prevent double slashes in paths
API_BASE_URL = API_BASE_URL.replace(/\/$/, "");

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
      
      // Use RPC to bypass RLS for anonymous users (Forgot Password flow)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "check_user_email_exists",
        { p_email: normalizedEmail }
      );

      if (rpcError) throw rpcError;
      
      const userData = Array.isArray(rpcData) ? rpcData[0] : rpcData;

      if (userData && userData.user_exists) {
        const roleLabel = userData.user_role === 'student' ? 'student account' : 'teacher/admin account';
        return { 
          exists: true, 
          message: `Email already registered as a ${roleLabel}.`
        };
      }
      
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
      const normalizedEmail = email.trim().toLowerCase();

      // Use the correct RPC name and bypass RLS-restricted direct table queries
      const { data: success, error: resetError } = await supabase.rpc(
        "admin_reset_student_password_v1",
        { p_email: normalizedEmail, p_new_password: newPassword.trim() }
      );

      if (resetError) throw resetError;
      if (!success) {
        return { success: false, message: "User not found or reset failed." };
      }

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
    teacher_id?: string;
    school_id?: string;
    department_id?: string;
    program_id: string;
    year: number;
    block_name: string;
    birthday?: string;
  }) => {
    try {
      const tempPassword = payload.password || `Edu${Math.floor(100000 + Math.random() * 900000)}`;
      const normalizedEmail = payload.email.trim().toLowerCase();

      const { data: authId, error: enrollError } = await supabase.rpc(
        "admin_enroll_student_v4",
        {
          p_email: normalizedEmail,
          p_student_code: payload.student_code,
          p_first_name: payload.first_name,
          p_last_name: payload.last_name,
          p_middle_name: payload.middle_name || null,
          p_suffix: (payload as any).suffix || null,
          p_birthday: payload.birthday || null,
          p_program_id: payload.program_id,
          p_year: payload.year,
          p_block_name: payload.block_name,
          p_teacher_id: payload.teacher_id || null,
          p_school_id: payload.school_id || null,
          p_department_id: payload.department_id || null,
        }
      );

      if (enrollError) {
        throw new Error(`Enrollment Error: ${enrollError.message}`);
      }

      return {
        success: true,
        student_id: authId as string, 
        temp_password: tempPassword
      };
    } catch (err: any) {
      console.error("Supabase enrollment error:", err);
      throw err;
    }
  },

  provisionUserV2: async (payload: {
    email: string;
    role: "admin" | "teacher" | "student";
    first_name: string;
    last_name: string;
    middle_name?: string;
    suffix?: string;
    title?: string;
    nickname?: string;
    code?: string;
    birthday?: string;
    password?: string;
    school_id?: string;
    department_id?: string;
    program_id?: string;
    year?: number;
    block_name?: string;
  }): Promise<{ success: boolean; auth_id: string; role: string; temp_password: string; email: string }> => {
    try {
      const tempPassword = payload.password || payload.birthday?.replace(/-/g, "") || `Edu${Math.floor(100000 + Math.random() * 900000)}`;
      const normalizedEmail = payload.email.trim().toLowerCase();

      // 1. Create the Auth Account using Backend API Proxy (Secure)
      const token = localStorage.getItem('auth_token') || '';
      const response = await fetch(`${API_BASE_URL}/auth/admin/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password: tempPassword,
          role: payload.role,
          first_name: payload.first_name,
          middle_name: payload.middle_name,
          last_name: payload.last_name,
          title: payload.title,
          nickname: payload.nickname
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Backend Error: ${response.statusText}`);
      }

      const result = await response.json();
      const authId = result.user?.supabase_user_id || result.user?.id;

      if (!authId) {
        throw new Error("Could not determine User ID for provisioning.");
      }

      // 2. Use the ultra-safe v1 RPC to sync the profile and details
      const { error: provisionError } = await supabase.rpc(
        "create_new_portal_user_v1",
        {
          p_email: normalizedEmail,
          p_password: tempPassword,
          p_first_name: payload.first_name,
          p_last_name: payload.last_name,
          p_role: payload.role,
          p_middle_name: payload.middle_name || null,
          p_suffix: payload.suffix || null,
          p_title: payload.title || null,
          p_nickname: payload.nickname || null,
          p_school_id: payload.school_id || null,
          p_department_id: payload.department_id || null,
          p_program_id: payload.program_id || null,
          p_birthday: payload.birthday || null,
          p_code: payload.code || null,
          p_year: payload.year || null,
          p_block_name: payload.block_name || null
        }
      );

      if (provisionError) {
        console.error("RPC Provisioning Error:", provisionError);
        throw new Error(`Sync Error: ${provisionError.message}`);
      }

      return {
        success: true,
        auth_id: authId as string,
        role: payload.role,
        temp_password: tempPassword,
        email: normalizedEmail
      };
    } catch (err: any) {
      console.error("Supabase provisioning error:", err);
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
            courses (
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
      name: `${b.teacher_program_loads?.teacher_course_loads?.courses?.course_code || ""} - ${b.name}`,
      description: `${b.teacher_program_loads?.teacher_course_loads?.courses?.course_title || ""} (Year ${b.year})`,
      user_id: b.teacher_id,
      created_at: b.created_at,
      is_active: b.is_active || true
    })) as Class[];
  },

  getClass: async (id: string) => {
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
  getStudentsByClass: async (classId: string) => {
    const { data, error } = await supabase
      .from("block_students")
      .select(`
        student_id,
        users!student_id (
          id,
          first_name,
          last_name,
          email,
          created_at,
          is_active,
          student_profiles!inner (
            student_code,
            year,
            block_name,
            enrollment_status
          )
        )
      `)
      .eq("block_id", classId);

    if (error) {
      console.error("Error fetching students for block:", error);
      return [];
    }

    return (data || [])
      .map((item: any) => {
        const u = item.users;
        const p = Array.isArray(u.student_profiles) ? u.student_profiles[0] : u.student_profiles;
        return {
          ...u,
          ...p,
          class_id: classId
        };
      })
      .filter(Boolean) as Student[];
  },

  createStudent: async (studentData: {
    student_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    class_id: string;
  }) => {
    return apiRequest<Student>("/students", {
      method: "POST",
      body: JSON.stringify(studentData),
    });
  },
};

// Essay API
export const essayApi = {
  getEssays: async (classId?: string) => {
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

  getEssay: async (id: string) => {
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
    student_id: string;
    class_id: string;
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
  getActivities: async (classId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from("essay_activities")
      .select(`
        *,
        courses (
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
      course_name: a.courses?.course_title,
      class_name: a.blocks?.name
    }));
  },

  getActivity: async (id: string) => {
    const { data, error } = await supabase
      .from("essay_activities")
      .select("*, courses(*), blocks(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },
};

// Knowledge Graph API
export const kgApi = {
  getKnowledgeGraph: async (essayId: string) => {
    return apiRequest<{
      essay_id: string;
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

  buildAndExportKG: async (essayId: string) => {
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
    essayId: string,
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
    essayIds: (string)[],
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
        essay_id: string;
        essay_title: string;
        student_id: string;
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
    
    // Removed trailing slash to match backend strict routing and prevent 307 redirects
    const response = await fetch(`${API_BASE_URL}/ocr/extract-text`, {
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
      .select(`
        id, email, first_name, middle_name, last_name, role, is_active, created_at,
        teacher_profiles (title, nickname, school_id, department_id),
        admin_profiles (is_super_admin),
        student_profiles (student_code, year, block_name, enrollment_status)
      `)
      .eq("is_active", true)
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

    // Map to include profile data and email_verified
    return data.map((user) => {
      const teacher = Array.isArray(user.teacher_profiles) ? user.teacher_profiles[0] : user.teacher_profiles;
      const admin = Array.isArray(user.admin_profiles) ? user.admin_profiles[0] : user.admin_profiles;
      const student = Array.isArray(user.student_profiles) ? user.student_profiles[0] : user.student_profiles;
      
      return {
        ...user,
        ...(teacher || {}),
        ...(admin || {}),
        ...(student || {}),
        email_verified: true,
      };
    });
  },

  updateUser: async (
    userId: string,
    data: {
      email?: string;
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      suffix?: string;
      title?: string;
      nickname?: string;
      role?: string;
      is_active?: boolean;
      enrollment_status?: string;
      school_id?: string;
      department_id?: string;
      student_code?: string;
      year?: number;
      block_name?: string;
      program_id?: string;
    },
  ) => {
    // 1. Separate users table fields from profile fields
    const userTableFields = ['email', 'first_name', 'middle_name', 'last_name', 'suffix', 'role', 'is_active'];
    const teacherFields = ['title', 'nickname', 'school_id', 'department_id'];
    const studentFields = ['student_code', 'year', 'block_name', 'enrollment_status', 'program_id', 'school_id', 'department_id'];
    const adminFields = ['is_super_admin'];

    const userData: any = {};
    const profileData: any = {};
    
    // Determine profile table based on role or specific fields
    let profileTable = data.role === 'admin' ? 'admin_profiles' : 
                       data.role === 'teacher' ? 'teacher_profiles' : 
                       data.role === 'student' ? 'student_profiles' : '';

    Object.entries(data).forEach(([key, value]) => {
      if (userTableFields.includes(key)) {
        userData[key] = value;
      } else {
        // If profileTable not determined by role, try to guess from fields
        if (!profileTable) {
          if (['student_code', 'year', 'block_name'].includes(key)) profileTable = 'student_profiles';
          else if (['title', 'nickname'].includes(key)) profileTable = 'teacher_profiles';
          else if (['is_super_admin'].includes(key)) profileTable = 'admin_profiles';
        }
        
        // Add to profile data if it belongs to any profile table
        if (teacherFields.includes(key) || studentFields.includes(key) || adminFields.includes(key)) {
          profileData[key] = value;
        }
      }
    });

    // 2. Update users table if needed
    if (Object.keys(userData).length > 0) {
      const { error: dbError } = await supabase
        .from("users")
        .update(userData)
        .eq("id", userId);
      if (dbError) throw new Error(dbError.message);
    }

    // 3. Update profile table if needed (Use upsert to create if missing)
    if (Object.keys(profileData).length > 0 && profileTable) {
      const { error: profileError } = await supabase
        .from(profileTable)
        .upsert({ 
          ...profileData, 
          user_id: userId 
        }, { 
          onConflict: 'user_id' 
        });
        
      if (profileError) throw new Error(`Profile sync failed: ${profileError.message}`);
    }

    // 2. If email is provided, update it in auth.users too
    if (data.email) {
        // Since id === auth_id in unified system, we use id directly
        // Use RPC instead of direct admin API to avoid browser 403 locks
        const { error: authError } = await supabase.rpc('admin_sync_user_email', {
          p_auth_id: userId,
          p_new_email: data.email
        });
        if (authError) throw new Error(`Auth sync failed via RPC: ${authError.message}`);
    }

    return { message: "User updated successfully", user: data };
  },

  deleteUser: async (userId: string): Promise<void> => {
    const token = localStorage.getItem('auth_token') || '';
    const response = await fetch(`${API_BASE_URL}/auth/admin/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: userId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to delete user via backend proxy");
    }
  },

  resetUserPassword: async (userId: string, newPassword: string) => {
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (fetchError || !user?.email) {
      throw new Error("User not found");
    }

    // Update password using RPC
    const { error } = await supabase.rpc(
      "admin_reset_student_password",
      { p_email: user.email, p_new_password: newPassword }
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
      .select("*, users(first_name, last_name, email, role)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (params?.userId || params?.studentId) {
      query = query.eq("user_id", params.userId || params.studentId);
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
    // 1. Fetch raw activities
    const { data: activities, error: activityError } = await supabase
      .from("essay_activities")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (activityError) throw new Error(activityError.message);

    // 2. Fetch all blocks and their program relationships
    const { data: blocks } = await supabase
      .from("blocks")
      .select(`
        id, 
        name, 
        year,
        program_load_id,
        teacher_program_loads!program_load_id(program_id)
      `);
    
    // 3. Fetch student counts from users table grouped by block_name
    const { data: studentCounts } = await supabase
      .from("users")
      .select("block_name")
      .eq("role", "student");
    
    const countMap: Record<string, number> = (studentCounts || []).reduce((acc: any, s: any) => {
      if (s.block_name) {
        acc[s.block_name] = (acc[s.block_name] || 0) + 1;
      }
      return acc;
    }, {});

    // Create a map from program_id to list of blocks
    const programToBlocks: Record<string, any[]> = {};
    (blocks || []).forEach((b: any) => {
      const pId = Array.isArray(b.teacher_program_loads) 
        ? b.teacher_program_loads[0]?.program_id 
        : b.teacher_program_loads?.program_id;
      
      if (pId) {
        if (!programToBlocks[pId]) programToBlocks[pId] = [];
        programToBlocks[pId].push({
          ...b,
          student_count: countMap[b.name] || 0
        });
      }
    });

    // 4. Fetch all teachers (users with role='teacher')
    const { data: teachers } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .eq("role", "teacher");

    // 5. Fetch all programs
    const { data: programs } = await supabase
      .from("programs_lookup")
      .select("id, name, abbr");

    // Create lookup maps for efficiency
    const blockMap = (blocks || []).reduce((acc: any, b: any) => {
      acc[b.id] = {
        ...b,
        student_count: countMap[b.name] || 0
      };
      return acc;
    }, {});

    const teacherMap = (teachers || []).reduce((acc: any, t: any) => {
      acc[t.id] = `${t.first_name} ${t.last_name}`;
      return acc;
    }, {});

    const programMap = (programs || []).reduce((acc: any, p: any) => {
      acc[p.id] = p;
      return acc;
    }, {});

    // 6. Map everything together
    return (activities || []).map(activity => {
      const teacherName = activity.teacher_id ? teacherMap[activity.teacher_id] : "Unknown";
      
      // Resolve programs from array of IDs
      const pIds = Array.isArray(activity.program_id) ? activity.program_id : activity.program_id ? [activity.program_id] : [];
      const resolvedPrograms = pIds.map((id: string) => programMap[id]).filter(Boolean);

      // Find ALL blocks associated with these programs
      const deployments: any[] = [];
      
      // Add the specific block if it exists
      if (activity.block_id && blockMap[activity.block_id]) {
        deployments.push(blockMap[activity.block_id]);
      }

      pIds.forEach((pId: string) => {
        if (programToBlocks[pId]) {
          deployments.push(...programToBlocks[pId]);
        }
      });

      // Remove duplicate blocks if any
      const uniqueDeployments = Array.from(new Map(deployments.map(d => [d.id, d])).values());

      return {
        ...activity,
        deployments: uniqueDeployments,
        teacher_name: teacherName,
        student_count: uniqueDeployments.reduce((sum, d) => sum + d.student_count, 0),
        programs_lookup: resolvedPrograms
      };
    });
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
      .from("users")
      .select(`
        id, first_name, middle_name, last_name, email, created_at,
        student_profiles!inner (
          student_code, year, block_name, program_id, enrollment_status
        ),
        programs_lookup:student_profiles(program_id, programs_lookup(id, name, abbr))
      `)
      .eq("role", "student")
      .eq("student_profiles.enrollment_status", "active")
      .order("created_at", { ascending: false });

    if (params?.search) {
      query = query.or(
        `student_code.ilike.%${params.search}%,first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%`,
      );
    }

    if (params?.limit) query = query.limit(params.limit);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map((user: any) => {
      const sp = Array.isArray(user.student_profiles) ? user.student_profiles[0] : user.student_profiles;
      return {
        ...user,
        ...sp,
        programs_lookup: sp?.programs_lookup
      };
    }) as unknown as {
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
