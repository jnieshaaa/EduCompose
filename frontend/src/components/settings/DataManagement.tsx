// Data Management Section Component (View)

import React from "react";
import { Upload, FileText, Download } from "lucide-react";
import Button from "../ui/Button";

interface DataManagementProps {
  id: string;
}

export const DataManagement: React.FC<DataManagementProps> = ({ id }) => (
  <div id={id} className="space-y-5 scroll-mt-20">
    {/* Batch Upload Formats */}
    <div className="bg-white border border-neutral-100 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
        <Upload className="w-4 h-4 text-neutral-400" />
        <h2 className="text-sm font-bold text-neutral-800">Batch Upload Formats</h2>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">
            Supported Formats
          </label>
          <div className="flex gap-1.5">
            {[".csv", ".xlsx", ".xls"].map((ext) => (
              <span key={ext} className="px-2.5 py-1 bg-neutral-50 rounded-lg text-[10px] font-semibold text-neutral-500 border border-neutral-100">
                {ext}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-300 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Programs Template
          </button>
          <span className="text-neutral-200">|</span>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-300 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Students Template
          </button>
        </div>
      </div>
    </div>

    {/* Export Reports */}
    <div className="bg-white border border-neutral-100 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-neutral-400" />
        <h2 className="text-sm font-bold text-neutral-800">Export Reports</h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-1.5 block">Report Type</label>
            <select
              id="report-type"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
            >
              <option>Student Performance</option>
              <option>AI Metrics Summary</option>
              <option>Program Overview</option>
              <option>Essay Submissions</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-1.5 block">Format</label>
            <select
              id="report-format"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
            >
              <option>PDF</option>
              <option>CSV</option>
              <option>Excel (.xlsx)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-1.5 block">Date From</label>
            <input
              id="date-from"
              type="date"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
              defaultValue={
                new Date(new Date().getFullYear(), 0, 1)
                  .toISOString()
                  .split("T")[0]
              }
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-1.5 block">Date To</label>
            <input
              id="date-to"
              type="date"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-9 px-4 shadow-md shadow-primary/15">
          <Download className="w-4 h-4 mr-1.5" />
          Export Report
        </Button>
      </div>
    </div>
  </div>
);
