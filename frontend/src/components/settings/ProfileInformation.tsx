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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div>
            <Label htmlFor="institution">Institution/Organization</Label>
            <Input
              id="institution"
              type="text"
              className="mt-1"
              value={profile.institution || ""}
              onChange={(value) => onProfileChange({ institution: value })}
              placeholder="Enter your institution or organization"
              disabled={isSaving}
            />
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

