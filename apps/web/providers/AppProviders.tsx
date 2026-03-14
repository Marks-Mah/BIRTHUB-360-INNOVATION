"use client";

import { Suspense, type ReactNode, useEffect } from "react";

import { CookieConsentBanner } from "../components/cookie-consent-banner";
import { PaywallProvider } from "../components/paywall-provider";
import { AnalyticsProvider } from "./AnalyticsProvider";
import { EngagementProvider } from "./EngagementProvider";

function ServiceWorkerBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PaywallProvider>
      <EngagementProvider>
        <Suspense fallback={null}>
          <AnalyticsProvider>
            <ServiceWorkerBootstrap />
            {children}
            <CookieConsentBanner />
          </AnalyticsProvider>
        </Suspense>
      </EngagementProvider>
    </PaywallProvider>
  );
}

