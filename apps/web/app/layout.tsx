import React from "react";
import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import "./globals.css";
import { LegalFooter } from "../components/legal-footer";
import { AppProviders } from "../providers/AppProviders";

const ibmPlexSans = IBM_Plex_Sans({
  display: "swap",
  preload: true,
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  description: "BirthHub360 v1.0: multitenancy, workflow engine, marketplace de agentes e billing.",
  manifest: "/manifest.json",
  title: "BirthHub360"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={ibmPlexSans.variable} lang="pt-BR">
      <body className={ibmPlexSans.className}>
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

