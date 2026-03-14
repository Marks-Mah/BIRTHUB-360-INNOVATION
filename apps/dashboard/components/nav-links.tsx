"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlatform } from "./platform-provider";
import { t } from "../lib/platform-i18n";

const links = [
  ["/", "overview"],
  ["/pipeline", "salesPipeline"],
  ["/health-score", "healthScore"],
  ["/financeiro", "financialView"],
  ["/analytics", "analytics"],
  ["/contratos", "contracts"],
  ["/atividades", "agentActivities"],
  ["/sales", "salesOs"],
  ["/migrations", "migrations"],
] as const;

export function NavLinks() {
  const pathname = usePathname();
  const { language } = usePlatform();

  return (
    <nav className="top-nav" aria-label="Navegação do dashboard">
      {links.map(([href, key]) => {
        const isActive = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            className={`nav-link${isActive ? " active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {t(language, key)}
          </Link>
        );
      })}
    </nav>
  );
}
