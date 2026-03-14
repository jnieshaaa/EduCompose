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
        
        if (role === 'admin') {
          setOnboardingCompleted(true);
          return;
        }

        if (role === 'student') {
          // Check students table for student onboarding status
          const { data, error } = await supabase
            .from('students')
            .select('onboarding_completed')
            .eq('auth_user_id', authUser.id)
            .maybeSingle();

          if (error) {
            console.error('Error checking student onboarding status:', error);
            setOnboardingCompleted(false);
          } else {
            setOnboardingCompleted(!!data?.onboarding_completed);
          }
        } else {
          // Default behavior for teachers/admins
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default OnboardingCheck;