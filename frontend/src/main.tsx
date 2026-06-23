import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ConfigProvider } from "./context/ConfigContext";
import { AuthProvider } from "./context/AuthContext";
import { StandortProvider } from "./context/StandortContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider>
      <AuthProvider>
        <StandortProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </StandortProvider>
      </AuthProvider>
    </ConfigProvider>
  </StrictMode>
);
