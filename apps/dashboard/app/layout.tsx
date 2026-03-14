import type { ReactNode } from "react";
import "./styles.css";
import { NavLinks } from "../components/nav-links";
import { SidebarOps } from "../components/sidebar-ops";
import { PlatformProvider } from "../components/platform-provider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <PlatformProvider>
          <NavLinks />
          <div className="app-shell"><SidebarOps /><section className="app-content">{children}</section></div>
        </PlatformProvider>
      </body>
    </html>
  );
}
