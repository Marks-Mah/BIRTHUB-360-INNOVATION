"use client";

import { useState } from "react";

import { getWebConfig } from "@birthub/config";

import { fetchWithSession } from "../../../../lib/auth-client";
import { DOMPurify } from "../../../../lib/dompurify";

const webConfig = getWebConfig();

interface MfaSetupPayload {
  otpauthUrl: string;
  qrCodeDataUrl: string;
  recoveryCodes: string[];
}

export default function ProfileSecurityPage() {
  const [setup, setSetup] = useState<MfaSetupPayload | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [richNotes, setRichNotes] = useState("<b>Salve os recovery codes em local seguro.</b>");
  const [error, setError] = useState<string | null>(null);

  const startSetup = async () => {
    setError(null);
    const response = await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/auth/mfa/setup`, {
      method: "POST"
    });

    if (!response.ok) {
      setError(`Falha ao iniciar setup MFA (${response.status})`);
      return;
    }

    setSetup((await response.json()) as MfaSetupPayload);
  };

  const enableMfa = async () => {
    setError(null);
    const response = await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/auth/mfa/enable`, {
      body: JSON.stringify({ totpCode }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      setError(`Codigo invalido (${response.status})`);
      return;
    }

    setIsEnabled(true);
  };

  const downloadRecoveryCodes = () => {
    if (!setup) {
      return;
    }

    const blob = new Blob([setup.recoveryCodes.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "birthhub360-recovery-codes.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header>
        <h1 style={{ margin: 0 }}>Setup MFA</h1>
        <p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>
          1) Escaneie o QR. 2) Digite o codigo de 6 digitos. 3) Salve os recovery codes.
        </p>
      </header>

      <button onClick={() => void startSetup()} type="button">
        Iniciar setup MFA
      </button>

      {setup ? (
        <article
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            display: "grid",
            gap: "0.75rem",
            padding: "1rem"
          }}
        >
          <strong>Passo 1: escanear QR</strong>
          <code style={{ wordBreak: "break-all" }}>{setup.otpauthUrl}</code>
          <img
            alt="MFA QR"
            src={setup.qrCodeDataUrl}
            style={{ background: "white", borderRadius: "0.75rem", maxWidth: 280, padding: "0.5rem" }}
          />

          <strong>Passo 2: validar TOTP</strong>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              maxLength={6}
              onChange={(event) => setTotpCode(event.target.value)}
              placeholder="123456"
              value={totpCode}
            />
            <button onClick={() => void enableMfa()} type="button">
              Confirmar codigo
            </button>
          </div>

          <strong>Passo 3: salvar Recovery Codes</strong>
          <pre
            style={{
              background: "rgba(0, 0, 0, 0.04)",
              borderRadius: "0.75rem",
              margin: 0,
              overflowX: "auto",
              padding: "0.75rem"
            }}
          >
            {setup.recoveryCodes.join("\n")}
          </pre>
          <button onClick={downloadRecoveryCodes} type="button">
            Exportar recovery codes (TXT)
          </button>
        </article>
      ) : null}

      <article style={{ border: "1px solid var(--border)", borderRadius: "1rem", padding: "1rem" }}>
        <strong>Campo rico sanitizado com DOMPurify</strong>
        <textarea
          onChange={(event) => setRichNotes(event.target.value)}
          rows={4}
          style={{ marginTop: "0.75rem", width: "100%" }}
          value={richNotes}
        />
        <div
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(richNotes) }}
          style={{ marginTop: "0.75rem" }}
        />
      </article>

      {isEnabled ? <p style={{ color: "var(--accent-strong)" }}>MFA habilitado com sucesso.</p> : null}
      {error ? <p style={{ color: "#a11d2d", margin: 0 }}>{error}</p> : null}
    </section>
  );
}

