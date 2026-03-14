import React from "react";
import type { Metadata } from "next";

import "./globals.css";
import { LegalFooter } from "../components/legal-footer";
import { AppProviders } from "../providers/AppProviders";

export const metadata: Metadata = {
  description: "BirthHub360 v1.0: multitenancy, workflow engine, marketplace de agentes e billing.",
  manifest: "/manifest.json",
  title: "BirthHub360"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>
          <div className="app-shell">
            <div className="app-shell__content">{children}</div>
            <LegalFooter />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
