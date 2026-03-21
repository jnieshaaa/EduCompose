  import React from "react";
import { useLocation, Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Layers, Home, FileText, ClipboardCheck, BarChart3, Settings, Bell, BookOpen, GitCompare } from "lucide-react";

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
        const courseId = searchParams.get("courseId");
        const courseCode = searchParams.get("courseCode");
        const programLoadId = searchParams.get("programLoad");
        const programAbbr = searchParams.get("programAbbr");
        const blockId = searchParams.get("block");
        const blockName = searchParams.get("blockName");

        items.push({
          label: "Course Management",
          path: "/Teacher/Courses",
          icon: <Layers className="w-4 h-4" />,
        });

        if (courseId && courseCode) {
          items.push({
            label: courseCode,
            path: `/Teacher/Courses?courseId=${courseId}&courseCode=${encodeURIComponent(courseCode)}`,
          });

          if (programLoadId && programAbbr) {
            if (blockId && blockName) {
              items.push({
                label: programAbbr,
                path: `/Teacher/Courses?courseId=${courseId}&courseCode=${encodeURIComponent(courseCode)}&programLoad=${programLoadId}&programAbbr=${encodeURIComponent(programAbbr)}`,
              });
              
              items.push({
                label: blockName,
                path: pathname === "/Teacher/Students" 
                  ? `/Teacher/Students?courseId=${courseId}&courseCode=${encodeURIComponent(courseCode)}&programLoad=${programLoadId}&programAbbr=${encodeURIComponent(programAbbr)}&block=${blockId}&blockName=${encodeURIComponent(blockName)}`
                  : `/Teacher/Courses?courseId=${courseId}&courseCode=${encodeURIComponent(courseCode)}&programLoad=${programLoadId}&programAbbr=${encodeURIComponent(programAbbr)}&block=${blockId}&blockName=${encodeURIComponent(blockName)}`,
              });
            } else {
              items.push({
                label: programAbbr,
                path: `/Teacher/Courses?courseId=${courseId}&courseCode=${encodeURIComponent(courseCode)}&programLoad=${programLoadId}&programAbbr=${encodeURIComponent(programAbbr)}`,
              });
            }
          }
        }
      } else if (pathname === "/Teacher/Activities") {
        const activityId = searchParams.get("activityId");
        const activityTitle = searchParams.get("activityTitle");
        const programSection = searchParams.get("programSection") || searchParams.get("courseSection");
        const programName = searchParams.get("programName") || searchParams.get("courseName");
        
        items.push({
          label: "Activities",
          path: "/Teacher/Activities",
          icon: config.icon,
        });
        
        if (activityId && activityTitle) {
          items.push({
            label: activityTitle,
            path: `/Teacher/Activities?activityId=${encodeURIComponent(activityId)}&activityTitle=${encodeURIComponent(activityTitle)}`,
          });
          
          if (programSection && programName) {
            items.push({
              label: `${programName} - ${programSection}`,
              path: `/Teacher/Activities?activityId=${encodeURIComponent(activityId)}&activityTitle=${encodeURIComponent(activityTitle)}&programSection=${encodeURIComponent(programSection)}&programName=${encodeURIComponent(programName)}`,
            });
          }
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
        const courseName = searchParams.get("courseName") || searchParams.get("courseCode") || "Class Detail";
        
        if (classId) {
          items.push({
            label: courseName,
            path: `/Student/Classes/${classId}${searchParams.get("courseName") ? `?courseName=${encodeURIComponent(courseName)}` : ""}`,
          });
        }
      }
    } else if (isSubmit) {
      const classId = searchParams.get("classId");
      const courseName = searchParams.get("courseName") || searchParams.get("courseCode");
      const activityTitle = searchParams.get("activityTitle") || "Submit Essay";

      items.push({
        label: "My Classes",
        path: "/Student/Classes",
        icon: <BookOpen className="w-4 h-4" />,
      });

      if (courseName) {
        items.push({
          label: courseName,
          path: classId 
            ? `/Student/Classes/${classId}?courseName=${encodeURIComponent(courseName)}`
            : `/Student/Classes?courseName=${encodeURIComponent(courseName)}`,
        });
      }
      
      items.push({
        label: activityTitle,
        path: location.search ? `${pathname}${location.search}` : pathname,
        icon: config?.icon,
      });
    } else if (pathname === "/Student/Feedback") {
      const classId = searchParams.get("classId");
      const courseName = searchParams.get("courseName") || searchParams.get("courseCode");
      const activityTitle = searchParams.get("activityTitle");

      if (courseName) {
        items.push({
          label: "My Classes",
          path: "/Student/Classes",
          icon: <BookOpen className="w-4 h-4" />,
        });
        
        items.push({
          label: courseName,
          path: classId 
           ? `/Student/Classes/${classId}?courseName=${encodeURIComponent(courseName)}`
           : `/Student/Classes?courseName=${encodeURIComponent(courseName)}`,
        });
      }
      
      if (activityTitle) {
        items.push({
          label: activityTitle,
          path: `/Student/Submit?activityId=${searchParams.get("activityId")}&classId=${classId}&courseName=${encodeURIComponent(courseName || "")}&activityTitle=${encodeURIComponent(activityTitle)}`,
        });
      }

      items.push({
        label: "AI Feedback",
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
  } else if (pathname === "/ClassManagement" && searchParams.get("programId")) {
    const programId = searchParams.get("programId");
    const programName = searchParams.get("programName") || "Program";
    const blockId = searchParams.get("blockId");
    const blockName = searchParams.get("blockName");
    const view = searchParams.get("view");
    const activityTitle = searchParams.get("activityTitle") || "Essay Activity";
    const basePath = `${pathname}?programId=${programId}&programName=${programName}`;

    items.push({
      label: "Class Management",
      path: "/ClassManagement",
      icon: <Layers className="w-4 h-4" />,
    });

    items.push({
      label: programName,
      path: basePath,
    });

    const blockViewPath = `${basePath}&view=blocks`;
    const blockPath = `${basePath}${blockId && blockName ? `&blockId=${blockId}&blockName=${blockName}` : ""}`;
    const blockLabel = blockName ?? "Block";
    const blockBreadcrumbPath = blockId && blockName ? blockPath : blockViewPath;

    if (view === "activities") {
      items.push({ label: blockLabel, path: blockBreadcrumbPath });
      items.push({ label: activityTitle, path: `${blockPath}&view=activities` });
    } else if (view === "students") {
      items.push({ label: blockLabel, path: blockBreadcrumbPath });
      items.push({ label: activityTitle, path: `${blockPath}&view=activities` });
      items.push({ label: "Students", path: `${blockPath}&view=students` });
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
      className='flex items-center px-4 md:px-6 py-3 bg-white border-b border-neutral-200 text-sm overflow-x-auto custom-scrollbar'
      aria-label='Breadcrumb'
    >
      <ol className='flex items-center space-x-2 min-w-max'>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li key={`${item.path}-${index}`} className='flex items-center'>
              {index > 0 && (
                <ChevronRight className='w-4 h-4 text-neutral-300 mx-2' />
              )}
              {isLast ? (
                <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${isFirst ? "bg-primary/10 text-primary" : "text-neutral-900 font-bold"}`}>
                  {item.icon && <span className={isFirst ? "text-primary" : "text-neutral-500"}>{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all hover:bg-neutral-50 group ${
                    isFirst ? "text-primary font-bold bg-primary/5 hover:bg-primary/10" : "text-neutral-500 hover:text-primary"
                  }`}
                >
                  {item.icon && <span className={`${isFirst ? "text-primary" : "text-neutral-400 group-hover:text-primary"} transition-colors`}>{item.icon}</span>}
                  <span>{item.label}</span>
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
