/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { useInactivityLogout } from "../hooks/useInactivityLogout";
import { useNotification } from "../context/NotificationContext";

interface User {
  auth_id: string;
  id: string | number;
  email: string;
  username: string;
  full_name: string;
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
  const safeDbQuery = async (query: any, timeoutMs = 2500) => {
    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
      setTimeout(() => resolve({ data: null, error: { message: "DB_TIMEOUT" } }), timeoutMs);
    });
    return Promise.race([query, timeoutPromise]);
  };

  // Sync session to DB without blocking
  const syncSessionToDB = async (_authUserId: string, _token: string) => {
    // try {
    //   const { data: userRec } = await safeDbQuery(
    //     supabase.from("users").select("id").eq("auth_user_id", authUserId).maybeSingle()
    //   );
    //   const table = userRec ? "users" : "students";
    //   await supabase.from(table).update({ current_session_id: token }).eq("auth_user_id", authUserId);
    // } catch (e) { /* ignore */ }
  };

  const fetchUserFromTable = async (authUserId: string): Promise<User | null> => {
    try {
      // 1. Try fetching from users table (Teacher/Admin)
      const userResult: any = await safeDbQuery(
        supabase.from("users").select("id, email, first_name, last_name, role, is_active, onboarding_completed, title, nickname").eq("auth_user_id", authUserId).maybeSingle()
      );

      if (userResult.data) {
        const data = userResult.data;
        const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.email?.split("@")[0] || "User";
        return {
          id: data.id.toString(),
          auth_id: authUserId,
          email: data.email ?? "",
          username: data.email ?? "",
          full_name: fullName,
          role: data.role || "teacher",
          is_active: data.is_active ?? true,
          email_verified: true,
          onboarding_completed: data.onboarding_completed ?? false,
          title: data.title,
          nickname: data.nickname,
        };
      }

      // 2. Try fetching from students table
      const studentResult: any = await safeDbQuery(
        supabase.from("students").select("id, email, first_name, last_name, onboarding_completed").eq("auth_user_id", authUserId).maybeSingle()
      );

      if (studentResult.data) {
        const data = studentResult.data;
        const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.email?.split("@")[0] || "Student";
        return {
          id: data.id.toString(),
          auth_id: authUserId,
          email: data.email ?? "",
          username: data.email ?? "",
          full_name: fullName,
          role: "student",
          is_active: true,
          email_verified: true,
          onboarding_completed: data.onboarding_completed ?? false,
        };
      }

      return null;
    } catch { return null; }
  };

  const mapSupabaseUser = async (supabaseUser: any): Promise<User | null> => {
    const su = supabaseUser;
    const userFromTable = await fetchUserFromTable(su.id);
    
    // If the account was deleted from the database but still exists in Auth (stale session)
    // we should treat it as null so the app forces a logout
    if (!userFromTable) {
      console.warn("User still has auth session but no database record found. Forcing logout check.");
      return null; 
    }

    return userFromTable;
  };

  const checkAuth = async () => {
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

      const mappedUser = await mapSupabaseUser(session.user);
      if (!mappedUser) {
        // If we have a session but no database record, sign the user out
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
  };

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session.user) {
          syncSessionToDB(session.user.id, session.access_token);
          const mappedUser = await mapSupabaseUser(session.user);
          localStorage.setItem("auth_token", session.access_token);
          localStorage.setItem("user", JSON.stringify(mappedUser));
          setUser(mappedUser);
        }
      }
    });

    // Realtime Session Monitoring - Removed
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user?.auth_id]);

  // USE INACTIVITY LOGOUT HOOK
  useInactivityLogout({
    timeout: 30 * 60 * 1000, // 30 mins
    warningTime: 2 * 60 * 1000, // 2 mins warning
    onLogout: () => {
      logout("Session expired due to inactivity.");
    },
    onWarning: () => {
      showNotification('warning', "Your session will expire in 2 minutes due to inactivity.");
    },
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

  const logout = async (reason?: string) => {
    try { 
      await supabase.auth.signOut(); 
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      setUser(null);
      
      if (reason) {
        showNotification('warning', reason);
      } else {
        showNotification('info', "Signed out successfully.");
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
