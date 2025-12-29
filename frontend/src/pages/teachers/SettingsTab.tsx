// SettingsTab Controller Component - Orchestrates settings management using MVC pattern

import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  Settings,
  AlertTriangle,
  BookOpen,
  Upload,
  Loader2,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useAlert } from "../../hooks/useAlert";
import {
  fetchTeacherSettings,
  updateTeacherProfile,
  updateAIAssessmentSettings,
  updateThresholdSettings,
  updateRubricDefaults,
  resetSettingsToDefaults,
} from "../../services/settingsService";
import type {
  TeacherSettings,
  TeacherProfile,
  AIAssessmentSettings,
  ThresholdSettings,
  RubricDefaults,
} from "../../types/settingsTypes";
import { fetchTeacherRubrics } from "../../services/rubricService";
import { supabase } from "../../lib/supabaseClient";
import { ProfileInformation } from "../../components/settings/ProfileInformation";
import { AIAssessmentSettingsComponent } from "../../components/settings/AIAssessmentSettings";
import { ThresholdSettingsComponent } from "../../components/settings/ThresholdSettings";
import { RubricDefaultsComponent } from "../../components/settings/RubricDefaults";
import { DataManagement } from "../../components/settings/DataManagement";

export function SettingsTab() {
  const { showSuccess, showError, AlertComponent } = useAlert();
  const [activeTab, setActiveTab] = useState("profile");
  const [isScrollingManually, setIsScrollingManually] = useState(false);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  // Settings state
  const [settings, setSettings] = useState<TeacherSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rubrics, setRubrics] = useState<{ id: number; name: string }[]>([]);

  // Load settings and rubrics on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [settingsData, teacherIdResult] = await Promise.all([
          fetchTeacherSettings(),
          supabase
            .from("teachers")
            .select("id")
            .eq(
              "auth_user_id",
              (await supabase.auth.getUser()).data.user?.id || ""
            )
            .single(),
        ]);

        if (settingsData) {
          setSettings(settingsData);
        }

        if (teacherIdResult.data) {
          const teacherRubrics = await fetchTeacherRubrics(
            teacherIdResult.data.id
          );
          setRubrics(
            teacherRubrics.map((r) => ({
              id: r.id,
              name: r.name,
            }))
          );
        }
      } catch {
        console.error("Error loading settings");
        showError("Failed to load settings. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [showError]);

  // Profile handlers
  const handleProfileChange = useCallback(
    (profile: Partial<TeacherProfile>) => {
      if (settings) {
        setSettings({
          ...settings,
          profile: { ...settings.profile, ...profile },
        });
      }
    },
    [settings]
  );

  const handleSaveProfile = useCallback(async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const result = await updateTeacherProfile(settings.profile);
      if (result.success) {
        showSuccess("Profile updated successfully!");
      } else {
        showError(result.error || "Failed to update profile");
      }
    } catch {
      showError("An unexpected error occurred while updating profile");
    } finally {
      setIsSaving(false);
    }
  }, [settings, showSuccess, showError]);

  // AI Assessment handlers
  const handleAISettingsChange = useCallback(
    (aiSettings: Partial<AIAssessmentSettings>) => {
      if (settings) {
        setSettings({
          ...settings,
          aiAssessment: { ...settings.aiAssessment, ...aiSettings },
        });
      }
    },
    [settings]
  );

  const handleSaveAISettings = useCallback(async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const result = await updateAIAssessmentSettings(settings.aiAssessment);
      if (result.success) {
        showSuccess("AI assessment settings saved successfully!");
      } else {
        showError(result.error || "Failed to save AI assessment settings");
      }
    } catch {
      showError("An unexpected error occurred while saving settings");
    } finally {
      setIsSaving(false);
    }
  }, [settings, showSuccess, showError]);

  // Threshold handlers
  const handleThresholdChange = useCallback(
    (thresholds: Partial<ThresholdSettings>) => {
      if (settings) {
        setSettings({
          ...settings,
          thresholds: { ...settings.thresholds, ...thresholds },
        });
      }
    },
    [settings]
  );

  const handleSaveThresholds = useCallback(async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const result = await updateThresholdSettings(settings.thresholds);
      if (result.success) {
        showSuccess("Threshold settings saved successfully!");
      } else {
        showError(result.error || "Failed to save threshold settings");
      }
    } catch {
      showError("An unexpected error occurred while saving thresholds");
    } finally {
      setIsSaving(false);
    }
  }, [settings, showSuccess, showError]);

  // Rubric defaults handlers
  const handleRubricDefaultsChange = useCallback(
    (defaults: Partial<RubricDefaults>) => {
      if (settings) {
        setSettings({
          ...settings,
          rubricDefaults: { ...settings.rubricDefaults, ...defaults },
        });
      }
    },
    [settings]
  );

  const handleSaveRubricDefaults = useCallback(async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const result = await updateRubricDefaults(settings.rubricDefaults);
      if (result.success) {
        showSuccess("Rubric defaults saved successfully!");
      } else {
        showError(result.error || "Failed to save rubric defaults");
      }
    } catch {
      showError("An unexpected error occurred while saving rubric defaults");
    } finally {
      setIsSaving(false);
    }
  }, [settings, showSuccess, showError]);

  // Reset to defaults
  const handleResetToDefaults = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await resetSettingsToDefaults();
      if (result.success) {
        const updatedSettings = await fetchTeacherSettings();
        if (updatedSettings) {
          setSettings(updatedSettings);
          showSuccess("Settings reset to defaults successfully!");
        }
      } else {
        showError(result.error || "Failed to reset settings");
      }
    } catch {
      showError("An unexpected error occurred while resetting settings");
    } finally {
      setIsSaving(false);
    }
  }, [showSuccess, showError]);

  // Scrollspy logic using Intersection Observer
  useEffect(() => {
    if (!observerRef.current) {
      const scrollContainer = document.querySelector("main");

      const observerOptions: IntersectionObserverInit = {
        root: scrollContainer as Element | null,
        rootMargin: "-10% 0px -85% 0px",
        threshold: 0,
      };

      observerRef.current = new IntersectionObserver((entries) => {
        if (
          isScrollingManually ||
          entries.every((entry) => !entry.isIntersecting)
        ) {
          return;
        }

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id);
          }
        });
      }, observerOptions);

      const sectionIds = [
        "profile",
        "ai-assessment",
        "thresholds",
        "rubric",
        "data",
      ];
      sectionIds.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          observerRef.current?.observe(element);
        }
      });
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [isScrollingManually]);

  // Click handler for smooth scrolling
  const handleNavClick = (id: string) => {
    setIsScrollingManually(true);

    const scrollContainer = document.querySelector("main");
    const targetElement = document.getElementById(id);

    if (scrollContainer && targetElement) {
      const containerRect = (
        scrollContainer as HTMLElement
      ).getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      const offsetTop =
        targetRect.top -
        containerRect.top +
        (scrollContainer as HTMLElement).scrollTop -
        16;

      (scrollContainer as HTMLElement).scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }

    setTimeout(() => {
      setIsScrollingManually(false);
      setActiveTab(id);
      window.history.pushState(null, "", `#${id}`);
    }, 400);
  };

  const settingsNavigation = [
    {
      id: "profile",
      name: "Profile Information",
      icon: User,
    },
    {
      id: "ai-assessment",
      name: "AI Assessment",
      icon: Settings,
    },
    {
      id: "thresholds",
      name: "Warning Thresholds",
      icon: AlertTriangle,
    },
    {
      id: "rubric",
      name: "Rubric Defaults",
      icon: BookOpen,
    },
    {
      id: "data",
      name: "Data Management",
      icon: Upload,
    },
  ];

  if (!settings && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <p className="text-neutral-600">
            Failed to load settings. Please refresh the page.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AlertComponent />
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage your profile, AI evaluation preferences, and system settings
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Side Navigation */}
          <div className="lg:w-1/4">
            <Card className="p-4 sticky top-6">
              <nav className="space-y-1">
                {settingsNavigation.map((item) => {
                  const isActive = item.id === activeTab;
                  const activeClasses =
                    "bg-neutral-100 text-primary-600 font-semibold";
                  const inactiveClasses =
                    "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900";

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center px-3 py-2 rounded-md transition-colors duration-150 ${
                        isActive ? activeClasses : inactiveClasses
                      }`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      <span className="text-sm text-left">{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Content Area */}
          <div className="lg:w-3/4 space-y-8">
            <ProfileInformation
              id="profile"
              profile={settings.profile}
              isLoading={isLoading}
              isSaving={isSaving}
              onProfileChange={handleProfileChange}
              onSaveProfile={handleSaveProfile}
            />

            <AIAssessmentSettingsComponent
              id="ai-assessment"
              settings={settings.aiAssessment}
              isLoading={isLoading}
              isSaving={isSaving}
              onSettingsChange={handleAISettingsChange}
              onSaveSettings={handleSaveAISettings}
            />

            <ThresholdSettingsComponent
              id="thresholds"
              thresholds={settings.thresholds}
              isLoading={isLoading}
              isSaving={isSaving}
              onThresholdChange={handleThresholdChange}
              onSaveThresholds={handleSaveThresholds}
            />

            <RubricDefaultsComponent
              id="rubric"
              defaults={settings.rubricDefaults}
              isLoading={isLoading}
              isSaving={isSaving}
              rubrics={rubrics}
              onDefaultsChange={handleRubricDefaultsChange}
              onSaveDefaults={handleSaveRubricDefaults}
            />

            <DataManagement id="data" />

            {/* Global Reset Button */}
            <div className="flex justify-end gap-2 pb-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleResetToDefaults}
                disabled={isSaving}
              >
                Reset to Defaults
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
