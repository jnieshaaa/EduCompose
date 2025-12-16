import React from "react";
import { useLocation, Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Layers, Home, FileText, ClipboardCheck, BarChart3, Settings, Bell, BookOpen } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

// Route configurations with their parent sections
const routeConfig: Record<string, { label: string; parent?: string; icon?: React.ReactNode }> = {
  // Dashboard
  "/Teacher/Dashboard": { label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  
  // Class Management section
  "/Teacher/Programs": { label: "Programs", parent: "Class Management", icon: <Layers className="w-4 h-4" /> },
  "/Teacher/Sections": { label: "Sections", parent: "Class Management", icon: <Layers className="w-4 h-4" /> },
  "/Teacher/Students": { label: "Students", parent: "Class Management", icon: <Layers className="w-4 h-4" /> },
  
  // Essay section
  "/Teacher/Activities": { label: "Activities", icon: <BookOpen className="w-4 h-4" /> },
  "/Teacher/Essays": { label: "Submissions", icon: <FileText className="w-4 h-4" /> },
  "/Teacher/EssayManagement": { label: "Essay Management", icon: <FileText className="w-4 h-4" /> },
  
  // Other sections
  "/Teacher/Rubrics": { label: "Rubrics / Criteria", icon: <ClipboardCheck className="w-4 h-4" /> },
  "/Teacher/Metrics": { label: "Metrics", icon: <BarChart3 className="w-4 h-4" /> },
  "/Teacher/Settings": { label: "Settings", icon: <Settings className="w-4 h-4" /> },
  "/Teacher/Notifications": { label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  
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

  // Get URL params for drill-down context
  const programFilter = searchParams.get("program");
  const sectionFilter = searchParams.get("section");

  // Build breadcrumb based on route and context
  if (config) {
    // Add parent section if exists (e.g., "Class Management" for Programs/Sections/Students)
    if (config.parent) {
      items.push({
        label: config.parent,
        path: "/Teacher/Programs", // Class Management defaults to Programs
        icon: <Layers className="w-4 h-4" />,
      });
    }

    // Handle drill-down paths for Class Management
    if (config.parent === "Class Management") {
      if (pathname === "/Teacher/Programs") {
        // On Programs page - just show "Class Management > Programs"
        items.push({
          label: "Programs",
          path: "/Teacher/Programs",
        });
      } else if (pathname === "/Teacher/Sections") {
        // On Sections page
        items.push({
          label: "Programs",
          path: "/Teacher/Programs",
        });
        
        if (programFilter) {
          // Drill-down from a specific program
          items.push({
            label: programFilter,
            path: `/Teacher/Sections?program=${encodeURIComponent(programFilter)}`,
          });
        } else {
          items.push({
            label: "Sections",
            path: "/Teacher/Sections",
          });
        }
      } else if (pathname === "/Teacher/Students") {
        // On Students page
        items.push({
          label: "Programs",
          path: "/Teacher/Programs",
        });
        
        if (programFilter) {
          items.push({
            label: programFilter,
            path: `/Teacher/Sections?program=${encodeURIComponent(programFilter)}`,
          });
        }
        
        if (sectionFilter) {
          items.push({
            label: sectionFilter,
            path: `/Teacher/Students?program=${encodeURIComponent(programFilter || "")}&section=${encodeURIComponent(sectionFilter)}`,
          });
        } else if (!programFilter) {
          items.push({
            label: "Students",
            path: "/Teacher/Students",
          });
        }
      }
    } else {
      // Non-Class Management routes - just show the current page
      items.push({
        label: config.label,
        path: pathname,
        icon: config.icon,
      });
    }
  } else {
    // Fallback for unknown routes
    items.push({
      label: "Dashboard",
      path: "/Teacher/Dashboard",
      icon: <Home className="w-4 h-4" />,
    });
  }

  // Handle legacy ClassManagement route with query params
  if (pathname === "/ClassManagement" && searchParams.get("programId")) {
    const programId = searchParams.get("programId");
    const programName = searchParams.get("programName") || "Program";
    const blockId = searchParams.get("blockId");
    const blockName = searchParams.get("blockName");
    const view = searchParams.get("view");
    const activityTitle = searchParams.get("activityTitle") || "Essay Activity";
    const basePath = `${pathname}?programId=${programId}&programName=${programName}`;

    // Clear and rebuild for legacy route
    items.length = 0;
    items.push({
      label: "Class Management",
      path: "/ClassManagement",
      icon: <Layers className="w-4 h-4" />,
    });

    // Add program breadcrumb
    items.push({
      label: programName,
      path: basePath,
    });

    const blockViewPath = `${basePath}&view=blocks`;
    const blockPath = `${basePath}${
      blockId && blockName ? `&blockId=${blockId}&blockName=${blockName}` : ""
    }`;
    const blockLabel = blockName ?? "Block";
    const blockBreadcrumbPath =
      blockId && blockName ? blockPath : blockViewPath;

    if (view === "activities") {
      items.push({
        label: blockLabel,
        path: blockBreadcrumbPath,
      });
      items.push({
        label: activityTitle,
        path: `${blockPath}&view=activities`,
      });
    } else if (view === "students") {
      items.push({
        label: blockLabel,
        path: blockBreadcrumbPath,
      });
      items.push({
        label: activityTitle,
        path: `${blockPath}&view=activities`,
      });
      items.push({
        label: "Students",
        path: `${blockPath}&view=students`,
      });
    } else if (blockId && blockName) {
      items.push({
        label: blockName,
        path: blockPath,
      });
    }
  }

  return (
    <nav
      className='flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 bg-white border-b border-neutral-200 text-xs sm:text-sm overflow-x-auto'
      aria-label='Breadcrumb'
    >
      <ol className='flex items-center space-x-1 sm:space-x-2 min-w-max'>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li key={`${item.path}-${index}`} className='flex items-center'>
              {index > 0 && (
                <ChevronRight className='w-4 h-4 text-neutral-400 mx-1 sm:mx-2' />
              )}
              {isLast ? (
                <span className='text-neutral-900 font-medium flex items-center'>
                  {isFirst && item.icon && <span className="mr-1.5">{item.icon}</span>}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className='text-neutral-600 hover:text-primary transition-colors flex items-center'
                >
                  {isFirst && item.icon && <span className="mr-1.5">{item.icon}</span>}
                  {item.label}
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
