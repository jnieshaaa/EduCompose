import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TeacherDashboard from "./pages/TeacherDashboard";
import ErrorPage from "./pages/ErrorPage";

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<TeacherDashboard />} />
      <Route path="*" element={<ErrorPage code={404} />} />
      {/* You can add more error routes as needed */}
    </Routes>
  </BrowserRouter>
);

export default App;
