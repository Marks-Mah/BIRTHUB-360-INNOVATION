"use client";

import {
  createContext,
  type ReactNode,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getStoredSession } from "../lib/auth-client";
import { useUserPreferencesStore } from "../stores/user-preferences-store";

interface AnalyticsContextValue {
  ready: boolean;
  track: (event: string, properties?: Record<string, unknown>) => void;
}

interface AnalyticsClient {
  track: (event: string, properties?: Record<string, unknown>) => Promise<void>;
}

const redactedFieldPatterns = [
  /email/i,
  /name/i,
  /prompt/i,
  /doc/i,
  /token/i,
  /secret/i,
  /content/i,
  /notes/i,
  /expected/i,
  /description/i,
  /input/i,
  /output/i
];

const AnalyticsContext = createContext<AnalyticsContextValue>({
  ready: false,
  track: () => undefined
});

function safeSessionId(): string {
  const existing = window.sessionStorage.getItem("bh_analytics_session_id");

  if (existing) {
    return existing;
  }

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `session-${Date.now().toString(36)}`;
  window.sessionStorage.setItem("bh_analytics_session_id", next);

  return next;
}

async function hashIdentifier(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeString(keyPath: string[], value: string): string {
  if (redactedFieldPatterns.some((pattern) => pattern.test(keyPath.join(".")))) {
    return "[redacted]";
  }

  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(sk|pk|rk|whsec|sg)\_[A-Za-z0-9_\-]+\b/g, "[redacted-token]")
    .replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi, "Bearer [redacted-token]")
    .slice(0, 180);
}

function sanitizeValue(keyPath: string[], value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return sanitizeString(keyPath, value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(keyPath, item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        sanitizeValue([...keyPath, key], nested)
      ])
    );
  }

  return String(value);
}

function buildAnalyticsClient(input: {
  apiKey: string;
  distinctId: string;
  host: string;
  sessionId: string;
  tenantId: string;
}): AnalyticsClient {
  const endpoint = new URL("/capture/", input.host).toString();

  return {
    async track(event, properties = {}) {
      const payload = {
        api_key: input.apiKey,
        distinct_id: input.distinctId,
        event,
        properties: sanitizeValue([], {
          ...properties,
          bh_session_id: input.sessionId,
          bh_tenant_id: input.tenantId
        })
      };

      const body = JSON.stringify(payload);

      try {
        if (navigator.sendBeacon && document.visibilityState === "hidden") {
          navigator.sendBeacon(
            endpoint,
            new Blob([body], {
              type: "application/json"
            })
          );
          return;
        }

        await fetch(endpoint, {
          body,
          headers: {
            "content-type": "application/json"
          },
          keepalive: true,
          method: "POST",
          mode: "cors"
        });
      } catch {
        // Trackers blocked by extensions or privacy settings must never break the UI tree.
      }
    }
  };
}

export function AnalyticsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const cookieConsent = useUserPreferencesStore((state) => state.preferences.cookieConsent);
  const clientRef = useRef<AnalyticsClient | null>(null);
  const previousPageViewRef = useRef<string | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    const userId = session?.userId;
    const tenantId = session?.tenantId;

    if (
      !session ||
      !userId ||
      !tenantId ||
      cookieConsent !== "ACCEPTED" ||
      !apiKey ||
      !host
    ) {
      clientRef.current = null;
      setReady(false);
      return;
    }

    let active = true;

    void hashIdentifier(userId).then((distinctId) => {
      if (!active) {
        return;
      }

      clientRef.current = buildAnalyticsClient({
        apiKey,
        distinctId,
        host,
        sessionId: safeSessionId(),
        tenantId
      });

      startTransition(() => {
        setReady(true);
      });
    });

    return () => {
      active = false;
    };
  }, [cookieConsent]);

  useEffect(() => {
    if (!ready || !clientRef.current) {
      return;
    }

    const nextPage = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;

    if (previousPageViewRef.current === nextPage) {
      return;
    }

    previousPageViewRef.current = nextPage;
    void clientRef.current.track("$pageview", {
      path: pathname,
      search: searchParams.toString()
    });
  }, [pathname, ready, searchParams]);

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      ready,
      track(event, properties) {
        void clientRef.current?.track(event, properties);
      }
    }),
    [ready]
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsContextValue {
  return useContext(AnalyticsContext);
}

