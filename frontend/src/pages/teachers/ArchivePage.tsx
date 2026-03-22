import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCourses } from "../../hooks/useCourses";
import { useSections } from "../../hooks/useSections";
import { useActivities } from "../../hooks/useActivities";
import { useStudents } from "../../hooks/useStudents";
import { Archive, BookOpen, Layers, GitCompare, ChevronRight, Users, Mail, ArrowLeft } from "lucide-react";
import Card from "../../components/ui/Card";
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

  if (selectedCourseId && selectedCourse) {
    return (
      <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col space-y-4">
          <button 
            onClick={() => setSelectedCourseId(null)}
            className="flex items-center text-sm text-neutral-500 hover:text-primary transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Archive List
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm text-neutral-500 mb-1">
                <span>{selectedCourse.academic_year}</span>
                <span>•</span>
                <span>{selectedCourse.term}</span>
              </div>
              <h1 className="text-3xl font-bold text-neutral-900">{selectedCourse.course_title}</h1>
              <p className="text-neutral-500">{selectedCourse.course_code} | {selectedCourse.programs_lookup?.name}</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-xl">
              <Layers className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Detail Tabs */}
        <div className="flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-rd w-fit">
          <button
            onClick={() => setActiveDetailTab("activities")}
            className={`px-4 py-2 text-sm font-medium rounded-rd transition-all flex items-center space-x-2 ${
              activeDetailTab === "activities" ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Activities ({courseActivities.length})</span>
          </button>
          <button
            onClick={() => setActiveDetailTab("blocks")}
            className={`px-4 py-2 text-sm font-medium rounded-rd transition-all flex items-center space-x-2 ${
              activeDetailTab === "blocks" ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>Blocks ({courseSections.length})</span>
          </button>
          <button
            onClick={() => setActiveDetailTab("students")}
            className={`px-4 py-2 text-sm font-medium rounded-rd transition-all flex items-center space-x-2 ${
              activeDetailTab === "students" ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students ({courseStudents.length})</span>
          </button>
        </div>

        <div className="mt-6 border-t pt-6">
          {activeDetailTab === "activities" && (
            <div className="space-y-4">
              {courseActivities.length === 0 ? (
                <div className="bg-white border rounded-rd p-12 text-center text-neutral-500">
                  No archived activities for this course.
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courseSections.length === 0 ? (
                <div className="col-span-full bg-white border rounded-rd p-12 text-center text-neutral-500">
                  No blocks assigned to this course load.
                </div>
              ) : (
                courseSections.map((section: any) => (
                    <Card key={section.id} className="hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <GitCompare className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-xs font-medium px-2 py-1 bg-neutral-100 text-neutral-600 rounded-full">
                                {section.year} Year
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-1">Block {section.name}</h3>
                        <p className="text-sm text-neutral-500 mb-4">{section.program_abbr}</p>
                    </Card>
                ))
              )}
            </div>
          )}

          {activeDetailTab === "students" && (
            <div className="space-y-4">
              {courseStudents.length === 0 ? (
                <div className="bg-white border rounded-rd p-12 text-center text-neutral-500">
                  No students were enrolled in this course context.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Student Name</th>
                                <th className="px-6 py-4 font-semibold">Program & Section</th>
                                <th className="px-6 py-4 font-semibold">Contact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {courseStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-neutral-900">
                                              {student.last_name}, {student.first_name}
                                            </span>
                                            <span className="text-xs text-neutral-400">{student.student_code}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{student.program_id}</span>
                                            <span className="text-xs text-neutral-500">
                                              {/* Show the block name related to THIS course */}
                                              {student.block_students?.find((bs: any) => courseBlockIds.has(bs.block_id))?.blocks?.name || student.block_name}
                                            </span>
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-neutral-900 rounded-xl">
            <Archive className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Academic Archive</h1>
            <p className="text-neutral-500 text-sm">Select a previous course to view its historical content.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <select
                value={ayFilter}
                onChange={(e) => setAyFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none hover:border-neutral-300 transition-all shadow-sm"
            >
                <option value="all">All Years</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
            </select>

            <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none hover:border-neutral-300 transition-all shadow-sm"
            >
                <option value="all">All Terms</option>
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer">Summer</option>
            </select>
        </div>
      </div>

      <div className="mt-6">
         {loadingCourses ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
             {[1, 2, 3].map(i => <div key={i} className="h-48 bg-neutral-100 rounded-2xl" />)}
           </div>
         ) : archivedCourses.length === 0 ? (
           <div className="bg-white border-2 border-dashed border-neutral-200 rounded-2xl p-20 text-center">
             <div className="mx-auto w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
               <Archive className="w-8 h-8 text-neutral-300" />
             </div>
             <h3 className="text-lg font-bold text-neutral-900 mb-1">No archived courses found</h3>
             <p className="text-neutral-500 max-w-xs mx-auto">Courses from previous semesters will appear here once they are concluded.</p>
           </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedCourses.map((course: any) => (
                    <Card 
                      key={course.id} 
                      className="group hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-neutral-200"
                      onClick={() => setSelectedCourseId(course.id)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-neutral-50 group-hover:bg-primary/10 rounded-xl transition-colors">
                                <Layers className="w-6 h-6 text-neutral-400 group-hover:text-primary transition-colors" />
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full mb-1">
                                    {course.academic_year}
                                </span>
                                <p className="text-xs font-medium text-neutral-400">{course.term}</p>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 mb-1 line-clamp-2">{course.course_title}</h3>
                        <p className="text-sm font-medium text-neutral-400 mb-6">{course.course_code}</p>
                        
                        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-neutral-500">
                            <div className="flex items-center text-xs font-medium">
                                <BookOpen className="w-4 h-4 mr-2" />
                                <span>{course.departments?.name || "General"}</span>
                            </div>
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-neutral-300" />
                        </div>
                    </Card>
                ))}
            </div>
         )}
      </div>
    </div>
  );
}
