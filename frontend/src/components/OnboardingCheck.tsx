import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface OnboardingCheckProps {
  children: React.ReactNode;
}

const OnboardingCheck: React.FC<OnboardingCheckProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // 1. First check if we have a valid session/user from Supabase Auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        setIsLoading(false);
        return;
      }

      try {
        const role = authUser.app_metadata?.role || authUser.user_metadata?.role;
        setUserRole(role || null);
        
        if (role === 'admin') {
          setOnboardingCompleted(true);
          return;
        }

        if (role === 'student') {
          // Check students table for student onboarding status and enrollment status
          const { data, error } = await supabase
            .from('students')
            .select('onboarding_completed, enrollment_status')
            .eq('auth_user_id', authUser.id)
            .maybeSingle();

          if (error) {
            console.error('Error checking student status:', error);
            setOnboardingCompleted(false);
          } else if (!data || data.enrollment_status !== 'active') {
            // Block access if student record not found or not active
            setOnboardingCompleted(false);
          } else {
            setOnboardingCompleted(!!data.onboarding_completed);
          }
        } else {
          // Default behavior for teachers/course owners
          const { data, error } = await supabase
            .from('users')
            .select('onboarding_completed, title, nickname')
            .eq('auth_user_id', authUser.id)
            .maybeSingle();

          if (error) {
            console.error('Error checking teacher onboarding status:', error);
            setOnboardingCompleted(false);
          } else {
            // Teacher must have completed onboarding AND have title/nickname set
            const isComplete = data?.onboarding_completed && data?.title && data?.nickname;
            setOnboardingCompleted(!!isComplete);
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setOnboardingCompleted(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      checkOnboardingStatus();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white relative overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute top-[-20%] left-[-15%] w-[55%] h-[55%] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-secondary/[0.04] blur-[120px]" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Branded Spinner */}
          <div className="relative w-14 h-14 mb-8">
            <div className="absolute inset-0 rounded-full border-[3px] border-neutral-100" />
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-spin" />
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary/60" />
            </div>
          </div>

          {/* Text */}
          <p className="text-sm font-semibold text-neutral-700 mb-1">
            Preparing your workspace
          </p>
          <p className="text-xs text-neutral-400">
            Verifying account credentials…
          </p>
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-50 overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-primary/30 via-primary to-primary/30 animate-[shimmer_2s_ease-in-out_infinite]"
            style={{
              animation: 'shimmer 2s ease-in-out infinite',
            }}
          />
          <style>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!onboardingCompleted) {
    // Redirect based on role
    if (userRole === 'student') {
      return <Navigate to="/Student/Onboarding" replace />;
    }
    return <Navigate to="/Teacher/Onboarding" replace />;
  }

  return <>{children}</>;
};

export default OnboardingCheck;