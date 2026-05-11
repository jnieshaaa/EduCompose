import { useState, useEffect } from "react";
import { X, UserPlus, Loader2, Mail, Hash, User, Calendar, Users } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useStudents } from "../../hooks/useStudents";
import Button from "../../components/ui/Button";

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  blockId: string;
  onSuccess?: () => void;
  availablePrograms?: any[];
}

export function AddStudentDialog({
  isOpen,
  onClose,
  blockId,
  onSuccess,
  availablePrograms = [],
}: AddStudentDialogProps) {
  const { handleCreateStudent } = useStudents(blockId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    student_code: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    birthday: "",
    program_id: "",
    year: 1,
    block_name: "",
  });

  const [blockInfo, setBlockInfo] = useState<{
    programName: string;
    deptName: string;
    year: number;
    blockName: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");
  const [existingStudents, setExistingStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  useEffect(() => {
    if (isOpen && blockId) {
      const fetchExisting = async () => {
        setIsLoadingExisting(true);
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData?.user) return;
          
          // Fetch block info first to filter students and show context
          const { data: bData } = await supabase
            .from("blocks")
            .select(`
              name,
              year,
              teacher_program_loads!fk_block_program_load (
                program_id,
                programs_lookup (
                  name,
                  departments (
                    name
                  )
                )
              )
            `)
            .eq("id", blockId)
            .single();
            
          if (!bData) return;

          const blockName = bData.name;
          const year = bData.year;
          const tplRaw = bData.teacher_program_loads;
          const tpl = Array.isArray(tplRaw) ? tplRaw[0] : tplRaw;
          const programId = tpl?.program_id;
          
          const programsLookupRaw = tpl?.programs_lookup;
          const programsLookup = Array.isArray(programsLookupRaw) ? programsLookupRaw[0] : programsLookupRaw;
          
          const departmentsRaw = programsLookup?.departments;
          const department = Array.isArray(departmentsRaw) ? departmentsRaw[0] : departmentsRaw;
          
          setBlockInfo({
            programName: programsLookup?.name || "N/A",
            deptName: department?.name || "N/A",
            year: year,
            blockName: blockName
          });

          let query = supabase
            .from("student_profiles")
            .select(`
              student_code,
              users!inner (
                id,
                first_name,
                last_name,
                is_active
              )
            `)
            .eq("teacher_id", userData.user.id)
            .eq("users.is_active", true);

          if (blockName) query = query.eq("block_name", blockName);
          if (year) query = query.eq("year", year);
          if (programId) query = query.eq("program_id", programId);

          const { data: profileMatches } = await query;

          if (!profileMatches) return;

          // Flatten the results
          const matchedStudents = profileMatches.map(p => {
            const userData = Array.isArray(p.users) ? p.users[0] : p.users;
            if (!userData) return null;
            
            return {
              id: userData.id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              student_code: p.student_code
            };
          }).filter((s): s is { id: string; first_name: string; last_name: string; student_code: string } => s !== null);

          if (!matchedStudents) return;

          const { data: inBlock } = await supabase
            .from("block_students")
            .select("student_id")
            .eq("block_id", blockId);

          const inBlockIds = new Set((inBlock || []).map(b => b.student_id));
          const available = matchedStudents.filter(s => !inBlockIds.has(s.id));
          
          setExistingStudents(available);
        } catch (err) {
          console.error("Failed to load existing students", err);
        } finally {
          setIsLoadingExisting(false);
        }
      };
      fetchExisting();
    }
  }, [isOpen, blockId]);

  const handleAddExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setError("Please select a student to add.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase
        .from("block_students")
        .insert({
          block_id: blockId,
          student_id: selectedStudentId
        });
        
      if (insertErr) throw insertErr;
      
      if (onSuccess) onSuccess();
      onClose();
      setSelectedStudentId("");
    } catch (err: any) {
      setError(err.message || "Failed to add existing student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const studentCodeRegex = /^\d{3}-\d{4}$/;
    if (!studentCodeRegex.test(formData.student_code)) {
      setError("Student ID must be in XXX-XXXX format (e.g., 123-4567).");
      return;
    }

    if (!formData.student_code || !formData.first_name || !formData.last_name || !formData.email || !formData.birthday) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await handleCreateStudent(formData);
      setFormData({
        student_code: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        birthday: "",
        program_id: "",
        year: 1,
        block_name: "",
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      // console.error(err);
      setError(err.message || "An error occurred while creating the student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Add New Student</h2>
              <p className="text-xs text-neutral-500">Register a new student to this block.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400">
            <X size={20} />
          </button>
        </div>

        {blockId && (
          <div className="flex border-b border-neutral-100">
            <button
              onClick={() => { setActiveTab("existing"); setError(null); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "existing" ? "text-primary border-b-2 border-primary" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50/50"
              }`}
            >
              Add Existing
            </button>
            <button
              onClick={() => { setActiveTab("new"); setError(null); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "new" ? "text-primary border-b-2 border-primary" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50/50"
              }`}
            >
              Create New
            </button>
          </div>
        )}

        {blockId && activeTab === "existing" ? (
          <form onSubmit={handleAddExisting} className="flex-1 flex flex-col min-h-0 relative">
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
             {error && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-white border border-neutral-200 shadow-2xl rounded-2xl p-6 text-center space-y-4 max-w-[280px] scale-in-center">
                  <div className="mx-auto w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                    <X size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Add Failed</h3>
                    <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                      {error}
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    onClick={() => setError(null)} 
                    className="w-full bg-primary text-white hover:bg-primary-600 shadow-md h-10 text-xs"
                  >
                    Go Back & Fix
                  </Button>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Select Student</label>
              <div className="relative group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" size={16} />
                <select
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all appearance-none"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={isLoadingExisting || existingStudents.length === 0}
                >
                  <option value="" disabled>
                    {isLoadingExisting ? "Loading..." : existingStudents.length === 0 ? "No available students to add." : "-- Select a student --"}
                  </option>
                  {existingStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.student_code} - {s.last_name}, {s.first_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-neutral-100 bg-neutral-50/30">
              <Button type="button" onClick={onClose} variant="ghost">Cancel</Button>
              <Button type="submit" disabled={isSubmitting || existingStudents.length === 0} className="bg-primary text-white px-8">
                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Add to Class
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 relative">
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
            {/* Error Overlay (Centered within form) */}
            {error && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="bg-white border border-neutral-200 shadow-2xl rounded-2xl p-6 text-center space-y-4 max-w-[280px] scale-in-center">
                <div className="mx-auto w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                  <X size={24} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Duplicate Found</h3>
                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                    {error}
                  </p>
                </div>
                <Button 
                  type="button" 
                  onClick={() => setError(null)} 
                  className="w-full bg-primary text-white hover:bg-primary-600 shadow-md h-10 text-xs"
                >
                  Go Back & Fix
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Student ID/Code*</label>
              <div className="relative group">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  required
                  placeholder="123-4567"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all font-mono"
                  value={formData.student_code}
                  maxLength={8}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^0-9]/g, "");
                    if (value.length > 3) {
                      value = value.slice(0, 3) + "-" + value.slice(3, 7);
                    }
                    setFormData({ ...formData, student_code: value });
                  }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">First Name*</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  required
                  placeholder="Juan"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value.trimStart() })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Middle Name</label>
              <input
                placeholder="Dela"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                value={formData.middle_name}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value.trimStart() })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Last Name*</label>
              <input
                required
                placeholder="Cruz"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value.trimStart() })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Email*</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  required
                  type="email"
                  placeholder="juan.cruz@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.replace(/\s/g, '') })}
                />
              </div>
            </div>

            {blockId && blockInfo && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                <div className="col-span-2">
                   <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Academic Department</label>
                   <div className="px-4 py-2.5 bg-neutral-100 rounded-xl text-xs font-bold text-neutral-400 cursor-not-allowed mt-1 truncate">
                     {blockInfo.deptName}
                   </div>
                </div>
                <div className="col-span-2">
                   <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Enrolled Program</label>
                   <div className="px-4 py-2.5 bg-neutral-100 rounded-xl text-xs font-bold text-neutral-400 cursor-not-allowed mt-1 truncate">
                     {blockInfo.programName}
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Year Level</label>
                   <div className="px-4 py-2.5 bg-neutral-100 rounded-xl text-xs font-bold text-neutral-400 cursor-not-allowed mt-1">
                     Year {blockInfo.year}
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Section Block</label>
                   <div className="px-4 py-2.5 bg-neutral-100 rounded-xl text-xs font-bold text-neutral-400 cursor-not-allowed mt-1 uppercase">
                     Block {blockInfo.blockName}
                   </div>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Birthday*</label>
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" size={16} />
                <input
                  required
                  type="date"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                  value={formData.birthday}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 15)).toISOString().split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                />
              </div>
            </div>

            {!blockId && (
              <>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Program*</label>
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                    value={formData.program_id}
                    onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                  >
                    <option value="">Select Program</option>
                    {availablePrograms.map((p) => (
                      <option key={p.id} value={p.id}>{p.abbr} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Year Level*</label>
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-500 uppercase block mb-1.5 ml-1">Block Name*</label>
                  <input
                    required
                    placeholder="e.g. A"
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all uppercase"
                    value={formData.block_name}
                    onChange={(e) => setFormData({ ...formData, block_name: e.target.value.trimStart() })}
                  />
                </div>
              </>
            )}
            </div>
            </div>
 
            <div className="flex justify-end gap-3 p-6 border-t border-neutral-100 bg-neutral-50/30">
              <Button type="button" onClick={onClose} variant="ghost">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-white px-8">
                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Register Student
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
