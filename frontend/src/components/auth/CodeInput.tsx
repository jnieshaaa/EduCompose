import { useRef, useEffect } from "react";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
}

export function CodeInput({ value, onChange, length = 6, error }: CodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChange = (index: number, digit: string) => {
    // Only allow digits
    if (digit && !/^\d$/.test(digit)) {
      return;
    }

    const newValue = value.split("");
    newValue[index] = digit;
    const updatedValue = newValue.join("").slice(0, length);
    onChange(updatedValue);

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, length);
    const digits = pastedData.split("").filter((char) => /^\d$/.test(char)).join("");
    onChange(digits.slice(0, length));
    const nextIndex = Math.min(digits.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div>
      <div className="flex gap-2 justify-center">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ""}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
              error
                ? "border-red-500 bg-red-50"
                : "border-neutral-300 bg-white text-neutral-900"
            }`}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}

