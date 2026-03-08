// App.tsx

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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

// General/Legacy Imports (kept for reference or removal later)
import Dashboard_v2 from "./pages/Dashboard_v2"; // Kept, but moved under /Teacher
import ClassManagement from "./pages/ClassManagement"; // Kept, but moved under /Teacher
import AssignmentManagement from "./pages/AssignmentManagement"; // Kept, but moved under /Teacher
import Gradebook from "./pages/Gradebook"; // Kept, but moved under /Teacher
import EssayActivity from "./pages/EssayActivity.tsx"; // Kept, but moved under /Teacher
import SectionsList from "./pages/SectionsList"; // Kept, but moved under /Teacher
import AnalysisResults from "./pages/AnalysisResults"; // General route (no layout)
// import Students from "./pages/Students"; // Legacy, kept for reference
// import Settings from "./pages/Settings"; // Legacy, kept for reference
import { EssayManagementTab } from "./pages/teachers/EssayManagementTab.tsx";
import { ActivitiesTab } from "./pages/teachers/ActivitiesTab.tsx";
import { CompareActivitiesTab } from "./pages/teachers/CompareActivitiesTab.tsx";
import { ArchivePage } from "./pages/teachers/ArchivePage.tsx";

// General/Utility Imports
import ErrorPage from "./components/ErrorPage";
import ClickEffect from "./components/ClickEffect";
// import IntroModal from "./components/IntroModal";
import LandingPage from "./pages/LandingPage";
import AnalyzeEssay from "./pages/AnalyzeEssay";
import About from "./pages/About.tsx";
import Login from "./pages/Login.tsx";
import EmailConfirmation from "./pages/EmailConfirmation.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import { LoaderProvider, useLoader } from "./components/ui/LoaderContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import OnboardingCheck from "./components/OnboardingCheck";

const AppContent: React.FC = () => {
  const location = useLocation();
  const { setLoading } = useLoader();

  // useEffect(() => {
  //   const modalShown = sessionStorage.getItem("introModalShown");
  //   if (location.pathname === "/" && !modalShown) {
  //     setShowIntro(true);
  //     sessionStorage.setItem("introModalShown", "true");
  //   }
  // }, [location.pathname]);

  // Trigger loader on route change
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 800); // simulate page load
    return () => clearTimeout(timer);
  }, [location.pathname, setLoading]);

  // const handleClose = () => setShowIntro(false);

  return (
    <>
      <ClickEffect />
      {/* <IntroModal isOpen={showIntro} onClose={handleClose} /> */}

      <Routes>
        {/* ======================================================= */}
        {/* 1. General Routes (No Layout / Public Access) */}
        {/* ======================================================= */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/AnalyzeEssay" element={<AnalyzeEssay />} />
        <Route path="/About" element={<About />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/auth/confirm" element={<EmailConfirmation />} />
        <Route path="/AnalysisResults" element={<AnalysisResults />} />
        
        {/* Onboarding Route (Protected but no onboarding check) */}
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<ErrorPage code={404} />} />

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

          {/* Legacy/Detailed Routes (can be removed later if tabs cover them) */}
          <Route path="Dashboard_v2" element={<Dashboard_v2 />} />
          <Route path="ClassManagement" element={<ClassManagement />} />
          <Route
            path="AssignmentManagement"
            element={<AssignmentManagement />}
          />
          <Route path="Gradebook" element={<Gradebook />} />
          <Route path="EssayActivity" element={<EssayActivity />} />
          <Route path="SectionsList" element={<SectionsList />} />

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
          <Route path="Feedback" element={<AIFeedbackTab />} />
          <Route path="Progress" element={<ProgressTab />} />
          <Route path="Rubric" element={<RubricTab />} />
          <Route path="Notifications" element={<NotificationsTab />} />
          <Route path="Settings" element={<StudentSettingsTab />} />

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
          <Route path="Rubrics" element={<AdminRubricsTab />} />
          <Route path="Content" element={<AdminContentTab />} />
          <Route path="Schools" element={<SchoolManagement />} />
          <Route path="Settings" element={<AdminSettingsTab />} />
          <Route path="Archive" element={<AdminArchiveTab />} />

          {/* Redirect to Dashboard if hitting /Admin without a sub-path */}
          <Route index element={<AdminDashboardTab />} />
        </Route>
      </Routes>
    </>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <LoaderProvider>
        <AppContent />
      </LoaderProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
