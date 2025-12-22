import React from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type AlertType = "error" | "success" | "warning" | "info";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: AlertType;
  title?: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  showCancel?: boolean;
  cancelText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  onConfirm,
  confirmText = "OK",
  showCancel = false,
  cancelText = "Cancel",
}) => {
  const getIcon = () => {
    const iconClass = "w-6 h-6";
    switch (type) {
      case "error":
        return <AlertCircle className={`${iconClass} text-error-default`} />;
      case "success":
        return <CheckCircle className={`${iconClass} text-success-default`} />;
      case "warning":
        return <AlertTriangle className={`${iconClass} text-warning-default`} />;
      case "info":
        return <Info className={`${iconClass} text-info-default`} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "error":
        return {
          bg: "bg-error-default/10",
          border: "border-error-default/20",
          iconBg: "bg-error-default/20",
          text: "text-error-default",
        };
      case "success":
        return {
          bg: "bg-success-default/10",
          border: "border-success-default/20",
          iconBg: "bg-success-default/20",
          text: "text-success-default",
        };
      case "warning":
        return {
          bg: "bg-warning-default/10",
          border: "border-warning-default/20",
          iconBg: "bg-warning-default/20",
          text: "text-warning-default",
        };
      case "info":
        return {
          bg: "bg-info-default/10",
          border: "border-info-default/20",
          iconBg: "bg-info-default/20",
          text: "text-info-default",
        };
    }
  };

  const colors = getColors();
  const defaultTitle =
    title ||
    (type === "error"
      ? "Error"
      : type === "success"
      ? "Success"
      : type === "warning"
      ? "Warning"
      : "Information");

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white rounded-rl shadow-xl w-full max-w-md"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-rs hover:bg-neutral-100 transition-colors duration-200 z-10"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full ${colors.iconBg} flex items-center justify-center`}
                >
                  {getIcon()}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    {defaultTitle}
                  </h3>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                    {message}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                {showCancel && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-rd hover:bg-neutral-50 transition-colors"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-rd transition-colors ${
                    type === "error"
                      ? "bg-error-default hover:bg-error-600"
                      : type === "success"
                      ? "bg-success-default hover:bg-success-600"
                      : type === "warning"
                      ? "bg-warning-default hover:bg-warning-600"
                      : "bg-info-default hover:bg-info-600"
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AlertModal;

