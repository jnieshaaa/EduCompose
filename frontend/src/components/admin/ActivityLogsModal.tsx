import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Search, Activity, ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

interface ActivityLog {
  essayId: string;
  student: string;
  action: string;
  essay: string;
  time: string;
  status: "new" | "evaluated" | "review";
  score?: number;
  courseIds: string[];
  blockIds: string[];
  activityId?: string;
  activityTitle?: string;
}

interface ActivityLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: ActivityLog[];
  courses: { id: string; label: string }[];
  blocks: { id: string; name: string; courseId: string }[];
  allActivities: any[];
}

export default function ActivityLogsModal({
  isOpen,
  onClose,
  activities,
  courses,
  blocks,
  allActivities,
}: ActivityLogsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("all");
  const [selectedBlock, setSelectedBlock] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");

  // Get filtered blocks based on selected activity
  const availableBlocks = useMemo(() => {
    let baseBlocks = blocks;
    
    // Filter by activity first if selected
    if (selectedActivity !== "all") {
      const activity = allActivities.find(a => String(a.id) === String(selectedActivity));
      if (activity) {
        baseBlocks = baseBlocks.filter(b => (activity.blockIds || []).map(String).includes(String(b.id)));
      }
    }
    
    return baseBlocks;
  }, [selectedActivity, blocks, allActivities]);

  const filteredLogs = useMemo(() => {
    return activities.filter((log) => {
      const matchesSearch = 
        log.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.essay.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.activityTitle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.score?.toString() || "").includes(searchTerm);
      
      const matchesActivity = selectedActivity === "all" || String(log.activityId) === String(selectedActivity);
      const matchesBlock = selectedBlock === "all" || log.blockIds.map(String).includes(String(selectedBlock));
      const matchesCourse = selectedCourse === "all" || log.courseIds.map(String).includes(String(selectedCourse));
      
      let matchesGrade = true;
      if (selectedGrade !== "all" && log.score !== undefined) {
        if (selectedGrade === "75-below") matchesGrade = log.score < 75;
        else if (selectedGrade === "75-80") matchesGrade = log.score >= 75 && log.score <= 80;
        else if (selectedGrade === "81-90") matchesGrade = log.score >= 81 && log.score <= 90;
        else if (selectedGrade === "91-100") matchesGrade = log.score >= 91 && log.score <= 100;
      } else if (selectedGrade !== "all" && log.score === undefined) {
        matchesGrade = false;
      }

      return matchesSearch && matchesActivity && matchesBlock && matchesCourse && matchesGrade;
    });
  }, [activities, searchTerm, selectedActivity, selectedBlock, selectedCourse, selectedGrade]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm z-[100]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-neutral-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
              <Activity size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight">Activity History</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Comprehensive Logs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-8 bg-white border-b border-neutral-50 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative group/search col-span-1 sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within/search:text-primary transition-colors" size={16} />
              <input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none"
              />
            </div>

            <div className="relative">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/5 appearance-none cursor-pointer"
              >
                <option value="all">All Courses</option>
                {courses.map(c => <option key={c.id} value={String(c.id)}>{c.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 pointer-events-none" size={14} />
            </div>

            <div className="relative">
              <select
                value={selectedActivity}
                onChange={(e) => {
                  setSelectedActivity(e.target.value);
                  setSelectedBlock("all");
                }}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/5 appearance-none cursor-pointer"
              >
                <option value="all">All Activities</option>
                {allActivities.map(a => <option key={a.id} value={String(a.id)}>{a.title}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 pointer-events-none" size={14} />
            </div>

            <div className="relative">
              <select
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/5 appearance-none cursor-pointer"
              >
                <option value="all">All Blocks</option>
                {availableBlocks.map(b => <option key={b.id} value={String(b.id)}>Block {b.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 pointer-events-none" size={14} />
            </div>

            <div className="relative">
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-100 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/5 appearance-none cursor-pointer"
              >
                <option value="all">All Grades</option>
                <option value="75-below">75 Below</option>
                <option value="75-80">75 - 80</option>
                <option value="81-90">81 - 90</option>
                <option value="91-100">91 - 100</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="py-20 text-center opacity-30">
               <Activity size={48} className="mx-auto mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No matching activities found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLogs.map((act, i) => (
                <div key={i} className="group p-5 rounded-3xl bg-neutral-50/50 hover:bg-white border border-transparent hover:border-neutral-100 hover:shadow-xl hover:shadow-primary/5 transition-all">
                   <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold text-neutral-800 tracking-tight">{act.student}</p>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{act.time}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${act.status === 'new' ? 'bg-amber-50 text-amber-600' : 'bg-success-default/5 text-success-default'}`}>
                        {act.status}
                      </span>
                   </div>
                   
                   <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-1 bg-primary/5 w-fit px-2 py-0.5 rounded-md border border-primary/10">
                        <BookOpen size={10} className="text-primary" />
                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider">{act.activityTitle || "Untitled Activity"}</span>
                      </div>
                      <p className="text-xs text-neutral-500 line-clamp-1 italic">{act.action} "{act.essay}"</p>
                   </div>

                   <div className="flex items-center justify-between pt-4 border-t border-neutral-100/50">
                      <div className="flex gap-2">
                        {act.score !== undefined && (
                          <div className="flex flex-col">
                             <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-tighter">Overall Score</span>
                             <span className="text-sm font-bold text-primary">{act.score}%</span>
                          </div>
                        )}
                      </div>
                      <button className="p-2 rounded-xl bg-white border border-neutral-100 text-neutral-300 hover:text-primary hover:border-primary transition-all shadow-sm">
                        <ArrowRight size={14} />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
           <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
             Showing {filteredLogs.length} of {activities.length} activities
           </p>
           <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-neutral-200 text-neutral-500 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-neutral-100 transition-all"
           >
             Close
           </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
