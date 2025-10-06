import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorPage from "./components/ErrorPage";
import EduComposeLogin from "./components/Login";
import TeacherDashboard from "./pages/TeacherDashboard";
import Essay from "./pages/Essay"; // ⬅️ Add your Essay page
import ClientSidebar from "./components/ClientSidebar";

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Public route */}
      <Route path='/' element={<EduComposeLogin />} />

      {/* Protected / client layout routes */}
      <Route
        path='/dashboard'
        element={
          <ClientSidebar>
            <TeacherDashboard />
          </ClientSidebar>
        }
      />
      <Route
        path='/essays'
        element={
          <ClientSidebar>
            <Essay />
          </ClientSidebar>
        }
      />

      {/* Catch-all error */}
      <Route path='*' element={<ErrorPage code={404} />} />
    </Routes>
  </BrowserRouter>
);

export default App;
