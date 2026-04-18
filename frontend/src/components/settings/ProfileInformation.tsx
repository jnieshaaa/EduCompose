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
  const inputClass =
    "w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 focus:bg-white transition-all placeholder:text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium";

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
              <input
                id="title"
                type="text"
                className={inputClass}
                value={profile.title || ""}
                onChange={(e) => onProfileChange({ title: e.target.value })}
                disabled={isSaving}
                placeholder="Title"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">Nickname</label>
              <input
                id="nickname"
                type="text"
                className={inputClass}
                value={profile.nickname || ""}
                onChange={(e) => onProfileChange({ nickname: e.target.value })}
                disabled={isSaving}
                placeholder="Nickname"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">First Name</label>
              <input
                id="first-name"
                type="text"
                className={inputClass}
                value={profile.firstName}
                onChange={(e) => onProfileChange({ firstName: e.target.value })}
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">
                Middle Name
                <span className="text-neutral-300 ml-1 font-bold normal-case tracking-normal">(optional)</span>
              </label>
              <input
                id="middle-name"
                type="text"
                className={inputClass}
                value={profile.middleName || ""}
                onChange={(e) => onProfileChange({ middleName: e.target.value })}
                disabled={isSaving}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.12em] mb-2 block">Last Name</label>
              <input
                id="last-name"
                type="text"
                className={inputClass}
                value={profile.lastName}
                onChange={(e) => onProfileChange({ lastName: e.target.value })}
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
              onClick={onSaveProfile}
              disabled={isSaving}
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
