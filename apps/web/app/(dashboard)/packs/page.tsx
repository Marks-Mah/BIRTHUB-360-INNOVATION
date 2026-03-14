"use client";

import { useEffect, useState } from "react";

type PackStatus = {
  installedVersion: string;
  latestAvailableVersion: string;
  packId: string;
  status: "active" | "degraded" | "failed" | "installed";
};

function buildHeaders() {
  return {
    "content-type": "application/json",
    "x-tenant-id": window.localStorage.getItem("tenantId") ?? "birthhub-alpha"
  };
}

function badgeTone(status: PackStatus["status"]): string {
  if (status === "active") {
    return "#1b4332";
  }

  if (status === "installed" || status === "degraded") {
    return "#9f4d00";
  }

  return "#9d0208";
}

export default function PacksPage() {
  const [packs, setPacks] = useState<PackStatus[]>([]);
  const [message, setMessage] = useState("");

  async function refresh(): Promise<void> {
    const response = await fetch("/api/v1/packs/status", {
      headers: buildHeaders()
    });

    if (!response.ok) {
      setMessage(`Falha ao carregar packs (${response.status}).`);
      return;
    }

    const payload = (await response.json()) as { packs: PackStatus[] };
    setPacks(payload.packs);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function updateToV2(packId: string): Promise<void> {
    setMessage(`Sinalizando update ${packId} -> v2.0...`);

    const response = await fetch(`/api/v1/packs/${encodeURIComponent(packId)}/version`, {
      body: JSON.stringify({
        latestAvailableVersion: "2.0.0"
      }),
      headers: buildHeaders(),
      method: "POST"
    });

    setMessage(response.ok ? `Pack ${packId} sinalizado para update v2.0.` : `Falha ao atualizar ${packId}.`);
    if (response.ok) {
      await refresh();
    }
  }

  async function uninstall(packId: string): Promise<void> {
    setMessage(`Desinstalando ${packId}...`);

    const response = await fetch("/api/v1/packs/uninstall", {
      body: JSON.stringify({ packId }),
      headers: buildHeaders(),
      method: "POST"
    });

    setMessage(response.ok ? `Pack ${packId} removido.` : `Falha ao remover ${packId}.`);
    if (response.ok) {
      await refresh();
    }
  }

  return (
    <main style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.4rem" }}>
        <h1 style={{ margin: 0 }}>Status dos Packs Instalados</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Painel para monitorar packs `active`, `degraded`, `failed` e acionar update para v2.0.
        </p>
      </header>

      <div style={{ display: "grid", gap: "0.8rem", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {packs.length === 0 ? (
          <article
            style={{
              background: "rgba(255,255,255,0.85)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "1rem"
            }}
          >
            Nenhum pack instalado para este tenant.
          </article>
        ) : (
          packs.map((pack) => (
            <article
              key={pack.packId}
              style={{
                background: "rgba(255,255,255,0.88)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                display: "grid",
                gap: "0.6rem",
                padding: "1rem"
              }}
            >
              <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
                <strong>{pack.packId}</strong>
                <span style={{ color: badgeTone(pack.status), fontWeight: 700, textTransform: "uppercase" }}>
                  {pack.status}
                </span>
              </div>
              <small>Instalado: {pack.installedVersion}</small>
              <small>Disponivel: {pack.latestAvailableVersion}</small>
              {pack.latestAvailableVersion !== pack.installedVersion ? (
                <small style={{ color: "#9f4d00" }}>Update disponivel para {pack.latestAvailableVersion}</small>
              ) : (
                <small style={{ color: "var(--muted)" }}>Sem update pendente no momento.</small>
              )}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => void updateToV2(pack.packId)} type="button">
                  Update to v2.0
                </button>
                <button onClick={() => void uninstall(pack.packId)} type="button">
                  Desinstalar
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {message ? <small style={{ color: "var(--accent-strong)" }}>{message}</small> : null}
    </main>
  );
}
