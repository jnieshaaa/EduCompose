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
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          className={`w-full pl-11 ${
            showToggle ? "pr-12" : "pr-4"
          } py-3 border border-neutral-300 rounded-rd bg-white text-neutral-900 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all`}
          placeholder={placeholder}
        />
        {showToggle && setShowPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-900 hover:text-neutral-400"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
