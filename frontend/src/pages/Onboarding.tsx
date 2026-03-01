import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Users,
  School,
  GraduationCap,
  ArrowRight,
  User,
  Mail,
  Building2,
  Presentation,
} from "lucide-react";

interface School {
  id: string;
  code: string;
  name: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
  school_id: string;
}

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

const Onboarding: React.FC = () => {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
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

  useEffect(() => {
    const fetchSchools = async () => {
      const { data: schoolsData, error } = await supabase
        .from("schools")
        .select("*")
        .order("name");
      if (!error && schoolsData) {
        setSchools(schoolsData);
      }
    };
    fetchSchools();
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!data.school) {
        setDepartments([]);
        return;
      }

      const { data: deptsData, error } = await supabase
        .from("departments")
        .select("*")
        .eq("school_id", data.school)
        .order("name");
      if (!error && deptsData) {
        setDepartments(deptsData);
      }
    };
    fetchDepartments();
  }, [data.school, schools]);

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
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !authUser) throw new Error("User not authenticated");

      const capitalizedTitle = data.title
        ? data.title.charAt(0).toUpperCase() + data.title.slice(1).toLowerCase()
        : "";

      const displayName =
        `${data.firstName} ${data.middleName} ${data.lastName}`.trim();

      await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          first_name: data.firstName,
          middle_name: data.middleName,
          last_name: data.lastName,
        },
      });

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
        navigate("/Teacher/Dashboard");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stepsContent = [
    {
      title: "Elevate Your Teaching",
      desc: "EduCompose empowers educators with AI-driven insights to transform classroom engagement.",
      icon: <Sparkles className="w-12 h-12 text-primary" />,
      features: [
        "Personalized Feedback",
        "Automated Grading",
        "In-depth Analysis",
      ],
    },
    {
      title: "Designed for Excellence",
      desc: "A professional platform tailored for modern academic workflows and student success.",
      icon: <Presentation className="w-12 h-12 text-secondary" />,
      features: ["Class Management", "Resource Sharing", "Growth Tracking"],
    },
    {
      title: "Join the Community",
      desc: "Connect with educators worldwide and simplify your administrative tasks.",
      icon: <Users className="w-12 h-12 text-accent" />,
      features: [
        "Collaborative Tools",
        "Peer Insights",
        "Seamless Integration",
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-hidden">
      <div className="flex flex-1 relative">
        {/* Left Side: Commercial */}
        <div className="hidden lg:flex w-1/2 bg-neutral-900 text-white relative flex-col justify-center p-20 overflow-hidden">
          <div className="absolute inset-0 opacity-40">
            <img
              src="/onboarding_hero_bg_1772338232066.png"
              alt="Background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-neutral-900 via-neutral-900/80 to-transparent" />
          </div>

          <div className="relative z-10 max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-8"
              >
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
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="font-medium">{feature}</span>
                      </motion.li>
                    ),
                  )}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-10 left-10 z-10">
            <div className="flex items-center gap-2 text-neutral-500 text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Powered by EduCompose AI</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 bg-neutral-50 flex flex-col items-center justify-center p-8 lg:p-24 relative overflow-y-auto">
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-10"
                >
                  <div className="space-y-4">
                    <h2 className="text-4xl font-bold text-neutral-900 tracking-tight">
                      Identity & Institution
                    </h2>
                    <p className="text-neutral-500 text-lg">
                      Tell us how to address you and where you teach.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1">
                        <label className="block text-sm font-semibold text-neutral-700 mb-2 ml-1">
                          Title
                        </label>
                        <select
                          value={data.title}
                          onChange={(e) =>
                            setData({ ...data, title: e.target.value })
                          }
                          className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer font-medium"
                        >
                          <option value="">Select</option>
                          {titleOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold text-neutral-700 mb-2 ml-1">
                          Nickname
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                          <input
                            type="text"
                            value={data.nickname}
                            onChange={(e) =>
                              setData({ ...data, nickname: e.target.value })
                            }
                            placeholder="e.g. Doc Smith"
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-neutral-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2 ml-1 flex items-center gap-2">
                          <School className="w-4 h-4" /> School
                        </label>
                        <select
                          value={data.school}
                          onChange={(e) =>
                            setData({
                              ...data,
                              school: e.target.value,
                              department: "",
                            })
                          }
                          className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer font-medium"
                        >
                          <option value="">Select your Institution</option>
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {data.school && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                        >
                          <label className="block text-sm font-semibold text-neutral-700 mb-2 ml-1 flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> Department
                          </label>
                          <select
                            value={data.department}
                            onChange={(e) =>
                              setData({ ...data, department: e.target.value })
                            }
                            className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer font-medium"
                          >
                            <option value="">Select your Department</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </motion.div>
                      )}
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
                  className="space-y-10"
                >
                  <div className="space-y-4">
                    <h2 className="text-4xl font-bold text-neutral-900 tracking-tight">
                      Personal Details
                    </h2>
                    <p className="text-neutral-500 text-lg">
                      Help us customize your professional experience.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-1">
                      <label className="block text-sm font-semibold text-neutral-700 mb-2 ml-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={data.firstName}
                        onChange={(e) =>
                          setData({ ...data, firstName: e.target.value })
                        }
                        className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-semibold text-neutral-700 mb-2 ml-1">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        value={data.middleName}
                        onChange={(e) =>
                          setData({ ...data, middleName: e.target.value })
                        }
                        className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-semibold text-neutral-700 mb-2 ml-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={data.lastName}
                        onChange={(e) =>
                          setData({ ...data, lastName: e.target.value })
                        }
                        className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-semibold text-neutral-700 mb-2 ml-1">
                        Suffix
                      </label>
                      <input
                        type="text"
                        value={data.suffix}
                        onChange={(e) =>
                          setData({ ...data, suffix: e.target.value })
                        }
                        placeholder="e.g. Jr."
                        className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-neutral-700 mb-2 ml-1 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Email Communication
                      </label>
                      <input
                        type="email"
                        value={data.email}
                        onChange={(e) =>
                          setData({ ...data, email: e.target.value })
                        }
                        className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-10"
                >
                  <div className="space-y-4">
                    <h2 className="text-4xl font-bold text-neutral-900 tracking-tight">
                      Ready to Start?
                    </h2>
                    <p className="text-neutral-500 text-lg">
                      Confirm your details and embark on your new teaching
                      journey.
                    </p>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-xl shadow-neutral-200/50 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="text-primary w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500 font-medium">
                          Account Name
                        </p>
                        <p className="text-lg font-bold text-neutral-900">
                          {data.title.charAt(0).toUpperCase() + data.title.slice(1)}. {data.nickname.charAt(0).toUpperCase() + data.nickname.slice(1)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                        <GraduationCap className="text-secondary w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500 font-medium">
                          Assigned Institution
                        </p>
                        <p className="text-lg font-bold text-neutral-900">
                          {schools.find((s) => s.id === data.school)?.name ||
                            "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                      <p className="text-sm text-neutral-600 italic">
                        "I'm excited to start providing deeper insights for my
                        students through EduCompose."
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Spacer for sticky bar */}
            <div className="h-32" />
          </div>
        </div>
      </div>

      {/* Non-floating navigation bar and footer */}
      <div className="bg-white border-t border-neutral-200 z-50">
        <div className="container mx-auto px-6 py-6 lg:py-8 flex items-center justify-between">
          <div className="w-40">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-3 rounded-2xl font-bold text-neutral-600 hover:bg-neutral-100 transition-all flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-6 lg:gap-12">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-3">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500
                    ${
                      currentStep === step
                        ? "bg-primary text-white scale-125 shadow-lg shadow-primary/30"
                        : currentStep > step
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-200 text-neutral-400"
                    }
                  `}
                >
                  {currentStep > step ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    step
                  )}
                </div>
                <span
                  className={`hidden md:inline font-bold text-sm tracking-widest uppercase ${
                    currentStep >= step
                      ? "text-neutral-900"
                      : "text-neutral-400"
                  }`}
                >
                  {step === 1 ? "Setup" : step === 2 ? "Profile" : "Launch"}
                </span>
              </div>
            ))}
          </div>

          <div className="w-40 flex justify-end">
            <button
              onClick={currentStep === 3 ? handleComplete : handleNext}
              disabled={
                isLoading ||
                (currentStep === 1 &&
                  (!data.title ||
                    !data.nickname ||
                    !data.school ||
                    !data.department))
              }
              className={`
                px-10 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all duration-300 shadow-xl hover:-translate-y-1 active:scale-95
                ${
                  currentStep === 3
                    ? "bg-success-default hover:bg-success-600 text-white shadow-success-default/30"
                    : "bg-primary hover:bg-primary-600 text-white shadow-primary/30"
                }
                disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none
              `}
            >
              {currentStep === 3 ? "Finish" : "Next"}
              {currentStep < 3 ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <footer className="bg-neutral-900 text-white py-4">
          <motion.div
            className="container mx-auto px-6 text-center font-semibold"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <p className="text-white animate-pulse text-xs tracking-widest uppercase">
              &copy; 2025 EduCompose | Team Nonchalant.
            </p>
          </motion.div>
        </footer>
      </div>
    </div>
  );
};

export default Onboarding;
