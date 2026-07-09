import "@ant-design/v5-patch-for-react-19";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import "@/styles/globals.css";
import "@/styles/role-colors.css";
import "@/styles/project-form.css";
import "@/styles/projects-database.css";
import "@/styles/cnf-tracker.css";
import "@/styles/dashboard.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
