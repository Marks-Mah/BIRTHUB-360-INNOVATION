"use client";

import { useState, useTransition } from "react";

import { getWebConfig } from "@birthub/config";

import { fetchWithSession, getStoredSession } from "../../../../lib/auth-client";

const webConfig = getWebConfig();
const DELETE_CONFIRMATION = "EXCLUIR MINHA CONTA";

export default function PrivacySettingsPageClient() {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const session = getStoredSession();

  const downloadExport = () => {
    startTransition(() => {
      void (async () => {
        try {
          setError(null);
          setNotice("Gerando exportacao do tenant...");
          const response = await fetchWithSession(
            `${webConfig.NEXT_PUBLIC_API_URL}/api/v1/privacy/export`
          );

          if (!response.ok) {
            throw new Error(`Falha ao exportar dados (${response.status})`);
          }

          const content = await response.text();
          const blob = new Blob([content], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `birthub360-export-${new Date().toISOString().slice(0, 10)}.json`;
          link.click();
          URL.revokeObjectURL(url);
          setNotice("Exportacao concluida.");
        } catch (requestError) {
          setError(
            requestError instanceof Error ? requestError.message : "Falha ao exportar dados."
          );
        }
      })();
    });
  };

  const requestDeletion = () => {
    startTransition(() => {
      void (async () => {
        try {
          setError(null);
          setNotice("Processando exclusao e anonimizacao da conta...");

          const response = await fetchWithSession(
            `${webConfig.NEXT_PUBLIC_API_URL}/api/v1/privacy/delete-account`,
            {
              body: JSON.stringify({
                confirmationText: confirmation
              }),
              headers: {
                "content-type": "application/json"
              },
              method: "POST"
            }
          );

          if (!response.ok) {
            throw new Error(`Falha ao excluir conta (${response.status})`);
          }

          localStorage.removeItem("bh_access_token");
          localStorage.removeItem("bh_refresh_token");
          localStorage.removeItem("bh_csrf_token");
          localStorage.removeItem("bh_tenant_id");
          localStorage.removeItem("bh_user_id");
          window.location.assign("/login");
        } catch (requestError) {
          setError(
            requestError instanceof Error ? requestError.message : "Falha ao excluir conta."
          );
        }
      })();
    });
  };

  return (
    <section style={{ display: "grid", gap: "1.25rem" }}>
      <header style={{ display: "grid", gap: "0.4rem" }}>
        <span className="badge">LGPD e Privacy Ops</span>
        <h1 style={{ margin: 0 }}>Privacidade, portabilidade e exclusao</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Exporte os dados do tenant sem segredos de integracao e execute exclusao com
          anonimizacao imediata. Owners tambem disparam revogacao de faturamento ativo.
        </p>
      </header>

      <article
        style={{
          background: "rgba(255,255,255,0.78)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          display: "grid",
          gap: "0.85rem",
          padding: "1rem"
        }}
      >
        <strong>Exportar meus dados</strong>
        <p style={{ margin: 0 }}>
          Gera um JSON consolidado do tenant atual, com organizacao, membros, workflows, billing,
          auditoria e metadados operacionais sem secrets.
        </p>
        <button disabled={isPending} onClick={downloadExport} type="button">
          {isPending ? "Gerando..." : "Exportar meus dados"}
        </button>
      </article>

      <article
        style={{
          background: "rgba(255,255,255,0.78)",
          border: "1px solid rgba(161,29,45,0.18)",
          borderRadius: "1.25rem",
          display: "grid",
          gap: "0.85rem",
          padding: "1rem"
        }}
      >
        <strong>Solicitar exclusao de conta e dados pessoais</strong>
        <p style={{ margin: 0 }}>
          Fluxo estrito com soft-delete, obfuscacao de PII, revogacao de sessoes e cancelamento de
          cobranca do tenant quando aplicavel.
        </p>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Digite {DELETE_CONFIRMATION}</span>
          <input
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </label>
        <button
          disabled={isPending || confirmation !== DELETE_CONFIRMATION}
          onClick={requestDeletion}
          type="button"
        >
          {isPending ? "Excluindo..." : "Solicitar Exclusao de Conta"}
        </button>
      </article>

      {session ? (
        <small style={{ color: "var(--muted)" }}>
          Usuario ativo: {session.userId} no tenant {session.tenantId}
        </small>
      ) : null}
      {error ? <p style={{ color: "#a11d2d", margin: 0 }}>{error}</p> : null}
      {notice ? <p style={{ color: "var(--accent-strong)", margin: 0 }}>{notice}</p> : null}
    </section>
  );
}
