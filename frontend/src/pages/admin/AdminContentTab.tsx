import React, { useState, useEffect } from "react";
import { BookOpen, FileText, ClipboardCheck, Search } from "lucide-react";
import { adminApi } from "../../api";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";

export function AdminContentTab() {
  const [activeTab, setActiveTab] = useState<"programs" | "activities" | "rubrics">("programs");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Content Management</h1>
        <p className="text-neutral-600 mt-1">View and manage all content across the platform</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex gap-4">
          {[
            { id: "programs", label: "Programs", icon: BookOpen },
            { id: "activities", label: "Activities", icon: FileText },
            { id: "rubrics", label: "Rubrics", icon: ClipboardCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <Input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Content List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-neutral-600 mt-4">Loading {activeTab}...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContent().map((item) => (
            <Card key={item.id} className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                {item.name || item.title}
              </h3>
              {item.description && (
                <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                  {item.description}
                </p>
              )}
              <div className="text-xs text-neutral-500">
                Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredContent().length === 0 && !loading && (
        <Card className="p-12 text-center">
          <p className="text-neutral-600">No {activeTab} found.</p>
        </Card>
      )}
    </div>
  );
}

