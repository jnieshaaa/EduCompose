import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
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
import About from "./pages/About";
import { LoaderProvider, useLoader } from "./components/ui/LoaderContext";

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
  }, [location.pathname]);

  const handleClose = () => setShowIntro(false);

  return (
    <>
      <ClickEffect />
      <IntroModal isOpen={showIntro} onClose={handleClose} />

      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/About' element={<About />} />
        <Route
          path='/Dashboard'
          element={
            <ClientLayout>
              <Dashboard />
            </ClientLayout>
          }
        />
        <Route
          path='/Dashboard_v2'
          element={
            <ClientLayout>
              <Dashboard_v2 />
            </ClientLayout>
          }
        />
        <Route
          path='/EssayManagement'
          element={
            <ClientLayout>
              <EssayManagement />
            </ClientLayout>
          }
        />
        <Route
          path='/ClassManagement'
          element={
            <ClientLayout>
              <ClassManagement />
            </ClientLayout>
          }
        />
        <Route
          path='/AssignmentManagement'
          element={
            <ClientLayout>
              <AssignmentManagement />
            </ClientLayout>
          }
        />
        <Route
          path='/Gradebook'
          element={
            <ClientLayout>
              <Gradebook />
            </ClientLayout>
          }
        />
        <Route
          path='/Settings'
          element={
            <ClientLayout>
              <Settings />
            </ClientLayout>
          }
        />
        <Route
          path='/Students'
          element={
            <ClientLayout>
              <Students />
            </ClientLayout>
          }
        />
        <Route
          path='/SectionsList'
          element={
            <ClientLayout>
              <SectionsList />
            </ClientLayout>
          }
        />
        <Route path='*' element={<ErrorPage code={404} />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <LoaderProvider>
      <AppContent />
    </LoaderProvider>
  </BrowserRouter>
);

export default App;
