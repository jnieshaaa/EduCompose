import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Users,
  GraduationCap,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Building2,
  FileText,
  User,
  Mail,
  UserCircle,
  LogOut
} from "lucide-react";
import { useNotification } from "../../context/NotificationContext";

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
      code?: string;
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
  const { checkAuth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [studentData, setStudentData] = useState<StudentData | null>(location.state?.student || null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const { showNotification } = useNotification();

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
                code,
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
                  code,
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
      } catch (err: any) {
        console.error("Error fetching student data:", err);
      }
    };
    fetchStudentData();
  }, []);

  const handleNext = () => {
    if (currentStep === 1 && !studentData) {
      showNotification('error', "Wait! We're still fetching your info.");
      return;
    }
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
      if (!authUser) throw new Error("Please log in first.");

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setPasswordError("Passwords don't match.");
          setIsLoading(false);
          return;
        }
        if (!allRequirementsMet) {
          setPasswordError("Password is too weak.");
          setIsLoading(false);
          return;
        }

        const { error: pwdError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (pwdError) throw pwdError;
      }

      if (!studentData?.id) {
        throw new Error("Missing student info.");
      }

      const { error: updateError } = await supabase
        .from("students")
        .update({ 
          onboarding_completed: true,
          auth_user_id: authUser.id 
        })
        .eq("id", studentData.id);

      if (updateError) throw updateError;

      await checkAuth();
      
      showNotification('success', "All set! Welcome to EduCompose.");
      
      setTimeout(() => {
        navigate("/Student/Dashboard");
      }, 100);
    } catch (err: any) {
      console.error("Error completing onboarding:", err);
      showNotification('error', "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const stepsContent = [
    {
      title: "Write Better Essays",
      desc: "EduCompose helps you fix your writing with smart tips from our AI.",
      icon: <Sparkles className="w-12 h-12 text-primary" />,
      features: [
        "Instant AI Tips",
        "Idea Analysis",
        "Better Grammar",
      ],
    },
    {
      title: "Check Your Info",
      desc: "We got your info from your school records. Please check if they are correct.",
      icon: <User className="w-12 h-12 text-secondary" />,
      features: ["Your Name", "ID Number", "Personal Info"],
    },
    {
      title: "Your Course & Group",
      desc: "Check if your course and your section/group are correct.",
      icon: <GraduationCap className="w-12 h-12 text-accent" />,
      features: [
        "Your Course",
        "Your Section",
        "Your Department",
      ],
    },
    {
      title: "Keep Your Account Safe",
      desc: "Please create a new password so only you can open your account.",
      icon: <ShieldCheck className="w-12 h-12 text-success-default" />,
      features: [
        "Safe Password",
        "Personal Keys",
        "Account Security",
      ],
    },
  ];

  if (studentData && studentData.enrollment_status && studentData.enrollment_status !== 'active') {
    return (
      <div className="flex h-[100dvh] bg-neutral-900 items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] p-12 max-w-lg w-full text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Lock size={160} />
          </div>
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-500/10">
            <Lock size={48} />
          </div>
          <h2 className="text-3xl font-black text-neutral-900 mb-4 tracking-tighter">Account Locked</h2>
          <p className="text-neutral-500 mb-10 leading-relaxed font-medium">
            Your account is currently <span className="font-bold text-red-500 uppercase tracking-widest">{studentData.enrollment_status}</span>. 
            Please talk to your school admin if you need help.
          </p>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="w-full py-5 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-900/20 active:scale-95"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-white overflow-hidden font-sans select-none">
      <AnimatePresence mode="wait">
        <div className="flex flex-1 w-full relative">
          {/* Left Side: Brand Narrative */}
          <div className="hidden lg:flex w-[45%] bg-primary relative flex-col justify-between p-12 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-50">
               <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[120px] animate-pulse" />
               <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-DEFAULT/30 rounded-full blur-[100px]" />
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
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Student Welcome</span>
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
                  <span>Join thousands of students</span>
               </div>
               <div className="flex gap-1">
                 {[1, 2, 3, 4].map(i => (
                   <div key={i} className={`h-1 duration-500 transition-all rounded-full ${currentStep === i ? "w-8 bg-white" : "w-3 bg-white/20"}`} />
                 ))}
               </div>
            </div>
          </div>

          {/* Right Side: Form Content */}
          <div className="flex-1 bg-white flex flex-col relative h-screen overflow-hidden">
            {/* Desktop Stepper HUD */}
            <div className="hidden lg:flex px-12 py-8 justify-between items-center border-b border-neutral-50 bg-white/50 backdrop-blur-xl sticky top-0 z-20 w-full">
              <div className="flex-1" />
              <div className="flex items-center gap-10">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center gap-3 group">
                    <div className={`
                      w-9 h-9 rounded-2xl flex items-center justify-center font-black text-[10px] transition-all duration-500 border-2
                      ${currentStep === step ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-110" : 
                        currentStep > step ? "bg-secondary border-secondary text-white" : "bg-white border-neutral-100 text-neutral-300"}
                    `}>
                      {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : `0${step}`}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${currentStep >= step ? "text-neutral-900" : "text-neutral-300"}`}>
                        {step === 1 ? "Welcome" : step === 2 ? "Your Info" : step === 3 ? "Course" : "Security"}
                      </span>
                      <div className={`h-[2px] w-full mt-1.5 transition-all duration-500 ${currentStep >= step ? "bg-primary" : "bg-neutral-100"}`} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex-1 flex justify-end">
                <button 
                  onClick={() => logout()}
                  className="p-2.5 rounded-xl bg-neutral-50 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-all group flex items-center gap-2"
                  title="Logout"
                >
                   <LogOut size={18} />
                </button>
              </div>
            </div>

            {/* Form Area */}
            <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto px-6 py-12 lg:px-24">
              <div className="w-full max-w-lg">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">Step 1</label>
                        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter leading-[1.1]">Let's Get<br/>Started.</h2>
                        <p className="text-neutral-500 font-medium leading-relaxed">EduCompose uses AI to help you write better. We'll show you what to fix so you can get higher scores.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 flex gap-5 hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all group">
                          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileText size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-neutral-900 text-base">Write Better</h4>
                            <p className="text-sm text-neutral-500 font-medium mt-1">Send us your essays and we'll give you tips right away.</p>
                          </div>
                        </div>
                        <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 flex gap-5 hover:bg-white hover:shadow-xl hover:shadow-secondary/5 transition-all group">
                          <div className="w-14 h-14 bg-secondary/10 text-secondary-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <GraduationCap size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-neutral-900 text-base">See Your Score</h4>
                            <p className="text-sm text-neutral-500 font-medium mt-1">Watch how your scores get better with every essay you write.</p>
                          </div>
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
                      className="space-y-8"
                    >
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">Step 2</label>
                        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter leading-[1.1]">Check Your<br/>Info.</h2>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">First Name</label>
                           <div className="px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-sm font-bold text-neutral-900 italic">
                             {studentData?.first_name || "---"}
                           </div>
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Middle Name</label>
                           <div className="px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-sm font-bold text-neutral-900 italic">
                             {studentData?.middle_name || "---"}
                           </div>
                         </div>
                         <div className="sm:col-span-2 space-y-2">
                           <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Last Name</label>
                           <div className="px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-sm font-bold text-neutral-900 italic">
                             {studentData?.last_name || "---"}
                           </div>
                         </div>
                         <div className="sm:col-span-2 space-y-2">
                           <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">School Email</label>
                           <div className="px-5 py-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-sm font-bold text-neutral-900 italic flex items-center gap-3">
                             <Mail size={16} className="text-neutral-300" />
                             {studentData?.email || "No email assigned"}
                           </div>
                         </div>
                         <div className="sm:col-span-2 space-y-2">
                           <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Student ID Number</label>
                           <div className="px-5 py-4 bg-primary/[0.03] rounded-2xl border border-primary/10 text-base font-black text-primary flex items-center gap-3">
                             <UserCircle size={18} />
                             {studentData?.student_code || "---"}
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
                      className="space-y-8"
                    >
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">Step 3</label>
                        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter leading-[1.1]">Check Your<br/>Course.</h2>
                      </div>

                      <div className="bg-neutral-50 p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                        
                        <div className="flex items-center gap-6 relative">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/5 border border-primary/5">
                            <GraduationCap className="text-primary w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">My Course</p>
                            <p className="text-xl font-black text-neutral-900 tracking-tight leading-none">
                              {studentData?.programs_lookup?.name || "Program Name"}
                            </p>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase mt-1">{studentData?.programs_lookup?.abbr || "---"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 relative">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-secondary/5 border border-secondary/5">
                            <Building2 className="text-secondary w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">My Department</p>
                            <p className="text-lg font-black text-neutral-900 tracking-tight leading-none">
                              {studentData?.programs_lookup?.departments?.name || "Department Name"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 relative">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-accent/5 border border-accent/5">
                            <Users className="text-accent w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">My Group</p>
                            <p className="text-xl font-black text-neutral-900 tracking-tight leading-none">
                              {studentData?.year && studentData?.block_name ? `Year ${studentData.year} - Group ${studentData.block_name}` : "No Section Yet"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">Step 4</label>
                        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter leading-[1.1]">Keep Your<br/>Account Safe.</h2>
                        <p className="text-neutral-500 font-medium leading-relaxed">Please change your password so that only you can open your account.</p>
                      </div>

                      <div className="p-8 bg-neutral-50 rounded-[2.5rem] border border-neutral-100 space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">New Password</label>
                          <div className="relative group/pass">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within/pass:text-primary transition-colors" />
                            <input
                              type={showPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                              onFocus={() => setIsPasswordFocused(true)}
                              onBlur={() => setIsPasswordFocused(false)}
                              placeholder="Type New Password"
                              className="w-full h-12 pl-11 pr-12 bg-white border border-neutral-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none shadow-sm"
                            />
                            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-600">
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>

                            <AnimatePresence>
                              {isPasswordFocused && !allRequirementsMet && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute left-0 right-0 top-full mt-4 p-5 bg-white rounded-2xl shadow-2xl border border-neutral-100 z-[60]"
                                >
                                  <h5 className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-4">Password Rules</h5>
                                  <div className="grid grid-cols-1 gap-3">
                                    {[
                                      { label: "8+ Letters", met: hasMinLength },
                                      { label: "1 Big Letter (ABC)", met: hasUppercase },
                                      { label: "1 Number (123)", met: hasNumber }
                                    ].map((req, i) => (
                                      <div key={i} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${req.met ? "bg-success-default text-white" : "bg-neutral-50 text-neutral-200"}`}>
                                           <CheckCircle2 size={12} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${req.met ? "text-neutral-900" : "text-neutral-300"}`}>{req.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Type it Again</label>
                          <div className="relative group/verify">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within/verify:text-primary transition-colors" />
                            <input
                              type={showPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                              placeholder="Re-type Password"
                              className="w-full h-12 pl-11 pr-12 bg-white border border-neutral-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none shadow-sm"
                            />
                          </div>
                        </div>

                        {passwordError && (
                          <div className="p-3.5 bg-red-50 text-red-500 rounded-xl border border-red-100 flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-widest italic animate-shake">
                            <AlertCircle size={14} /> {passwordError}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Sticky Interaction Bar */}
            <div className="px-12 py-8 bg-white/80 backdrop-blur-md border-t border-neutral-50 flex items-center justify-between sticky bottom-0 z-20">
              <button
                disabled={currentStep === 1}
                onClick={handleBack}
                className="flex items-center gap-2 group disabled:opacity-0 transition-opacity"
              >
                <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center group-hover:bg-neutral-100 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-neutral-500" />
                </div>
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Back</span>
              </button>

              <button
                onClick={currentStep === 4 ? handleComplete : handleNext}
                disabled={isLoading}
                className={`
                  flex items-center gap-4 pl-12 pr-6 py-4 rounded-3xl font-black tracking-[0.15em] uppercase text-xs transition-all duration-500 relative overflow-hidden group active:scale-95 shadow-2xl shadow-primary/20
                  ${currentStep === 4 ? "bg-success-default" : "bg-primary"} text-white
                `}
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 italic" />
                <span className="relative z-10">{currentStep === 4 ? "Start Now" : "Next"}</span>
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center relative z-10 group-hover:translate-x-2 transition-transform">
                  {currentStep === 4 ? <ArrowRight className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>
            </div>
          </div>
        </div>
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 w-full lg:w-[45%] p-8 pointer-events-none hidden lg:block">
         <div className="flex justify-between items-center text-white/20 text-[9px] font-black uppercase tracking-[0.3em]">
            <span>EduCompose AI v2.4</span>
            <span>&copy; 2026</span>
         </div>
      </footer>

      {/* Security Notice Modal */}
      <AnimatePresence>
        {showSecurityModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative overflow-hidden border border-neutral-100"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <ShieldCheck size={120} />
              </div>
              <div className="w-20 h-20 bg-success-default/10 text-success-default rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-success-default/5">
                <Lock size={32} />
              </div>
              <h3 className="text-2xl font-black text-neutral-900 mb-4 tracking-tighter">Security Tip</h3>
              <p className="text-neutral-500 mb-10 leading-relaxed font-medium">
                Please create a password that only you know to keep your account safe.
              </p>
              <button
                onClick={() => setShowSecurityModal(false)}
                className="w-full py-5 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-xl active:scale-95"
              >
                Got it!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentOnboarding;
