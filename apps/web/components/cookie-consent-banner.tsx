"use client";

import { useMemo } from "react";

import { getStoredSession } from "../lib/auth-client";
import { useUserPreferencesStore } from "../stores/user-preferences-store";

export function CookieConsentBanner() {
  const hydrated = useUserPreferencesStore((state) => state.hydrated);
  const isSaving = useUserPreferencesStore((state) => state.isSaving);
  const preferences = useUserPreferencesStore((state) => state.preferences);
  const update = useUserPreferencesStore((state) => state.update);
  const session = useMemo(() => getStoredSession(), []);

  if (!session || !hydrated || preferences.cookieConsent !== "PENDING") {
    return null;
  }

  return (
    <aside
      style={{
        backdropFilter: "blur(14px)",
        background: "rgba(16,42,67,0.94)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 24,
        bottom: 20,
        color: "#f8fafc",
        display: "grid",
        gap: "0.9rem",
        left: 20,
        maxWidth: 520,
        padding: "1rem 1.1rem",
        position: "fixed",
        right: 20,
        width: "min(100% - 40px, 520px)",
        zIndex: 1200
      }}
    >
      <div style={{ display: "grid", gap: "0.35rem" }}>
        <strong>Consentimento de analytics</strong>
        <p style={{ color: "rgba(226,232,240,0.9)", margin: 0 }}>
          Usamos telemetria sem PII para medir pageviews e execucao de agentes. Se voce rejeitar,
          o tracker externo permanece desligado.
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <button
          className="action-button"
          disabled={isSaving}
          onClick={() => {
            void update({
              cookieConsent: "ACCEPTED"
            });
          }}
          type="button"
        >
          Aceitar analytics
        </button>
        <button
          className="ghost-button"
          disabled={isSaving}
          onClick={() => {
            void update({
              cookieConsent: "REJECTED"
            });
          }}
          style={{
            background: "rgba(255,255,255,0.08)",
            borderColor: "rgba(255,255,255,0.18)",
            color: "#f8fafc"
          }}
          type="button"
        >
          Rejeitar
        </button>
      </div>
    </aside>
  );
}

