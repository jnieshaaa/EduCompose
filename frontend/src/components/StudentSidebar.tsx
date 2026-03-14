import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  // Layers,
  // BarChart3,
  // Users,
  // GraduationCap,
  // ClipboardList,
  // Award,
  Info,
  // BookOpen,
  // Target,
  // Zap,
  // Shield,
  // LayoutDashboard,
  // Users,
  ClipboardCheck,
  // BarChart3,
  Settings,
  // X,
  LayoutDashboard, // New icon for student dashboard
  BookOpen, // Icon for My Classes
  Upload, // Icon for Essay Submission in Info Modal
  MessageSquare, // New icon for AI Feedback
  TrendingUp, // New icon for Progress & Analytics
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import Tooltip from "./ui/Tooltip";
import Modal from "./ui/Modal";
import eduComposeLogo from "../assets/EduCompose.png";

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface StudentSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

interface EnrolledClass {
  id: string;
  code: string;
  name: string;
  instructor: string;
}

// Renamed component from ClientSidebar to StudentSidebar
const StudentSidebar: React.FC<StudentSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [logoShine, setLogoShine] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isClassesOpen, setIsClassesOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  // Fetch real classes data
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Get student record (prefer auth_user_id, fallback to email)
        let { data: student } = await supabase
          .from("students")
          .select("id, email, auth_user_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        
        if (!student && user.email) {
          const { data: emailData } = await supabase
            .from("students")
            .select("id, email, auth_user_id")
            .eq("email", user.email)
            .maybeSingle();
          student = emailData;
        }

        if (!student) {
          console.warn("StudentSidebar: No student record found for user", user.id);
          setIsLoadingClasses(false);
          return;
        }

        // 2. Get enrolled blocks and their associated courses/teachers
        const { data: enrollments, error } = await supabase
          .from("block_students")
          .select(`
            block_id,
            blocks (
              teacher_program_loads (
                teacher_course_loads (
                  id,
                  course_id,
                  teacher_id,
                  courses (
                    course_code,
                    course_title
                  ),
                  users:teacher_id (
                    first_name,
                    last_name,
                    title,
                    nickname
                  )
                )
              )
            )
          `)
          .eq("student_id", student.id);

        if (error) {
          console.error("StudentSidebar: Query error", error);
          throw error;
        }

        // Flatten the data with array support for joins
        const flattenedClasses: EnrolledClass[] = [];
        enrollments?.forEach(enrollment => {
          const block = enrollment.blocks as any;
          if (!block) return;

          // Supabase might return single object or array depending on relationship
          const tplData = block.teacher_program_loads;
          const tpls = Array.isArray(tplData) ? tplData : (tplData ? [tplData] : []);

          tpls.forEach((tpl: any) => {
            const tclData = tpl.teacher_course_loads;
            const tcls = Array.isArray(tclData) ? tclData : (tclData ? [tclData] : []);

            tcls.forEach((tcl: any) => {
              if (tcl && tcl.courses) {
                flattenedClasses.push({
                  id: tcl.id,
                  code: tcl.courses.course_code,
                  name: tcl.courses.course_title,
                  instructor: tcl.users 
                    ? (tcl.users.title && tcl.users.nickname 
                      ? `${tcl.users.title} ${tcl.users.nickname}` 
                      : (tcl.users.title ? `${tcl.users.title} ${tcl.users.last_name}` : tcl.users.last_name))
                    : "TBA"
                });
              }
            });
          });
        });

        setEnrolledClasses(flattenedClasses);
      } catch (err) {
        console.error("Error fetching student classes:", err);
      } finally {
        setIsLoadingClasses(false);
      }
    };

    fetchClasses();
  }, []);

  // Updated menu items for the student role
  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: <LayoutDashboard className='w-5 h-5' />,
        label: "Dashboard",
        path: "/Student/Dashboard",
      },
      {
        icon: <FileText className='w-5 h-5' />,
        label: "My Essays",
        path: "/Student/Essays",
      },
      // {
      //   icon: <MessageSquare className='w-5 h-5' />,
      //   label: "AI Feedback",
      //   path: "/Student/Feedback",
      // },
      {
        icon: <TrendingUp className='w-5 h-5' />,
        label: "Progress & Analytics",
        path: "/Student/Progress",
      },
      {
        icon: <ClipboardCheck className='w-5 h-5' />,
        label: "Rubric / Criteria",
        path: "/Student/Rubric",
      },
      {
        icon: <Settings className='w-5 h-5' />,
        label: "Settings",
        path: "/Student/Settings",
      },
    ],
    []
  );

  const [activePath, setActivePath] = useState(location.pathname);
  useEffect(() => {
    setActivePath(location.pathname);
    // Auto-expand classes dropdown if on a class detail page
    if (location.pathname.startsWith('/Student/Classes/')) {
      setIsClassesOpen(true);
    }
  }, [location.pathname]);

  const handleItemClick = (path: string) => {
    navigate(path);
    if (!isDesktop) setIsSidebarOpen(false);
  };

  useEffect(() => {
    const currentItem = menuItems.find(
      (item) => item.path.toLowerCase() === location.pathname.toLowerCase()
    );
    // Title updated to reflect Student context
    document.title = currentItem ? currentItem.label : "EduCompose Student";
  }, [location.pathname, menuItems]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsDesktop(width >= 1024);
      setIsTablet(width >= 768 && width < 1024);
      // Auto-close sidebar on mobile when resizing to mobile size
      if (width < 768 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen]);

  useEffect(() => {
    setLogoShine(true);
    const timeout = setTimeout(() => setLogoShine(false), 1000);
    return () => clearTimeout(timeout);
  }, []);

  const textVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className='flex h-screen overflow-hidden'>
      <aside
        className='fixed lg:relative h-full z-40 flex flex-col border-r border-neutral3 bg-primary'
        style={{
          width: isSidebarOpen ? (isTablet ? "240px" : "280px") : isDesktop ? "80px" : "0px",
          transition: "width 0.2s",
          overflow: isSidebarOpen ? "hidden" : "visible",
        }}
      >
        {/* Header */}
        <div className='flex items-center h-16 border-b border-white p-2.5 relative'>
            {/* 👇 CHANGE 1: Logo container size reduced from w-14 h-14 (56px) to w-10 h-10 (40px) */}
            <div className='relative w-10 h-10 flex-shrink-0 rounded overflow-hidden flex items-center justify-center group'>
              <img
                src={eduComposeLogo}
                alt='EduCompose Logo'
                className='w-full h-full object-cover cursor-none'
              />
              <div className='absolute inset-0 pointer-events-none overflow-hidden'>
                <div
                  className={`absolute top-0 left-0 w-1/3 h-full bg-shine-gradient transform -translate-x-full z-20
                    ${logoShine ? "animate-shine" : ""} group-hover:animate-shine`}
                  onAnimationEnd={() => setLogoShine(false)}
                ></div>
              </div>
            </div>

            {isSidebarOpen && (
              <div className='ml-2 sm:ml-3 flex flex-col overflow-hidden flex-1 min-w-0'>
                <AnimatePresence>
                  <motion.div
                    initial='hidden'
                    animate='visible'
                    exit='hidden'
                    variants={textVariants}
                    className='flex flex-col min-w-0'
                  >
                    <h1 className='font-bold text-lg sm:text-xl md:text-2xl text-white whitespace-nowrap truncate'>
                      EduCompose
                    </h1>
                    <p className='text-[10px] sm:text-xxs font-md mt-0.5 text-white whitespace-nowrap truncate'>
                      Student Portal for Essay Evaluation
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>

        {/* Navigation */}
        <nav className='flex-1 p-4 overflow-y-auto'>
          <ul
            className='space-y-2'
            style={{ overflow: isSidebarOpen ? "hidden" : "visible" }}
          >
            {/* Dashboard (always first) */}
            {menuItems.slice(0, 1).map((item) => {
              const isActive = activePath.toLowerCase() === item.path.toLowerCase() ||
                               activePath.toLowerCase().startsWith(item.path.toLowerCase() + "/");
              return (
                <li key={item.label} className='w-full'>
                  <Tooltip
                    content={item.label}
                    position='right'
                    delay={200}
                    disabled={isSidebarOpen}
                  >
                    <button
                      onClick={() => handleItemClick(item.path)}
                      className={`btn-fade group w-full flex items-center rounded-rd ${
                        isActive
                          ? "bg-neutral-50 text-primary"
                          : "bg-primary text-white hover:text-support-superlight"
                      }`}
                    >
                      <div className='flex items-center w-full flex-1'>
                        <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                          {item.icon}
                        </span>
                        <AnimatePresence>
                          {isSidebarOpen && (
                            <motion.span
                              initial='hidden'
                              animate='visible'
                              exit='hidden'
                              variants={textVariants}
                              className='font-medium whitespace-nowrap flex-1 pr-4 text-left'
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </button>
                  </Tooltip>
                </li>
              );
            })}

            {/* My Classes - always below Dashboard, acts as dropdown */}
            <li className='w-full'>
              <Tooltip
                content="My Classes"
                position='right'
                delay={200}
                disabled={isSidebarOpen}
              >
                <button
                  onClick={() => {
                    // Ensure sidebar is open and dropdown toggles
                    if (!isSidebarOpen) {
                      setIsSidebarOpen(true);
                    }
                    setIsClassesOpen((prev) => !prev);
                    navigate("/Student/Classes");
                    if (!isDesktop) {
                      // keep sidebar open on mobile while viewing classes
                      setIsSidebarOpen(true);
                    }
                  }}
                  className={`btn-fade group w-full flex items-center rounded-rd ${
                    activePath.toLowerCase().startsWith("/student/classes")
                      ? "bg-neutral-50 text-primary"
                      : "bg-primary text-white hover:text-support-superlight"
                  }`}
                >
                  <div className='flex items-center w-full flex-1'>
                    <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                      <BookOpen className='w-5 h-5' />
                    </span>
                    <AnimatePresence>
                      {isSidebarOpen && (
                        <motion.div
                          initial='hidden'
                          animate='visible'
                          exit='hidden'
                          variants={textVariants}
                          className='font-medium whitespace-nowrap flex-1 pr-4 text-left flex items-center justify-between'
                        >
                          <span>My Classes</span>
                          <span className='ml-auto'>
                            {isClassesOpen ? (
                              <ChevronDown className='w-4 h-4' />
                            ) : (
                              <ChevronRight className='w-4 h-4' />
                            )}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              </Tooltip>

              {/* Classes Dropdown */}
              <AnimatePresence>
                {isSidebarOpen && isClassesOpen && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className='ml-12 mt-2 space-y-1 overflow-hidden'
                  >
                    {enrolledClasses.length > 0 ? (
                      enrolledClasses.map((classItem) => {
                        const classPath = `/Student/Classes/${classItem.id}`;
                        const isClassActive = activePath === classPath;
                        return (
                          <li key={classItem.id}>
                            <Tooltip content={classItem.instructor} position="right" delay={100}>
                              <button
                                onClick={() => {
                                  navigate(classPath);
                                  if (!isDesktop) setIsSidebarOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                  isClassActive
                                    ? "bg-neutral-100 text-primary font-medium"
                                    : "text-white/80 hover:text-white hover:bg-white/10"
                                }`}
                              >
                                <div className='flex flex-col'>
                                  <span className='font-medium'>{classItem.code}</span>
                                  <span className='text-[10px] opacity-75 truncate'>{classItem.name}</span>
                                </div>
                              </button>
                            </Tooltip>
                          </li>
                        );
                      })
                    ) : (
                      <li className="px-3 py-2 text-white/50 text-xs italic">
                        {isLoadingClasses ? "Loading classes..." : "No classes joined yet"}
                      </li>
                    )}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>

            {/* Remaining menu items (start after Dashboard) */}
            {menuItems.slice(1).map((item) => {
              const isActive = activePath.toLowerCase() === item.path.toLowerCase() || 
                              activePath.toLowerCase().startsWith(item.path.toLowerCase() + '/');
              return (
                <li key={item.label} className='w-full'>
                  <Tooltip
                    content={item.label}
                    position='right'
                    delay={200}
                    disabled={isSidebarOpen}
                  >
                    <button
                      onClick={() => handleItemClick(item.path)}
                      className={`btn-fade group w-full flex items-center rounded-rd ${
                        isActive
                          ? "bg-neutral-50 text-primary"
                          : "bg-primary text-white hover:text-support-superlight"
                      }`}
                    >
                      <div className='flex items-center w-full flex-1'>
                        <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                          {item.icon}
                        </span>
                        <AnimatePresence>
                          {isSidebarOpen && (
                            <motion.span
                              initial='hidden'
                              animate='visible'
                              exit='hidden'
                              variants={textVariants}
                              className='font-medium whitespace-nowrap flex-1 pr-4 text-left'
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </button>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Info Tab at Bottom */}
        <div className='p-4 border-t border-white'>
          <Tooltip
            content='About EduCompose'
            position='right'
            delay={200}
            disabled={isSidebarOpen}
          >
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className='btn-fade group w-full flex items-center rounded-lg bg-primary text-white hover:text-support-superlight'
            >
              <div className='flex items-center w-full flex-1'>
                <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                  <Info className='w-5 h-5' />
                </span>
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span
                      initial='hidden'
                      animate='visible'
                      exit='hidden'
                      variants={textVariants}
                      className='font-medium whitespace-nowrap flex-1 pr-4 text-left'
                    >
                      About EduCompose
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {!isDesktop && isSidebarOpen && (
        <div
          className='lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30'
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Info Modal - Reused from ClientSidebar */}
      <Modal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title='About EduCompose'
        size='lg'
      >
        <div className='space-y-6'>
          {/* Header Card */}
          <div className='bg-gradient-to-r from-primary to-primary-500 rounded-rd p-6 text-white'>
            <div className='flex items-center space-x-4'>
              <div className='w-16 h-16 bg-white bg-opacity-20 rounded-rd flex items-center justify-center'>
                <img
                  src={eduComposeLogo}
                  alt='EduCompose Logo'
                  className='w-12 h-12 object-contain'
                />
              </div>
              <div>
                <h3 className='text-2xl font-bold'>EduCompose</h3>
                <p className='text-white text-opacity-90'>
                  Teacher's Companion for Essay Evaluation
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='bg-neutral-100 rounded-rd p-4 border border-neutral-300'>
              <div className='flex items-center space-x-3 mb-2'>
                <Upload className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  Essay Submission
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Easily submit your essays and track their status through the portal.
              </p>
            </div>

            <div className='bg-neutral-100 rounded-rd p-4 border border-neutral-300'>
              <div className='flex items-center space-x-3 mb-2'>
                <MessageSquare className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  AI-Powered Feedback
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Receive instant, constructive feedback on your writing to help you improve.
              </p>
            </div>

            <div className='bg-neutral-100 rounded-rd p-4 border border-neutral-300'>
              <div className='flex items-center space-x-3 mb-2'>
                <TrendingUp className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  Track Progress
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Visualize your improvement over time with detailed progress and analytics.
              </p>
            </div>

            <div className='bg-neutral-100 rounded-rd p-4 border border-neutral-300'>
              <div className='flex items-center space-x-3 mb-2'>
                <ClipboardCheck className='w-6 h-6 text-primary' />
                <h4 className='font-semibold text-neutral-900'>
                  View Rubrics
                </h4>
              </div>
              <p className='text-sm text-neutral-600'>
                Understand the grading criteria for each assignment to meet expectations.
              </p>
            </div>
          </div>

          {/* Version Info */}
          <div className='bg-neutral-200 rounded-rd p-4 border border-neutral-300'>
            <div className='flex justify-between items-center'>
              <div>
                <p className='text-sm font-medium text-neutral-900'>
                  Version 1.0.0
                </p>
                <p className='text-xs text-neutral-600'>
                  Last updated: December 2024
                </p>
              </div>
              <div className='text-right'>
                <p className='text-xs text-neutral-600'>
                  Made with for educators and students
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentSidebar;