import React, { useState, useRef, useEffect } from "react";

const ClickEffect: React.FC = () => {
  const [ripples, setRipples] = useState<
    { id: number; x: number; y: number }[]
  >([]);
  const idRef = useRef(0);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const id = idRef.current++;
      const ripple = { id, x: e.clientX, y: e.clientY };
      setRipples((prev) => [...prev, ripple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 300);
    };

    document.body.addEventListener("click", handleClick, { passive: true });
    return () => document.body.removeEventListener("click", handleClick);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            position: "absolute",
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 10,
            height: 10,
            borderRadius: "50%",
            border: "2px solid rgba(0,150,255,0.7)",
            transform: "scale(0)",
            animation: "ripple 0.4s ease-out forwards",
          }}
        />
      ))}

      <style>
        {`
          @keyframes ripple {
            to {
              transform: scale(3);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ClickEffect;
