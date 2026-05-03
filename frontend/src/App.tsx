// App.tsx

import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
// Import Teacher Layout and Tabs
import TeacherLayout from "./layout/TeacherLayout.tsx";
import { DashboardTab } from "./pages/teachers/DashboardTab.tsx";
import { SettingsTab } from "./pages/teachers/SettingsTab.tsx";
import { StudentsTab } from "./pages/teachers/StudentsTab.tsx";
// import { EssaysTab } from "./pages/teachers/EssaysTab.tsx";
import { MetricsTab } from "./pages/teachers/MetricsTab.tsx";
import { CoursesTab } from "./pages/teachers/CoursesTab.tsx";
import { RubricsTab } from "./pages/teachers/RubricsTab.tsx";
import { SectionsTab } from "./pages/teachers/SectionsTab.tsx";
import { NotificationsTab as TeacherNotificationsTab } from "./pages/teachers/NotificationsTab.tsx";

// Import Admin Layout and Tabs
import AdminLayout from "./layout/AdminLayout.tsx";
import { AdminDashboardTab } from "./pages/admin/AdminDashboardTab.tsx";
import { AdminRubricsTab } from "./pages/admin/AdminRubricsTab.tsx";
import { AdminUsersTab } from "./pages/admin/AdminUsersTab.tsx";
import { AdminTeachersTab } from "./pages/admin/AdminTeachersTab.tsx";
import { AdminStudentsTab } from "./pages/admin/AdminStudentsTab.tsx";
import { AdminSettingsTab } from "./pages/admin/AdminSettingsTab.tsx";
import { AdminContentTab } from "./pages/admin/AdminContentTab.tsx";
import SchoolManagement from "./pages/admin/SchoolManagement.tsx";
import { AdminArchiveTab } from "./pages/admin/AdminArchiveTab.tsx";

// Import Student Layout and Pages (Placeholders)
// NOTE: I'm creating a new StudentLayout and placeholder components for the student pages
// based on the paths defined in StudentSidebar.tsx. You will need to create these files.
import StudentLayout from "./layout/StudentLayout.tsx"; // Create this file
import { StudentDashboardTab } from "./pages/students/StudentDashboardTab.tsx"; // Create this file
import { SubmitEssayTab } from "./pages/students/SubmitEssayTab.tsx"; // Create this file
import { MyEssaysTab } from "./pages/students/MyEssaysTab.tsx"; // Create this file
import { AIFeedbackTab } from "./pages/students/AIFeedbackTab.tsx"; // Create this file
import { ProgressTab } from "./pages/students/ProgressTab.tsx"; // Create this file
import { RubricTab } from "./pages/students/RubricTab.tsx"; // Create this file
import { NotificationsTab } from "./pages/students/NotificationsTab.tsx"; // Create this file
import { StudentSettingsTab } from "./pages/students/StudentSettingsTab.tsx"; // Create this file
import { MyClassesTab } from "./pages/students/MyClassesTab.tsx"; // Create this file
import { ClassDetailTab } from "./pages/students/ClassDetailTab.tsx"; // Create this file
import { EssayResultTranscript } from "./pages/students/EssayResultTranscript.tsx";
import HelpPage from "./pages/general/HelpPage.tsx";

// General/Legacy Imports (kept for reference or removal later)
import AnalysisResults from "./pages/AnalysisResults";
// import Students from "./pages/Students"; // Legacy, kept for reference
// import Settings from "./pages/Settings"; // Legacy, kept for reference
import { EssayManagementTab } from "./pages/teachers/EssayManagementTab.tsx";
import { ActivitiesTab } from "./pages/teachers/ActivitiesTab.tsx";
import { CompareActivitiesTab } from "./pages/teachers/CompareActivitiesTab.tsx";
import { ArchivePage } from "./pages/teachers/ArchivePage.tsx";
import Maintenance from "./pages/Maintenance.tsx";
import { supabase } from "./lib/supabaseClient";
import { useAuth } from "./contexts/AuthContext";

// General/Utility Imports
import ErrorPage from "./components/ErrorPage";
import ClickEffect from "./components/ClickEffect";
// import IntroModal from "./components/IntroModal";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/students/StudentLogin.tsx";
import StudentOnboarding from "./pages/students/StudentOnboarding.tsx";
import EmailConfirmation from "./pages/EmailConfirmation.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import { LoaderProvider, useLoader } from "./components/ui/LoaderContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import OnboardingCheck from "./components/OnboardingCheck";
import { PremiumLoader } from "./components/ui/PremiumLoader";
import { HelpProvider } from "./contexts/HelpContext";
import HelpModal from "./components/HelpModal";

/** Preserves ?ref=… when moving analysis links behind teacher auth */
const LegacyAnalysisResultsRedirect: React.FC = () => {
  const { search } = useLocation();
  return <Navigate to={`/Teacher/AnalysisResults${search}`} replace />;
};

const AppContent: React.FC = () => {
  const { loading } = useLoader();

  // useEffect(() => {
  //   const modalShown = sessionStorage.getItem("introModalShown");
  //   if (location.pathname === "/" && !modalShown) {
  //     setShowIntro(true);
  //     sessionStorage.setItem("introModalShown", "true");
  //   }
  // }, [location.pathname]);



  // const handleClose = () => setShowIntro(false);

  const [maintenanceSettings, setMaintenanceSettings] = React.useState<any>(null);
  const location = useLocation();

  React.useEffect(() => {
    const checkMaintenance = async () => {
      // 1. Check localStorage first (fastest for current user)
      const localMode = localStorage.getItem('maintenanceMode') === 'true';
      if (localMode) {
        setMaintenanceSettings({ global: true });
        return;
      }

      // 2. Check sessionStorage cache
      const cached = sessionStorage.getItem("maintenance_mode");
      if (cached) {
        setMaintenanceSettings(JSON.parse(cached));
      }

      // 3. Check database (global truth)
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();
      
      if (data) {
        setMaintenanceSettings(data.value);
        sessionStorage.setItem("maintenance_mode", JSON.stringify(data.value));
      }
    };

    checkMaintenance();
    
    const channel = supabase
      .channel('system_settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings' }, (payload) => {
        if (payload.new && payload.new.key === 'maintenance_mode') {
          setMaintenanceSettings(payload.new.value);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <ClickEffect />
      {maintenanceSettings && !location.pathname.includes("/Maintenance") && (
        <MaintenanceInterceptor settings={maintenanceSettings} />
      )}

      <Routes>
        <Route path="/Maintenance" element={<Maintenance />} />
        {/* ======================================================= */}
        {/* 1. General Routes (No Layout / Public Access) */}
        {/* ======================================================= */}
        <Route path="/" element={<LandingPage />} />
        {/* Legacy public analyzer removed; free tier no longer exposed */}
        <Route path="/AnalyzeEssay" element={<Navigate to="/" replace />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Student/Login" element={<Login />} />
        <Route path="/auth/confirm" element={<EmailConfirmation />} />
        {/* Old share links → teacher-only analysis page (requires teacher login) */}
        <Route path="/AnalysisResults" element={<LegacyAnalysisResultsRedirect />} />

        {/* Onboarding Routes */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Student/Onboarding"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Teacher/Onboarding"
          element={
            <ProtectedRoute requiredRole="teacher">
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* ======================================================= */}
        {/* 2. Teacher Routes (Protected, uses TeacherLayout) */}
        {/* All Teacher routes are now prefixed with /Teacher/ for clarity (optional, but good practice) */}
        {/* ======================================================= */}
        <Route
          path="/Teacher"
          element={
            <ProtectedRoute requiredRole="teacher">
              <OnboardingCheck>
                <TeacherLayout />
              </OnboardingCheck>
            </ProtectedRoute>
          }
        >
          {/* New/Modern Tabs */}
          <Route path="Dashboard" element={<DashboardTab />} />
          <Route path="Settings" element={<SettingsTab />} />
          <Route path="Students" element={<StudentsTab />} />
          {/* <Route path="Essays" element={<EssaysTab />} /> */}
          <Route path="Activities" element={<ActivitiesTab />} />
          <Route path="CompareActivities" element={<CompareActivitiesTab />} />
          <Route path="EssayManagement" element={<EssayManagementTab />} />
          <Route path="Metrics" element={<MetricsTab />} />
          <Route path="Courses" element={<CoursesTab />} />
          <Route path="Rubrics" element={<RubricsTab />} />
          <Route path="Sections" element={<SectionsTab />} />
          <Route path="Archive" element={<ArchivePage />} />
          <Route path="Notifications" element={<TeacherNotificationsTab />} />
          <Route path="AnalysisResults" element={<AnalysisResults />} />
          <Route path="Help" element={<HelpPage />} />

          {/* Redirect to Dashboard if hitting /Teacher without a sub-path */}

          {/* Redirect to Dashboard if hitting /Teacher without a sub-path */}
          <Route index element={<DashboardTab />} />
        </Route>

        {/* ======================================================= */}
        {/* 3. Student Routes (Protected, uses StudentLayout) */}
        {/* Routes based on StudentSidebar.tsx are implemented here. */}
        {/* ======================================================= */}
        <Route
          path="/Student"
          element={
            <ProtectedRoute requiredRole="student">
              <OnboardingCheck>
                <StudentLayout />
              </OnboardingCheck>
            </ProtectedRoute>
          }
        >
          {/* StudentSidebar Menu Items */}
          <Route path="Dashboard" element={<StudentDashboardTab />} />
          <Route path="Classes" element={<MyClassesTab />} />
          <Route path="Classes/:classId" element={<ClassDetailTab />} />
          <Route path="Submit" element={<SubmitEssayTab />} />
          <Route path="Essays" element={<MyEssaysTab />} />
          <Route path="Essays/Result" element={<EssayResultTranscript />} />
          <Route path="Feedback" element={<AIFeedbackTab />} />
          <Route path="Progress" element={<ProgressTab />} />
          <Route path="Rubric" element={<RubricTab />} />
          <Route path="Notifications" element={<NotificationsTab />} />
          <Route path="Settings" element={<StudentSettingsTab />} />
          <Route path="Help" element={<HelpPage />} />

          {/* Redirect to Dashboard if hitting /Student without a sub-path */}
          <Route index element={<StudentDashboardTab />} />
        </Route>

        {/* ======================================================= */}
        {/* 4. Admin Routes (Protected, uses AdminLayout) */}
        {/* ======================================================= */}
        <Route
          path="/Admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <OnboardingCheck>
                <AdminLayout />
              </OnboardingCheck>
            </ProtectedRoute>
          }
        >
          <Route path="Dashboard" element={<AdminDashboardTab />} />
          <Route path="Users" element={<AdminUsersTab />} />
          <Route path="Teachers" element={<AdminTeachersTab />} />
          <Route path="Students" element={<AdminStudentsTab />} />
          <Route path="Rubrics" element={<AdminRubricsTab />} />
          <Route path="Content" element={<AdminContentTab />} />
          <Route path="Schools" element={<SchoolManagement />} />
          <Route path="Settings" element={<AdminSettingsTab />} />
          <Route path="Archive" element={<AdminArchiveTab />} />
          <Route path="Help" element={<HelpPage />} />

          {/* Redirect to Dashboard if hitting /Admin without a sub-path */}
          <Route index element={<AdminDashboardTab />} />
        </Route>

        <Route path="*" element={<ErrorPage code={404} />} />
      </Routes>

      {/* Global Premium Loader */}
      <PremiumLoader 
        loading={loading} 
        message="EduCompose is preparing your workspace..." 
      />

      {/* Global Help Modal */}
      <HelpModal />
    </>
  );
};

// Helper component to handle conditional redirect based on role
const MaintenanceInterceptor: React.FC<{ settings: any }> = ({ settings }) => {
  const { user } = useAuth();

  // Automatic bypass for local development
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) return null;

  // 1. If global maintenance is on, everyone except Admin sees it
  if (settings.global && user?.role !== 'admin') {
    return <Navigate to="/Maintenance" state={{ role: 'global' }} replace />;
  }

  // 2. Specific role maintenance
  if (user?.role === 'teacher' && settings.teacher) {
    return <Navigate to="/Maintenance" state={{ role: 'teacher' }} replace />;
  }

  if (user?.role === 'student' && settings.student) {
    return <Navigate to="/Maintenance" state={{ role: 'student' }} replace />;
  }

  return null;
};

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <LoaderProvider>
        <HelpProvider>
          <AppContent />
        </HelpProvider>
      </LoaderProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
