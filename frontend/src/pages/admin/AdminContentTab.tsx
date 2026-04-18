import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  BookOpen, 
  FileText, 
  ClipboardCheck, 
  Search, 
  Loader2, 
  Layers, 
  ArrowRight,
  ChevronRight,
  Filter,
  Activity,
  Zap,
  Box
} from "lucide-react";
import { adminApi } from "../../api";
import Card from "../../components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";

export function AdminContentTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("view") as "programs" | "activities" | "rubrics") || "programs";
  
  const setActiveTab = (tab: "programs" | "activities" | "rubrics") => {
    searchParams.set("view", tab);
    setSearchParams(searchParams);
  };

  const [programs, setPrograms] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadContent();
  }, [activeTab]);

  const loadContent = async () => {
    try {
      setLoading(true);
      if (activeTab === "programs") {
        const data = await adminApi.getAllPrograms();
        setPrograms(data);
      } else if (activeTab === "activities") {
        const data = await adminApi.getAllActivities();
        setActivities(data);
      } else if (activeTab === "rubrics") {
        const data = await adminApi.getAllRubrics();
        setRubrics(data);
      }
    } catch (err) {
      console.error("Error loading content:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = () => {
    const content = activeTab === "programs" ? programs : activeTab === "activities" ? activities : rubrics;
    if (!searchTerm) return content;
    
    const term = searchTerm.toLowerCase();
    return content.filter((item) => {
      if (activeTab === "programs") {
        return item.name?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term);
      } else if (activeTab === "activities") {
        return item.title?.toLowerCase().includes(term);
      } else {
        return item.name?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term);
      }
    });
  };

  const getIcon = (tab: string) => {
    switch (tab) {
      case "programs": return <BookOpen size={20} />;
      case "activities": return <Activity size={20} />;
      case "rubrics": return <ClipboardCheck size={20} />;
      default: return <Layers size={20} />;
    }
  };

  const getLabel = (tab: string) => {
    switch (tab) {
      case "programs": return "Academic Hubs";
      case "activities": return "Active Missions";
      case "rubrics": return "Quality Tokens";
      default: return tab;
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Premium Integrated Header */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-8">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Content Discovery</h1>
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <Box size={14} className="text-primary/50" />
            Cross-Platform Asset Audit & Intelligence
          </p>
        </div>
        
        {/* Modern Tab HUD */}
        <div className="p-1.5 bg-neutral-100/50 rounded-2xl flex items-center gap-1 border border-neutral-100">
          {[
            { id: "programs", label: "Curriculums", icon: BookOpen },
            { id: "activities", label: "Activities", icon: Activity },
            { id: "rubrics", label: "Rubrics", icon: ClipboardCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-white text-primary shadow-sm border border-neutral-100"
                  : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <tab.icon className={activeTab === tab.id ? "text-primary" : "text-neutral-300"} size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Telemetry Search */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-primary transition-colors" size={18} />
          <input
            placeholder={`Query local ${activeTab} cluster...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl text-sm font-bold placeholder:text-neutral-300 focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Content Canvas */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-40 bg-white rounded-[3.5rem] border border-neutral-100 shadow-sm"
          >
            <Loader2 className="animate-spin text-primary/30 w-12 h-12 mb-6" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-400 animate-pulse">Establishing Intelligence Link</p>
          </motion.div>
        ) : (
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredContent().map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="group bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden outline-none flex flex-col"
              >
                <div className="p-8 space-y-6 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      {getIcon(activeTab)}
                    </div>
                    <span className="text-[9px] font-black text-neutral-300 uppercase tracking-widest bg-neutral-50 px-3 py-1.5 rounded-xl">ID: {item.id.toString().slice(-6)}</span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-neutral-900 tracking-tight leading-tight group-hover:text-primary transition-colors">
                      {item.name || item.title}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest line-clamp-2 leading-relaxed opacity-80">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-neutral-50 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Zap size={14} className="text-primary/40" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{getLabel(activeTab)}</span>
                     </div>
                     <span className="text-[9px] font-black text-neutral-300 uppercase tracking-tighter">
                        Log: {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
                     </span>
                  </div>
                </div>
                
                <button className="w-full py-5 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-center gap-3 group/btn transition-colors hover:bg-primary hover:text-white">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">Full Content Audit</span>
                   <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {filteredContent().length === 0 && !loading && (
        <div className="bg-white p-20 rounded-[3.5rem] border border-neutral-100 text-center flex flex-col items-center shadow-sm">
           <Layers className="w-16 h-16 text-neutral-100 mb-6" />
           <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Zero assets detected in {activeTab} cluster</p>
        </div>
      )}
    </div>
  );
}
