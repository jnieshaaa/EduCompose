import React, { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Mail,
  Phone,
  UserRound,
  GraduationCap,
} from "lucide-react";
import ProgressBar from "../components/ui/ProgressBar";

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  section: string;
  average: number; // 0-100
  completedAssignments: number;
  totalAssignments: number;
}

const mockStudents: Student[] = [
  {
    id: "s-001",
    name: "Ava Thompson",
    email: "ava.thompson@example.com",
    phone: "+1 (555) 214-9921",
    section: "English 10-A",
    average: 92,
    completedAssignments: 14,
    totalAssignments: 16,
  },
  {
    id: "s-002",
    name: "Liam Carter",
    email: "liam.carter@example.com",
    phone: "+1 (555) 786-2301",
    section: "English 10-B",
    average: 84,
    completedAssignments: 13,
    totalAssignments: 16,
  },
  {
    id: "s-003",
    name: "Mia Rodriguez",
    email: "mia.rod@example.com",
    phone: "+1 (555) 990-1133",
    section: "English 10-A",
    average: 88,
    completedAssignments: 16,
    totalAssignments: 16,
  },
  {
    id: "s-004",
    name: "Noah Patel",
    email: "noah.patel@example.com",
    phone: "+1 (555) 413-7788",
    section: "English 10-C",
    average: 76,
    completedAssignments: 11,
    totalAssignments: 16,
  },
];

const Students: React.FC = () => {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("All");

  const sections = useMemo(
    () => ["All", ...Array.from(new Set(mockStudents.map((s) => s.section)))],
    []
  );

  const filtered = useMemo(() => {
    return mockStudents.filter((s) => {
      const matchesQuery = `${s.name} ${s.email} ${s.phone}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      const matchesSection = section === "All" || s.section === section;
      return matchesQuery && matchesSection;
    });
  }, [query, section]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserRound className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-neutral-900">Students</h1>
        </div>

        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone"
              className="pl-9 pr-3 py-2 rounded-lg border border-neutral-300 bg-white min-w-[260px] focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 rounded-lg border border-neutral-300 bg-white min-w-[200px] focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {sections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
              ▾
            </span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
          <div className="text-sm text-neutral-500">Total Students</div>
          <div className="text-2xl font-bold text-neutral-900">
            {mockStudents.length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
          <div className="text-sm text-neutral-500">Average Grade</div>
          <div className="text-2xl font-bold text-neutral-900">
            {Math.round(
              mockStudents.reduce((a, s) => a + s.average, 0) /
                mockStudents.length
            )}
            %
          </div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
          <div className="text-sm text-neutral-500">Completion Rate</div>
          <div className="text-2xl font-bold text-neutral-900">
            {Math.round(
              (mockStudents.reduce((a, s) => a + s.completedAssignments, 0) /
                mockStudents.reduce((a, s) => a + s.totalAssignments, 0)) *
                100
            )}
            %
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-neutral-500 border-b">
          <div className="col-span-4">Student</div>
          <div className="col-span-3">Section</div>
          <div className="col-span-3">Progress</div>
          <div className="col-span-2 text-right">Average</div>
        </div>

        {filtered.map((s) => {
          const percent = (s.completedAssignments / s.totalAssignments) * 100;
          return (
            <div
              key={s.id}
              className="grid grid-cols-12 gap-2 items-center px-4 py-4 border-b last:border-b-0 hover:bg-neutral-100/50"
            >
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">
                  {s.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-neutral-900 truncate">
                    {s.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {s.email}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {s.phone}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-span-3 flex items-center gap-2 text-neutral-700">
                <GraduationCap className="w-4 h-4 text-primary" /> {s.section}
              </div>
              <div className="col-span-3">
                <ProgressBar
                  value={percent}
                  label={`${s.completedAssignments}/${s.totalAssignments} Assignments`}
                  showPercentage={false}
                />
              </div>
              <div className="col-span-2 text-right font-semibold text-neutral-900">
                {s.average}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Students;
