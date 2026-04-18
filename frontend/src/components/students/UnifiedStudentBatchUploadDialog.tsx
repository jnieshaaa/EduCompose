import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import Button from "../ui/Button";
import { Upload, FileText, AlertCircle, CheckCircle, X, Loader2, Info, Download, ArrowUpFromLine } from "lucide-react";
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
      `Student ID,First Name,Middle Name,Last Name,Email,Birthday\n` + // Row 4: Headers
      `2023-0001,John,Quincy,Doe,john.doe@email.com,2001-01-01\n` +
      `2023-0002,Jane,,Smith,jane.smith@email.com,2002-12-31`;
    
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
      <DialogContent className="max-w-xl bg-white max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* ─── Header ─── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <ArrowUpFromLine className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-neutral-900">
                Bulk Student Import
              </DialogTitle>
              <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                {currentAY} &middot; {currentSemester}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* ─── Body ─── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">

          {/* Course Context */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] block">
              Target Course
            </label>
            {!propsCourseId ? (
              <select 
                className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 transition-all"
                value={selectedCourseId || ""}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="">Select a course…</option>
                {teacherCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5 border border-primary/10 rounded-xl">
                <span className="text-sm font-semibold text-primary">Current course context</span>
                <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Locked</span>
              </div>
            )}
          </div>

          {/* Drop Zone */}
          {!result && (
            <div 
              className="border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer group"
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
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center group-hover:scale-105 group-hover:border-primary/20 transition-all">
                  <Upload className="w-5 h-5 text-neutral-400 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-700">
                    Drop files or click to browse
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    CSV or XLSX &middot; Multiple files supported
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File Cards */}
          {fileConfigs.length > 0 && !result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em]">
                  Files ({fileConfigs.length})
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  + Add more
                </button>
              </div>

              {fileConfigs.map((config, idx) => (
                <div key={idx} className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 space-y-3 hover:border-neutral-200 transition-colors">
                  {/* File Info Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 bg-white border border-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-800 truncate" title={config.file.name}>
                          {config.file.name}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {(config.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="p-1 text-neutral-300 hover:text-error-default hover:bg-error-default/5 rounded-md transition-all flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Config Fields */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">
                        Program <span className="text-tertiary">*</span>
                      </label>
                      <select 
                        className={`w-full px-2.5 py-2 border rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-primary/10 transition-all ${!config.program ? "border-warning-light" : "border-neutral-200"}`}
                        value={config.program || ""}
                        onChange={(e) => updateFileConfig(idx, { program: e.target.value })}
                      >
                        <option value="">—</option>
                        {availablePrograms.map(p => (
                          <option key={p.id} value={p.abbr}>{p.abbr}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">
                        Year <span className="text-tertiary">*</span>
                      </label>
                      <select 
                        className={`w-full px-2.5 py-2 border rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-primary/10 transition-all ${!config.year ? "border-warning-light" : "border-neutral-200"}`}
                        value={config.year || 1}
                        onChange={(e) => updateFileConfig(idx, { year: parseInt(e.target.value) })}
                      >
                        {[1, 2, 3, 4, 5].map(y => (
                          <option key={y} value={y}>{y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">
                        Block <span className="text-tertiary">*</span>
                      </label>
                      <input 
                        className={`w-full px-2.5 py-2 border rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-neutral-300 uppercase font-semibold ${!config.block ? "border-warning-light" : "border-neutral-200"}`}
                        placeholder="e.g. A"
                        value={config.block || ""}
                        onChange={(e) => updateFileConfig(idx, { block: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Template Help */}
          {!result && (
            <div className="bg-neutral-50 rounded-xl border border-neutral-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">File Format Guide</span>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary-300 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download Template
                </button>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Required Columns</p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">Student ID, First Name, Last Name, Email</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Grouping</p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">Program, Year, and Block (set above or in file)</p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                result.success 
                  ? "bg-success-default/5 border-success-default/15" 
                  : "bg-error-default/5 border-error-default/15"
              }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  result.success ? "bg-success-default text-white" : "bg-error-default text-white"
                }`}>
                  {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${result.success ? "text-success-dark" : "text-error-dark"}`}>
                    {result.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">{result.totalRows} rows</span>
                    <span className="text-[10px] font-semibold text-success-dark bg-success-default/10 px-2 py-0.5 rounded-md">{result.importedCount} new</span>
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{result.skippedCount} linked</span>
                  </div>
                </div>
              </div>

              {/* Linked Students */}
              {result.skippedStudentCodes && result.skippedStudentCodes.length > 0 && (
                <div className="bg-neutral-50 rounded-xl border border-neutral-100 p-4">
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Info className="w-3 h-3 text-primary" />
                    Existing Students (Linked)
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                    {result.skippedStudentCodes.map((code, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white text-primary border border-primary/15 rounded-md text-[9px] font-bold font-mono">{code}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Log */}
              {result.errors.length > 0 && (
                <div className="bg-neutral-50 rounded-xl border border-neutral-100 p-4">
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-error-default" />
                    Issues ({result.errors.length})
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-1.5 custom-scrollbar">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-[10px] text-error-dark bg-error-default/5 border-l-2 border-error-default/30 pl-2.5 py-1.5 rounded-r-md leading-relaxed">{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="px-6 py-4 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-end gap-2.5">
          <Button variant="ghost" onClick={handleClose} disabled={uploading} className="text-sm">
            Cancel
          </Button>
          {!result && (
            <Button
              onClick={handleUpload}
              disabled={uploading || fileConfigs.length === 0 || (!selectedCourseId && !propsCourseId) || fileConfigs.some(c => !c.program || !c.block)}
              className="bg-primary text-white font-bold min-w-[130px] shadow-md shadow-primary/20 h-10 text-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Start Import
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
