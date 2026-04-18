import React from "react";
import { useLocation, Link, useSearchParams } from "react-router-dom";
import { readSecureParams, buildSecureUrl } from "../../utils/secureUrl";
import { ChevronRight, Layers, Home, FileText, ClipboardCheck, BarChart3, Settings, Bell, BookOpen, GitCompare, Users, GraduationCap, School, Archive, HelpCircle } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

// Route configurations with their parent sections
const routeConfig: Record<string, { label: string; parent?: string; icon?: React.ReactNode }> = {
  // Dashboard
  "/Teacher/Dashboard": { label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  
  // Course Management section
  "/Teacher/Courses": { label: "Course Management", icon: <Layers className="w-4 h-4" /> },
  "/Teacher/Students": { label: "Course Management", icon: <Layers className="w-4 h-4" /> },
  "/Teacher/Programs": { label: "Programs", parent: "Course Management", icon: <Layers className="w-4 h-4" /> },
  "/Teacher/Sections": { label: "Sections", parent: "Course Management", icon: <Layers className="w-4 h-4" /> },
  
  // Essay section
  "/Teacher/Activities": { label: "Activities", icon: <BookOpen className="w-4 h-4" /> },
  "/Teacher/CompareActivities": { label: "Compare Essays", icon: <GitCompare className="w-4 h-4" /> },
  "/Teacher/Essays": { label: "Submissions", icon: <FileText className="w-4 h-4" /> },
  "/Teacher/EssayManagement": { label: "Essay Management", icon: <FileText className="w-4 h-4" /> },
  "/Teacher/AnalysisResults": { label: "Analysis Results", icon: <FileText className="w-4 h-4" /> },

  // Other sections
  "/Teacher/Rubrics": { label: "Rubrics / Criteria", icon: <ClipboardCheck className="w-4 h-4" /> },
  "/Teacher/Metrics": { label: "Metrics", icon: <BarChart3 className="w-4 h-4" /> },
  "/Teacher/Settings": { label: "Settings", icon: <Settings className="w-4 h-4" /> },
  "/Teacher/Notifications": { label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  
  // Student Dashboard
  "/Student/Dashboard": { label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  "/Student/Classes": { label: "My Classes", icon: <BookOpen className="w-4 h-4" /> },
  "/Student/Essays": { label: "My Essays", icon: <FileText className="w-4 h-4" /> },
  "/Student/Progress": { label: "Progress & Analytics", icon: <BarChart3 className="w-4 h-4" /> },
  "/Student/Rubric": { label: "Rubric / Criteria", icon: <ClipboardCheck className="w-4 h-4" /> },
  "/Student/Settings": { label: "Settings", icon: <Settings className="w-4 h-4" /> },
  "/Student/Notifications": { label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  "/Student/Submit": { label: "Submit Essay", icon: <FileText className="w-4 h-4" /> },
  "/Student/Feedback": { label: "AI Feedback", icon: <ClipboardCheck className="w-4 h-4" /> },
  "/Student/Essays/Result": { label: "Essay Transcript", parent: "My Essays", icon: <FileText className="w-4 h-4" /> },
  
  // Admin section
  "/Admin/Dashboard": { label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  "/Admin/Users": { label: "User Management", icon: <Users className="w-4 h-4" /> },
  "/Admin/Students": { label: "Students", icon: <GraduationCap className="w-4 h-4" /> },
  "/Admin/Rubrics": { label: "System Rubrics", icon: <ClipboardCheck className="w-4 h-4" /> },
  "/Admin/Content": { label: "Content Management", icon: <Layers className="w-4 h-4" /> },
  "/Admin/Schools": { label: "Schools & Departments", icon: <School className="w-4 h-4" /> },
  "/Admin/Settings": { label: "System Settings", icon: <Settings className="w-4 h-4" /> },
  "/Admin/Archive": { label: "Archive", icon: <Archive className="w-4 h-4" /> },
  "/Teacher/Archive": { label: "Academic Archive", icon: <Archive className="w-4 h-4" /> },
  "/Student/Help": { label: "Support Center", icon: <HelpCircle className="w-4 h-4" /> },
  "/Teacher/Help": { label: "Support Center", icon: <HelpCircle className="w-4 h-4" /> },
  "/Admin/Help": { label: "Support Center", icon: <HelpCircle className="w-4 h-4" /> },
  
  // Legacy routes
  "/Dashboard": { label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  "/EssayManagement": { label: "Essay Management", icon: <FileText className="w-4 h-4" /> },
  "/ClassManagement": { label: "Class Management", icon: <Layers className="w-4 h-4" /> },
  "/AssignmentManagement": { label: "Assignment Management" },
  "/Gradebook": { label: "Gradebook" },
  "/Students": { label: "Students" },
  "/Settings": { label: "Settings", icon: <Settings className="w-4 h-4" /> },
  "/SectionsList": { label: "Sections List" },
};

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const pathname = location.pathname;

  // Global secure params handling
  const secureParams = readSecureParams(location.search);
  
  // Helper to get parameters safely from either raw URL or secure 'ref' token
  const getParam = (name: string) => secureParams?.[name] || searchParams.get(name);

  // Don't show breadcrumb on landing page
  if (pathname === "/") {
    return null;
  }

  const items: BreadcrumbItem[] = [];
  const config = routeConfig[pathname];

  // Build breadcrumb based on route and context
  if (pathname.startsWith("/Teacher/")) {
    if (config) {
      if (pathname === "/Teacher/Courses" || pathname === "/Teacher/Students") {
        const courseId = getParam("courseId");
        const courseCode = getParam("courseCode");
        const programLoadId = getParam("programLoad");
        const programAbbr = getParam("programAbbr");
        const blockId = getParam("block");
        const blockName = getParam("blockName");

        items.push({
          label: "Course Management",
          path: "/Teacher/Courses",
          icon: <Layers className="w-4 h-4" />,
        });

        if (courseId && courseCode) {
          items.push({
            label: courseCode,
            path: buildSecureUrl("/Teacher/Courses", { courseId, courseCode }),
          });

          if (programLoadId && programAbbr) {
            if (blockId && blockName) {
              items.push({
                label: programAbbr,
                path: buildSecureUrl("/Teacher/Courses", { 
                  courseId, 
                  courseCode, 
                  programLoad: programLoadId, 
                  programAbbr 
                }),
              });
              
              items.push({
                label: blockName,
                path: buildSecureUrl(pathname, { 
                  courseId, 
                  courseCode, 
                  programLoad: programLoadId, 
                  programAbbr, 
                  block: blockId, 
                  blockName 
                }),
              });
            } else {
              items.push({
                label: programAbbr,
                path: buildSecureUrl("/Teacher/Courses", { 
                  courseId, 
                  courseCode, 
                  programLoad: programLoadId, 
                  programAbbr 
                }),
              });
            }
          }
        }
      } else if (pathname === "/Teacher/Activities") {
        const activityId = getParam("activityId");
        const activityTitle = getParam("activityTitle");
        const programSection = getParam("programSection") || getParam("courseSection");
        const programName = getParam("programName") || getParam("courseName");
        
        items.push({
          label: "Activities",
          path: "/Teacher/Activities",
          icon: config.icon,
        });
        
        if (activityId && activityTitle) {
          items.push({
            label: activityTitle,
            path: buildSecureUrl("/Teacher/Activities", { activityId, activityTitle }),
          });
          
          if (programSection && programName) {
            items.push({
              label: `${programName} - ${programSection}`,
              path: buildSecureUrl("/Teacher/Activities", { 
                activityId, 
                activityTitle, 
                programSection, 
                programName 
              }),
            });
          }
        }
      } else if (pathname === "/Teacher/AnalysisResults") {
        const activityId = getParam("activityId") || getParam("a");
        const activityTitle = getParam("activityTitle");
        const programSection = getParam("programSection") || getParam("courseSection");
        const programName = getParam("programName") || getParam("courseName");
        const studentName = getParam("studentName");

        items.push({
          label: "Activities",
          path: "/Teacher/Activities",
          icon: <BookOpen className="w-4 h-4" />,
        });

        if (activityId && activityTitle) {
          items.push({
            label: activityTitle,
            path: buildSecureUrl("/Teacher/Activities", { activityId, activityTitle }),
          });
          if (programSection && programName) {
            items.push({
              label: `${programName} - ${programSection}`,
              path: buildSecureUrl("/Teacher/Activities", {
                activityId,
                activityTitle,
                programSection,
                programName,
              }),
            });
          }
        }

        items.push({
          label: studentName ? `${studentName} Results` : "Analysis Results",
          path: `${pathname}${location.search}`,
          icon: <FileText className="w-4 h-4" />,
        });
      } else if (pathname === "/Teacher/Archive") {
        const courseId = getParam("courseId");
        const courseCode = getParam("courseCode");
        
        items.push({
          label: "Archive",
          path: "/Teacher/Archive",
          icon: <Archive className="w-4 h-4" />,
        });
        
        if (courseId && courseCode) {
          items.push({
            label: courseCode,
            path: buildSecureUrl("/Teacher/Archive", { courseId, courseCode }),
          });
        }
      } else {
        if (config.parent) {
          items.push({
            label: config.parent,
            path: "/Teacher/Courses",
            icon: <Layers className="w-4 h-4" />,
          });
        }
        items.push({
          label: config.label,
          path: pathname,
          icon: config.icon,
        });
      }
    } else {
      items.push({
        label: "Dashboard",
        path: "/Teacher/Dashboard",
        icon: <Home className="w-4 h-4" />,
      });
    }
  } else if (pathname.startsWith("/Student/")) {
    const isSubmit = pathname === "/Student/Submit";
    const isClassDetail = pathname.startsWith("/Student/Classes/");

    if (pathname === "/Student/Classes" || isClassDetail) {
      items.push({
        label: "My Classes",
        path: "/Student/Classes",
        icon: <BookOpen className="w-4 h-4" />,
      });

      if (isClassDetail) {
        const classId = pathname.split("/").pop();
        const courseName = getParam("courseName") || getParam("courseCode") || "Class Detail";
        const courseCode = getParam("courseCode");
        
        if (classId) {
          items.push({
            label: courseName,
            path: buildSecureUrl(`/Student/Classes/${classId}`, { 
              courseName,
              courseCode
            }),
          });
        }
      }
    } else if (isSubmit) {
      const classId = getParam("classId");
      const courseName = getParam("courseName") || getParam("courseCode");
      const courseCode = getParam("courseCode");
      const activityTitle = getParam("activityTitle") || "Submit Essay";

      items.push({
        label: "My Classes",
        path: "/Student/Classes",
        icon: <BookOpen className="w-4 h-4" />,
      });

      if (courseName) {
        items.push({
          label: courseName,
          path: classId 
            ? buildSecureUrl(`/Student/Classes/${classId}`, { courseName, courseCode })
            : buildSecureUrl("/Student/Classes", { courseName, courseCode }),
        });
      }
      
      items.push({
        label: activityTitle,
        path: location.search ? `${pathname}${location.search}` : pathname,
        icon: config?.icon,
      });
    } else if (pathname === "/Student/Feedback") {
      const classId = getParam("classId");
      const courseName = getParam("courseName") || getParam("courseCode");
      const courseCode = getParam("courseCode");
      const activityTitle = getParam("activityTitle");
      const activityId = getParam("activityId");
      const fromEssays = getParam("fromEssays") === "true";

      if (fromEssays) {
        items.push({
          label: "My Essays",
          path: "/Student/Essays",
          icon: <FileText className="w-4 h-4" />,
        });
      } else if (courseName) {
        items.push({
          label: "My Classes",
          path: "/Student/Classes",
          icon: <BookOpen className="w-4 h-4" />,
        });
        
        items.push({
          label: courseName,
          path: classId 
            ? buildSecureUrl(`/Student/Classes/${classId}`, { courseName, courseCode })
            : buildSecureUrl("/Student/Classes", { courseName, courseCode }),
        });
      }
      
      if (activityTitle) {
        items.push({
          label: activityTitle,
          path: buildSecureUrl("/Student/Submit", { 
            activityId, 
            classId, 
            courseName: courseName || "", 
            activityTitle 
          }),
        });
      }

      items.push({
        label: "AI Feedback",
        path: location.search ? `${pathname}${location.search}` : pathname,
        icon: config?.icon,
      });
    } else if (pathname === "/Student/Essays/Result") {
      const activityTitle = getParam("activityTitle") || "Essay";
      items.push({
        label: "My Essays",
        path: "/Student/Essays",
        icon: <FileText className="w-4 h-4" />,
      });
      items.push({
        label: `${activityTitle} Result`,
        path: location.search ? `${pathname}${location.search}` : pathname,
        icon: config?.icon,
      });
    } else if (config) {
      items.push({
        label: config.label,
        path: pathname,
        icon: config.icon,
      });
    } else {
      items.push({
        label: "Dashboard",
        path: "/Student/Dashboard",
        icon: <Home className="w-4 h-4" />,
      });
    }
  } else if (pathname.startsWith("/Admin/")) {
    if (config) {
      items.push({
        label: config.label,
        path: pathname,
        icon: config.icon,
      });

      // Special case for Activity Logs in User Management
      if (pathname === "/Admin/Users" && getParam("logs")) {
        items.push({
          label: "Activity Logs",
          path: `${pathname}?logs=${getParam("logs")}`,
        });
      }

      // Sub-views for Content Management
      if (pathname === "/Admin/Content") {
        const view = getParam("view");
        if (view) {
          const labels: Record<string, string> = {
            programs: "Programs",
            activities: "Activities",
            rubrics: "Rubrics",
          };
          items.push({
            label: labels[view] || view.charAt(0).toUpperCase() + view.slice(1),
            path: `${pathname}?view=${view}`,
          });
        }
      }

      // Sub-views for Schools & Courses
      if (pathname === "/Admin/Schools") {
        const view = getParam("view");
        if (view) {
          const labels: Record<string, string> = {
            schools: "Institutional Hierarchy",
            courses: "Global Course Registry",
          };
          items.push({
            label: labels[view] || view.charAt(0).toUpperCase() + view.slice(1),
            path: `${pathname}?view=${view}`,
          });
        }
      }
    } else {
      items.push({
        label: "Dashboard",
        path: "/Admin/Dashboard",
        icon: <Home className="w-4 h-4" />,
      });
    }
  } else if (pathname === "/ClassManagement" && getParam("programId")) {
    const programId = getParam("programId");
    const programName = getParam("programName") || "Program";
    const blockId = getParam("blockId");
    const blockName = getParam("blockName");
    const view = getParam("view");
    const activityTitle = getParam("activityTitle") || "Essay Activity";
    const basePath = buildSecureUrl(pathname, { programId, programName });

    items.push({
      label: "Class Management",
      path: "/ClassManagement",
      icon: <Layers className="w-4 h-4" />,
    });

    items.push({
      label: programName,
      path: basePath,
    });

    const blockViewPath = buildSecureUrl(pathname, { programId, programName, view: 'blocks' });
    const blockPath = buildSecureUrl(pathname, { 
      programId, 
      programName, 
      ...(blockId && blockName ? { blockId, blockName } : {}) 
    });
    const blockLabel = blockName ?? "Block";
    const blockBreadcrumbPath = blockId && blockName ? blockPath : blockViewPath;

    if (view === "activities") {
      items.push({ label: blockLabel, path: blockBreadcrumbPath });
      items.push({ label: activityTitle, path: buildSecureUrl(pathname, { 
        programId, 
        programName, 
        blockId, 
        blockName, 
        view: 'activities' 
      })});
    } else if (view === "students") {
      items.push({ label: blockLabel, path: blockBreadcrumbPath });
      items.push({ label: activityTitle, path: buildSecureUrl(pathname, { 
        programId, 
        programName, 
        blockId, 
        blockName, 
        view: 'activities' 
      })});
      items.push({ label: "Students", path: buildSecureUrl(pathname, { 
        programId, 
        programName, 
        blockId, 
        blockName, 
        view: 'students' 
      })});
    } else if (blockId && blockName) {
      items.push({ label: blockName, path: blockPath });
    }
  } else {
    items.push({
      label: config?.label || "Dashboard",
      path: pathname,
      icon: config?.icon || <Home className="w-4 h-4" />,
    });
  }

  return (
    <nav
      className='flex items-center px-4 sm:px-6 py-1.5 bg-white border-b border-neutral-50 overflow-x-auto whitespace-nowrap scrollbar-hide'
      aria-label='Breadcrumb'
    >
      <ol className='flex items-center gap-0.5'>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li key={`${item.path}-${index}`} className='flex items-center'>
              {index > 0 && (
                <ChevronRight className='w-3 h-3 text-neutral-200 mx-1 flex-shrink-0' />
              )}
              {isLast ? (
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isFirst ? "bg-primary/5 text-primary" : "text-neutral-700"}`}>
                  {item.icon && <span className={`${isFirst ? "text-primary" : "text-neutral-400"} flex-shrink-0 [&>svg]:w-3 [&>svg]:h-3`}>{item.icon}</span>}
                  <span className="truncate max-w-[120px] sm:max-w-none">{item.label}</span>
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-colors group ${
                    isFirst ? "text-primary bg-primary/5 hover:bg-primary/10" : "text-neutral-400 hover:text-primary"
                  }`}
                >
                  {item.icon && <span className={`${isFirst ? "text-primary" : "text-neutral-300 group-hover:text-primary"} transition-colors flex-shrink-0 [&>svg]:w-3 [&>svg]:h-3`}>{item.icon}</span>}
                  <span className="truncate max-w-[80px] sm:max-w-none">{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
