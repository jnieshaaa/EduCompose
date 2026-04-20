// Profile Information Section Component (View)

import React from "react";
import { User, Save, Loader2 } from "lucide-react";
import { ScrollableSection } from "./ScrollableSection";
import Button from "../ui/Button";
import type { TeacherProfile } from "../../types/settingsTypes";

interface ProfileInformationProps {
  id: string;
  profile: TeacherProfile;
  isLoading: boolean;
  isSaving: boolean;
  onProfileChange: (profile: Partial<TeacherProfile>) => void;
  onSaveProfile: () => void;
}

export const ProfileInformation: React.FC<ProfileInformationProps> = ({
  id,
  profile,
  isLoading,
  isSaving,
  onProfileChange,
  onSaveProfile,
}) => {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const sanitizeName = (value: string) => {
    // Only letters, no spaces
    let clean = value.replace(/[^A-Za-z]/g, "");
    // Capitalize first letter, lower rest
    if (clean.length > 0) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    }
    return clean;
  };

  const validateNames = () => {
    const newErrors: Record<string, string> = {};
    if (!profile.firstName || profile.firstName.length < 3) {
      newErrors.firstName = "Must be at least 3 letters";
    }
    if (!profile.lastName || profile.lastName.length < 3) {
      newErrors.lastName = "Must be at least 3 letters";
    }
    if (profile.middleName && profile.middleName.trim().length > 0 && profile.middleName.length < 3) {
      newErrors.middleName = "Must be at least 3 letters or empty";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateNames()) {
      onSaveProfile();
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 focus:bg-white transition-all placeholder:text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium";
  const errorClass = "border-red-500 focus:ring-red-500/15 focus:border-red-500";

  return (
    <ScrollableSection id={id} title="Profile Information" icon={User}>
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-neutral-400">Loading…</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">Title</label>
              <select
                id="title"
                className={inputClass}
                value={profile.title || ""}
                onChange={(e) => onProfileChange({ title: e.target.value })}
                disabled={isSaving}
              >
                <option value="" disabled>Select Title</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Miss">Miss</option>
                <option value="Dr.">Dr.</option>
                <option value="Dra.">Dra.</option>
                <option value="Prof.">Prof.</option>
                <option value="Engr.">Engr.</option>
                <option value="Atty.">Atty.</option>
                <option value="Rev.">Rev.</option>
                <option value="Sir">Sir</option>
                <option value="Ma'am">Ma'am</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block flex items-center justify-between">
                <span>Nickname</span>
                {errors.nickname && <span className="text-red-500 text-[10px] normal-case tracking-normal">{errors.nickname}</span>}
              </label>
              <input
                id="nickname"
                type="text"
                className={`${inputClass} ${errors.nickname ? errorClass : ''}`}
                value={profile.nickname || ""}
                onChange={(e) => {
                  onProfileChange({ nickname: sanitizeName(e.target.value) });
                  if (errors.nickname) setErrors({ ...errors, nickname: '' });
                }}
                disabled={isSaving}
                placeholder="Nickname"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block flex items-center justify-between">
                <span>First Name</span>
                {errors.firstName && <span className="text-red-500 text-[10px] normal-case tracking-normal">{errors.firstName}</span>}
              </label>
              <input
                id="first-name"
                type="text"
                className={`${inputClass} ${errors.firstName ? errorClass : ''}`}
                value={profile.firstName}
                onChange={(e) => {
                  onProfileChange({ firstName: sanitizeName(e.target.value) });
                  if (errors.firstName) setErrors({ ...errors, firstName: '' });
                }}
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block flex items-center justify-between">
                <div>
                  Middle Name
                  <span className="text-neutral-300 ml-1 font-bold normal-case tracking-normal">(optional)</span>
                </div>
                {errors.middleName && <span className="text-red-500 text-[10px] normal-case tracking-normal">{errors.middleName}</span>}
              </label>
              <input
                id="middle-name"
                type="text"
                className={`${inputClass} ${errors.middleName ? errorClass : ''}`}
                value={profile.middleName || ""}
                onChange={(e) => {
                  onProfileChange({ middleName: sanitizeName(e.target.value) });
                  if (errors.middleName) setErrors({ ...errors, middleName: '' });
                }}
                disabled={isSaving}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block flex items-center justify-between">
                <span>Last Name</span>
                {errors.lastName && <span className="text-red-500 text-[10px] normal-case tracking-normal">{errors.lastName}</span>}
              </label>
              <input
                id="last-name"
                type="text"
                className={`${inputClass} ${errors.lastName ? errorClass : ''}`}
                value={profile.lastName}
                onChange={(e) => {
                  onProfileChange({ lastName: sanitizeName(e.target.value) });
                  if (errors.lastName) setErrors({ ...errors, lastName: '' });
                }}
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">
                Suffix
                <span className="text-neutral-300 ml-1 font-bold normal-case tracking-normal">(optional)</span>
              </label>
              <input
                id="suffix"
                type="text"
                className={inputClass}
                value={profile.suffix || ""}
                onChange={(e) => onProfileChange({ suffix: e.target.value })}
                disabled={isSaving}
                placeholder="e.g., Jr."
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">School</label>
              <input
                id="school"
                type="text"
                className={`${inputClass} bg-neutral-100`}
                value={profile.schoolName || ""}
                disabled
                placeholder="School"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">Department</label>
              <input
                id="department"
                type="text"
                className={`${inputClass} bg-neutral-100`}
                value={profile.departmentName || ""}
                disabled
                placeholder="Department"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">Email</label>
            <input
              id="email"
              type="email"
              className={`${inputClass} bg-neutral-100`}
              value={profile.email}
              disabled
            />
            <p className="text-[11px] font-bold text-neutral-300 mt-2 ml-0.5 uppercase tracking-wide">
              Email cannot be changed. Contact your administrator.
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <Button
              className="bg-primary hover:bg-primary-300 text-white font-bold text-sm h-9 px-4 shadow-md shadow-primary/15"
              onClick={handleSave}
              disabled={isSaving || Object.keys(errors).length > 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  Update Profile
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </ScrollableSection>
  );
};
