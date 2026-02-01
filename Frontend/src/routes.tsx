import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { DecisionsPage } from "./pages/DecisionsPage";
import { AuditPage } from "./pages/AuditPage";
import { CompliancePage } from "./pages/CompliancePage";
import { SettingsPage } from "./pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout><Dashboard /></Layout>,
  },
  {
    path: "/decisions",
    element: <Layout><DecisionsPage /></Layout>,
  },
  {
    path: "/audit",
    element: <Layout><AuditPage /></Layout>,
  },
  {
    path: "/compliance",
    element: <Layout><CompliancePage /></Layout>,
  },
  {
    path: "/settings",
    element: <Layout><SettingsPage /></Layout>,
  },
]);
