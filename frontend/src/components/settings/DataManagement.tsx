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
        <Upload className="w-4 h-4 text-primary" />
        <h2 className="text-base font-bold text-neutral-800 tracking-tight">Batch Upload Formats</h2>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-3 block">
            Supported Formats
          </label>
          <div className="flex gap-2">
            {[".csv", ".xlsx", ".xls"].map((ext) => (
              <span key={ext} className="px-3 py-1 bg-neutral-50 rounded-lg text-[11px] font-bold text-neutral-500 border border-neutral-100 uppercase tracking-wider">
                {ext}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-300 transition-colors uppercase tracking-widest">
            <Download size={16} />
            Programs Template
          </button>
          <span className="text-neutral-200">|</span>
          <button className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-300 transition-colors uppercase tracking-widest">
            <Download size={16} />
            Students Template
          </button>
        </div>
      </div>
    </div>

    {/* Export Reports */}
    <div className="bg-white border border-neutral-100 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <h2 className="text-base font-bold text-neutral-800 tracking-tight">Export Reports</h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">Report Type</label>
            <select
              id="report-type"
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all font-medium"
            >
              <option>Student Performance</option>
              <option>AI Metrics Summary</option>
              <option>Program Overview</option>
              <option>Essay Submissions</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">Format</label>
            <select
              id="report-format"
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all font-medium"
            >
              <option>PDF</option>
              <option>CSV</option>
              <option>Excel (.xlsx)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">Date From</label>
            <input
              id="date-from"
              type="date"
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all font-medium"
              defaultValue={
                new Date(new Date().getFullYear(), 0, 1)
                  .toISOString()
                  .split("T")[0]
              }
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">Date To</label>
            <input
              id="date-to"
              type="date"
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all font-medium"
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
