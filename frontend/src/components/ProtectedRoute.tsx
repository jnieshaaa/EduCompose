import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "teacher" | "student";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuth();
  const location = useLocation();

  // Re-validate authentication on route change
  useEffect(() => {
    const validateAuth = async () => {
      // Double-check session is valid
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        // Session invalid, ensure we're logged out
        await supabase.auth.signOut();
        checkAuth();
      }
    };

    // Only validate if we think we're authenticated
    if (isAuthenticated) {
      validateAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    const path = location.pathname.toLowerCase();
    
    // If accessing student routes OR explicit student role is required
    if (path.startsWith("/student") || requiredRole === "student") {
      return <Navigate to="/Student/Login" state={{ from: location }} replace />;
    }

    // Default for Admin or Teacher - Redirect to Landing Page (where Teacher/Admin AuthModal exists)
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check role-based access if requiredRole is specified
  if (requiredRole && user) {
    const userRole = user.role?.toLowerCase();
    const requiredRoleLower = requiredRole.toLowerCase();

    if (userRole !== requiredRoleLower) {
      // Redirect based on user's actual role
      if (userRole === "admin") {
        return <Navigate to="/Admin/Dashboard" replace />;
      } else if (userRole === "student") {
        return <Navigate to="/Student/Dashboard" replace />;
      } else {
        return <Navigate to="/Teacher/Dashboard" replace />;
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

