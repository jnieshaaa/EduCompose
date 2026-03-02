import React, { useState } from "react";
import { AdminSchoolsTab } from "./AdminSchoolsTab";
import { AdminCoursesTab } from "./AdminCoursesTab";

const SchoolManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"schools" | "courses">("schools");

  return (
    <div className="space-y-6">
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("schools")}
          className={`px-6 py-3 font-semibold transition-all border-b-2 text-sm uppercase tracking-wider ${
            activeTab === "schools"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          Institutional Hierarchy
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={`px-6 py-3 font-semibold transition-all border-b-2 text-sm uppercase tracking-wider ${
            activeTab === "courses"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          Global Course Registry
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "schools" ? (
          <AdminSchoolsTab />
        ) : (
          <AdminCoursesTab />
        )}
      </div>
    </div>
  );
};

export default SchoolManagement;
