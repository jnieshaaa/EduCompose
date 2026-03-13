import { useState } from "react";
import { useCourses } from "../../hooks/useCourses";
import { useSections } from "../../hooks/useSections";
import { useActivities } from "../../hooks/useActivities";
import { useStudents } from "../../hooks/useStudents";
import { Archive, BookOpen, Layers, GitCompare, ChevronRight, Users, Mail } from "lucide-react";
import Card from "../../components/ui/Card";
import { ActivitiesListView } from "../../components/activities/ActivitiesListView";

export function ArchivePage() {
  const [activeTab, setActiveTab] = useState<"courses" | "sections" | "activities" | "students">("activities");
  const [ayFilter, setAyFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  
  const { 
    myCourses: archivedCourses, 
    isLoading: loadingCourses 
  } = useCourses(true, ayFilter, termFilter);
  
  const { 
    sections: archivedSections, 
    isLoading: loadingSections 
  } = useSections(true, ayFilter, termFilter);
  
  const { 
    activities: archivedActivities,
    rubrics,
    courses,
    sections,
    isLoading: loadingActivities,
    handleActivityClick,
    totalActivities,
    totalSubmissions,
    upcomingDue
  } = useActivities(true, ayFilter, termFilter);

  const {
    students: archivedStudents,
    isLoading: loadingStudents
  } = useStudents(undefined, ayFilter, termFilter);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-neutral-100 rounded-lg">
          <Archive className="w-6 h-6 text-neutral-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Academic Archive</h1>
          <p className="text-neutral-500 text-sm">View content from previous academic years and terms.</p>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-rd w-fit">
            <button
            onClick={() => setActiveTab("activities")}
            className={`px-4 py-2 text-sm font-medium rounded-rd transition-all flex items-center space-x-2 ${
                activeTab === "activities" ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
            }`}
            >
            <BookOpen className="w-4 h-4" />
            <span>Activities</span>
            </button>
            <button
            onClick={() => setActiveTab("sections")}
            className={`px-4 py-2 text-sm font-medium rounded-rd transition-all flex items-center space-x-2 ${
                activeTab === "sections" ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
            }`}
            >
            <GitCompare className="w-4 h-4" />
            <span>Blocks</span>
            </button>
            <button
            onClick={() => setActiveTab("courses")}
            className={`px-4 py-2 text-sm font-medium rounded-rd transition-all flex items-center space-x-2 ${
                activeTab === "courses" ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
            }`}
            >
            <Layers className="w-4 h-4" />
            <span>Course Loads</span>
            </button>
            <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2 text-sm font-medium rounded-rd transition-all flex items-center space-x-2 ${
                activeTab === "students" ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
            }`}
            >
            <Users className="w-4 h-4" />
            <span>Students</span>
            </button>
        </div>

        <div className="flex items-center gap-3">
            <select
                value={ayFilter}
                onChange={(e) => setAyFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none hover:border-neutral-300 transition-colors"
            >
                <option value="all">All Academic Years</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
            </select>

            <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none hover:border-neutral-300 transition-colors"
            >
                <option value="all">All Terms</option>
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer">Summer</option>
            </select>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "activities" && (
          <div className="space-y-4">
             {loadingActivities ? (
               <div className="flex justify-center p-12 text-neutral-400">Loading archived activities...</div>
             ) : archivedActivities.length === 0 ? (
               <div className="bg-white border rounded-rd p-12 text-center text-neutral-500">
                 No archived activities found.
               </div>
             ) : (
                <ActivitiesListView
                    activities={archivedActivities}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onActivityClick={handleActivityClick}
                    onEditActivity={() => {}} // Read-only in archive
                    onDeleteActivity={() => {}} // Read-only in archive
                    onCreateActivity={() => {}} // Can't create in archive
                    totalActivities={totalActivities}
                    totalSubmissions={totalSubmissions}
                    upcomingDue={upcomingDue}
                    courses={courses}
                    sections={sections}
                    rubrics={[...rubrics.platform, ...rubrics.teacher]}
                    isReadOnly={true}
                />
             )}
          </div>
        )}

        {activeTab === "sections" && (
          <div className="space-y-4">
            {loadingSections ? (
               <div className="flex justify-center p-12 text-neutral-400">Loading archived blocks...</div>
            ) : archivedSections.length === 0 ? (
               <div className="bg-white border rounded-rd p-12 text-center text-neutral-500">
                 No archived blocks found.
               </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {archivedSections.map((section: any) => (
                        <Card key={section.id} className="hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <GitCompare className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="text-xs font-medium px-2 py-1 bg-neutral-100 text-neutral-600 rounded-full">
                                    {section.academic_year} | {section.term}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900 mb-1">{section.name}</h3>
                            <p className="text-sm text-neutral-500 mb-4">{section.courses?.course_title}</p>
                            <div className="flex items-center text-sm text-neutral-600">
                                <ChevronRight className="w-4 h-4 mr-1" />
                                <span>{section.students_estimated} Estimated Students</span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
          </div>
        )}

        {activeTab === "courses" && (
          <div className="space-y-4">
             {loadingCourses ? (
               <div className="flex justify-center p-12 text-neutral-400">Loading archived course loads...</div>
             ) : archivedCourses.length === 0 ? (
               <div className="bg-white border rounded-rd p-12 text-center text-neutral-500">
                 No archived course loads found.
               </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {archivedCourses.map((course: any) => (
                        <Card key={course.id} className="hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <Layers className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-xs font-medium px-2 py-1 bg-neutral-100 text-neutral-600 rounded-full mb-1">
                                        {course.academic_year} | {course.term}
                                    </span>
                                    <p className="text-xs font-bold text-neutral-400">{course.course_code}</p>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900 mb-2">{course.course_title}</h3>
                            <div className="space-y-2">
                                <div className="flex items-center text-sm text-neutral-600">
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    <span>{course.departments?.name || "General"}</span>
                                </div>
                                <div className="flex items-center text-sm text-neutral-600">
                                    <ChevronRight className="w-4 h-4 mr-2" />
                                    <span>{course.schools?.name}</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
             )}
          </div>
        )}

        {activeTab === "students" && (
          <div className="space-y-4">
             {loadingStudents ? (
               <div className="flex justify-center p-12 text-neutral-400">Loading archived students...</div>
             ) : archivedStudents.length === 0 ? (
               <div className="bg-white border rounded-rd p-12 text-center text-neutral-500">
                 No archived students found.
               </div>
             ) : (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Student Name</th>
                                <th className="px-6 py-4 font-semibold">Program & Section</th>
                                <th className="px-6 py-4 font-semibold">Contact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {archivedStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-neutral-900">
                                              {student.last_name}, {student.first_name}
                                            </span>
                                            <span className="text-xs text-neutral-400">{student.student_code || student.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{student.program_id}</span>
                                            <span className="text-xs text-neutral-500">{student.block_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-sm text-neutral-600">
                                            <Mail className="w-3 h-3 mr-2" />
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
