import React, { useEffect, useState } from "react";
import { AlertCircle, Home, ArrowLeft, RefreshCw, WifiOff } from "lucide-react";

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

const ErrorPage: React.FC<ErrorPageProps> = ({ code, message }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.title = `${code || "Network"} — ${errorMessages[code] || "Error"}`;
  }, [code]);

  const handleGoBack = () => window.history.back();
  const handleGoHome = () => (window.location.href = "/");
  const handleRefresh = () => window.location.reload();

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-[#0f172a]">
      {/* Dynamic Vibrant Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/30 blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/30 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-pink-600/20 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className={`relative z-10 max-w-2xl w-full text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Icon Section */}
        <div className="flex justify-center mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl group-hover:bg-white/40 transition-all duration-500"></div>
            <div className="relative w-32 h-32 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
              {code === 0 ? (
                <WifiOff className="w-16 h-16 text-white animate-bounce" />
              ) : (
                <AlertCircle className="w-16 h-16 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Big Code */}
        <h1 className="text-9xl font-black mb-2 text-white/10 tracking-tighter sm:text-[12rem]">
          {code || "!!!"}
        </h1>

        {/* Title */}
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg">
          {errorMessages[code] || "Something went wrong"}
        </h2>

        {/* Detailed Explanation for Network Error */}
        {code === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-12 text-left shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-purple-500"></div>
            
            <div className="space-y-4 text-white/90">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-blue-300 mb-2">Ano ito?</h3>
                <p className="text-lg leading-relaxed">
                  Nawawala ang connection ng browser mo sa internet habang sinusubukan niyang mag-send ng request (<strong>ERR_INTERNET_DISCONNECTED</strong>).
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-purple-300 mb-2">Bakit ito mahalaga?</h3>
                <p className="text-lg leading-relaxed italic opacity-80">
                  "Kapag nagkaproblema sa internet, minsan ang lumalabas na error sa browser ay 'CORS' kahit ang totoong problema ay naputol lang ang connection."
                </p>
              </div>

              <div className="p-4 bg-white/10 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold text-green-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-ping"></div>
                  Solusyon:
                </h3>
                <p className="text-lg">Siguraduhing stable ang internet connection mo habang nagte-test.</p>
              </div>
            </div>
          </div>
        ) : (
          /* Default Description for other errors */
          <p className="text-white/70 text-xl mb-12 max-w-lg mx-auto leading-relaxed">
            {message || "We encountered an unexpected issue. Please try again or go back to safety."}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button
            onClick={handleGoBack}
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>

          <button
            onClick={handleGoHome}
            className="group flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-slate-900 bg-white hover:bg-blue-50 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            <Home className="w-5 h-5" />
            Go Home
          </button>

          {(code === 500 || code === 0) && (
            <button
              onClick={handleRefresh}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30"
            >
              <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
              Retry Connection
            </button>
          )}
        </div>
      </div>

      {/* Decorative Text */}
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
        <p className="text-white/20 font-mono text-sm tracking-[0.5em] uppercase">EduCompose Core Security Systems</p>
      </div>
    </div>
  );
};

export default ErrorPage;
