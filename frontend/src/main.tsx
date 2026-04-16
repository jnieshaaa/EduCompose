import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { NotificationProvider } from "./context/NotificationContext";
import { GradingProvider } from "./context/GradingContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NotificationProvider>
      <GradingProvider>
        <App />
      </GradingProvider>
    </NotificationProvider>
  </StrictMode>
);
