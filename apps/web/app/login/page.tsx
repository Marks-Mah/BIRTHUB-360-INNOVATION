import { getWebConfig } from "@birthub/config";

import { LoginForm } from "../../components/login-form";
import { getServerRequestId } from "../../lib/request-id";

export default async function LoginPage() {
  const config = getWebConfig();
  const requestId = await getServerRequestId();

  return (
    <main
      style={{
        alignItems: "center",
        display: "grid",
        minHeight: "100vh",
        padding: "2rem"
      }}
    >
      <div
        style={{
          display: "grid",
          gap: "2rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          maxWidth: 960,
          width: "100%"
        }}
      >
        <aside
          style={{
            display: "grid",
            gap: "1rem",
            padding: "1rem 0"
          }}
        >
          <div
            style={{
              background: "rgba(19, 93, 102, 0.08)",
              border: "1px solid rgba(19, 93, 102, 0.16)",
              borderRadius: "1.25rem",
              padding: "1rem"
            }}
          >
            <strong>Ciclo 1</strong>
            <p style={{ color: "var(--muted)", marginBottom: 0 }}>
              Base monorepo, observabilidade, seguranca e operacao local consolidadas.
            </p>
          </div>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.65)",
              border: "1px solid var(--border)",
              borderRadius: "1.25rem",
              padding: "1rem"
            }}
          >
            <strong>Propagacao de contexto</strong>
            <p style={{ color: "var(--muted)", marginBottom: 0 }}>
              Web cria o request ID, API replica em headers e o worker recebe o mesmo valor via BullMQ.
            </p>
          </div>
        </aside>

        <LoginForm apiUrl={config.NEXT_PUBLIC_API_URL} initialRequestId={requestId} />
      </div>
    </main>
  );
}

