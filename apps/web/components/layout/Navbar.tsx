"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck, ExternalLink } from "lucide-react";

import {
  type NotificationItem,
  useNotificationStore
} from "../../stores/notification-store";
import { useUserPreferencesStore } from "../../stores/user-preferences-store";

function toDisplayDateLabel(value: string): string {
  const current = new Date();
  const target = new Date(value);
  const dayDiff = Math.floor(
    (Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()) -
      Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())) /
      (24 * 60 * 60 * 1000)
  );

  if (dayDiff === 0) {
    return "Hoje";
  }

  if (dayDiff === 1) {
    return "Ontem";
  }

  return target.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short"
  });
}

function groupByDay(items: NotificationItem[]) {
  return items.reduce<Array<{ label: string; items: NotificationItem[] }>>((groups, item) => {
    const label = toDisplayDateLabel(item.createdAt);
    const currentGroup = groups.find((group) => group.label === label);

    if (currentGroup) {
      currentGroup.items.push(item);
      return groups;
    }

    groups.push({
      items: [item],
      label
    });
    return groups;
  }, []);
}

export function Navbar() {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const items = useNotificationStore((state) => state.items);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const refresh = useNotificationStore((state) => state.refresh);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const notificationsEnabled = useUserPreferencesStore(
    (state) => state.preferences.inAppNotifications
  );

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const grouped = useMemo(() => groupByDay(items.slice(0, 10)), [items]);

  return (
    <>
      <div className="dashboard-title">
        <span>BirthHub360</span>
        <strong>Tenant Command Center</strong>
      </div>

      <div
        style={{
          alignItems: "center",
          display: "flex",
          flex: 1,
          gap: "1rem",
          justifyContent: "space-between"
        }}
      >
        <nav className="dashboard-nav" style={{ flex: 1 }}>
          <Link href="/billing">Billing</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/outputs">Outputs</Link>
          <Link href="/settings/privacy">Privacidade</Link>
          <Link href="/profile/notifications">Notificacoes</Link>
          <Link href="/settings/developers/webhooks">Webhooks</Link>
          <Link href="/admin/cs">CS</Link>
          <Link href="/admin/dashboard">Master Admin</Link>
        </nav>

        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            aria-expanded={open}
            aria-label="Abrir central de notificacoes"
            className="ghost-button"
            onClick={() => {
              if (!open) {
                void refresh();
              }
              setOpen((current) => !current);
            }}
            style={{
              alignItems: "center",
              borderRadius: "999px",
              display: "inline-flex",
              gap: "0.45rem",
              position: "relative"
            }}
            type="button"
          >
            {notificationsEnabled === false ? <BellOff size={18} /> : <Bell size={18} />}
            <span style={{ fontWeight: 600 }}>Feed</span>
            {notificationsEnabled !== false && unreadCount > 0 ? (
              <span
                style={{
                  alignItems: "center",
                  background: "#c81e1e",
                  borderRadius: "999px",
                  color: "#fff",
                  display: "inline-flex",
                  fontSize: "0.72rem",
                  justifyContent: "center",
                  minHeight: 20,
                  minWidth: 20,
                  padding: "0 0.35rem"
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>

          {open ? (
            <div
              style={{
                backdropFilter: "blur(16px)",
                background: "rgba(255,255,255,0.96)",
                border: "1px solid var(--border)",
                borderRadius: 22,
                boxShadow: "0 18px 48px rgba(15,23,42,0.18)",
                display: "grid",
                gap: "0.9rem",
                maxHeight: 480,
                overflow: "hidden",
                padding: "1rem",
                position: "absolute",
                right: 0,
                top: "calc(100% + 0.6rem)",
                width: "min(92vw, 420px)",
                zIndex: 300
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <strong>Notificacoes</strong>
                  <p style={{ color: "var(--muted)", margin: 0 }}>
                    Ultimas 10 entradas com atualizacao leve a cada minuto.
                  </p>
                </div>
                <button
                  className="ghost-button"
                  onClick={() => {
                    void markAllAsRead();
                  }}
                  style={{
                    alignItems: "center",
                    display: "inline-flex",
                    gap: "0.35rem",
                    padding: "0.55rem 0.85rem"
                  }}
                  type="button"
                >
                  <CheckCheck size={16} />
                  Ler tudo
                </button>
              </div>

              {notificationsEnabled === false ? (
                <div className="panel" style={{ borderRadius: 18, padding: "0.9rem" }}>
                  <strong>Notificacoes in-app desativadas</strong>
                  <p style={{ marginBottom: 0 }}>
                    Reative no seu perfil para voltar a receber avisos no app.
                  </p>
                </div>
              ) : grouped.length === 0 ? (
                <div className="panel" style={{ borderRadius: 18, padding: "0.9rem" }}>
                  <strong>Feed vazio</strong>
                  <p style={{ marginBottom: 0 }}>Nenhuma notificacao recente para este usuario.</p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "0.85rem",
                    maxHeight: 320,
                    overflowY: "auto",
                    paddingRight: "0.25rem"
                  }}
                >
                  {grouped.map((group) => (
                    <section key={group.label} style={{ display: "grid", gap: "0.55rem" }}>
                      <small
                        style={{
                          color: "var(--muted)",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase"
                        }}
                      >
                        {group.label}
                      </small>
                      {group.items.map((item) => (
                        <a
                          href={item.link ?? "/profile/notifications"}
                          key={item.id}
                          onClick={() => {
                            setOpen(false);
                            if (!item.isRead) {
                              void markAsRead(item.id);
                            }
                          }}
                          style={{
                            background: item.isRead
                              ? "rgba(255,255,255,0.65)"
                              : "rgba(19,93,102,0.08)",
                            border: "1px solid rgba(31,29,23,0.08)",
                            borderRadius: 18,
                            color: "inherit",
                            display: "grid",
                            gap: "0.35rem",
                            padding: "0.8rem",
                            textDecoration: "none"
                          }}
                        >
                          <div
                            style={{
                              alignItems: "center",
                              display: "flex",
                              gap: "0.45rem",
                              justifyContent: "space-between"
                            }}
                          >
                            <strong style={{ fontSize: "0.95rem" }}>
                              {item.type.replace(/_/g, " ")}
                            </strong>
                            <small style={{ color: "var(--muted)" }}>
                              {new Date(item.createdAt).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </small>
                          </div>
                          <span>{item.content}</span>
                          <span
                            style={{
                              alignItems: "center",
                              color: "var(--accent-strong)",
                              display: "inline-flex",
                              gap: "0.3rem"
                            }}
                          >
                            Abrir detalhe
                            <ExternalLink size={14} />
                          </span>
                        </a>
                      ))}
                    </section>
                  ))}
                </div>
              )}

              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between"
                }}
              >
                <Link href="/profile/notifications" onClick={() => setOpen(false)}>
                  Ver todas
                </Link>
                <Link href="/profile/notifications">Preferencias</Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

