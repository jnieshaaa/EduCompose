import React from "react";

interface InputProps {
  label?: string;
  placeholder?: string;
  // Make optional and allow number
  value?: string | number; 
  onChange?: (value: string) => void;
  // FIX: Add 'date' type
  type?: "text" | "email" | "password" | "number" | "textarea" | "search" | "date"; 
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  rows?: number;
  id?: string;
  readOnly?: boolean;
  // FIX: Add defaultValue prop
  defaultValue?: string | number;
  // Event handlers
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value, // Removed default value assignment here, using defaultValue below for uncontrolled usage
  onChange = () => {},
  type = "text",
  error,
  disabled = false,
  required = false,
  className = "",
  rows = 4,
  id,
  readOnly = false,
  defaultValue, // Destructure defaultValue
  onKeyDown,
  onFocus,
  onBlur,
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

  // Ensure value is always a string for the native input element if 'value' is provided
  const stringValue = typeof value !== 'undefined'
    ? String(value)
    : undefined;
    
  // Ensure defaultValue is a string for the native input element if 'defaultValue' is provided
  const stringDefaultValue = typeof defaultValue !== 'undefined'
    ? String(defaultValue)
    : undefined;

  // Use stringValue or stringDefaultValue depending on whether the input is controlled or uncontrolled
  const finalValueProps = {
    value: stringValue,
    defaultValue: stringDefaultValue,
  };


  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-error-default ml-1">*</span>}
        </label>
      )}

      {type === "textarea" ? (
        <textarea
          id={id}
          {...finalValueProps} // Apply value or defaultValue
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          className={inputClasses}
          readOnly={readOnly}
        />
      ) : (
        <input
          id={id}
          type={type}
          {...finalValueProps} // Apply value or defaultValue
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClasses}
          readOnly={readOnly}
        />
      )}

      {error && <p className="text-sm text-error-default">{error}</p>}
    </div>
  );
};

export default Input;