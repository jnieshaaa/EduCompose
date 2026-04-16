import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  // Layers,
  // BarChart3,
  // Users,
  // GraduationCap,
  // ClipboardList,
  // Award,
  HelpCircle,
  // BookOpen,
  // Target,
  // Zap,
  // Shield,
  // LayoutDashboard,
  // Users,
  // BarChart3,
  Settings,
  // X,
  LayoutDashboard, // New icon for student dashboard
  BookOpen, // Icon for My Classes
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import Tooltip from "./ui/Tooltip";
import eduComposeLogo from "../assets/EduCompose.png";
import { readSecureParams } from "../utils/secureUrl";

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

interface TeacherUserJoin {
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  nickname?: string | null;
}

interface CourseJoin {
  course_code?: string | null;
  course_title?: string | null;
}

interface TeacherCourseLoadJoin {
  id?: string | null;
  courses?: CourseJoin | null;
  users?: TeacherUserJoin | null;
}

interface TeacherProgramLoadJoin {
  teacher_course_loads?: TeacherCourseLoadJoin | TeacherCourseLoadJoin[] | null;
}

interface BlockJoin {
  teacher_program_loads?: TeacherProgramLoadJoin | TeacherProgramLoadJoin[] | null;
}

// Renamed component from ClientSidebar to StudentSidebar
const StudentSidebar: React.FC<StudentSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [logoShine, setLogoShine] = useState(false);
  const [isClassesOpen, setIsClassesOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const secureParams = readSecureParams(location.search);

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
              teacher_program_loads!fk_block_program_load (
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
          const block = enrollment.blocks as BlockJoin | null;
          if (!block) return;

          // Supabase might return single object or array depending on relationship
          const tplData = block.teacher_program_loads;
          const tpls = Array.isArray(tplData) ? tplData : (tplData ? [tplData] : []);

          tpls.forEach((tpl: TeacherProgramLoadJoin) => {
            const tclData = tpl.teacher_course_loads;
            const tcls = Array.isArray(tclData) ? tclData : (tclData ? [tclData] : []);

            tcls.forEach((tcl: TeacherCourseLoadJoin) => {
              if (tcl && tcl.courses) {
                flattenedClasses.push({
                  id: tcl.id || "",
                  code: tcl.courses.course_code || "N/A",
                  name: tcl.courses.course_title || "Untitled Course",
                  instructor: tcl.users 
                    ? (tcl.users.title && tcl.users.nickname 
                      ? `${tcl.users.title} ${tcl.users.nickname}` 
                      : (tcl.users.title ? `${tcl.users.title} ${tcl.users.last_name || ""}` : (tcl.users.last_name || "TBA")))
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
      // {
      //   icon: <ClipboardCheck className='w-5 h-5' />,
      //   label: "Rubric / Criteria",
      //   path: "/Student/Rubric",
      // },
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
    } else {
      // On /Student/Submit the class id is stored in the secure ref token.
      // Auto-expand so the highlighted class is visible.
      if (secureParams?.classId) setIsClassesOpen(true);
    }
  }, [location.pathname, secureParams?.classId]);

  const activeClassId = (() => {
    // Prefer class id in the URL path: /Student/Classes/<id>
    if (location.pathname.startsWith("/Student/Classes/")) {
      const parts = location.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || null;
    }
    // Otherwise, fall back to the secure ref token (e.g., /Student/Submit?ref=...)
    return secureParams?.classId ?? null;
  })();

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
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {!isDesktop && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden'
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: isSidebarOpen ? (isTablet ? "240px" : "280px") : (isDesktop ? "80px" : "0px"),
          x: (!isDesktop && !isSidebarOpen) ? -280 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed lg:relative h-full z-50 flex flex-col border-r border-white/10 bg-primary shadow-2xl lg:shadow-none`}
      >
        {/* Header */}
        <div className='flex items-center h-16 border-b border-white/10 p-2.5 relative flex-shrink-0'>
          <div className='relative w-10 h-10 flex-shrink-0 rounded overflow-hidden flex items-center justify-center group ml-1.5'>
            <img
              src={eduComposeLogo}
              alt='EduCompose Logo'
              className='w-full h-full object-cover'
            />
            <div className='absolute inset-0 pointer-events-none overflow-hidden'>
              <div
                className={`absolute top-0 left-0 w-1/3 h-full bg-shine-gradient transform -translate-x-full z-20
                  ${logoShine ? "animate-shine" : ""} group-hover:animate-shine`}
                onAnimationEnd={() => setLogoShine(false)}
              ></div>
            </div>
          </div>

          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial='hidden'
                animate='visible'
                exit='hidden'
                variants={textVariants}
                className='ml-3 flex flex-col overflow-hidden flex-1 min-w-0'
              >
                <h1 className='font-bold text-lg text-white whitespace-nowrap truncate'>
                  EduCompose
                </h1>
                <p className='text-[10px] font-md text-white/70 whitespace-nowrap truncate uppercase tracking-wider'>
                  Student Portal
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className='flex-1 p-4 overflow-y-auto scrollbar-hide'>
          <ul
            className='space-y-2'
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
                    className="block w-full"
                  >
                    <button
                      onClick={() => handleItemClick(item.path)}
                      className={`group w-full flex items-center rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-white text-primary shadow-md"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <div className='flex items-center w-full flex-1'>
                        <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                          {item.icon}
                        </span>
                        {isSidebarOpen && (
                          <span className='font-medium whitespace-nowrap flex-1 pr-4 text-left text-sm'>
                            {item.label}
                          </span>
                        )}
                      </div>
                    </button>
                  </Tooltip>
                </li>
              );
            })}

            {/* My Classes Dropdown */}
            <li className='w-full'>
              <Tooltip
                content="My Classes"
                position='right'
                delay={200}
                disabled={isSidebarOpen}
                className="block w-full"
              >
                <button
                  onClick={() => {
                    if (!isSidebarOpen) {
                      setIsSidebarOpen(true);
                      setIsClassesOpen(true);
                    } else {
                      setIsClassesOpen((prev) => !prev);
                    }
                  }}
                  className={`group w-full flex items-center rounded-xl transition-all duration-200 ${
                    activePath.toLowerCase().startsWith("/student/classes")
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className='flex items-center w-full flex-1'>
                    <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                      <BookOpen className='w-5 h-5' />
                    </span>
                    {isSidebarOpen && (
                      <div className='font-medium whitespace-nowrap flex-1 pr-4 text-left text-sm flex items-center justify-between'>
                        <span>My Classes</span>
                        <span className='ml-auto'>
                          {isClassesOpen ? (
                            <ChevronDown className='w-4 h-4' />
                          ) : (
                            <ChevronRight className='w-4 h-4' />
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              </Tooltip>

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
                        const isClassActive =
                          (activeClassId && classItem.id === activeClassId) ||
                          activePath === classPath;
                        return (
                          <li key={classItem.id}>
                            <button
                              onClick={() => {
                                navigate(classPath);
                                if (!isDesktop) setIsSidebarOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                isClassActive
                                  ? "bg-white text-primary font-semibold"
                                  : "text-white/60 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <div className='flex flex-col'>
                                <span className='text-xs font-bold'>{classItem.code}</span>
                                <span className='text-[10px] opacity-80 truncate'>{classItem.name}</span>
                              </div>
                            </button>
                          </li>
                        );
                      })
                    ) : (
                      <li className="px-3 py-2 text-white/40 text-xs italic">
                        {isLoadingClasses ? "Loading..." : "No classes"}
                      </li>
                    )}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>

            {/* Remaining menu items */}
            {menuItems.slice(1).map((item) => {
              const isActive = activePath.toLowerCase() === item.path.toLowerCase() || 
                               activePath.toLowerCase().startsWith(item.path.toLowerCase() + '/') ||
                               (item.path.toLowerCase() === "/student/essays" && activePath.toLowerCase() === "/student/feedback");
              return (
                <li key={item.label} className='w-full'>
                  <Tooltip
                    content={item.label}
                    position='right'
                    delay={200}
                    disabled={isSidebarOpen}
                    className="block w-full"
                  >
                    <button
                      onClick={() => handleItemClick(item.path)}
                      className={`group w-full flex items-center rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-white text-primary shadow-md"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <div className='flex items-center w-full flex-1'>
                        <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                          {item.icon}
                        </span>
                        {isSidebarOpen && (
                          <span className='font-medium whitespace-nowrap flex-1 pr-4 text-left text-sm'>
                            {item.label}
                          </span>
                        )}
                      </div>
                    </button>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Help at Bottom */}
        <div className='p-4 border-t border-white/10'>
          <Tooltip
            content='Help & Support'
            position='right'
            delay={200}
            disabled={isSidebarOpen}
            className="block w-full"
          >
            <button
              onClick={() => handleItemClick('/Student/Help')}
              className={`group w-full flex items-center rounded-xl transition-all duration-200 ${
                activePath.toLowerCase() === "/student/help"
                  ? "bg-white text-primary shadow-md"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <div className='flex items-center w-full flex-1'>
                <span className='flex-shrink-0 flex items-center justify-center w-12 h-12'>
                  <HelpCircle className='w-5 h-5' />
                </span>
                {isSidebarOpen && (
                  <span className='font-medium whitespace-nowrap flex-1 pr-4 text-left text-sm'>
                    Help
                  </span>
                )}
              </div>
            </button>
          </Tooltip>
        </div>

        {/* Expand/Collapse Toggle Overlay Button (Desktop/Tablet) */}
        {(isDesktop || isTablet) && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-1/2 -right-4 -translate-y-1/2 z-50 flex items-center justify-center w-8 h-8 bg-white text-primary border border-neutral-200 shadow-md hover:bg-neutral-50 hover:text-primary-600 transition-colors focus:outline-none rounded-full cursor-pointer"
            aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        )}
      </motion.aside>

    </>
  );
};

export default StudentSidebar;