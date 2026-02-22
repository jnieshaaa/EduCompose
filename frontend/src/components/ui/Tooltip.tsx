import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "right",
  delay = 300,
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );

  const showTooltip = () => {
    console.log("showTooltip called, disabled:", disabled, "content:", content);
    if (disabled) return;

    const id = setTimeout(() => {
      console.log("Setting tooltip visible");
      computeCoords();
      setIsVisible(true);
    }, delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const computeCoords = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    let top = rect.top + window.scrollY;
    let left = rect.left + window.scrollX;
    switch (position) {
      case "top":
        top = rect.top + window.scrollY - gap;
        left = rect.left + window.scrollX + rect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + window.scrollY + gap;
        left = rect.left + window.scrollX + rect.width / 2;
        break;
      case "left":
        top = rect.top + window.scrollY + rect.height / 2;
        left = rect.left + window.scrollX - gap;
        break;
      case "right":
      default:
        top = rect.top + window.scrollY + rect.height / 2;
        left = rect.right + window.scrollX + gap;
        break;
    }
    setCoords({ top, left });
  };

  useEffect(() => {
    if (!isVisible) return;
    computeCoords();
    const onScroll = () => computeCoords();
    const onResize = () => computeCoords();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [isVisible, position]);

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      <AnimatePresence>
        {isVisible && coords && (
          <>
            {console.log("Rendering tooltip:", { isVisible, coords, content })}
            {createPortal(
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="fixed z-[1000]"
                style={{
                  top: coords.top,
                  left: coords.left,
                  transform:
                    position === "top" || position === "bottom"
                      ? "translate(-50%, -100%)"
                      : position === "left"
                      ? "translate(-100%, -50%)"
                      : "translate(0, -50%)",
                }}
              >
                <div className="bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                  {content}
                </div>
              </motion.div>,
              document.body
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
