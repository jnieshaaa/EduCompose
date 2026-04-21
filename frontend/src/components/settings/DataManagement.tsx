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
      <div className="p-5 space-y-5">
        <div>
          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-3 block">
            New Unified Import Format
          </label>
          <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
            Our new <span className="font-bold text-primary">Unified Student Import</span> supports metadata rows for Program, Year, and Block inside the file. This eliminates the need to upload files one by one for each section.
          </p>
          <div className="flex gap-2">
            {[".csv", ".xlsx"].map((ext) => (
              <span key={ext} className="px-3 py-1 bg-neutral-50 rounded-lg text-[11px] font-bold text-neutral-500 border border-neutral-100 uppercase tracking-wider">
                {ext}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
          <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.12em] mb-2">Student List Template</h4>
          <p className="text-[11px] text-neutral-600 mb-4 font-medium"> Includes 3 metadata rows (Program, Year Level, Block) followed by the student data headers.</p>
          <button 
            onClick={() => {
              const csvContent = 
                `Program:,BSCS\n` +
                `Year Level:,1\n` +
                `Block Name:,A\n` +
                `Student ID,First Name,Middle Name,Last Name,Email,Birthday\n` +
                `123-4567,John,Quincy,Doe,john.doe@email.com,2001-01-01`;
              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
              const link = document.createElement("a");
              const url = URL.createObjectURL(blob);
              link.setAttribute("href", url);
              link.setAttribute("download", "student_list_template.csv");
              link.click();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-300 transition-all shadow-sm shadow-primary/20 uppercase tracking-widest"
          >
            <Download size={14} />
            Download Master Template
          </button>
        </div>
      </div>
    </div>
  </div>
);
