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
      // Fetching from unified users table (Admin/Teacher/Student)
      const userResult: any = await safeDbQuery(
        supabase.from("users")
          .select("id, email, first_name, last_name, role, is_active, onboarding_completed, title, nickname, student_code, program_id, year, block_name, school_id, department_id")
          .eq("id", authUserId)
          .maybeSingle()
      );

      if (userResult.error && userResult.error.message !== "DB_TIMEOUT") {
         return { user: null, error: userResult.error };
      }

      if (userResult.data) {
        const data = userResult.data;
        return {
          user: {
            id: data.id.toString(),
            auth_id: authUserId, // In unified system, id === auth_id
            email: data.email ?? "",
            username: data.email ?? "",
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            role: data.role || "teacher",
            is_active: data.is_active ?? true,
            email_verified: true,
            onboarding_completed: data.onboarding_completed ?? false,
            title: data.title,
            nickname: data.nickname,
            student_code: data.student_code,
            program_id: data.program_id,
            year: data.year,
            block_name: data.block_name,
            school_id: data.school_id,
            department_id: data.department_id,
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
      await supabase.auth.signOut(); 
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

      if (!mappedUser) {
        // DB record missing — could be a mid-signup state or a deleted account.
        // Don't force signOut() (causes 403 on expired tokens & breaks signup flows).
        // Just clear local state so the user sees the login screen naturally.
        console.warn("Session exists but no DB record found. Clearing local state.");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        setUser(null);
        return;
      }
      
      setUser(mappedUser);
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
      console.log("[AuthContext] onAuthStateChange:", event, session?.user?.email);

      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session.user) {
          console.log("[AuthContext] Looking up DB record for:", session.user.id, "role hint:", session.user.user_metadata?.role);
          const { user: mappedUser, error: mapError } = await mapSupabaseUser(session.user);
          console.log("[AuthContext] DB lookup result — mappedUser:", mappedUser, "error:", mapError);

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
            console.warn("[AuthContext] SIGNED_IN but no DB record found for:", session.user.email, "— allowing signup flow to proceed.");
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
