"use client";

import React, { useMemo, useState } from "react";

type Step = 1 | 2 | 3 | 4;

interface PackInstallerProps {
  apiUrl: string;
  availablePacks: Array<{
    description: string;
    id: string;
    name: string;
  }>;
}

export function PackInstaller({ apiUrl, availablePacks }: Readonly<PackInstallerProps>) {
  const [step, setStep] = useState<Step>(1);
  const [selectedPackId, setSelectedPackId] = useState<string>(availablePacks[0]?.id ?? "");
  const [activateAgents, setActivateAgents] = useState(true);
  const [connectors, setConnectors] = useState({
    crmProvider: "hubspot",
    emailProvider: "smtp",
    storageProvider: "s3"
  });
  const [status, setStatus] = useState<string>("");

  const selectedPack = useMemo(
    () => availablePacks.find((pack) => pack.id === selectedPackId) ?? availablePacks[0],
    [availablePacks, selectedPackId]
  );

  async function installPack(): Promise<void> {
    setStatus("Instalando agente oficial...");

    const response = await fetch(`${apiUrl}/api/v1/packs/install`, {
      body: JSON.stringify({
        activateAgents,
        agentId: selectedPackId,
        connectors,
        packId: selectedPackId
      }),
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      setStatus(`Falha na instalacao (${response.status}).`);
      return;
    }

    setStatus("Agente oficial instalado com sucesso.");
    setStep(4);
  }

  return (
    <section
      style={{
        background: "rgba(255, 255, 255, 0.8)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        display: "grid",
        gap: "1rem",
        padding: "1rem"
      }}
    >
      <header style={{ display: "grid", gap: "0.3rem" }}>
        <strong>Official Agent Installer</strong>
        <small style={{ color: "var(--muted)" }}>Step {step} of 4</small>
      </header>

      {step === 1 ? (
        <div style={{ display: "grid", gap: "0.7rem" }}>
          <label htmlFor="pack-select">Selecionar agente oficial</label>
          <select
            id="pack-select"
            onChange={(event) => setSelectedPackId(event.target.value)}
            value={selectedPackId}
          >
            {availablePacks.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.name}
              </option>
            ))}
          </select>
          <button onClick={() => setStep(2)} type="button">
            Continuar
          </button>
        </div>
      ) : null}

      {step === 2 && selectedPack ? (
        <div style={{ display: "grid", gap: "0.7rem" }}>
          <strong>{selectedPack.name}</strong>
          <p style={{ margin: 0 }}>{selectedPack.description}</p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setStep(1)} type="button">
              Voltar
            </button>
            <button onClick={() => setStep(3)} type="button">
              Configurar conectores
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div style={{ display: "grid", gap: "0.7rem" }}>
          <label>
            CRM
            <select
              onChange={(event) =>
                setConnectors((current) => ({ ...current, crmProvider: event.target.value }))
              }
              value={connectors.crmProvider}
            >
              <option value="hubspot">HubSpot</option>
              <option value="salesforce">Salesforce</option>
            </select>
          </label>

          <label>
            Email
            <select
              onChange={(event) =>
                setConnectors((current) => ({ ...current, emailProvider: event.target.value }))
              }
              value={connectors.emailProvider}
            >
              <option value="smtp">SMTP</option>
              <option value="sendgrid">SendGrid</option>
            </select>
          </label>

          <label>
            Storage
            <select
              onChange={(event) =>
                setConnectors((current) => ({ ...current, storageProvider: event.target.value }))
              }
              value={connectors.storageProvider}
            >
              <option value="s3">S3</option>
              <option value="supabase">Supabase Storage</option>
            </select>
          </label>

          <label style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
            <input
              checked={activateAgents}
              onChange={(event) => setActivateAgents(event.target.checked)}
              type="checkbox"
            />
            Ativar agentes ao finalizar instalacao
          </label>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setStep(2)} type="button">
              Voltar
            </button>
            <button onClick={() => void installPack()} type="button">
              Instalar pack
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div style={{ display: "grid", gap: "0.7rem" }}>
          <strong>Ativacao concluida</strong>
          <p style={{ margin: 0 }}>Agente {selectedPack?.name} pronto para uso.</p>
          <button onClick={() => setStep(1)} type="button">
            Instalar outro agente
          </button>
        </div>
      ) : null}

      {status ? <small style={{ color: "var(--accent-strong)" }}>{status}</small> : null}
    </section>
  );
}
