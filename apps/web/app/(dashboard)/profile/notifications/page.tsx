"use client";

import { useEffect, useMemo } from "react";

import { getStoredSession } from "../../../../lib/auth-client";
import { useNotificationStore } from "../../../../stores/notification-store";
import { useUserPreferencesStore } from "../../../../stores/user-preferences-store";

function ToggleCard(input: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        background: "rgba(255,255,255,0.76)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        cursor: "pointer",
        display: "grid",
        gap: "0.4rem",
        padding: "1rem"
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between"
        }}
      >
        <strong>{input.label}</strong>
        <input
          checked={input.checked}
          disabled={input.disabled}
          onChange={(event) => input.onChange(event.target.checked)}
          type="checkbox"
        />
      </div>
      <span style={{ color: "var(--muted)" }}>{input.description}</span>
    </label>
  );
}

export default function NotificationPreferencesPage() {
  const session = useMemo(() => getStoredSession(), []);
  const preferences = useUserPreferencesStore((state) => state.preferences);
  const prefError = useUserPreferencesStore((state) => state.error);
  const prefHydrated = useUserPreferencesStore((state) => state.hydrated);
  const prefSaving = useUserPreferencesStore((state) => state.isSaving);
  const hydratePreferences = useUserPreferencesStore((state) => state.hydrate);
  const updatePreferences = useUserPreferencesStore((state) => state.update);
  const feed = useNotificationStore((state) => state.items);
  const feedError = useNotificationStore((state) => state.error);
  const isLoadingFeed = useNotificationStore((state) => state.isLoading);
  const nextCursor = useNotificationStore((state) => state.nextCursor);
  const refreshFeed = useNotificationStore((state) => state.refresh);
  const loadMore = useNotificationStore((state) => state.loadMore);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  useEffect(() => {
    if (!session) {
      return;
    }

    void hydratePreferences();
    void refreshFeed();
  }, [hydratePreferences, refreshFeed, session]);

  if (!session) {
    return (
      <main style={{ padding: "1.5rem" }}>
        <div className="panel">
          <h1 style={{ marginTop: 0 }}>Notificacoes e consentimento</h1>
          <p>Realize login para configurar preferencias de email, in-app e telemetria.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
      <section className="hero-card">
        <span className="badge">Engajamento do usuario</span>
        <h1>Preferencias de notificacao</h1>
        <p style={{ marginBottom: 0 }}>
          Controle email, feed in-app, base de push e consentimento de analytics em um unico lugar.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gap: "0.9rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
        }}
      >
        <ToggleCard
          checked={preferences.inAppNotifications}
          description="Mantem badge e feed na navbar com polling leve."
          disabled={prefSaving || !prefHydrated}
          label="Notificacoes in-app"
          onChange={(checked) => {
            void updatePreferences({
              inAppNotifications: checked
            });
          }}
        />
        <ToggleCard
          checked={preferences.emailNotifications}
          description="Emails transacionais como workflow concluido e erro critico."
          disabled={prefSaving || !prefHydrated}
          label="Emails transacionais"
          onChange={(checked) => {
            void updatePreferences({
              emailNotifications: checked
            });
          }}
        />
        <ToggleCard
          checked={preferences.marketingEmails}
          description="Exemplo de opt-out para emails promocionais."
          disabled={prefSaving || !prefHydrated}
          label="Emails promocionais"
          onChange={(checked) => {
            void updatePreferences({
              marketingEmails: checked
            });
          }}
        />
        <ToggleCard
          checked={preferences.pushNotifications}
          description="Fundacao pronta para web push V2 com service worker."
          disabled={prefSaving || !prefHydrated}
          label="Push web"
          onChange={(checked) => {
            void updatePreferences({
              pushNotifications: checked
            });
          }}
        />
      </section>

      <section className="panel">
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h2 style={{ marginTop: 0 }}>Consentimento de cookies</h2>
            <p style={{ color: "var(--muted)", marginBottom: 0 }}>
              O provider de analytics so inicializa quando o consentimento estiver aceito.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.65rem" }}>
            <button
              className="action-button"
              disabled={prefSaving}
              onClick={() => {
                void updatePreferences({
                  cookieConsent: "ACCEPTED"
                });
              }}
              type="button"
            >
              Aceitar
            </button>
            <button
              className="ghost-button"
              disabled={prefSaving}
              onClick={() => {
                void updatePreferences({
                  cookieConsent: "REJECTED"
                });
              }}
              type="button"
            >
              Rejeitar
            </button>
          </div>
        </div>
        <p style={{ marginBottom: 0 }}>
          Status atual: <strong>{preferences.cookieConsent}</strong>
        </p>
        {prefError ? <p style={{ color: "#9b2f2f", marginBottom: 0 }}>{prefError}</p> : null}
      </section>

      <section className="panel">
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h2 style={{ marginTop: 0 }}>Feed de notificacoes</h2>
            <p style={{ color: "var(--muted)", marginBottom: 0 }}>
              Ultimas entradas agrupadas por recencia para leitura rapida.
            </p>
          </div>
          <button
            className="ghost-button"
            onClick={() => {
              void markAllAsRead();
            }}
            type="button"
          >
            Marcar todas como lidas
          </button>
        </div>

        {feed.length === 0 && !isLoadingFeed ? (
          <p style={{ marginBottom: 0 }}>Nenhuma notificacao encontrada.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {feed.map((item) => (
              <article
                key={item.id}
                style={{
                  background: item.isRead ? "rgba(255,255,255,0.7)" : "rgba(19,93,102,0.08)",
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  display: "grid",
                  gap: "0.35rem",
                  padding: "0.9rem"
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "space-between"
                  }}
                >
                  <strong>{item.type.replace(/_/g, " ")}</strong>
                  <small style={{ color: "var(--muted)" }}>
                    {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </small>
                </div>
                <span>{item.content}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
                  {item.link ? (
                    <a href={item.link} style={{ color: "var(--accent-strong)" }}>
                      Abrir link
                    </a>
                  ) : null}
                  {!item.isRead ? (
                    <button
                      className="ghost-button"
                      onClick={() => {
                        void markAsRead(item.id);
                      }}
                      type="button"
                    >
                      Marcar como lida
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        {nextCursor ? (
          <button
            className="ghost-button"
            disabled={isLoadingFeed}
            onClick={() => {
              void loadMore();
            }}
            type="button"
          >
            {isLoadingFeed ? "Carregando..." : "Carregar mais"}
          </button>
        ) : null}

        {feedError ? <p style={{ color: "#9b2f2f", marginBottom: 0 }}>{feedError}</p> : null}
      </section>
    </main>
  );
}

