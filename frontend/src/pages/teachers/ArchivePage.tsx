import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCourses } from "../../hooks/useCourses";
import { useSections } from "../../hooks/useSections";
import { useActivities } from "../../hooks/useActivities";
import { useStudents } from "../../hooks/useStudents";
import { Archive, BookOpen, Layers, GitCompare, ChevronRight, Users, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { ActivitiesListView } from "../../components/activities/ActivitiesListView";

export function ArchivePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCourseId = searchParams.get("courseId");
  
  const setSelectedCourseId = (id: string | null) => {
    if (id) {
      searchParams.set("courseId", id);
      const course = archivedCourses.find(c => c.id === id);
      if (course) searchParams.set("courseCode", course.course_code);
    } else {
      searchParams.delete("courseId");
      searchParams.delete("courseCode");
    }
    setSearchParams(searchParams);
  };

  const [activeDetailTab, setActiveDetailTab] = useState<"activities" | "blocks" | "students">("activities");
  const [ayFilter, setAyFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  
  const { 
    myCourses: archivedCourses, 
    isLoading: loadingCourses 
  } = useCourses(true, ayFilter, termFilter);
  
  const { 
    sections: archivedSections
  } = useSections(true, ayFilter, termFilter);
  
  const { 
    activities: archivedActivities,
    rubrics,
    courses, // These are metadata courses
    sections: metaSections,
    handleActivityClick
  } = useActivities(true, ayFilter, termFilter);

  const {
    students: archivedStudents
  } = useStudents(undefined, ayFilter, termFilter, true);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const selectedCourse = archivedCourses.find(c => c.id === selectedCourseId);

  // Filter detail items based on selected course
  const courseSections = archivedSections.filter(s => s.course_id === selectedCourseId);
  const courseActivities = archivedActivities.filter(a => a.courseIds?.includes(selectedCourseId || ""));
  
  // For students, we look at the blocks assigned to this course
  const courseBlockIds = new Set(courseSections.map(s => s.id));
  const courseStudents = archivedStudents.filter(student => 
    student.block_students?.some((bs: any) => courseBlockIds.has(bs.block_id))
  );

  // ─── Course Detail View ───
  if (selectedCourseId && selectedCourse) {
    const detailTabs = [
      { key: "activities" as const, label: "Activities", icon: BookOpen, count: courseActivities.length },
      { key: "blocks" as const, label: "Blocks", icon: GitCompare, count: courseSections.length },
      { key: "students" as const, label: "Students", icon: Users, count: courseStudents.length },
    ];

    return (
      <div className="p-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedCourseId(null)}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{selectedCourse.academic_year}</span>
                <span className="text-neutral-200">&middot;</span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{selectedCourse.term}</span>
              </div>
              <h1 className="text-lg font-bold text-neutral-900">{selectedCourse.course_title}</h1>
              <p className="text-xs text-neutral-400 mt-0.5">{selectedCourse.course_code} &middot; {selectedCourse.programs_lookup?.abbr || selectedCourse.programs_lookup?.name}</p>
            </div>
          </div>
        </div>

        {/* Detail Tabs */}
        <div className="flex items-center border-b border-neutral-100">
          {detailTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveDetailTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors relative ${
                activeDetailTab === tab.key
                  ? "text-primary"
                  : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className="text-[10px] font-semibold text-neutral-300 ml-0.5">{tab.count}</span>
              {activeDetailTab === tab.key && (
                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeDetailTab === "activities" && (
            <div>
              {courseActivities.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs text-neutral-400">No archived activities for this course</p>
                </div>
              ) : (
                <ActivitiesListView
                    activities={courseActivities}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onActivityClick={handleActivityClick}
                    onEditActivity={() => {}} 
                    onDeleteActivity={() => {}}
                    onCreateActivity={() => {}}
                    totalActivities={courseActivities.length}
                    totalSubmissions={courseActivities.reduce((acc, a) => acc + a.submissionCount, 0)}
                    upcomingDue={0}
                    courses={courses}
                    sections={metaSections}
                    rubrics={[...rubrics.platform, ...rubrics.teacher]}
                    isReadOnly={true}
                />
              )}
            </div>
          )}

          {activeDetailTab === "blocks" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {courseSections.length === 0 ? (
                <div className="col-span-full py-12 text-center">
                  <p className="text-xs text-neutral-400">No blocks assigned to this course load</p>
                </div>
              ) : (
                courseSections.map((section: any) => (
                  <div key={section.id} className="bg-white border border-neutral-100 rounded-xl p-4 hover:border-neutral-200 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 bg-neutral-50 rounded-lg flex items-center justify-center">
                        <GitCompare className="w-4 h-4 text-neutral-400" />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-md">
                        {section.year} Year
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-neutral-800">Block {section.name}</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{section.program_abbr}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeDetailTab === "students" && (
            <div>
              {courseStudents.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs text-neutral-400">No students were enrolled in this course context</p>
                </div>
              ) : (
                <div className="bg-white border border-neutral-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-neutral-50/50 border-b border-neutral-100">
                        <th className="px-5 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Student</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Program & Block</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {courseStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <span className="text-sm font-semibold text-neutral-800">
                              {student.last_name}, {student.first_name}
                            </span>
                            <span className="block text-[10px] text-neutral-400 mt-0.5">{student.student_code}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-medium text-neutral-600">{student.program_id}</span>
                            <span className="block text-[10px] text-neutral-400 mt-0.5">
                              {/* Show the block name related to THIS course */}
                              {student.block_students?.find((bs: any) => courseBlockIds.has(bs.block_id))?.blocks?.name || student.block_name}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center text-xs text-neutral-500">
                              <Mail className="w-3 h-3 mr-1.5 text-neutral-300" />
                              {student.email}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Archive List View ───
  return (
    <div className="p-6 space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-neutral-900">Academic Archive</h1>
          <p className="text-xs text-neutral-400 mt-0.5">Browse previous courses and their historical content</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={ayFilter}
            onChange={(e) => setAyFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
          >
            <option value="all">All Years</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
          </select>

          <select
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
          >
            <option value="all">All Terms</option>
            <option value="1st Semester">1st Semester</option>
            <option value="2nd Semester">2nd Semester</option>
            <option value="Summer">Summer</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loadingCourses ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-xs text-neutral-400">Loading archive…</span>
        </div>
      ) : archivedCourses.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 bg-neutral-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Archive className="w-5 h-5 text-neutral-300" />
          </div>
          <h3 className="text-sm font-bold text-neutral-700 mb-1">No archived courses</h3>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            Courses from previous semesters will appear here once they are concluded.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {archivedCourses.map((course: any) => (
            <div 
              key={course.id} 
              className="bg-white border border-neutral-100 rounded-xl p-4 hover:border-neutral-200 hover:shadow-sm cursor-pointer transition-all group"
              onClick={() => setSelectedCourseId(course.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-neutral-50 rounded-lg flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                  <Layers className="w-4 h-4 text-neutral-400 group-hover:text-primary transition-colors" />
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-md">
                    {course.academic_year}
                  </span>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{course.term}</p>
                </div>
              </div>

              <h3 className="text-sm font-bold text-neutral-800 mb-0.5 line-clamp-2 group-hover:text-primary transition-colors">
                {course.course_title}
              </h3>
              <p className="text-[11px] text-neutral-400 mb-4">{course.course_code}</p>
              
              <div className="pt-3 border-t border-neutral-50 flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {course.departments?.code || course.departments?.name || "General"}
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-200 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
