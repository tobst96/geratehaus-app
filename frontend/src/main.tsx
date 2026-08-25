import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ConfigProvider } from "./context/ConfigContext";
import { AuthProvider } from "./context/AuthProvider";
import { ToastProvider } from "./context/ToastContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ConfigProvider>
  </StrictMode>
);
