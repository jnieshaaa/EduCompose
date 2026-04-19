import { useEffect, useRef, useCallback } from "react";

interface UseInactivityLogoutOptions {
  /** Time in milliseconds before logout (default: 1 hour) */
  timeout?: number;
  /** Time in milliseconds before showing warning (default: 5 minutes before timeout) */
  warningTime?: number;
  /** Callback when user should be logged out */
  onLogout: () => void;
  /** Callback when warning should be shown (optional) */
  onWarning?: (remainingSeconds: number) => void;
  /** Callback when timer is reset after warning was shown (optional) */
  onWarningDismissed?: () => void;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook to automatically log out users after a period of inactivity
 * Tracks mouse movements, clicks, keyboard input, scroll, and touch events
 */
export function useInactivityLogout({
  timeout = 60 * 60 * 1000, // 1 hour in milliseconds
  warningTime = 5 * 60 * 1000, // 5 minutes before timeout
  onLogout,
  onWarning,
  onWarningDismissed,
  enabled = true,
}: UseInactivityLogoutOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    warningShownRef.current = false;
  }, []);

  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    if (!enabled) return;

    const wasWarningShown = warningShownRef.current;
    clearTimers();
    lastActivityRef.current = Date.now();
    localStorage.setItem("educompose_last_activity", lastActivityRef.current.toString());
    warningShownRef.current = false;

    // If warning was shown and timer is being reset, notify that warning should be dismissed
    if (wasWarningShown && onWarningDismissed) {
      onWarningDismissed();
    }

    // Set warning timer (if warning time is less than timeout)
    if (warningTime < timeout && onWarning) {
      const warningDelay = timeout - warningTime;
      warningTimeoutRef.current = setTimeout(() => {
        const remainingSeconds = Math.ceil(warningTime / 1000);
        warningShownRef.current = true;
        onWarning(remainingSeconds);
      }, warningDelay);
    }

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      onLogout();
    }, timeout);
  }, [enabled, timeout, warningTime, onLogout, onWarning, onWarningDismissed, clearTimers]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (!enabled) return;
    
    // Only reset if there was actual activity (not just timer firing)
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Throttle: only reset if at least 1 second has passed since last activity
    // This prevents excessive timer resets from rapid events
    if (timeSinceLastActivity >= 1000) {
      resetTimer();
    }
  }, [enabled, resetTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Initial timer setup
    resetTimer();

    // Events to track for user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
      "keydown",
    ];

    // Throttled function to reset the timer
    const throttledReset = () => {
      handleActivity();
    };

    events.forEach((event) => {
      document.addEventListener(event, throttledReset, { passive: true });
    });

    // Cross-tab synchronization logic
    const STORAGE_KEY = "educompose_last_activity";
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const remoteActivity = parseInt(e.newValue);
        if (!isNaN(remoteActivity)) {
          // Sync internal state with other tab's activity
          lastActivityRef.current = remoteActivity;
          resetTimer();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also track visibility changes (when user switches tabs/windows)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // When coming back to a tab, check if we've been active elsewhere
        const savedActivity = localStorage.getItem(STORAGE_KEY);
        if (savedActivity) {
          const parsed = parseInt(savedActivity);
          if (!isNaN(parsed) && parsed > lastActivityRef.current) {
             lastActivityRef.current = parsed;
          }
        }
        resetTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      clearTimers();
      events.forEach((event) => {
        document.removeEventListener(event, throttledReset);
      });
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, resetTimer, handleActivity, clearTimers]);

  // Return function to manually reset timer (useful for API calls)
  return {
    resetTimer: handleActivity,
    clearTimers,
  };
}

