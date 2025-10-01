import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorPage from "./components/ErrorPage";
import EduComposeLogin from "./components/Login";
import TeacherDashboard from "./pages/TeacherDashboard";

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<EduComposeLogin />} />
      <Route path="/dashboard" element={<TeacherDashboard />} />
      <Route path="*" element={<ErrorPage code={404} />} />
      {/* You can add more error routes as needed */}
    </Routes>
  </BrowserRouter>
);

export default App;
