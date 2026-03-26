/**
 * Utility functions for handling and clarifying error messages
 */

export interface AppError {
  message: string;
  type: 'network' | 'auth' | 'database' | 'validation' | 'server' | 'unknown';
  originalError?: any;
}

/**
 * Parses an error and returns a user-friendly message and error type
 */
export function parseError(err: any): AppError {
  // Check for network connectivity first
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      message: "No internet connection. Please check your network and try again.",
      type: 'network',
      originalError: err
    };
  }

  const errorString = String(err?.message || err).toLowerCase();

  // Network/Fetch errors
  if (
    errorString.includes('fetch') || 
    errorString.includes('network error') || 
    errorString.includes('connection') ||
    errorString.includes('timeout') ||
    errorString.includes('econnrefused')
  ) {
    return {
      message: "Network error occurred. The server may be unreachable or your connection is unstable.",
      type: 'network',
      originalError: err
    };
  }

  // Auth errors
  if (
    errorString.includes('auth') || 
    errorString.includes('token') || 
    errorString.includes('unauthorized') ||
    errorString.includes('session expired')
  ) {
    return {
      message: "Your session has expired or you don't have permission. Please log in again.",
      type: 'auth',
      originalError: err
    };
  }

  // Database errors (Supabase specific)
  if (err?.code && (err.code.startsWith('P') || err.code.startsWith('23') || err.code.startsWith('42'))) {
    return {
      message: "A database error occurred while processing your request.",
      type: 'database',
      originalError: err
    };
  }

  // OCR/AI Specific Errors
  if (errorString.includes('ocr') || errorString.includes('extract text')) {
    return {
      message: "Failed to extract text from the document. Please ensure it's a valid PDF.",
      type: 'server',
      originalError: err
    };
  }

  if (errorString.includes('analyze') || errorString.includes('grading')) {
    return {
      message: "The AI analysis service is temporarily unavailable. Please try again later.",
      type: 'server',
      originalError: err
    };
  }

  // Default
  return {
    message: err?.message || "An unexpected error occurred. Please try again.",
    type: 'unknown',
    originalError: err
  };
}

/**
 * Returns only the message string for quick use in alerts
 */
export function getErrorMessage(err: any): string {
  return parseError(err).message;
}
