import type { ReactNode } from "react";

import { DashboardBillingGate } from "../../components/dashboard-billing-gate";
import { Navbar } from "../../components/layout/Navbar";
import "./dashboard.css";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar">
        <Navbar />
      </header>
      <main className="dashboard-content">
        <DashboardBillingGate>{children}</DashboardBillingGate>
      </main>
    </div>
  );
}

