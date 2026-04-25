import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  HelpCircle,
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Settings,
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

const StudentSidebar: React.FC<StudentSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isClassesOpen, setIsClassesOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const secureParams = readSecureParams(location.search);

  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let { data: student } = await supabase
          .from("users")
          .select("id, email")
          .eq("id", user.id)
          .eq("role", "student")
          .maybeSingle();
        
        if (!student && user.email) {
          const { data: emailData } = await supabase
            .from("users")
            .select("id, email")
            .eq("email", user.email)
            .eq("role", "student")
            .maybeSingle();
          student = emailData;
        }

        if (!student) {
          setIsLoadingClasses(false);
          return;
        }

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

        if (error) throw error;

        const flattenedClasses: EnrolledClass[] = [];
        enrollments?.forEach(enrollment => {
          const block = enrollment.blocks as BlockJoin | null;
          if (!block) return;

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
      {
        icon: <TrendingUp className='w-5 h-5' />,
        label: "Progress & Analytics",
        path: "/Student/Progress",
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
    if (location.pathname.startsWith('/Student/Classes/')) {
      setIsClassesOpen(true);
    } else {
      if (secureParams?.classId) setIsClassesOpen(true);
    }
  }, [location.pathname, secureParams?.classId]);

  const activeClassId = (() => {
    if (location.pathname.startsWith("/Student/Classes/")) {
      const parts = location.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || null;
    }
    return secureParams?.classId ?? null;
  })();

  const handleItemClick = (path: string) => {
    navigate(path);
    if (!isDesktop) setIsSidebarOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsDesktop(width >= 1024);
      if (width < 768 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen]);

  return (
    <>
      <AnimatePresence>
        {!isDesktop && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden'
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:relative h-full z-[70] flex flex-col bg-primary border-r border-white/5 shadow-2xl transition-transform duration-300 ease-in-out
          ${!isDesktop ? (isSidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}
        `}
        style={{
          width: isDesktop ? (isSidebarOpen ? "260px" : "72px") : "260px",
        }}
      >
        {/* Header / Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/5">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <img src={eduComposeLogo} alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-3 overflow-hidden"
            >
              <h1 className="text-white font-bold text-sm tracking-tight truncate">EduCompose</h1>
              <p className="text-white/40 text-[9px] uppercase tracking-[0.15em] font-bold truncate">Student Portal</p>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2.5 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1">
            {/* Dashboard (always first) */}
            {menuItems.slice(0, 1).map((item) => {
              const active = activePath.toLowerCase() === item.path.toLowerCase() ||
                             activePath.toLowerCase().startsWith(item.path.toLowerCase() + "/");
              return (
                <li key={item.label}>
                  <Tooltip content={item.label} position="right" disabled={isSidebarOpen} className="block w-full">
                    <button
                      onClick={() => handleItemClick(item.path)}
                      className={`w-full flex items-center h-10 rounded-xl transition-all duration-200 group relative ${
                        isSidebarOpen ? "px-0" : "justify-center"
                      } ${
                        active 
                        ? "bg-white text-primary shadow-sm" 
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className={`${isSidebarOpen ? "w-11" : "w-10"} h-10 flex items-center justify-center flex-shrink-0`}>
                        <LayoutDashboard className="w-4.5 h-4.5" />
                      </div>
                      <AnimatePresence initial={false}>
                        {isSidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            className="text-xs font-bold whitespace-nowrap overflow-hidden"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {active && !isSidebarOpen && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-white rounded-full" />
                      )}
                    </button>
                  </Tooltip>
                </li>
              );
            })}

            {/* My Classes Dropdown */}
            <li className='w-full'>
              <Tooltip content="My Classes" position='right' disabled={isSidebarOpen} className="block w-full">
                <button
                  onClick={() => {
                    if (!isSidebarOpen) {
                      setIsSidebarOpen(true);
                      setIsClassesOpen(true);
                    } else {
                      setIsClassesOpen((prev) => !prev);
                    }
                  }}
                  className={`w-full flex items-center h-10 rounded-xl transition-all duration-200 group ${
                    isSidebarOpen ? "px-0" : "justify-center"
                  } ${
                    activePath.toLowerCase().startsWith("/student/classes") && !isClassesOpen
                      ? "bg-white text-primary shadow-sm"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className={`${isSidebarOpen ? "w-11" : "w-10"} h-10 flex items-center justify-center flex-shrink-0`}>
                    <BookOpen className='w-4.5 h-4.5' />
                  </div>
                  {isSidebarOpen && (
                    <div className='flex-1 flex items-center justify-between pr-3 overflow-hidden'>
                      <span className='text-xs font-bold whitespace-nowrap overflow-hidden'>My Classes</span>
                      <span className={`transition-transform duration-200 text-white/40 ${isClassesOpen ? 'rotate-180' : ''}`}>
                         <ChevronDown className='w-3.5 h-3.5' />
                      </span>
                    </div>
                  )}
                </button>
              </Tooltip>

              <AnimatePresence>
                {isSidebarOpen && isClassesOpen && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className='ml-5 mt-1 border-l border-white/10 overflow-hidden'
                  >
                    {enrolledClasses.length > 0 ? (
                      enrolledClasses.map((cl) => {
                        const active = (activeClassId && cl.id === activeClassId);
                        return (
                          <li key={cl.id}>
                            <button
                              onClick={() => {
                                navigate(`/Student/Classes/${cl.id}`);
                                if (!isDesktop) setIsSidebarOpen(false);
                              }}
                              className={`w-full text-left pl-6 pr-3 py-1.5 transition-colors group ${
                                active ? "text-white" : "text-white/40 hover:text-white/80"
                              }`}
                            >
                              <div className='flex flex-col'>
                                <span className={`text-[11px] font-bold ${active ? 'text-white' : ''}`}>{cl.code}</span>
                                <span className='text-[9px] opacity-60 truncate'>{cl.name}</span>
                              </div>
                            </button>
                          </li>
                        );
                      })
                    ) : (
                      <li className="pl-6 py-2 text-white/20 text-[10px] italic">
                        {isLoadingClasses ? "Loading..." : "No classes"}
                      </li>
                    )}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>

            {/* Remaining menu items */}
            {menuItems.slice(1).map((item) => {
              const active = activePath.toLowerCase() === item.path.toLowerCase() || 
                             activePath.toLowerCase().startsWith(item.path.toLowerCase() + '/') ||
                             (item.path.toLowerCase() === "/student/essays" && activePath.toLowerCase() === "/student/feedback");
              return (
                <li key={item.label}>
                  <Tooltip content={item.label} position="right" disabled={isSidebarOpen} className="block w-full">
                    <button
                      onClick={() => handleItemClick(item.path)}
                      className={`w-full flex items-center h-10 rounded-xl transition-all duration-200 group relative ${
                        isSidebarOpen ? "px-0" : "justify-center"
                      } ${
                        active 
                        ? "bg-white text-primary shadow-sm" 
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className={`${isSidebarOpen ? "w-11" : "w-10"} h-10 flex items-center justify-center flex-shrink-0`}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { className: "w-4.5 h-4.5" })}
                      </div>
                      <AnimatePresence initial={false}>
                        {isSidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            className="text-xs font-bold whitespace-nowrap overflow-hidden"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {active && !isSidebarOpen && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-white rounded-full" />
                      )}
                    </button>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Help at Bottom */}
        <div className="p-3 border-t border-white/5">
          <Tooltip content="Help & Support" position="right" disabled={isSidebarOpen} className="block w-full">
            <button
              onClick={() => handleItemClick("/Student/Help")}
              className={`w-full flex items-center h-10 rounded-xl transition-all duration-200 group ${
                isSidebarOpen ? "px-0" : "justify-center"
              } ${
                activePath.toLowerCase() === "/student/help"
                ? "bg-white text-primary shadow-sm"
                : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className={`${isSidebarOpen ? "w-11" : "w-10"} h-10 flex items-center justify-center flex-shrink-0`}>
                <HelpCircle className="w-4.5 h-4.5" />
              </div>
              {isSidebarOpen && (
                <span className="text-xs font-bold whitespace-nowrap overflow-hidden">
                  Help Center
                </span>
              )}
            </button>
          </Tooltip>
        </div>

        {/* Desktop Toggle Button */}
        {isDesktop && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-white text-primary border border-neutral-100 rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[80] group"
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </aside>
    </>
  );
};

export default StudentSidebar;