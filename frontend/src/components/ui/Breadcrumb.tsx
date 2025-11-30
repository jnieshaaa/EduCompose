import React from "react";
import { useLocation, Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  path: string;
}

const routeMap: Record<string, string> = {
  "/Dashboard": "Dashboard",
  "/EssayManagement": "Essay Management",
  "/ClassManagement": "Class Management",
  "/AssignmentManagement": "Assignment Management",
  "/Gradebook": "Gradebook",
  "/Students": "Students",
  "/Settings": "Settings",
  "/SectionsList": "Sections List",
};

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const pathname = location.pathname;

  // Don't show breadcrumb on landing page
  if (pathname === "/") {
    return null;
  }

  const items: BreadcrumbItem[] = [
    {
      label: "Home",
      path: "/Dashboard",
    },
  ];

  // Add current page if it's not the home page
  if (pathname !== "/Dashboard" && routeMap[pathname]) {
    items.push({
      label: routeMap[pathname],
      path: pathname,
    });
  } else if (pathname === "/Dashboard") {
    // On Dashboard, show just "Home"
    items[0].label = "Dashboard";
  }

  // Check if we're viewing Block inside ClassManagement
  if (pathname === "/ClassManagement" && searchParams.get("programId")) {
    const programId = searchParams.get("programId");
    const programName = searchParams.get("programName") || "Program";
    const blockId = searchParams.get("blockId");
    const blockName = searchParams.get("blockName");

    // Add program breadcrumb
    items.push({
      label: programName,
      path: `${pathname}?programId=${programId}&programName=${programName}`,
    });

    // Add block breadcrumb if a specific block is selected
    if (blockId && blockName) {
      items.push({
        label: blockName,
        path: `${pathname}?programId=${programId}&programName=${programName}&blockId=${blockId}&blockName=${blockName}`,
      });
    }
  }

  return (
    <nav
      className="flex items-center space-x-2 px-4 py-3 bg-white border-b border-neutral-200 text-sm"
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.path} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-neutral-400 mx-2" />
              )}
              {isLast ? (
                <span className="text-neutral-900 font-medium flex items-center">
                  {index === 0 && <Home className="w-4 h-4 mr-1.5" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="text-neutral-600 hover:text-primary transition-colors flex items-center"
                >
                  {index === 0 && <Home className="w-4 h-4 mr-1.5" />}
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
