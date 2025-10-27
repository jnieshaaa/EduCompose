import type {
  Essay,
  Student,
  Class,
  User,
  AnalysisResponse,
  DashboardStats,
} from "./types/Essay";
import dummyDataJson from "./data/dummyData.json";

const API_BASE_URL = "http://localhost:8000/api";

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
  options: RequestInit = {}
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }

  return response.json();
};

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    return apiRequest<{ access_token: string; token_type: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
  },

  register: async (userData: {
    email: string;
    username: string;
    full_name: string;
    password: string;
  }) => {
    return apiRequest<User>("/auth/register", {
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

// Analysis API
export const analysisApi = {
  analyzeEssay: async (
    essayId: number,
    analysisType:
      | "grammar"
      | "style"
      | "argument"
      | "comprehensive" = "comprehensive"
  ) => {
    return apiRequest<AnalysisResponse>("/analysis/analyze", {
      method: "POST",
      body: JSON.stringify({ essay_id: essayId, analysis_type: analysisType }),
    });
  },

  getDashboardStats: async () => {
    return apiRequest<DashboardStats>("/analysis/dashboard-stats");
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
