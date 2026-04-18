import React from "react";
import { createPortal } from "react-dom";
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
  hideButtons?: boolean;
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
  hideButtons = false,
}) => {
  const getIcon = () => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case "error":
        return <AlertCircle className={`${iconClass} text-error-default`} />;
      case "success":
        return <CheckCircle className={`${iconClass} text-success-default`} />;
      case "warning":
        return (
          <AlertTriangle className={`${iconClass} text-warning-default`} />
        );
      case "info":
        return <Info className={`${iconClass} text-info-default`} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "error":
        return {
          bg: "bg-error-default/5",
          border: "border-error-default/10",
          iconBg: "bg-error-default/10",
          text: "text-error-default",
        };
      case "success":
        return {
          bg: "bg-success-default/5",
          border: "border-success-default/10",
          iconBg: "bg-success-default/10",
          text: "text-success-default",
        };
      case "warning":
        return {
          bg: "bg-warning-default/5",
          border: "border-warning-default/10",
          iconBg: "bg-warning-default/10",
          text: "text-warning-default",
        };
      case "info":
        return {
          bg: "bg-info-default/5",
          border: "border-info-default/10",
          iconBg: "bg-info-default/10",
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

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={hideButtons ? undefined : onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm border border-neutral-100 pointer-events-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            {!hideButtons && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-neutral-50 transition-colors z-10"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            )}

            {/* Content */}
            <div className="p-6">
              <div className="flex flex-col items-start gap-4">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center shadow-sm`}
                >
                  {getIcon()}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                    {defaultTitle}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1.5 whitespace-pre-wrap leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {!hideButtons && (
                <div className="flex justify-end gap-2 mt-6">
                  {showCancel && (
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      {cancelText}
                    </button>
                  )}
                  <button
                    onClick={handleConfirm}
                    className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white rounded-lg transition-colors shadow-sm ${
                      type === "error"
                        ? "bg-error-default hover:bg-error-600 shadow-error-default/20"
                        : type === "success"
                          ? "bg-success-default hover:bg-success-600 shadow-success-default/20"
                          : type === "warning"
                            ? "bg-warning-default hover:bg-warning-600 shadow-warning-default/20"
                            : "bg-info-default hover:bg-info-600 shadow-info-default/20"
                    }`}
                  >
                    {confirmText}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof window !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default AlertModal;
