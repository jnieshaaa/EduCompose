// App.tsx

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
// import Dashboard from "./pages/Dashboard"; // Hidden for future purposes
import Dashboard_v2 from "./pages/Dashboard_v2";
import EssayManagement from "./pages/EssayManagement";
import ClassManagement from "./pages/ClassManagement";
import AssignmentManagement from "./pages/AssignmentManagement";
import Gradebook from "./pages/Gradebook";
import Students from "./pages/Students";
import Settings from "./pages/Settings";
import ClientLayout from "./layout/ClientLayout";
import ErrorPage from "./components/ErrorPage";
import ClickEffect from "./components/ClickEffect";
import SectionsList from "./pages/SectionsList";
import IntroModal from "./components/IntroModal";
import LandingPage from "./pages/LandingPage";
import About from "./pages/About.tsx";
import EssayActivity from "./pages/EssayActivity.tsx";
import AnalysisResults from "./pages/AnalysisResults";
import { LoaderProvider, useLoader } from "./components/ui/LoaderContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

const AppContent: React.FC = () => {
  const location = useLocation();
  const { setLoading } = useLoader();
  const [showIntro, setShowIntro] = React.useState(false);

  useEffect(() => {
    const modalShown = sessionStorage.getItem("introModalShown");
    if (location.pathname === "/" && !modalShown) {
      setShowIntro(true);
      sessionStorage.setItem("introModalShown", "true");
    }
  }, [location.pathname]);

  // Trigger loader on route change
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 800); // simulate page load
    return () => clearTimeout(timer);
  }, [location.pathname, setLoading]);

  const handleClose = () => setShowIntro(false);

  return (
    <>
      <ClickEffect />
      <IntroModal isOpen={showIntro} onClose={handleClose} />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/About" element={<About />} />
        <Route path="/AnalysisResults" element={<AnalysisResults />} />
        <Route
          path="/Dashboard"
          element={
            <ProtectedRoute>
              <ClientLayout>
                <Dashboard_v2 />
              </ClientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/Dashboard_v2"
          element={
            <ProtectedRoute>
              <ClientLayout>
                <Dashboard_v2 />
              </ClientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/EssayManagement"
          element={
            <ProtectedRoute>
              <ClientLayout>
                <EssayManagement />
              </ClientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ClassManagement"
          element={
            <ProtectedRoute>
              <ClientLayout>
                <ClassManagement />
              </ClientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/EssayActivity"
          element={
            <ProtectedRoute>
              <ClientLayout>
                <EssayActivity />
              </ClientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/AssignmentManagement"
          element={
            <ProtectedRoute>
              <ClientLayout>
                <AssignmentManagement />
              </ClientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/Gradebook"
          element={
            <ProtectedRoute>
              <ClientLayout>
                <Gradebook />
              </ClientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/Settings"
          element={
            <ProtectedRoute>
              <ClientLayout>
                <Settings />
              </ClientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/Students"
          element={
            <ProtectedRoute>
              <ClientLayout>
                <Students />
              </ClientLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/SectionsList"
          element={
            <ProtectedRoute>
              <ClientLayout>
                <SectionsList />
              </ClientLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<ErrorPage code={404} />} />
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
