import React from "react";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password" | "number" | "textarea";
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  rows?: number;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  error,
  disabled = false,
  required = false,
  className = "",
  rows = 4,
}) => {
  const baseClasses =
    "w-full px-3 py-2 border rounded-rd focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";
  const errorClasses = error
    ? "border-error-default focus:ring-error-default focus:border-error-default"
    : "border-neutral-300";
  const disabledClasses = disabled
    ? "bg-neutral-100 cursor-not-allowed"
    : "bg-white";

  const inputClasses = `${baseClasses} ${errorClasses} ${disabledClasses} ${className}`;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-error-default ml-1">*</span>}
        </label>
      )}

      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          className={inputClasses}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClasses}
        />
      )}

      {error && <p className="text-sm text-error-default">{error}</p>}
    </div>
  );
};

export default Input;
