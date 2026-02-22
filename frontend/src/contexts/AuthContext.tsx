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
  email: "demo@educompose.com",
  username: "demo_user",
  full_name: "Demo Teacher",
  role: "teacher",
  is_active: true,
  email_verified: true,
};

interface User {
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
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const countdownIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch user data from the users table with timeout
  const fetchUserFromTable = async (authUserId: string): Promise<User | null> => {
    try {
      // Add timeout to prevent hanging - 2 seconds max
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: "Timeout" } }), 2000);
      });

      const queryPromise = supabase
        .from("users")
        .select("id, email, full_name, role, is_active, onboarding_completed, title, nickname")
        .eq("auth_user_id", authUserId)
        .single();

      const result = await Promise.race([queryPromise, timeoutPromise]);

      // If timeout occurred or error
      if (result.error || !result.data) {
        // Don't log as error if it's just that the record doesn't exist yet or timeout
        if (result.error?.message !== "Timeout" && result.error?.code !== "PGRST116") {
          console.warn("User not found in users table, using metadata fallback");
        }
        return null;
      }

      const { data } = result;

      return {
        id: data.id.toString(),
        email: data.email ?? "",
        username: data.email ?? "",
        full_name: data.full_name || data.email?.split("@")[0] || "User",
        role: data.role || "teacher",
        is_active: data.is_active ?? true,
        email_verified: true,
        onboarding_completed: data.onboarding_completed ?? false,
        title: data.title,
        nickname: data.nickname,
      };
    } catch (err) {
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
      (meta["full_name"] as string | undefined) ||
      (meta["name"] as string | undefined) ||
      su.email?.split("@")[0] ||
      "Teacher";

    return {
      id: su.id ?? "",
      email: su.email ?? "",
      username:
        (meta["username"] as string | undefined) || su.email || fullName,
      full_name: fullName,
      role: (meta["role"] as string | undefined) || "teacher",
      is_active: true,
      email_verified: !!su.email_confirmed_at,
      onboarding_completed: false, // Default to false for new users
      title: (meta["title"] as string | undefined),
      nickname: (meta["nickname"] as string | undefined),
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
        error,
      } = await supabase.auth.getSession();

      if (error || !session || !session.user) {
        // Clear all auth data if session is invalid
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
        const timeoutPromise = new Promise<{ data: { user: null }; error: { message: string } }>((resolve) => {
          setTimeout(() => resolve({ data: { user: null }, error: { message: "Timeout" } }), 5000);
        });

        const userResult = await Promise.race([getUserPromise, timeoutPromise]);
        currentUser = userResult.data?.user;
        userError = userResult.error;
      } catch (err) {
        userError = err as { message: string };
        currentUser = null;
      }

      if (userError || !currentUser) {
        // Session expired or invalid, clear everything
        if (userError?.message !== "Timeout") {
          await supabase.auth.signOut();
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
      // On any error, clear auth and sign out
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
  }, []);

  // Cleanup countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
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
  const handleInactivityWarning = (seconds: number) => {
    setRemainingSeconds(seconds);
    setShowInactivityWarning(true);
    
    // Clear any existing countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    // Start countdown timer
    let currentSeconds = seconds;
    countdownIntervalRef.current = setInterval(() => {
      currentSeconds -= 1;
      setRemainingSeconds(currentSeconds);
      
      if (currentSeconds <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    }, 1000);
  };

  // Handle inactivity logout
  const handleInactivityLogout = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setShowInactivityWarning(false);
    logout();
  };

  // Use inactivity logout hook (only when user is authenticated)
  useInactivityLogout({
    timeout: 60 * 60 * 1000, // 1 hour
    warningTime: 5 * 60 * 1000, // 5 minutes before logout
    onLogout: handleInactivityLogout,
    onWarning: handleInactivityWarning,
    onWarningDismissed: () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
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
        onClose={() => setShowInactivityWarning(false)}
        type="warning"
        title="Session Timeout Warning"
        message={`You have been inactive for a while. You will be automatically logged out in ${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'} for security reasons. Please interact with the page to stay logged in.`}
        confirmText="Stay Logged In"
        onConfirm={() => {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setShowInactivityWarning(false);
          // Activity will reset the timer automatically
        }}
        showCancel={false}
      />
    </AuthContext.Provider>
  );
};
