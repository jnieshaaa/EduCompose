// SettingsTab Controller Component - Orchestrates settings management using MVC pattern

import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  Upload,
  Loader2,
  RotateCcw,
  Lock,
  Archive,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAlert } from "../../hooks/useAlert";
import {
  fetchTeacherSettings,
  updateTeacherProfile,
  resetSettingsToDefaults,
} from "../../services/settingsService";
import type {
  TeacherSettings,
  TeacherProfile,
} from "../../types/settingsTypes";
import { useAuth } from "../../contexts/AuthContext";
import { ProfileInformation } from "../../components/settings/ProfileInformation";
import { DataManagement } from "../../components/settings/DataManagement";
import { ChangePassword } from "../../components/settings/ChangePassword";

export function SettingsTab() {
  const { checkAuth } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError, AlertComponent } = useAlert();
  const [activeTab, setActiveTab] = useState("profile");
  const [isScrollingManually, setIsScrollingManually] = useState(false);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  // Settings state
  const [settings, setSettings] = useState<TeacherSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings and rubrics on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const settingsData = await fetchTeacherSettings();

        if (settingsData) {
          setSettings(settingsData);
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
        await checkAuth(); // Refresh header
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

      const sectionIds = ["profile", "security", "data", "archive"];
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
    { id: "profile", name: "Profile", icon: User },
    { id: "security", name: "Security", icon: Lock },
    { id: "data", name: "My Data", icon: Upload },
    { id: "archive", name: "Archives", icon: Archive },
  ];

  if (!settings && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 min-h-[400px]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-xs text-neutral-400">Loading settings…</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="bg-error-default/5 border border-error-default/15 rounded-xl p-6 text-center">
          <p className="text-sm text-error-dark">
            Failed to load settings. Please refresh the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertComponent />
      <div className="p-6 space-y-0">
        {/* ─── Header ─── */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-neutral-900">Settings</h1>
          <p className="text-sm text-neutral-400 mt-1 font-medium">
            Manage your account and AI grading settings
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Side Navigation ─── */}
          <div className="lg:w-56 flex-shrink-0">
            <nav className="sticky top-6 space-y-1">
              {settingsNavigation.map((item) => {
                const isActive = item.id === activeTab;
 
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-left ${
                      isActive
                        ? "bg-primary/5 text-primary font-bold shadow-sm ring-1 ring-primary/10"
                        : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? "text-primary" : "text-neutral-400"
                    }`} />
                    <span className="text-sm font-bold uppercase tracking-widest">{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ─── Content Area ─── */}
          <div className="flex-1 min-w-0 space-y-8">
            <ProfileInformation
              id="profile"
              profile={settings.profile}
              isLoading={isLoading}
              isSaving={isSaving}
              onProfileChange={handleProfileChange}
              onSaveProfile={handleSaveProfile}
            />

            <ChangePassword id="security" />

            <DataManagement id="data" />

            {/* Archive Section */}
            <div id="archive" className="bg-white border border-neutral-100 rounded-2xl overflow-hidden scroll-mt-20">
              <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                    <Archive size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-neutral-800 tracking-tight">Records Archive</h2>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Historical Data & Deleted Items</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="text-sm font-bold text-neutral-700 mb-1">Archived Activities</h4>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Access your previous academic years' records, archived activities, and restored items.
                    </p>
                  </div>
                  <button 
                    onClick={() => navigate("/Teacher/Archive")}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-neutral-200 text-neutral-700 text-xs font-black rounded-xl hover:border-primary hover:text-primary transition-all uppercase tracking-widest shadow-sm"
                  >
                    Open Archive Center
                  </button>
                </div>
              </div>
            </div>

            {/* Global Reset */}
            <div className="flex items-center justify-end pt-5 border-t border-neutral-100 pb-10">
              <button
                onClick={handleResetToDefaults}
                disabled={isSaving}
                className="flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-error-default transition-colors disabled:opacity-40 uppercase tracking-widest"
              >
                <RotateCcw size={16} />
                Reset All Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
