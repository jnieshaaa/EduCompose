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
    const iconClass = "w-8 h-8";
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
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg border border-neutral-200"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200 z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>

            {/* Content */}
            <div className="p-8">
              <div className="flex items-start gap-5">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-16 h-16 rounded-full ${colors.iconBg} flex items-center justify-center shadow-sm`}
                >
                  {getIcon()}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="text-xl font-semibold text-neutral-900 mb-3 leading-tight">
                    {defaultTitle}
                  </h3>
                  <p className="text-base text-neutral-700 whitespace-pre-wrap leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-neutral-200">
                {showCancel && (
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 text-base font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors duration-200"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={`px-6 py-2.5 text-base font-medium text-white rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md ${
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

