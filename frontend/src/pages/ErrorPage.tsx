import React from "react";

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

const ErrorPage: React.FC<ErrorPageProps> = ({ code, message }) => (
  <div className="p-6 text-center">
    <h1 className="text-3xl text-error font-bold mb-4">
      {code} - {errorMessages[code] || "Error"}
    </h1>
    <p className="text-gray-600">{message || "Sorry, something went wrong."}</p>
  </div>
);

export default ErrorPage;
