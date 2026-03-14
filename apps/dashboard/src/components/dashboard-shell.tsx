"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  DollarSign,
  Settings,
  Megaphone,
  CreditCard,
  FileText
} from "lucide-react";
import clsx from "clsx";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            BirtHub 360
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Overview" />
          <NavItem href="/leads" icon={<Users size={20} />} label="Leads (LDR)" />
          <NavItem href="/deals" icon={<Briefcase size={20} />} label="Deals (SDR/AE)" />
          <NavItem href="/customers" icon={<Users size={20} />} label="Customers (CS)" />
          <NavItem href="/marketing" icon={<Megaphone size={20} />} label="Marketing" />
          <NavItem href="/finance" icon={<DollarSign size={20} />} label="Finance" />
          <NavItem href="/contracts" icon={<FileText size={20} />} label="Contracts" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" />
        </div>
      </aside>

      <main className="flex-1 ml-64 overflow-y-auto">
        <header className="bg-white border-b h-16 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <div className="text-sm font-medium text-gray-500">
            Welcome back, Admin
          </div>
          <div className="flex items-center gap-4">
             <div className="h-8 w-8 rounded-full bg-slate-200 ring-2 ring-offset-2 ring-slate-300"></div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
        isActive
          ? "bg-slate-800 text-white font-medium"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );
}
