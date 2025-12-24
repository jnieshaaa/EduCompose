import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  contentClassName?: string;
  transparent?: boolean;
  blackBackground?: boolean;
  closeOnBackdropClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className = "",
  contentClassName = "",
  transparent = false,
  blackBackground = false,
  closeOnBackdropClick = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  // Determine backdrop background class
  let backdropClass = "bg-black/50";
  if (blackBackground) {
    backdropClass = "bg-black/30 backdrop-blur-md";
  } else if (transparent) {
    backdropClass = "bg-black/30 backdrop-blur-md";
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className={`absolute inset-0 ${backdropClass}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            style={{ pointerEvents: transparent ? "none" : "auto" }}
          />

          {/* Modal */}
          <motion.div
            className={`relative ${
              transparent ? "bg-transparent" : "bg-white"
            } rounded-rl ${transparent ? "" : "shadow-xl"} w-full ${
              sizeClasses[size]
            } ${className} flex flex-col max-h-[90vh]`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 flex-shrink-0">
                <h2 className="text-xl font-semibold text-neutral-900">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-rs hover:bg-neutral-100 transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className={`p-6 ${contentClassName} overflow-y-auto flex-1 min-h-0`}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
