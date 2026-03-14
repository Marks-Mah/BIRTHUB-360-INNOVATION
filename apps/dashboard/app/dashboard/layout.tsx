import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 p-8 w-full min-h-screen bg-gray-50">{children}</main>
    </div>
  );
}
