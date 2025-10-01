import React from "react";
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
  const handleGoBack = () => window.history.back();
  const handleGoHome = () => (window.location.href = "/");
  const handleRefresh = () => window.location.reload();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
      <div className="max-w-2xl w-full">
        {/* Error Card */}
        <div className="rounded-2xl shadow-2xl p-8 md:p-12 text-center bg-white">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full flex items-center justify-center bg-cyan-100">
              <AlertCircle className="w-12 h-12 text-cyan-600" />
            </div>
          </div>

          {/* Error Code */}
          <h1 className="text-7xl md:text-8xl font-bold mb-4 bg-gradient-to-br from-cyan-600 to-cyan-800 bg-clip-text text-transparent">
            {code}
          </h1>

          {/* Error Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            {errorMessages[code] || "Error"}
          </h2>

          {/* Error Description */}
          <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
            {message ||
              errorDescriptions[code] ||
              "Sorry, something went wrong."}
          </p>

          {/* Divider */}
          <div className="mb-8">
            <div className="w-20 h-1 mx-auto rounded-full bg-cyan-300"></div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border border-gray-200 text-cyan-600 bg-white hover:bg-gray-100 hover:border-cyan-600 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>

            <button
              onClick={handleGoHome}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-br from-cyan-600 to-cyan-800 shadow-lg transform hover:from-cyan-800 hover:to-cyan-600 hover:-translate-y-0.5 hover:shadow-xl transition-all"
            >
              <Home className="w-5 h-5" />
              Go Home
            </button>

            {code === 500 && (
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border border-gray-200 text-cyan-600 bg-white hover:bg-gray-100 hover:border-cyan-600 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Retry
              </button>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help?{" "}
              <button
                onClick={() => console.log("Contact support")}
                className="font-semibold text-cyan-600 hover:text-cyan-800 transition-colors"
              >
                Contact Support
              </button>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        {code === 404 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Error Code: {code} | If you believe this is a mistake, please
              contact our support team.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorPage;
