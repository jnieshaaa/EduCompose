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
  const mapSupabaseUser = (supabaseUser: any): User => {
    const metadata = supabaseUser.user_metadata || {};
    const fullName =
      metadata.full_name ||
      metadata.name ||
      supabaseUser.email?.split("@")[0] ||
      "Teacher";

    return {
      id: supabaseUser.id,
      email: supabaseUser.email ?? "",
      username: metadata.username || supabaseUser.email || fullName,
      full_name: fullName,
      role: "teacher",
      is_active: true,
      email_verified: !!supabaseUser.email_confirmed_at,
    };
  };

  // Check if user is authenticated via Supabase on mount and when token changes
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      // Prefer locally cached user if present
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setIsLoading(false);
        return;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session || !session.user) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        setUser(null);
        setIsLoading(false);
        return;
      }

      const mappedUser = mapSupabaseUser(session.user);
      localStorage.setItem("auth_token", session.access_token);
      localStorage.setItem("user", JSON.stringify(mappedUser));
      setUser(mappedUser);
    } catch (error) {
      console.error("Auth check failed:", error);
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

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
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