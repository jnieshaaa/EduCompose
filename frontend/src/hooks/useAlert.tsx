import { useState, useCallback, useRef, useEffect } from "react";
import AlertModal, { type AlertType } from "../components/ui/AlertModal";
import { useNotification } from "../context/NotificationContext";

interface AlertOptions {
  type?: AlertType;
  title?: string;
  onConfirm?: () => void | Promise<void>;
  confirmText?: string;
  showCancel?: boolean;
  cancelText?: string;
}

/**
 * Stable component to handle the UI part of alerts.
 * This is defined outside the hook to prevent unmount/remount on every state change.
 */
const AlertUI = (props: {
  state: any;
  onClose: () => void;
}) => (
  <AlertModal
    isOpen={props.state.isOpen}
    onClose={props.onClose}
    type={props.state.type}
    title={props.state.title}
    message={props.state.message}
    onConfirm={props.state.onConfirm}
    confirmText={props.state.confirmText}
    showCancel={props.state.showCancel}
    cancelText={props.state.cancelText}
  />
);

export const useAlert = () => {
  const { showNotification } = useNotification();
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: AlertType;
    title?: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    showCancel?: boolean;
    cancelText?: string;
  }>({
    isOpen: false,
    type: "info",
    message: "",
  });

  const timeoutRef = useRef<any>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const closeAlert = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setAlertState((prev: any) => ({ ...prev, isOpen: false }));
  }, []);

  const showAlert = useCallback(
    (message: string, options: AlertOptions = {}) => {
      // 1. Immediately close any open alert
      setAlertState((prev: any) => ({ ...prev, isOpen: false }));
      
      // 2. Clear any pending showAlert timeouts
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      // 3. Schedule the new alert to open
      // Using a slightly longer delay to ensure the UI has processed the close state
      timeoutRef.current = setTimeout(() => {
        setAlertState({
          isOpen: true,
          type: options.type || "info",
          title: options.title,
          message,
          onConfirm: options.onConfirm as any,
          confirmText: options.confirmText,
          showCancel: options.showCancel,
          cancelText: options.cancelText,
        });
      }, 100);
    },
    []
  );

  const showError = useCallback(
    (message: string) => {
      showNotification('error', message);
    },
    [showNotification]
  );

  const showSuccess = useCallback(
    (message: string) => {
      showNotification('success', message);
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string, options?: Omit<AlertOptions, "type">) => {
      // Keep warnings as modals if they have a confirm action
      if (options?.onConfirm) {
        showAlert(message, { ...options, type: "warning" });
      } else {
        showNotification('info', message);
      }
    },
    [showAlert, showNotification]
  );

  const showInfo = useCallback(
    (message: string) => {
      showNotification('info', message);
    },
    [showNotification]
  );

  // Use a stable wrapper for the UI component
  const AlertComponent = useCallback(() => (
    <AlertUI state={alertState} onClose={closeAlert} />
  ), [alertState, closeAlert]);

  return {
    showAlert,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    closeAlert,
    AlertComponent,
  };
};
