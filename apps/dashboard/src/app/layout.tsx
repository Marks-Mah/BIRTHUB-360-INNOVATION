import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard-shell";
import { RealtimeProvider } from "@/components/realtime-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BirtHub 360 Dashboard",
  description: "Revenue Operations Ecosystem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RealtimeProvider>
          <DashboardShell>{children}</DashboardShell>
        </RealtimeProvider>
      </body>
    </html>
  );
}
