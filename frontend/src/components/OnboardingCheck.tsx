import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingCheckProps {
  children: React.ReactNode;
}

const OnboardingCheck: React.FC<OnboardingCheckProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading: isAuthLoading, isInitialCheckComplete } = useAuth();

  // If we are still doing the very first background verification, keep showing the loader
  // even if optimistic user exists, to avoid flash of onboarding redirect if stale.
  if (isAuthLoading || !isInitialCheckComplete) {
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

  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  // Admin bypass
  if (user.role === 'admin') {
    return <>{children}</>;
  }

  let onboardingCompleted = !!user.onboarding_completed;

  // Teacher specific check: must have title and nickname
  if (user.role === 'teacher') {
    onboardingCompleted = onboardingCompleted && !!user.title && !!user.nickname;
  }

  if (!onboardingCompleted) {
    if (user.role === 'student') {
      return <Navigate to="/Student/Onboarding" replace />;
    }
    return <Navigate to="/Teacher/Onboarding" replace />;
  }

  return <>{children}</>;
};

export default OnboardingCheck;