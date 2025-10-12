import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EduComposeLogin from "./pages/Login";
import TeacherDashboard from "./pages/TeacherDashboard";
import Essay from "./pages/Essay";
import ClientLayout from "./components/ClientLayout";
import ErrorPage from "./components/ErrorPage";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path='/' element={<EduComposeLogin />} />

        {/* Protected layout with sidebar + header */}
        <Route
          path='/dashboard'
          element={
            <ClientLayout>
              <TeacherDashboard />
            </ClientLayout>
          }
        />
        <Route
          path='/essays'
          element={
            <ClientLayout>
              <Essay />
            </ClientLayout>
          }
        />

        {/* Catch-all error */}
        <Route path='*' element={<ErrorPage code={404} />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
