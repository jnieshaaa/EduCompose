import React, { useEffect, useState } from "react";
import { AlertCircle, Home, ArrowLeft, RefreshCw } from "lucide-react";

type ErrorPageProps = {
  code: number;
  message?: string;
};

const errorMessages: Record<number, string> = {
  404: "Page Not Found",
  501: "Not Implemented",
  500: "Internal Server Error",
  403: "Forbidden",
  400: "Bad Request",
};

const errorDescriptions: Record<number, string> = {
  404: "The page you're looking for doesn't exist or has been moved.",
  501: "This feature hasn't been implemented yet. We're working on it!",
  500: "Something went wrong on our end. Our team has been notified.",
  403: "You don't have permission to access this resource.",
  400: "The request couldn't be understood or was missing required parameters.",
};

const ErrorPage: React.FC<ErrorPageProps> = ({ code, message }) => {
  const [shineMount, setShineMount] = useState(false);

  const handleGoBack = () => window.history.back();
  const handleGoHome = () => (window.location.href = "/");
  const handleRefresh = () => window.location.reload();

  useEffect(() => {
    document.title = `${code} — ${errorMessages[code] || "Error"}`;
  }, [code]);

  useEffect(() => {
    setShineMount(true);
  }, []);

  return (
    <div className='min-h-screen flex items-center justify-center p-6'>
      <div className='max-w-2xl w-full'>
        <div className='rounded-2xl shadow-2xl p-8 md:p-12 text-center bg-white border border-neutral-300/30'>
          <div className='flex justify-center mb-6'>
            <div className='w-24 h-24 rounded-full flex items-center justify-center bg-primary-50/20'>
              <AlertCircle className='w-12 h-12 text-primary-500' />
            </div>
          </div>

          <h1
            className='relative text-7xl md:text-8xl font-bold mb-4 
              bg-gradient-to-br from-primary-50 to-primary-500 
              bg-clip-text text-transparent overflow-hidden group'
          >
            {code}
            <span
              className={`absolute top-0 left-0 w-1/3 h-full bg-shine-gradient
                  transform -translate-x-full z-20 
                  ${
                    shineMount ? "animate-shine" : ""
                  } group-hover:animate-shine`}
              onAnimationEnd={() => setShineMount(false)}
            ></span>
          </h1>

          <h2 className='text-2xl md:text-3xl font-bold text-neutral-900 mb-4'>
            {errorMessages[code] || "Error"}
          </h2>

          <p className='text-neutral-600 text-lg mb-12 max-w-md mx-auto'>
            {message ||
              errorDescriptions[code] ||
              "Sorry, something went wrong."}
          </p>

          <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
            <button
              onClick={handleGoBack}
              className='flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border border-neutral-300 text-primary bg-white hover:bg-neutral-200 hover:text-primary-500 hover:border-primary transition-all'
            >
              <ArrowLeft className='w-5 h-5' />
              Go Back
            </button>

            <button
              onClick={handleGoHome}
              className='flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white bg-primary shadow-lg hover:bg-primary-300 transition-all'
            >
              <Home className='w-5 h-5' />
              Go Home
            </button>

            {code === 500 && (
              <button
                onClick={handleRefresh}
                className='flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border border-neutral-300 text-primary bg-white hover:bg-neutral-100 hover:border-primary-500 transition-all'
              >
                <RefreshCw className='w-5 h-5' />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
