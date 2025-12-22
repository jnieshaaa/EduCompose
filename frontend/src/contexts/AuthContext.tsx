import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

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

  // Map Supabase user object into our local User shape
  const mapSupabaseUser = (supabaseUser: unknown): User => {
    const su = supabaseUser as {
      id?: string | number;
      email?: string | null;
      user_metadata?: Record<string, unknown> | null;
      email_confirmed_at?: string | null;
    };
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
      role: "teacher",
      is_active: true,
      email_verified: !!su.email_confirmed_at,
    };
  };

  // Check if user is authenticated via Supabase on mount and when token changes
  const checkAuth = async () => {
    setIsLoading(true);
    try {
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

      // Verify session is still valid by checking user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        // Session expired or invalid, clear everything
        await supabase.auth.signOut();
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Session is valid, update user data
      const mappedUser = mapSupabaseUser(currentUser);
      localStorage.setItem("auth_token", session.access_token);
      localStorage.setItem("user", JSON.stringify(mappedUser));
      setUser(mappedUser);
    } catch (error) {
      console.error("Auth check failed:", error);
      // On any error, clear auth and sign out
      await supabase.auth.signOut();
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
          const mappedUser = mapSupabaseUser(session.user);
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
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!localStorage.getItem("auth_token"),
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
