/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { useInactivityLogout } from "../hooks/useInactivityLogout";
import { useNotification } from "../contexts/NotificationContext";

interface User {
  auth_id: string;
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  email_verified?: boolean;
  onboarding_completed?: boolean;
  title?: string;
  nickname?: string;
  student_code?: string;
  program_id?: string;
  year?: number;
  block_name?: string;
  school_id?: string;
  department_id?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData?: User) => void;
  logout: (reason?: string) => void;
  checkAuth: () => Promise<void>;
  isInitialCheckComplete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(!localStorage.getItem("auth_token"));
  const [isInitialCheckComplete, setIsInitialCheckComplete] = useState(false);
  const { showNotification } = useNotification();

  const isNetworkDisconnectError = (maybeMessage?: unknown) => {
    const message = typeof maybeMessage === "string" ? maybeMessage : undefined;
    if (!message) return false;
    const normalized = message.toLowerCase();
    return (
      normalized.includes("failed to fetch") ||
      normalized.includes("err_internet_disconnected") ||
      normalized.includes("network error")
    );
  };

  // Helper with Timeout for Database calls
  const safeDbQuery = async (query: any, timeoutMs = 15000) => {
    const timeoutPromise = new Promise<{ data: null; error: { message: string; isTimeout: boolean } }>((resolve) => {
      setTimeout(() => resolve({ data: null, error: { message: "DB_TIMEOUT", isTimeout: true } }), timeoutMs);
    });
    return Promise.race([query, timeoutPromise]);
  };

  const fetchUserFromTable = async (authUserId: string, _roleHint?: string): Promise<{ user: User | null; error: any }> => {
    try {
      // Fetching from unified users table with role-specific profile joins
      const userResult: any = await safeDbQuery(
        supabase.from("users")
          .select(`
            *,
            admin_profiles!user_id(*),
            teacher_profiles!user_id(*),
            student_profiles!user_id(*)
          `)
          .eq("id", authUserId)
          .maybeSingle()
      );

      if (userResult.error && userResult.error.message !== "DB_TIMEOUT") {
         return { user: null, error: userResult.error };
      }

      if (userResult.data) {
        const data = userResult.data;
        const role = data.role || "teacher";
        
        // Flatten role-specific profile data (handles both array and single object formats)
        let profile: any = {};
        if (role === 'admin') {
          profile = (data.admin_profiles as any)?.[0] || data.admin_profiles || {};
        } else if (role === 'teacher') {
          profile = (data.teacher_profiles as any)?.[0] || data.teacher_profiles || {};
        } else if (role === 'student') {
          profile = (data.student_profiles as any)?.[0] || data.student_profiles || {};
        }

        return {
          user: {
            id: data.id.toString(),
            auth_id: authUserId, // In unified system, id === auth_id
            email: data.email ?? "",
            username: data.email ?? "",
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            role: role,
            is_active: data.is_active ?? true,
            email_verified: true,
            onboarding_completed: profile.onboarding_completed ?? false,
            title: profile.title,
            nickname: profile.nickname,
            student_code: profile.student_code,
            program_id: profile.program_id,
            year: profile.year,
            block_name: profile.block_name,
            school_id: profile.school_id,
            department_id: profile.department_id,
          },
          error: null
        };
      }

      if (userResult.error?.isTimeout) return { user: null, error: userResult.error };

      return { user: null, error: null };
    } catch (e) { 
      return { user: null, error: e }; 
    }
  };

  const mapSupabaseUser = async (supabaseUser: any): Promise<{ user: User | null; error: any }> => {
    const su = supabaseUser;
    const roleHint = su.user_metadata?.role;
    return await fetchUserFromTable(su.id, roleHint);
  };


  const logout = useCallback(async (reason?: string) => {
    try { 
      await supabase.auth.signOut({ scope: 'local' }); 
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      localStorage.removeItem("educompose_last_activity");
      setUser(null);
      
      if (reason) {
        showNotification('warning', reason);
      } else {
        showNotification('info', "Signed out successfully.");
      }
    }
  }, [showNotification]);

  const checkAuth = useCallback(async () => {
    // Only set loading to true if we don't have a user yet
    if (!user) setIsLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        if (isNetworkDisconnectError(sessionError.message)) return;
        
        // If 403 or 401, clear session
        if ((sessionError as any).status === 403 || (sessionError as any).status === 401) {
          console.error("Auth session invalid (403/401). Clearing session...");
          await logout();
          return;
        }
        
        setUser(null);
        return;
      }

      if (!session || !session.user) {
        setUser(null);
        return;
      }

      const { user: mappedUser, error: mapError } = await mapSupabaseUser(session.user);
      
      if (mapError) {
        // Database lookup failed but auth session exists. Retaining session for now.
        return;
      }

      if (mappedUser) {
        localStorage.setItem("user", JSON.stringify(mappedUser));
        setUser(mappedUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
      setIsInitialCheckComplete(true);
    }
  }, [logout, mapSupabaseUser]);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session.user) {
          const { user: mappedUser, error: mapError } = await mapSupabaseUser(session.user);

          if (mappedUser) {
            localStorage.setItem("auth_token", session.access_token);
            localStorage.setItem("user", JSON.stringify(mappedUser));
            setUser(mappedUser);
          } else if (mapError) {
            // DB lookup error (possibly timeout). Skipping state update.
          } else {
            // No record found in DB — but this can be a NEW teacher/student mid-signup.
            // Check if the signup flow is in progress (gives it time to create the record).
            // We do NOT auto-logout here to avoid killing the signup flow.
            // The login() call in the signup flow will call checkAuth() after inserting the record.
          }
        }
      }
    });

    // Realtime Session Monitoring - Removed
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleInactivityLogout = useCallback(() => {
    logout("Session expired due to inactivity.");
  }, [logout]);

  const handleInactivityWarning = useCallback(() => {
    showNotification('warning', "Your session will expire in 2 minutes due to inactivity.");
  }, [showNotification]);

  // USE INACTIVITY LOGOUT HOOK
  useInactivityLogout({
    timeout: 30 * 60 * 1000, // 30 mins
    warningTime: 2 * 60 * 1000, // 2 mins warning
    onLogout: handleInactivityLogout,
    onWarning: handleInactivityWarning,
    enabled: !!user,
  });

  const login = (token: string, userData?: User) => {
    localStorage.setItem("auth_token", token);
    if (userData) {
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    }
    checkAuth();
  };


  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, checkAuth, isInitialCheckComplete }}>
      {children}
    </AuthContext.Provider>
  );
};
