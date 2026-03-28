/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { useInactivityLogout } from "../hooks/useInactivityLogout";
import AlertModal from "../components/ui/AlertModal";

// Design/demo mode is now disabled so Supabase auth is used.
export const DESIGN_MODE_ENABLED = false;
export const DESIGN_MODE_TOKEN = "DESIGN_MODE_AUTH_TOKEN";
export const DESIGN_MODE_USER = {
  id: 1,
  auth_id: "demo-auth-id",
  email: "demo@educompose.com",
  username: "demo_user",
  full_name: "Demo Teacher",
  role: "teacher",
  is_active: true,
  email_verified: true,
};

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
  school?: string;
  department?: string;
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
    // Typical Supabase/browser messages when offline
    if (!message) return false;
    const normalized = message.toLowerCase();
    return (
      normalized.includes("failed to fetch") ||
      normalized.includes("fetch failed") ||
      normalized.includes("network request failed") ||
      normalized.includes("err_internet_disconnected") ||
      normalized.includes("internet disconnected") ||
      normalized.includes("networkerror") ||
      normalized.includes("timeout") // sometimes happens during network loss
    );
  };

  // Fetch user data from the users table with timeout
  const fetchUserFromTable = async (
    authUserId: string,
  ): Promise<User | null> => {
    try {
      // Add timeout to prevent hanging - 2 seconds max
      const timeoutPromise = new Promise<{
        data: null;
        error: { message: string };
      }>((resolve) => {
        setTimeout(
          () => resolve({ data: null, error: { message: "Timeout" } }),
          2000,
        );
      });

      const queryPromise = supabase
        .from("users")
        .select(
          "id, email, first_name, middle_name, last_name, role, is_active, onboarding_completed, title, nickname",
        )
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      const result = await Promise.race([queryPromise, timeoutPromise]);

      // If timeout occurred or error
      if (result.error || !result.data) {
        return null;
      }

      const { data } = result;

      // Compute full_name from first_name, middle_name, last_name
      const nameParts = [
        data.first_name,
        data.middle_name,
        data.last_name,
      ].filter(Boolean);
      const fullName =
        nameParts.length > 0
          ? nameParts.join(" ")
          : data.email?.split("@")[0] || "User";

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
    } catch {
      console.warn("Error fetching user from users table, using fallback");
      return null;
    }
  };

  // Map Supabase user object into our local User shape
  const mapSupabaseUser = async (supabaseUser: unknown): Promise<User> => {
    const su = supabaseUser as {
      id?: string | number;
      email?: string | null;
      user_metadata?: Record<string, unknown> | null;
      email_confirmed_at?: string | null;
    };

    // Try to fetch from users table first
    if (su.id) {
      const userFromTable = await fetchUserFromTable(su.id.toString());
      if (userFromTable) {
        return userFromTable;
      }
    }

    // Fallback to metadata if users table doesn't have the record
    const metadata = su.user_metadata ?? {};
    const meta = metadata as Record<string, unknown>;
    const fullName =
      (meta["display_name"] as string | undefined) ||
      (meta["full_name"] as string | undefined) ||
      (meta["name"] as string | undefined) ||
      su.email?.split("@")[0] ||
      "Teacher";

    return {
      id: su.id ?? "",
      auth_id: su.id?.toString() ?? "",
      email: su.email ?? "",
      username:
        (meta["username"] as string | undefined) || su.email || fullName,
      full_name: fullName,
      role: (meta["role"] as string | undefined) || "teacher",
      is_active: true,
      email_verified: !!su.email_confirmed_at,
      onboarding_completed: false, // Default to false for new users
      title: meta["title"] as string | undefined,
      nickname: meta["nickname"] as string | undefined,
    };
  };

  // Check if user is authenticated via Supabase on mount and when token changes
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      // Check localStorage first for faster initial load
      const cachedUser = localStorage.getItem("user");
      if (cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser);
          setUser(parsedUser);
        } catch {
          // Invalid cache, continue with auth check
        }
      }

      // Always verify with Supabase to ensure session is valid
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session || !session.user) {
        // If this is just a temporary network disconnect, keep the current auth state.
        if (sessionError && isNetworkDisconnectError(sessionError.message)) {
          console.warn(
            "Network error verifying session, skipping sign-out:",
            sessionError.message,
          );
          setIsLoading(false);
          return;
        }

        // Clear all auth data if session is invalid or refresh failed
        if (sessionError) {
          console.warn(
            "Session refresh or retrieval failed, signing out:",
            sessionError.message,
          );
          try {
            await supabase.auth.signOut();
          } catch {
            // Ignore signout errors
          }
        }
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Verify session is still valid by checking user (with timeout)
      let currentUser;
      let userError;
      try {
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<{
          data: { user: null };
          error: { message: string };
        }>((resolve) => {
          setTimeout(
            () =>
              resolve({ data: { user: null }, error: { message: "Timeout" } }),
            5000,
          );
        });

        const userResult = await Promise.race([getUserPromise, timeoutPromise]);
        currentUser = userResult.data?.user;
        userError = userResult.error;
      } catch (err) {
        userError = err as { message: string };
        currentUser = null;
      }

      if (userError || !currentUser) {
        // If this is just a temporary network disconnect, do not sign the user out.
        if (userError?.message && isNetworkDisconnectError(userError.message)) {
          console.warn(
            "Network error verifying user, skipping sign-out:",
            userError.message,
          );
          setIsLoading(false);
          return;
        }

        // Session expired or invalid, clear everything
        if (userError?.message !== "Timeout") {
          console.warn(
            "User verification failed, signing out:",
            userError?.message,
          );
          try {
            await supabase.auth.signOut();
          } catch {
            // Ignore signout errors
          }
        }
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Session is valid, update user data (with fast fallback)
      const mappedUser = await mapSupabaseUser(currentUser);
      localStorage.setItem("auth_token", session.access_token);
      localStorage.setItem("user", JSON.stringify(mappedUser));
      setUser(mappedUser);
    } catch (error) {
      console.error("Auth check failed:", error);

      // On network errors, don't sign out.
      const maybeMessage =
        typeof (error as { message?: string }).message === "string"
          ? (error as { message?: string }).message
          : undefined;
      if (isNetworkDisconnectError(maybeMessage)) {
        console.warn(
          "Network/auth fetch failure detected, keeping current auth state",
        );
        return;
      }

      // On any other error, clear auth and sign out
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore signout errors
      }
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check authentication on mount
    checkAuth();

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        // User signed out or session expired
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        setUser(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // User signed in or token refreshed, update user data
        if (session.user) {
          const mappedUser = await mapSupabaseUser(session.user);
          localStorage.setItem("auth_token", session.access_token);
          localStorage.setItem("user", JSON.stringify(mappedUser));
          setUser(mappedUser);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (token: string, userData?: User) => {
    localStorage.setItem("auth_token", token);
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } else {
      // If no userData provided, verify with backend
      checkAuth();
    }
  };

  const logout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      // Always clear local storage regardless of Supabase signout result
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      setUser(null);
      setShowInactivityWarning(false);
    }
  };

  // Handle inactivity warning
  const handleInactivityWarning = () => {
    setShowInactivityWarning(true);
  };

  // Handle inactivity logout
  const handleInactivityLogout = () => {
    setShowInactivityWarning(false);
    logout();
  };

  // Use inactivity logout hook (only when user is authenticated)
  useInactivityLogout({
    timeout: 30 * 60 * 1000, // 30 minutes of inactivity
    warningTime: 2 * 60 * 1000, // 2 minutes warning before logout
    onLogout: handleInactivityLogout,
    onWarning: handleInactivityWarning,
    onWarningDismissed: () => {
      setShowInactivityWarning(false);
    },
    enabled: !!user && !!localStorage.getItem("auth_token"),
  });

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!localStorage.getItem("auth_token"),
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Inactivity Warning Modal */}
      <AlertModal
        isOpen={showInactivityWarning}
        onClose={handleInactivityLogout}
        type="warning"
        title="Session Timeout"
        message="You have been inactive for too long. For security reasons, please click OK to logout."
        confirmText="OK"
        onConfirm={handleInactivityLogout}
        showCancel={false}
      />
    </AuthContext.Provider>
  );
};
