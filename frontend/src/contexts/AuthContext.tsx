/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { useInactivityLogout } from "../hooks/useInactivityLogout";
import { useNotification } from "../contexts/NotificationContext";

interface User {
  auth_id: string;
  id: string | number;
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
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData?: User) => void;
  logout: (reason?: string) => void;
  checkAuth: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchUserFromTable = async (authUserId: string, roleHint?: string): Promise<{ user: User | null; error: any }> => {
    try {
      // 1. If we have a student hint, try students table first
      if (roleHint === 'student') {
        const studentResult: any = await safeDbQuery(
          supabase.from("students").select("id, email, first_name, last_name, onboarding_completed").eq("auth_user_id", authUserId).maybeSingle()
        );

        if (studentResult.data) {
          const data = studentResult.data;
          return {
            user: {
              id: data.id.toString(),
              auth_id: authUserId,
              email: data.email ?? "",
              username: data.email ?? "",
              first_name: data.first_name || "",
              last_name: data.last_name || "",
              role: "student",
              is_active: true,
              email_verified: true,
              onboarding_completed: data.onboarding_completed ?? false,
            },
            error: null
          };
        }
        
        if (studentResult.error?.isTimeout) return { user: null, error: studentResult.error };
      }

      // 2. Try fetching from users table (Teacher/Admin or default)
      const userResult: any = await safeDbQuery(
        supabase.from("users").select("id, email, first_name, last_name, role, is_active, onboarding_completed, title, nickname").eq("auth_user_id", authUserId).maybeSingle()
      );

      if (userResult.error && userResult.error.message !== "DB_TIMEOUT") {
         return { user: null, error: userResult.error };
      }

      if (userResult.data) {
        const data = userResult.data;
        return {
          user: {
            id: data.id.toString(),
            auth_id: authUserId,
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
          },
          error: null
        };
      }

      if (userResult.error?.isTimeout) return { user: null, error: userResult.error };

      // 3. Fallback to students table if not tried yet
      if (roleHint !== 'student') {
        const studentResult: any = await safeDbQuery(
          supabase.from("students").select("id, email, first_name, last_name, onboarding_completed").eq("auth_user_id", authUserId).maybeSingle()
        );

        if (studentResult.data) {
          const data = studentResult.data;
          return {
            user: {
              id: data.id.toString(),
              auth_id: authUserId,
              email: data.email ?? "",
              username: data.email ?? "",
              first_name: data.first_name || "",
              last_name: data.last_name || "",
              role: "student",
              is_active: true,
              email_verified: true,
              onboarding_completed: data.onboarding_completed ?? false,
            },
            error: null
          };
        }
        return { user: null, error: studentResult.error };
      }

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
    setIsLoading(true);
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
        console.warn("Database lookup failed during checkAuth but auth session exists. Retaining session for now.");
        // We stay in current state (keep user if we had one)
        return;
      }

      if (!mappedUser) {
        // Record truly missing
        console.error("Authenticated but record not found in database. Signing out...");
        await logout("Account record no longer exists. Please sign up again.");
        return;
      }
      
      setUser(mappedUser);
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
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
            console.warn("Auth state change error (possibly timeout). Skipping state update.");
          } else {
            // No user and no error -> Record truly missing
            await logout("Account database record not found.");
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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
