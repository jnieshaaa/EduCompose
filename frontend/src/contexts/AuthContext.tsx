/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { useInactivityLogout } from "../hooks/useInactivityLogout";
import AlertModal from "../components/ui/AlertModal";

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
  logout: () => void;
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
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);

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
  const syncSessionToDB = async (authUserId: string, token: string) => {
    try {
      const { data: userRec } = await safeDbQuery(
        supabase.from("users").select("id").eq("auth_user_id", authUserId).maybeSingle()
      );
      const table = userRec ? "users" : "students";
      await supabase.from(table).update({ current_session_id: token }).eq("auth_user_id", authUserId);
    } catch (e) { /* ignore */ }
  };

  const fetchUserFromTable = async (authUserId: string): Promise<User | null> => {
    try {
      const result: any = await safeDbQuery(
        supabase.from("users").select("id, email, first_name, middle_name, last_name, role, is_active, onboarding_completed, title, nickname").eq("auth_user_id", authUserId).maybeSingle()
      );

      if (!result.data) return null;
      const data = result.data;
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
    } catch { return null; }
  };

  const mapSupabaseUser = async (supabaseUser: any): Promise<User> => {
    const su = supabaseUser;
    const userFromTable = await fetchUserFromTable(su.id);
    if (userFromTable) return userFromTable;

    const metadata = su.user_metadata || {};
    return {
      id: su.id,
      auth_id: su.id,
      email: su.email || "",
      username: metadata.username || su.email || "User",
      full_name: metadata.full_name || metadata.display_name || su.email?.split("@")[0] || "Teacher",
      role: metadata.role || "teacher",
      is_active: true,
      email_verified: !!su.email_confirmed_at,
    };
  };

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session || !session.user) {
        if (sessionError && isNetworkDisconnectError(sessionError.message)) return;
        setUser(null);
        return;
      }

      // Single Session Safety with Timeout
      try {
        const query = supabase.from("users").select("id, current_session_id").eq("auth_user_id", session.user.id).maybeSingle();
        let result: any = await safeDbQuery(query);
        let dbRecord = result.data;
        
        if (!dbRecord) {
          const sQuery = supabase.from("students").select("id, current_session_id").eq("auth_user_id", session.user.id).maybeSingle();
          result = await safeDbQuery(sQuery);
          dbRecord = result.data;
        }

        if (dbRecord && dbRecord.current_session_id && dbRecord.current_session_id !== session.access_token) {
          await logout();
          alert("Logged out: This account is being used on another device.");
          return;
        }
      } catch (err) { /* fail silent */ }

      const mappedUser = await mapSupabaseUser(session.user);
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

    let sessionChannel: any;
    const subscribeToSession = async (authId: string) => {
      try {
        const { data: userRec } = await safeDbQuery(supabase.from("users").select("id").eq("auth_user_id", authId).maybeSingle());
        const table = userRec ? "users" : "students";
        sessionChannel = supabase.channel(`session-${authId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `auth_user_id=eq.${authId}` }, (p: any) => {
            const newestId = p.new.current_session_id;
            const ourId = localStorage.getItem("auth_token");
            if (newestId && ourId && newestId !== ourId) {
              logout();
              alert("Session Expired: New login detected on another device.");
            }
          }).subscribe();
      } catch (e) { /* ignore */ }
    }

    if (user?.auth_id) subscribeToSession(user.auth_id);

    return () => {
      subscription.unsubscribe();
      if (sessionChannel) supabase.removeChannel(sessionChannel);
    };
  }, [user?.auth_id]);

  // USE INACTIVITY LOGOUT HOOK
  useInactivityLogout({
    timeout: 30 * 60 * 1000, // 30 mins
    warningTime: 2 * 60 * 1000, // 2 mins warning
    onLogout: () => {
      setShowInactivityWarning(false);
      logout();
    },
    onWarning: () => setShowInactivityWarning(true),
    onWarningDismissed: () => setShowInactivityWarning(false),
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

  const logout = async () => {
    try { await supabase.auth.signOut(); } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      setUser(null);
      setShowInactivityWarning(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, checkAuth }}>
      {children}
      <AlertModal
        isOpen={showInactivityWarning}
        onClose={() => logout()}
        type="warning"
        title="Session Timeout"
        message="Your session is about to expire due to inactivity."
        confirmText="Logout Now"
        onConfirm={() => logout()}
        showCancel={false}
      />
    </AuthContext.Provider>
  );
};
