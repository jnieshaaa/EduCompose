import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Users,
  GraduationCap,
  ArrowRight,
  // User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  BookOpen,
  ShieldCheck,
  Building2,
  FileText,
} from "lucide-react";

interface StudentData {
  id: number;
  student_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string | null;
  program_id: string | null;
  programs_lookup?: {
    name: string;
    abbr: string;
    departments?: {
      name: string;
      schools?: {
        name: string;
      };
    };
  };
  year: number | null;
  block_name: string | null;
  enrollment_status?: 'active' | 'dropped' | 'graduated';
}

const StudentOnboarding: React.FC = () => {
  const { checkAuth } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Password requirements Check
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const allRequirementsMet = hasMinLength && hasUppercase && hasNumber;

  useEffect(() => {
    if (currentStep === 4) {
      setShowSecurityModal(true);
    }
  }, [currentStep]);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: initialData, error: initialError } = await supabase
          .from("students")
          .select(
            `
            *,
            programs_lookup (
              name,
              abbr,
              departments (
                name,
                schools (
                  name
                )
              )
            )
          `,
          )
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        let data = initialData;
        const error = initialError;

        // Fallback: If not found by auth_user_id, try by email
        if (!data && authUser.email) {
          const { data: emailData, error: emailError } = await supabase
            .from("students")
            .select(
              `
              *,
              programs_lookup (
                name,
                abbr,
                departments (
                  name,
                  schools (
                    name
                  )
                )
              )
            `,
            )
            .eq("email", authUser.email)
            .maybeSingle();

          if (!emailError && emailData) {
            data = emailData;
            // Proactively link the auth_user_id if it's missing
            if (!emailData.auth_user_id) {
              await supabase
                .from("students")
                .update({ auth_user_id: authUser.id })
                .eq("id", emailData.id);
            }
          }
        }

        if (error) throw error;
        setStudentData(data);
      } catch (err) {
        console.error("Error fetching student data:", err);
      }
    };
    fetchStudentData();
  }, []);

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      // Optional Password Change
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setPasswordError("Passwords do not match");
          setIsLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          setPasswordError("Password must be at least 6 characters");
          setIsLoading(false);
          return;
        }

        const { error: pwdError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (pwdError) throw pwdError;
      }

      // Mark onboarding as complete in students table
      const { error } = await supabase
        .from("students")
        .update({ onboarding_completed: true })
        .eq("auth_user_id", authUser.id);

      if (error) {
        // Fallback: If column doesn't exist yet, we still proceed to dashboard
        // but tell user to inform admin.
        console.warn(
          "Could not mark onboarding_completed. Ensure migration is run.",
        );
      }

      await checkAuth();
      navigate("/Student/Dashboard");
    } catch (err) {
      console.error("Error completing onboarding:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const stepsContent = [
    {
      title: "Welcome to EduCompose",
      desc: "Your companion for improving essay writing through AI-powered feedback.",
      icon: <Sparkles className="w-12 h-12 text-blue-500" />,
      features: [
        "Real-time Grammar Analysis",
        "Argument Mining & Coherence",
        "Expert AI Feedback",
      ],
    },
    {
      title: "Master the Art of Writing",
      desc: "Submit your essays and get detailed insights on how to strengthen your arguments.",
      icon: <BookOpen className="w-12 h-12 text-indigo-500" />,
      features: [
        "Submit via Text or File",
        "Visual Knowledge Graphs",
        "Progress Tracking",
      ],
    },
    {
      title: "Verify Your Information",
      desc: "We've pre-filled your academic record. Please check if everything is correct.",
      icon: <GraduationCap className="w-12 h-12 text-violet-500" />,
      features: [
        "Personal Details",
        "Course & Program",
        "Section/Block Assignment",
      ],
    },
  ];

  if (studentData && studentData.enrollment_status && studentData.enrollment_status !== 'active') {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Access Restricted</h2>
          <p className="text-neutral-600 mb-8">
            Your account status is currently set to <span className="font-bold uppercase text-red-600">{studentData.enrollment_status}</span>. 
            Only active students can proceed to the system.
          </p>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="w-full py-4 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-all"
          >
            Return to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-hidden">
      <div className="flex flex-1 relative">
        {/* Left Side: Illustration & Progress */}
        <div className="hidden lg:flex w-1/2 bg-neutral-900 text-white relative flex-col justify-center p-20 overflow-hidden">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-neutral-900 to-indigo-900/40" />
          </div>

          <div className="relative z-10 max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                {currentStep <= 3 ? (
                  <>
                    <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl inline-block border border-white/20">
                      {stepsContent[currentStep - 1].icon}
                    </div>
                    <h1 className="text-5xl font-bold leading-tight">
                      {stepsContent[currentStep - 1].title}
                    </h1>
                    <p className="text-xl text-neutral-400 font-light leading-relaxed">
                      {stepsContent[currentStep - 1].desc}
                    </p>
                    <ul className="space-y-4 pt-4">
                      {stepsContent[currentStep - 1].features.map(
                        (feature, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + idx * 0.1 }}
                            className="flex items-center gap-3 text-neutral-300"
                          >
                            <CheckCircle2 className="w-5 h-5 text-blue-400" />
                            <span className="font-medium">{feature}</span>
                          </motion.li>
                        ),
                      )}
                    </ul>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl inline-block border border-white/20">
                      <Lock className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h1 className="text-5xl font-bold leading-tight">
                      Secure Your Account
                    </h1>
                    <p className="text-xl text-neutral-400 font-light leading-relaxed">
                      Final step! You can optionally change your temporary
                      password to a more secure one.
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side: Step Content */}
        <div className="flex-1 bg-neutral-50 flex flex-col items-center justify-center p-8 lg:p-24 relative overflow-y-auto">
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="text-center md:text-left">
                    <h2 className="text-4xl font-bold text-neutral-900 tracking-tight">
                      Writing Analytics
                    </h2>
                    <p className="text-neutral-500 text-lg mt-2">
                      EduCompose uses advanced AI to analyze your essay
                      structure.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="p-6 bg-white rounded-2xl border border-neutral-200 flex gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl h-fit">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900">
                          Structured Feedback
                        </h4>
                        <p className="text-sm text-neutral-500">
                          Get insights on every part of your essay, from
                          introduction to conclusion.
                        </p>
                      </div>
                    </div>
                    <div className="p-6 bg-white rounded-2xl border border-neutral-200 flex gap-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl h-fit">
                        <Users size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900">
                          Class Integration
                        </h4>
                        <p className="text-sm text-neutral-500">
                          Stay connected with your courses and submit
                          assignments with ease.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="text-center md:text-left">
                    <h2 className="text-4xl font-bold text-neutral-900 tracking-tight">
                      Personal & Academic
                    </h2>
                    <p className="text-neutral-500 text-lg mt-2">
                      Verify your student identity and institutional records.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-xl border border-neutral-200">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase">
                          First Name
                        </label>
                        <p className="font-semibold text-neutral-900">
                          {studentData?.first_name || "---"}
                        </p>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-neutral-200">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase">
                          Middle Name
                        </label>
                        <p className="font-semibold text-neutral-900">
                          {studentData?.middle_name || "---"}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-neutral-200">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">
                        Last Name
                      </label>
                      <p className="font-semibold text-neutral-900">
                        {studentData?.last_name || "---"}
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-neutral-200">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">
                        Email Address
                      </label>
                      <p className="font-semibold text-neutral-900">
                        {studentData?.email || "No email assigned"}
                      </p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-neutral-200 flex justify-between items-center">
                      <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase">
                          Student ID
                        </label>
                        <p className="font-bold text-primary">
                          {studentData?.student_code || "---"}
                        </p>
                      </div>
                    </div>

                    {!studentData && !isLoading && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="text-red-500 w-5 h-5 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-red-700">
                            Student Record Not Found
                          </p>
                          <p className="text-xs text-red-600">
                            Your account exists but isn't linked to your
                            academic record. Please contact your teacher or
                            administrator.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="text-center md:text-left">
                    <h2 className="text-4xl font-bold text-neutral-900 tracking-tight">
                      Academic Load
                    </h2>
                    <p className="text-neutral-500 text-lg mt-2">
                      Your current program and block information.
                    </p>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-xl space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                        <GraduationCap className="text-blue-600 w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400 font-bold uppercase">
                          Program
                        </p>
                        <p className="text-lg font-bold text-neutral-900">
                          {studentData?.programs_lookup?.name || "---"} (
                          {studentData?.programs_lookup?.abbr || "---"})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                        <Building2 className="text-indigo-600 w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400 font-bold uppercase">
                          Department & School
                        </p>
                        <p className="text-sm font-semibold text-neutral-700">
                          {studentData?.programs_lookup?.departments?.name ||
                            "---"}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {studentData?.programs_lookup?.departments?.schools
                            ?.name || "---"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                        <Users className="text-emerald-600 w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400 font-bold uppercase">
                          Current Year & BLock
                        </p>
                        <p className="text-lg font-bold text-neutral-900">
                          {studentData?.year && studentData?.block_name
                            ? `${studentData.year}${studentData.block_name}`
                            : "No block assigned"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="text-center md:text-left">
                    <h2 className="text-4xl font-bold text-neutral-900 tracking-tight">
                      Security Check
                    </h2>
                    <p className="text-neutral-500 text-lg mt-2 font-medium">
                      Reset your password to keep your account safe.
                    </p>
                  </div>

                  <div className="p-6 bg-white rounded-2xl border border-neutral-200">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900">
                          Optional Update
                        </h4>
                        <p className="text-sm text-neutral-500 leading-relaxed">
                          Since your account was created by a teacher, we
                          recommend changing your password. Leave this blank to
                          keep your current password.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">
                          New Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              setPasswordError("");
                            }}
                            onFocus={() => setIsPasswordFocused(true)}
                            onBlur={() => setIsPasswordFocused(false)}
                            className="w-full pl-10 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                            placeholder="Create a strong password"
                          />
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                          >
                            {showPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>

                          {/* Floating Password Validation Modal */}
                          <AnimatePresence>
                            {isPasswordFocused && !allRequirementsMet && (
                              <motion.div
                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                className="absolute left-full ml-4 top-0 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-100 p-5 z-[60] hidden md:block"
                              >
                                <div className="absolute -left-2 top-5 w-4 h-4 bg-white border-l border-b border-neutral-100 rotate-45" />
                                <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">
                                  Requirements
                                </h5>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                        hasMinLength
                                          ? "bg-emerald-500 text-white"
                                          : "bg-neutral-100 text-neutral-300"
                                      }`}
                                    >
                                      <CheckCircle2 size={12} />
                                    </div>
                                    <span
                                      className={`text-xs font-bold ${
                                        hasMinLength
                                          ? "text-emerald-600"
                                          : "text-neutral-400"
                                      }`}
                                    >
                                      8+ Characters
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                        hasUppercase
                                          ? "bg-emerald-500 text-white"
                                          : "bg-neutral-100 text-neutral-300"
                                      }`}
                                    >
                                      <CheckCircle2 size={12} />
                                    </div>
                                    <span
                                      className={`text-xs font-bold ${
                                        hasUppercase
                                          ? "text-emerald-600"
                                          : "text-neutral-400"
                                      }`}
                                    >
                                      1 Uppercase Letter
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                        hasNumber
                                          ? "bg-emerald-500 text-white"
                                          : "bg-neutral-100 text-neutral-300"
                                      }`}
                                    >
                                      <CheckCircle2 size={12} />
                                    </div>
                                    <span
                                      className={`text-xs font-bold ${
                                        hasNumber
                                          ? "text-emerald-600"
                                          : "text-neutral-400"
                                      }`}
                                    >
                                      1 Number
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setPasswordError("");
                            }}
                            className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                            placeholder="Re-type new password"
                          />
                        </div>
                      </div>

                      {passwordError && (
                        <div className="text-xs text-red-500 font-bold ml-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {passwordError}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Security Notice Modal */}
            <AnimatePresence>
              {showSecurityModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <ShieldCheck size={120} />
                    </div>
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Lock size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-3">
                      Security First
                    </h3>
                    <p className="text-neutral-500 mb-8 leading-relaxed">
                      To keep your work safe, we recommend setting a personal
                      password. You can do this now or skip it if you're in a
                      hurry!
                    </p>
                    <button
                      onClick={() => setShowSecurityModal(false)}
                      className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-lg"
                    >
                      Got it, thanks!
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <div className="h-32" />
          </div>
        </div>
      </div>

      {/* Nav Bar */}
      <div className="bg-white border-t border-neutral-200 z-50">
        <div className="container mx-auto px-6 py-8 flex items-center justify-between">
          <div className="w-32">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-3 rounded-2xl font-bold text-neutral-500 hover:bg-neutral-100 transition-all flex items-center gap-2"
              >
                <ChevronLeft size={20} /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  currentStep === s ? "bg-primary w-8" : "bg-neutral-200"
                }`}
              />
            ))}
          </div>

          <div className="w-32 flex justify-end">
            <button
              onClick={currentStep === 4 ? handleComplete : handleNext}
              className={`
                px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all duration-300 shadow-lg active:scale-95
                ${currentStep === 4 ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : "bg-primary hover:bg-primary-600 shadow-primary/20"}
                text-white
              `}
              disabled={isLoading}
            >
              {currentStep === 4
                ? isLoading
                  ? "Finishing..."
                  : "Finish"
                : "Next"}
              {currentStep < 4 ? (
                <ChevronRight size={20} />
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
          </div>
        </div>

        <footer className="bg-neutral-900 py-4">
          <p className="text-center text-white/40 text-[10px] uppercase font-bold tracking-[0.2em]">
            &copy; 2025 EDUCOMPOSE | STUDENT ONBOARDING
          </p>
        </footer>
      </div>
    </div>
  );
};

export default StudentOnboarding;
