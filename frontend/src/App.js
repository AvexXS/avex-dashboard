import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import "@/index.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";

import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import DesignServices from "@/pages/DesignServices";
import VPS from "@/pages/VPS";
import About from "@/pages/About";
import Legal from "@/pages/Legal";

import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import DashboardHome from "@/pages/dashboard/DashboardHome";
import Servers from "@/pages/dashboard/Servers";
import ServerDetail from "@/pages/dashboard/ServerDetail";
import Tickets from "@/pages/dashboard/Tickets";
import TicketDetail from "@/pages/dashboard/TicketDetail";
import Billing from "@/pages/dashboard/Billing";
import Account from "@/pages/dashboard/Account";

import AdminLayout from "@/pages/admin/AdminLayout";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminPlans from "@/pages/admin/AdminPlans";
import AdminTickets from "@/pages/admin/AdminTickets";
import AdminInvoices from "@/pages/admin/AdminInvoices";
import AdminSettings from "@/pages/admin/AdminSettings";

function Protected({ children, roles }) {
  const { user, bootstrapped } = useAuth();
  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white/40 font-mono text-sm">
        loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="bottom-right" richColors closeButton theme="dark" />
        <Routes>
          {/* Marketing */}
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/design" element={<DesignServices />} />
          <Route path="/vps" element={<VPS />} />
          <Route path="/about" element={<About />} />
          <Route path="/legal/:doc" element={<Legal />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* User dashboard */}
          <Route
            path="/dashboard"
            element={
              <Protected>
                <DashboardLayout />
              </Protected>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="servers" element={<Servers />} />
            <Route path="servers/:serverId" element={<ServerDetail />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="tickets/:ticketId" element={<TicketDetail />} />
            <Route path="billing" element={<Billing />} />
            <Route path="account" element={<Account />} />
          </Route>

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <Protected roles={["admin", "staff", "engineer"]}>
                <AdminLayout />
              </Protected>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="invoices" element={<AdminInvoices />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
