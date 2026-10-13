import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { AppContextProvider } from "./context/AppContext.jsx";
import { WorkerAppContextProvider } from "./context/WorkerAppContext.jsx"; // ← เพิ่ม

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AppContextProvider>
      <WorkerAppContextProvider>
        <App />
      </WorkerAppContextProvider>
    </AppContextProvider>
  </BrowserRouter>,
);
