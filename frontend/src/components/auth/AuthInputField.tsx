import { Eye, EyeOff } from "lucide-react";

interface AuthInputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  Icon: React.ElementType;
  showToggle?: boolean;
  showPassword?: boolean;
  setShowPassword?: (show: boolean) => void;
}

export function AuthInputField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  Icon,
  showToggle = false,
  showPassword,
  setShowPassword,
}: AuthInputFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-neutral-600 mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          className={`w-full pl-9 ${
            showToggle ? "pr-10" : "pr-3"
          } py-2.5 text-sm border border-neutral-300 rounded-lg bg-white text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all`}
          placeholder={placeholder}
        />
        {showToggle && setShowPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
