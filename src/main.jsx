import { Toaster } from "react-hot-toast";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="238703562089-n53o5htfhqrboeh9pascgcf5f0ntts91.apps.googleusercontent.com">
      <AppErrorBoundary><BrowserRouter>
          <App />
          <Toaster position="top-right" />
      </BrowserRouter></AppErrorBoundary>
    </GoogleOAuthProvider>
  </StrictMode>
);
