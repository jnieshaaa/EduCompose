import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { lagunaUniversity } from "../data/schoolData";

interface OnboardingData {
  title: string;
  nickname: string;
  school: string;
  department: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  email: string;
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  className?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = "",
  required = false,
  type = "text",
  className = "",
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-200 placeholder-gray-400 text-gray-900 shadow-sm"
    />
  </div>
);

const Onboarding: React.FC = () => {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    title: "",
    nickname: "",
    school: "",
    department: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    email: user?.email || "",
  });

  const titleOptions = [
    { value: "mr", label: "Mr." },
    { value: "ms", label: "Ms." },
    { value: "mrs", label: "Mrs." },
    { value: "sir", label: "Sir" },
    { value: "prof", label: "Prof." },
    { value: "dr", label: "Dr." },
    { value: "other", label: "Other" },
  ];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authUser) {
        throw new Error("User not authenticated");
      }

      // Capitalize first letter of title
      const capitalizedTitle = data.title
        ? data.title.charAt(0).toUpperCase() + data.title.slice(1).toLowerCase()
        : "";

      const { error, data: updatedData } = await supabase
        .from("users")
        .update({
          title: capitalizedTitle,
          nickname: data.nickname,
          school: data.school,
          department: data.department,
          first_name: data.firstName,
          middle_name: data.middleName,
          last_name: data.lastName,
          suffix: data.suffix,
          email: data.email,
          full_name:
            `${data.firstName} ${data.middleName} ${data.lastName}`.trim(),
          onboarding_completed: true,
        })
        .eq("auth_user_id", authUser.id)
        .select()
        .single();

      if (error) throw error;

      await checkAuth();

      if (updatedData?.onboarding_completed) {
        navigate("/Teacher/Dashboard");
      } else {
        console.warn("Onboarding flag verification failed, redirecting anyway");
        navigate("/Teacher/Dashboard");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
          Welcome to EduCompose
        </h2>
        <p className="text-gray-500 text-lg font-light">
          Let's set up your profile. How would you like to be addressed?
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex gap-4 items-start">
          <div className="w-32 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
              Title
            </label>
            <div className="relative">
              <select
                value={data.title}
                onChange={(e) => setData({ ...data, title: e.target.value })}
                className="w-full px-3 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none text-gray-900 shadow-sm cursor-pointer"
                required
              >
                <option value="">Select</option>
                {titleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <InputField
              label={data.title === "other" ? "Custom Title" : "Nickname"}
              value={data.nickname}
              onChange={(e) => setData({ ...data, nickname: e.target.value })}
              placeholder={data.title === "other" ? "Enter your preferred title" : "Any specific name you'd like to be called"}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
            School
          </label>
          <div className="relative">
            <select
              value={data.school}
              onChange={(e) => setData({ ...data, school: e.target.value, department: "" })}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none text-gray-900 shadow-sm cursor-pointer"
              required
            >
              <option value="">Select a school</option>
              <option value={lagunaUniversity.code}>{lagunaUniversity.name}</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {data.school && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
              Department
            </label>
            <div className="relative">
              <select
                value={data.department}
                onChange={(e) => setData({ ...data, department: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none text-gray-900 shadow-sm cursor-pointer"
                required
              >
                <option value="">Select a department</option>
                {lagunaUniversity.departments.map((dept) => (
                  <option key={dept.code} value={dept.code}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleNext}
          disabled={!data.title || !data.nickname || !data.school || !data.department}
          className="px-8 py-3 bg-primary text-white font-medium rounded-xl shadow-lg shadow-primary/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/40 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          Next Step
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
          Personal Information
        </h2>
        <p className="text-gray-500 text-lg font-light">
          This helps us personalize your experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="First Name"
          value={data.firstName}
          onChange={(e) => setData({ ...data, firstName: e.target.value })}
        />

        <InputField
          label="Middle Name"
          value={data.middleName}
          onChange={(e) => setData({ ...data, middleName: e.target.value })}
        />

        <InputField
          label="Last Name"
          value={data.lastName}
          onChange={(e) => setData({ ...data, lastName: e.target.value })}
        />

        <InputField
          label="Suffix"
          value={data.suffix}
          onChange={(e) => setData({ ...data, suffix: e.target.value })}
          placeholder="Jr., Sr., III, etc."
        />

        <div className="md:col-span-2">
          <InputField
            label="Email"
            type="email"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <button
          onClick={handleBack}
          className="px-6 py-3 text-gray-500 font-medium hover:text-gray-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-3 bg-primary text-white font-medium rounded-xl shadow-lg shadow-primary/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/40 active:scale-95 transition-all duration-300"
        >
          Next Step
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
          Welcome aboard!
        </h2>
        <p className="text-gray-500 text-lg font-light max-w-md mx-auto">
          You're all set. Our AI-powered platform will help you provide better
          feedback to your students.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            title: "Smart Analysis",
            desc: "Analyze student essays with AI-powered insights",
            icon: "✨",
          },
          {
            title: "Feedback Reports",
            desc: "Generate structured feedback reports instantly",
            icon: "📝",
          },
          {
            title: "Progress Tracking",
            desc: "Track student progress over time clearly",
            icon: "📈",
          },
          {
            title: "Class Management",
            desc: "Manage classes and assignments efficiently",
            icon: "👥",
          },
        ].map((feature, idx) => (
          <div
            key={idx}
            className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 group"
          >
            <div className="text-2xl mb-3 group-hover:scale-110 transition-transform duration-300 inline-block">
              {feature.icon}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              {feature.title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4">
        <button
          onClick={handleBack}
          className="px-6 py-3 text-gray-500 font-medium hover:text-gray-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          disabled={isLoading}
          className="px-8 py-3 bg-success-default text-white font-bold rounded-xl shadow-lg shadow-success-default/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-success-default/40 active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-wait"
        >
          {isLoading ? "Setting up..." : "Get Started"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Abstract Grid background */}
        <div
          className="absolute inset-0 bg-gray-50"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "30px 30px",
            opacity: 0.5,
          }}
        ></div>

        {/* Soft Gradients */}
        <div className="absolute -top-[30%] -right-[10%] w-[800px] h-[800px] bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl mix-blend-multiply opacity-60 animate-blob"></div>
        <div className="absolute -bottom-[30%] -left-[10%] w-[800px] h-[800px] bg-gradient-to-tr from-secondary/10 to-transparent rounded-full blur-3xl mix-blend-multiply opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl mix-blend-multiply opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-xl w-full relative z-10">
        <div className="text-center mb-8">
          <img
            className="mx-auto h-16 w-auto drop-shadow-sm mb-6"
            src="/EduCompose.png"
            alt="EduCompose"
          />

          {/* Progress indicator */}
          <div className="flex justify-center items-center space-x-3 mb-8">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div
                  className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-500 border-2 ${
                    step <= currentStep
                      ? "border-primary bg-primary text-white shadow-lg shadow-primary/25 scale-110"
                      : "border-gray-300 bg-white text-gray-400"
                  }`}
                >
                  <span className="text-xs font-bold">{step}</span>
                </div>
                {step < 3 && (
                  <div
                    className={`w-12 h-1 rounded-full transition-colors duration-500 ${
                      step < currentStep ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="backdrop-blur-md bg-white/80 border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-8 sm:p-10 transition-all duration-300 relative overflow-hidden ring-1 ring-white/60">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-70"></div>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          © 2024 EduCompose. Minimalist EdTech.
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
