import React, { useEffect, useState } from "react";
import { AlertCircle, Home, ArrowLeft, RefreshCw, WifiOff, ShieldAlert } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type ErrorPageProps = {
  code: number;
  message?: string;
};

const errorMessages: Record<number, string> = {
  0: "Network Connection Error",
  404: "Page Not Found",
  501: "Not Implemented",
  500: "Internal Server Error",
  403: "Forbidden",
  400: "Bad Request",
};

const errorDescriptions: Record<number, string> = {
  0: "Your device appears to be offline. Check your Wi-Fi or mobile data and try again.",
  404: "The page you're looking for doesn't exist or has been moved.",
  501: "This feature hasn't been built yet. Check back later.",
  500: "Something broke on our end. Our team has been notified.",
  403: "You don't have permission to access this resource.",
  400: "The request couldn't be understood. Please try a different action.",
};

const ErrorPage: React.FC<ErrorPageProps> = ({ code, message }) => {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
    document.title = `${code || "Network"} — ${errorMessages[code] || "Error"}`;
  }, [code]);

  const handleGoBack = () => window.history.back();

  const handleGoHome = () => {
    if (!user) {
      window.location.href = "/";
      return;
    }

    // Role-based redirection
    switch (user.role?.toLowerCase()) {
      case "admin":
        window.location.href = "/Admin/Dashboard";
        break;
      case "student":
        window.location.href = "/Student/Dashboard";
        break;
      case "teacher":
        window.location.href = "/Teacher/Dashboard";
        break;
      default:
        window.location.href = "/";
    }
  };

  const handleRefresh = () => window.location.reload();

  return (
    <div className="min-h-screen flex bg-neutral-900 overflow-hidden relative">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full bg-primary/20 blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[40%] h-[40%] rounded-full bg-secondary/15 blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[30%] right-[5%] w-[25%] h-[25%] rounded-full bg-support/10 blur-[100px] animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Split Layout */}
      <div className={`flex flex-col lg:flex-row w-full relative z-10 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

        {/* Left Panel — Visual & Code Display */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16">
          {/* Icon Orb */}
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl scale-150 group-hover:bg-primary/30 transition-all duration-700" />
            <div className="relative w-28 h-28 lg:w-36 lg:h-36 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              {code === 0 ? (
                <WifiOff className="w-12 h-12 lg:w-16 lg:h-16 text-white/80" />
              ) : code === 403 ? (
                <ShieldAlert className="w-12 h-12 lg:w-16 lg:h-16 text-white/80" />
              ) : (
                <AlertCircle className="w-12 h-12 lg:w-16 lg:h-16 text-white/80" />
              )}
            </div>
          </div>

          {/* Big Error Code */}
          <h1 className="text-[8rem] lg:text-[11rem] font-black leading-none text-white/[0.07] tracking-tighter select-none">
            {code || "???"}
          </h1>

          {/* Title */}
          <h2 className="text-3xl lg:text-4xl font-bold text-white mt-[-1rem] lg:mt-[-2rem] text-center">
            {errorMessages[code] || "Something went wrong"}
          </h2>
        </div>

        {/* Right Panel — Diagnostic Information & Actions */}
        <div className="flex-1 flex flex-col justify-center p-8 lg:p-16 lg:max-w-xl">
          {/* Diagnostic Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl mb-8">
            {/* Card Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em]">
                Diagnostic Report
              </span>
              <span className="ml-auto text-[10px] font-mono text-white/20">
                CODE {code || "NET"}
              </span>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-5">
              {/* Description */}
              <div>
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">What happened</h3>
                <p className="text-white/80 leading-relaxed">
                  {message || errorDescriptions[code] || "We encountered an unexpected issue. Please try again or go back to safety."}
                </p>
              </div>

              {/* Network-specific details */}
              {code === 0 && (
                <>
                  <div className="border-t border-white/5 pt-4">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Why does this happen?</h3>
                    <p className="text-white/60 text-sm leading-relaxed italic">
                      "Sometimes a browser will display a 'CORS' error when the actual problem is just a lost network connection."
                    </p>
                  </div>

                  <div className="p-4 bg-success-default/10 rounded-xl border border-success-default/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-success-default animate-ping" />
                      <h3 className="text-xs font-bold text-success-light uppercase tracking-widest">Resolution</h3>
                    </div>
                    <p className="text-white/70 text-sm">Ensure you have a stable internet connection, then click <strong className="text-white">Retry</strong> below.</p>
                  </div>
                </>
              )}

              {/* Quick meta row */}
              <div className="flex gap-3 pt-2">
                <span className="text-[9px] font-bold text-white/20 bg-white/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  HTTP {code || "N/A"}
                </span>
                <span className="text-[9px] font-bold text-white/20 bg-white/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGoBack}
              className="group flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Go Back
            </button>

            <button
              onClick={handleGoHome}
              className="group flex items-center gap-2.5 px-8 py-3 rounded-xl font-bold text-sm text-neutral-900 bg-white hover:bg-neutral-100 transition-all duration-300 active:scale-95 shadow-lg shadow-white/10"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>

            {(code === 500 || code === 0) && (
              <button
                onClick={handleRefresh}
                className="group flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-300 transition-all duration-300 active:scale-95 shadow-lg shadow-primary/30"
              >
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                Retry Connection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
        <p className="text-white/10 font-mono text-[10px] tracking-[0.4em] uppercase">
          EduCompose System Diagnostics
        </p>
      </div>
    </div>
  );
};

export default ErrorPage;
