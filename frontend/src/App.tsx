import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorPage from "./pages/ErrorPage";
import EduComposeLogin from "./components/Login";

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<EduComposeLogin />} />
      <Route path="*" element={<ErrorPage code={404} />} />
      {/* You can add more error routes as needed */}
    </Routes>
  </BrowserRouter>
);

export default App;
