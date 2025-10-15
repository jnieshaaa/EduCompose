import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EduComposeLogin from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EssayManagement from "./pages/EssayManagement";
import ClientLayout from "./components/ClientLayout";
import ErrorPage from "./components/ErrorPage";
import ClickEffect from "./components/ClickEffect";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ClickEffect />
      <Routes>
        <Route path='/' element={<EduComposeLogin />} />
        <Route
          path='/Dashboard'
          element={
            <ClientLayout>
              <Dashboard />
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
        <Route path='*' element={<ErrorPage code={404} />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
