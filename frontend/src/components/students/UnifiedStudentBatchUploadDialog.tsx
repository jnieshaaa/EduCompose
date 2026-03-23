import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import Button from "../ui/Button";
import { Upload, FileText, AlertCircle, CheckCircle, X, Loader2, Info } from "lucide-react";
import { UnifiedStudentUploadService } from "../../services/UnifiedStudentUploadService";
import type { UnifiedUploadResult, UploadFileConfig } from "../../services/UnifiedStudentUploadService";
import { FileParserService } from "../../services/FileParserService";
import { supabase } from "../../lib/supabaseClient";
import { useAcademicContext } from "../../hooks/useAcademicContext";
import { useAlert } from "../../hooks/useAlert";

interface UnifiedStudentBatchUploadDialogProps {
  courseId?: string | null;
  onComplete?: (result: UnifiedUploadResult) => void;
  trigger?: React.ReactNode;
}

export function UnifiedStudentBatchUploadDialog({
  courseId: propsCourseId,
  onComplete,
  trigger,
}: UnifiedStudentBatchUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileConfigs, setFileConfigs] = useState<UploadFileConfig[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UnifiedUploadResult | null>(null);
  const [teacherCourses, setTeacherCourses] = useState<{id: string, code: string, title: string}[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(propsCourseId || null);
  const [availablePrograms, setAvailablePrograms] = useState<{id: string, name: string, abbr: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { currentAY, currentSemester } = useAcademicContext();
  const { showError, showSuccess } = useAlert();

  // Load courses if none provided via props
  useEffect(() => {
    if (isOpen && !propsCourseId) {
      const fetchCourses = async () => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;

        const { data } = await supabase
          .from("courses")
          .select("id, course_code, course_title")
          .order("course_code", { ascending: true });
        
        if (data) setTeacherCourses(data.map(c => ({ id: c.id, code: c.course_code, title: c.course_title })));
      };
      fetchCourses();
    }
  }, [isOpen, propsCourseId]);
  
  // Load available programs for the selected course
  useEffect(() => {
    if (isOpen && selectedCourseId) {
      const fetchCoursePrograms = async () => {
        const { data: loads } = await supabase
          .from("teacher_course_loads")
          .select(`
            teacher_program_loads (
              program_id,
              programs_lookup (id, name, abbr)
            )
          `)
          .eq("course_id", selectedCourseId)
          .maybeSingle();
        
        if (loads?.teacher_program_loads) {
          const progs = (loads.teacher_program_loads as any[]).map(l => l.programs_lookup).filter(Boolean);
          setAvailablePrograms(progs);
          
          // Auto-assign program to existing configs if only one program available
          if (progs.length === 1) {
             setFileConfigs(prev => prev.map(c => ({ ...c, program: c.program || progs[0].abbr })));
          }
        }
      };
      fetchCoursePrograms();
    }
  }, [isOpen, selectedCourseId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      return extension === "csv" || extension === "xlsx" || extension === "xls";
    });

    if (validFiles.length < files.length) {
      showError("Some files were skipped. Please select .csv or .xlsx files only.");
    }

    const configsWithMeta: UploadFileConfig[] = await Promise.all(validFiles.map(async (file) => {
       const initialConfig: UploadFileConfig = {
          file,
          program: availablePrograms.length === 1 ? availablePrograms[0].abbr : "",
          year: 1,
          block: ""
       };

       try {
         const rawResult = await FileParserService.parseFileRaw(file);
         if (rawResult.success && rawResult.rows.length >= 4) {
           const rows = rawResult.rows;
           const row3 = rows[3] || [];
           
           // Exactly same detection logic as in service
           const hasStudentHeaders = row3.some(h => String(h).toLowerCase().includes("id") || String(h).toLowerCase().includes("student"));
           
           if (hasStudentHeaders) {
             const getMeta = (rowArr: string[], fallback: string | number) => {
                if (rowArr.length === 0) return fallback;
                if (rowArr.length === 1) return rowArr[0] || fallback;
                const first = String(rowArr[0]).toLowerCase();
                if (first.includes("program") || first.includes("year") || first.includes("block") || first.includes("section")) {
                   return rowArr[1] || fallback;
                }
                return rowArr[0] || fallback;
             };

             initialConfig.program = String(getMeta(rows[0] || [], initialConfig.program || ""));
             initialConfig.year = parseInt(String(getMeta(rows[1] || [], initialConfig.year || 1))) || 1;
             initialConfig.block = String(getMeta(rows[2] || [], initialConfig.block || "")).toUpperCase();
           }
         }
       } catch (err) {
         console.warn("Failed to pre-parse metadata for UI:", file.name);
       }

       return initialConfig;
    }));

    setFileConfigs(prev => [...prev, ...configsWithMeta]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateFileConfig = (index: number, updates: Partial<UploadFileConfig>) => {
    setFileConfigs(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const removeFile = (index: number) => {
    setFileConfigs(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedCourseId) {
       showError("Please select a target course for this upload.");
       return;
    }

    const incompleteConfigs = fileConfigs.some(c => !c.program || !c.year || !c.block);
    if (incompleteConfigs) {
      showError("Please set the Program, Year, and Block for all files.");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const uploadResult = await UnifiedStudentUploadService.upload(
        fileConfigs.map(c => ({ ...c, block: c.block?.toUpperCase() })),
        selectedCourseId,
        { ay: currentAY || "", term: currentSemester || "" }
      );

      setResult(uploadResult);
      if (onComplete) onComplete(uploadResult);

      if (uploadResult.success && uploadResult.errors.length === 0) {
        showSuccess(uploadResult.message);
        setTimeout(() => setIsOpen(false), 2000);
      }
    } catch (err) {
      showError("A fatal error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFileConfigs([]);
    setResult(null);
  };

  const downloadTemplate = () => {
    // 3 Rows of Metadata with Labels + 1 Row of Headers
    const program = availablePrograms[0]?.abbr || "BSA";
    const csvContent = 
      `Program:,${program}\n` +          // Row 1: Label and Value
      `Year Level:,1\n` +                 // Row 2: Label and Value
      `Block Name:,A\n` +                  // Row 3: Label and Value
      `Student ID,First Name,Middle Name,Last Name,Email\n` + // Row 4: Headers
      `2023-0001,John,Quincy,Doe,john.doe@email.com\n` +
      `2023-0002,Jane,,Smith,jane.smith@email.com`;
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `student_template_${program}_1A.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Bulk Upload Student List
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-neutral-900 flex items-center gap-2">
             <Upload className="w-5 h-5 text-primary" />
             Bulk Student List Upload
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Target Course Info */}
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <h4 className="text-sm font-bold text-neutral-900 mb-2 flex items-center gap-2">
               <Info className="w-4 h-4 text-primary" />
               Target Implementation Context
            </h4>
            {!propsCourseId ? (
              <div className="space-y-2">
                <p className="text-xs text-neutral-500 font-medium">Select which course these students should be added to:</p>
                <select 
                  className="w-full p-2.5 border rounded-xl text-sm bg-white outline-none focus:ring-4 focus:ring-primary/10 shadow-sm transition-all"
                  value={selectedCourseId || ""}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  <option value="">-- Choose Course --</option>
                  {teacherCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>
            ) : (
                <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-primary">Importing into current Course context</p>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black border border-primary/20 uppercase tracking-widest">Fixed Context</span>
                </div>
            )}
            <p className="text-[10px] text-neutral-400 mt-2 font-bold uppercase tracking-widest leading-none">Academic Period: {currentAY} | {currentSemester}</p>
          </div>

          {!result && (
            <div 
              className="border-2 border-dashed border-neutral-200 rounded-2xl p-8 text-center hover:border-primary/50 transition-all cursor-pointer bg-neutral-50/50 group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-bold text-neutral-800">
                  Select Student List Files
                </span>
                <span className="text-xs text-neutral-400 mt-1 font-medium">
                  CSV or XLSX files only. You can select multiple.
                </span>
              </div>
            </div>
          )}

          {/* File configurations and inputs */}
          {fileConfigs.length > 0 && !result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                 <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Batch Configurations</h4>
                 <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">{fileConfigs.length} Files</span>
              </div>
              {fileConfigs.map((config, idx) => (
                <div key={idx} className="p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm space-y-4 group hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 bg-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-neutral-800 truncate block" title={config.file.name}>{config.file.name}</span>
                        <span className="text-[10px] text-neutral-400 font-medium">{(config.file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="p-1.5 text-neutral-400 hover:text-error-default hover:bg-error-default/5 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                        Program
                        <span className="text-red-500">*</span>
                      </label>
                      <select 
                        className={`w-full p-2.5 border rounded-xl text-xs bg-neutral-50/30 outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all font-medium ${!config.program ? "border-amber-200" : "border-neutral-100"}`}
                        value={config.program || ""}
                        onChange={(e) => updateFileConfig(idx, { program: e.target.value })}
                      >
                        <option value="">-- Choose --</option>
                        {availablePrograms.map(p => (
                          <option key={p.id} value={p.abbr}>{p.abbr}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                        Year
                        <span className="text-red-500">*</span>
                      </label>
                      <select 
                        className={`w-full p-2.5 border rounded-xl text-xs bg-neutral-50/30 outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all font-medium ${!config.year ? "border-amber-200" : "border-neutral-100"}`}
                        value={config.year || 1}
                        onChange={(e) => updateFileConfig(idx, { year: parseInt(e.target.value) })}
                      >
                        {[1, 2, 3, 4, 5].map(y => (
                          <option key={y} value={y}>{y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                        Block
                        <span className="text-red-500">*</span>
                      </label>
                      <input 
                        className={`w-full p-2.5 border rounded-xl text-xs bg-neutral-50/30 outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all placeholder:text-neutral-300 uppercase font-bold ${!config.block ? "border-amber-200 shadow-sm shadow-amber-50" : "border-neutral-100"}`}
                        placeholder="e.g. 1A"
                        value={config.block || ""}
                        onChange={(e) => updateFileConfig(idx, { block: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* format Instructions */}
          {!result && (
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className="w-7 h-7 bg-amber-default/10 rounded-lg flex items-center justify-center">
                       <FileText className="w-4 h-4 text-amber-default" />
                     </div>
                     <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-[0.2em]">Data Structure Template</h4>
                  </div>
                  <Button 
                    variant="outline" 
                    className="h-7 text-[9px] gap-1.5 border-amber-200 hover:bg-amber-100 text-amber-700 font-black px-3 rounded-lg uppercase tracking-wider whitespace-nowrap"
                    onClick={downloadTemplate}
                  >
                     <Upload className="w-2.5 h-2.5 rotate-180" />
                     Get CSV Template
                  </Button>
               </div>
                
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-amber-900/60 uppercase tracking-widest leading-none">Min. Required Columns</p>
                     <p className="text-[10px] text-amber-700 font-medium">Student ID, First Name, Last Name, Email</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-amber-900/60 uppercase tracking-widest leading-none">Grouping (Required)</p>
                     <p className="text-[10px] text-amber-700 font-medium">Program, Year, and Section (can be set in UI above or inside Excel)</p>
                  </div>
               </div>
               
               <p className="text-[10px] text-amber-700/80 font-medium leading-relaxed border-t border-amber-200/50 pt-3">
                  <span className="font-bold">Pro-tip:</span> If you set the Program and Block in the UI above, the system will use those even if the Excel columns are empty!
               </p>
            </div>
          )}

          {/* Result View */}
          {result && (
            <div className={`p-6 rounded-2xl border ${result.success ? "bg-success-default/5 border-success-default/20" : "bg-error-default/5 border-error-default/20"}`}>
              <div className="flex items-start gap-4">
                {result.success ? (
                  <div className="w-10 h-10 bg-success-default text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-success-default/20 animate-in zoom-in spin-in-12 duration-500">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-error-default text-white rounded-2xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1">
                  <p className={`text-base font-bold ${result.success ? "text-success-darker" : "text-error-darker"}`}>
                    {result.message}
                  </p>
                  <div className="flex gap-4 mt-2">
                     <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Rows: {result.totalRows}</span>
                     <span className="text-[10px] font-bold text-success-default bg-success-default/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">New: {result.importedCount}</span>
                     <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">Linked: {result.skippedCount}</span>
                  </div>
                  
                  {result.skippedStudentCodes && result.skippedStudentCodes.length > 0 && (
                    <div className="mt-4 bg-white/60 rounded-2xl p-4 border border-neutral-100 overflow-hidden shadow-inner">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <Info className="w-3 h-3 text-primary" />
                         Existing Students (Linked)
                      </p>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                        {result.skippedStudentCodes.map((code, i) => (
                          <span key={i} className="px-2 py-0.5 bg-primary/5 text-primary border border-primary/20 rounded text-[9px] font-bold font-mono tracking-tighter shadow-sm">{code}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.errors.length > 0 && (
                    <div className="mt-4 bg-white/60 rounded-2xl p-4 border border-neutral-100 overflow-hidden shadow-inner font-mono">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <AlertCircle className="w-3 h-3" />
                         Issues / Error Log
                      </p>
                      <div className="max-h-24 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {result.errors.map((err, i) => (
                           <p key={i} className="text-[9px] text-error-default border-l-2 border-error-default/40 pl-3 py-1 bg-error-default/5 rounded-r-lg font-medium leading-relaxed">{err}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-neutral-50/50 border-t border-neutral-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || fileConfigs.length === 0 || (!selectedCourseId && !propsCourseId) || fileConfigs.some(c => !c.program || !c.block)}
            className="bg-primary text-white font-bold min-w-[140px] shadow-xl shadow-primary/25 h-11"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 Importing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Start Import
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
