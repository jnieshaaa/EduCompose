import { useState, useCallback } from "react";
import AlertModal, { type AlertType } from "../components/ui/AlertModal";

interface AlertOptions {
  type?: AlertType;
  title?: string;
  onConfirm?: () => void;
  confirmText?: string;
  showCancel?: boolean;
  cancelText?: string;
}

export const useAlert = () => {
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

  const showAlert = useCallback(
    (message: string, options: AlertOptions = {}) => {
      setAlertState({
        isOpen: true,
        type: options.type || "info",
        title: options.title,
        message,
        onConfirm: options.onConfirm,
        confirmText: options.confirmText,
        showCancel: options.showCancel,
        cancelText: options.cancelText,
      });
    },
    []
  );

  const showError = useCallback(
    (message: string, options?: Omit<AlertOptions, "type">) => {
      showAlert(message, { ...options, type: "error" });
    },
    [showAlert]
  );

  const showSuccess = useCallback(
    (message: string, options?: Omit<AlertOptions, "type">) => {
      showAlert(message, { ...options, type: "success" });
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (message: string, options?: Omit<AlertOptions, "type">) => {
      showAlert(message, { ...options, type: "warning" });
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (message: string, options?: Omit<AlertOptions, "type">) => {
      showAlert(message, { ...options, type: "info" });
    },
    [showAlert]
  );

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const AlertComponent = () => (
    <AlertModal
      isOpen={alertState.isOpen}
      onClose={closeAlert}
      type={alertState.type}
      title={alertState.title}
      message={alertState.message}
      onConfirm={alertState.onConfirm}
      confirmText={alertState.confirmText}
      showCancel={alertState.showCancel}
      cancelText={alertState.cancelText}
    />
  );

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
