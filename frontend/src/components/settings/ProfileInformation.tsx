// Profile Information Section Component (View)

import React from "react";
import { User, Save, Loader2 } from "lucide-react";
import { ScrollableSection } from "./ScrollableSection";
import { Label } from "../ui/label";
import Input from "../ui/Input";
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
  return (
    <ScrollableSection id={id} title="Profile Information" icon={User}>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title (e.g., Mr., Ms., Dr.)</Label>
              <Input
                id="title"
                type="text"
                className="mt-1"
                value={profile.title || ""}
                onChange={(value) => onProfileChange({ title: value })}
                disabled={isSaving}
                placeholder="Title"
              />
            </div>
             <div>
              <Label htmlFor="nickname">Nickname (Display Name)</Label>
              <Input
                id="nickname"
                type="text"
                className="mt-1"
                value={profile.nickname || ""}
                onChange={(value) => onProfileChange({ nickname: value })}
                disabled={isSaving}
                placeholder="Nickname"
              />
            </div>
            <div>
              <Label htmlFor="first-name">First Name</Label>
              <Input
                id="first-name"
                type="text"
                className="mt-1"
                value={profile.firstName}
                onChange={(value) => onProfileChange({ firstName: value })}
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="middle-name">Middle Name</Label>
              <Input
                id="middle-name"
                type="text"
                className="mt-1"
                value={profile.middleName || ""}
                onChange={(value) => onProfileChange({ middleName: value })}
                disabled={isSaving}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                type="text"
                className="mt-1"
                value={profile.lastName}
                onChange={(value) => onProfileChange({ lastName: value })}
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="suffix">Suffix</Label>
              <Input
                id="suffix"
                type="text"
                className="mt-1"
                value={profile.suffix || ""}
                onChange={(value) => onProfileChange({ suffix: value })}
                disabled={isSaving}
                placeholder="Optional (e.g., Jr.)"
              />
            </div>
            <div>
              <Label htmlFor="school">School Code</Label>
              <Input
                id="school"
                type="text"
                className="mt-1"
                value={profile.school || ""}
                disabled
                placeholder="School Code"
              />
            </div>
            <div>
              <Label htmlFor="department">Department Code</Label>
              <Input
                id="department"
                type="text"
                className="mt-1"
                value={profile.department || ""}
                disabled
                placeholder="Department Code"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              className="mt-1"
              value={profile.email}
              disabled
            />
            <p className="text-sm text-neutral-500 mt-1">
              Email address cannot be changed. Contact your administrator for
              assistance.
            </p>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button
              className="bg-primary hover:bg-primary-300"
              onClick={onSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
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

