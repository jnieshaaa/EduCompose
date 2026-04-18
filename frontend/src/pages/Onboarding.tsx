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
  ChevronDown,
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

const TeacherOnboarding: React.FC = () => {
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
    { value: "Mr.", label: "Mr." },
    { value: "Ms.", label: "Ms." },
    { value: "Mrs.", label: "Mrs." },
    { value: "Sir", label: "Sir" },
    { value: "Prof.", label: "Prof." },
    { value: "Dr.", label: "Dr." },
    { value: "Other", label: "Other" },
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

      const capitalizedTitle = data.title || "";

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
          school_id: data.school, // Use UUID column
          department_id: data.department, // Use UUID column
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
    <div className="flex h-[100dvh] bg-white overflow-hidden font-sans select-none">
      <AnimatePresence mode="wait">
        <div className="flex flex-1 w-full relative">
          {/* Left Side: Commercial & Brand Narrative */}
          <div className="hidden lg:flex w-[45%] bg-primary relative flex-col justify-between p-12 overflow-hidden">
            {/* Sophisticated Background Noise & Patterns */}
            <div className="absolute inset-0 pointer-events-none opacity-50">
               <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[120px] animate-pulse" />
               <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-DEFAULT/30 rounded-full blur-[100px]" />
               <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-white/40 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
               <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-white/20 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
               <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <defs>
                   <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                     <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5"/>
                   </pattern>
                 </defs>
                 <rect width="100" height="100" fill="url(#grid)" />
               </svg>
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-lg">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-black tracking-tighter text-white uppercase italic">EduCompose<span className="text-white/50 not-italic">.online</span></span>
            </div>

            <div className="relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-6"
>
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-xl">
                      <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Instructional Evolution</span>
                    </div>
                    <h1 className="text-4xl font-black leading-[1.1] text-white tracking-tighter">
                      {stepsContent[currentStep - 1].title}
                    </h1>
                    <p className="text-base text-white/70 font-medium leading-relaxed max-w-md">
                      {stepsContent[currentStep - 1].desc}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {stepsContent[currentStep - 1].features.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="flex items-center gap-4 p-3 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-white/90 text-sm tracking-wide">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 mt-6">
               <div className="flex items-center gap-3 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex -space-x-2">
                     {[1, 2, 3, 4].map(i => <div key={i} className={`w-6 h-6 rounded-full border-2 border-primary bg-neutral-200`} />)}
                  </div>
                  <span>Joined by 10k+ Educators</span>
               </div>
               <div className="flex gap-1">
                 {[1, 2, 3].map(i => (
                   <div key={i} className={`h-1 duration-500 transition-all rounded-full ${currentStep === i ? "w-8 bg-white" : "w-3 bg-white/20"}`} />
                 ))}
               </div>
            </div>
          </div>

          {/* Right Side: Interactive Form Interface */}
          <div className="flex-1 bg-white flex flex-col relative h-screen overflow-hidden">
            {/* Form Header / Mobile Branding */}
            <div className="lg:hidden p-6 flex justify-between items-center bg-primary text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-black tracking-tighter uppercase">EduCompose</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Step {currentStep} of 3</span>
            </div>

            {/* Stepper HUD (Desktop Only) */}
            <div className="hidden lg:flex px-12 py-8 justify-center">
              <div className="flex items-center gap-12">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-3 group">
                    <div className={`
                      w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-500 border-2
                      ${currentStep === step ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-110" : 
                        currentStep > step ? "bg-secondary border-secondary text-white" : "bg-white border-neutral-100 text-neutral-300"}
                    `}>
                      {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : `0${step}`}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${currentStep >= step ? "text-neutral-900" : "text-neutral-300"}`}>
                        {step === 1 ? "Organization" : step === 2 ? "Identity" : "Deployment"}
                      </span>
                      <div className={`h-[2px] w-full mt-1.5 transition-all duration-500 ${currentStep >= step ? "bg-primary" : "bg-neutral-100"}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Area */}
            <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-6 py-4 lg:px-24">
              <div className="w-full max-w-lg">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">Institutional Node</label>
                        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter leading-tight">Where is your<br/>Academic Hub?</h2>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Preferred Title</label>
                            <div className="relative group">
                              <select
                                value={data.title}
                                onChange={(e) => setData({ ...data, title: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none cursor-pointer font-bold text-sm outline-none shadow-sm"
                              >
                                <option value="">Select Prefix</option>
                                {titleOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Professional Alias</label>
                            <input
                              type="text"
                              value={data.nickname}
                              placeholder="e.g. Doc Smith"
                              onChange={(e) => setData({ ...data, nickname: e.target.value })}
                              className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-sm outline-none placeholder:text-neutral-300 shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Host Institution</label>
                             <div className="relative group">
                                <School className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300 group-focus-within:text-primary transition-colors" />
                                <select
                                  value={data.school}
                                  onChange={(e) => setData({ ...data, school: e.target.value, department: "" })}
                                  className="w-full pl-12 pr-10 py-3 bg-white border border-neutral-300 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none cursor-pointer font-bold text-sm outline-none shadow-sm"
                                >
                                  <option value="">Locate your School</option>
                                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                             </div>
                          </div>

                          <AnimatePresence>
                            {data.school && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2"
                              >
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Academic Department</label>
                                <div className="relative group">
                                  <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-primary transition-colors" />
                                  <select
                                    value={data.department}
                                    onChange={(e) => setData({ ...data, department: e.target.value })}
                                    className="w-full pl-12 pr-10 py-3 bg-white border border-neutral-300 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none cursor-pointer font-bold text-sm outline-none shadow-sm"
                                  >
                                    <option value="">Select Department</option>
                                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                  </select>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">Profile Identity</label>
                        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter leading-tight">How shall we<br/>Recognize you?</h2>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Given Name</label>
                           <input
                             type="text"
                             value={data.firstName}
                             placeholder="First Name"
                             onChange={(e) => setData({ ...data, firstName: e.target.value })}
                             className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-sm outline-none placeholder:text-neutral-300 shadow-sm"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Middle Name</label>
                           <input
                             type="text"
                             value={data.middleName}
                             placeholder="Middle Name"
                             onChange={(e) => setData({ ...data, middleName: e.target.value })}
                             className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-sm outline-none placeholder:text-neutral-300 shadow-sm"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Family Name</label>
                           <input
                             type="text"
                             value={data.lastName}
                             placeholder="Last Name"
                             onChange={(e) => setData({ ...data, lastName: e.target.value })}
                             className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-sm outline-none placeholder:text-neutral-300 shadow-sm"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Suffix</label>
                           <input
                             type="text"
                             value={data.suffix}
                             placeholder="e.g. Jr., Sr., II"
                             onChange={(e) => setData({ ...data, suffix: e.target.value })}
                             className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-sm outline-none placeholder:text-neutral-300 shadow-sm"
                           />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Communication Endpoint</label>
                            <div className="relative group">
                              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-primary transition-colors" />
                              <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData({ ...data, email: e.target.value })}
                                className="w-full pl-12 pr-5 py-3 bg-white border border-neutral-300 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-sm outline-none placeholder:text-neutral-300 shadow-sm"
                                placeholder="your@email.com"
                              />
                            </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="space-y-3 text-center sm:text-left">
                        <label className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">Operational Readiness</label>
                        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter leading-tight">Ready for<br/>Deployment?</h2>
                      </div>

                      <div className="bg-neutral-50/50 p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                        
                        <div className="flex items-center gap-6 relative">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/5 border border-primary/5">
                            <User className="text-primary w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Authorised User</p>
                            <p className="text-xl font-black text-neutral-900 tracking-tight leading-none">
                              {data.title && `${data.title} `}{data.nickname}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 relative">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-secondary/5 border border-secondary/5">
                            <School className="text-secondary w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Operational Post</p>
                            <p className="text-xl font-black text-neutral-900 tracking-tight leading-none truncate max-w-[240px]">
                              {schools.find((s) => s.id === data.school)?.name || "Academic Entity"}
                            </p>
                          </div>
                        </div>

                        <div className="p-6 bg-white rounded-2xl border border-dashed border-neutral-200 text-center italic relative">
                          <p className="text-xs font-bold text-neutral-400 leading-relaxed uppercase tracking-wider">
                            "Initializing high-fidelity academic orchestration protocols."
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Sticky Interaction Bar */}
            <div className="p-8 lg:px-16 lg:py-10 bg-white border-t border-neutral-50 flex items-center justify-between">
              <button
                disabled={currentStep === 1}
                onClick={handleBack}
                className="flex items-center gap-2 group disabled:opacity-0 transition-opacity"
              >
                <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center group-hover:bg-neutral-100 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-neutral-500" />
                </div>
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Previous</span>
              </button>

              <button
                onClick={currentStep === 3 ? handleComplete : handleNext}
                disabled={isLoading || (currentStep === 1 && (!data.title || !data.nickname || !data.school || !data.department))}
                className={`
                  flex items-center gap-4 pl-12 pr-6 py-4 rounded-3xl font-black tracking-[0.15em] uppercase text-xs transition-all duration-500 relative overflow-hidden group active:scale-95 shadow-2xl shadow-primary/20
                  ${currentStep === 3 ? "bg-primary-500" : "bg-primary"} text-white
                `}
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 italic" />
                <span className="relative z-10">{currentStep === 3 ? "Initialize Launch" : "Synchronize Step"}</span>
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center relative z-10 group-hover:translate-x-2 transition-transform">
                  {currentStep === 3 ? <ArrowRight className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>
            </div>
          </div>
        </div>
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 w-full lg:w-[45%] p-8 pointer-events-none hidden lg:block">
         <div className="flex justify-between items-center text-white/20 text-[9px] font-black uppercase tracking-[0.3em]">
            <span>EduCompose AI v2.4</span>
            <span>&copy; 2025 Institutional Registry</span>
         </div>
      </footer>
    </div>
  );
};

// Main Onboarding Export with conditional rendering
import StudentOnboarding from "./students/StudentOnboarding";

const Onboarding: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();

  if (role === 'student') {
    return <StudentOnboarding />;
  }

  return <TeacherOnboarding />;
};

export default Onboarding;
