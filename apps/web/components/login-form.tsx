"use client";

import React, { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export interface LoginFormProps {
  apiUrl: string;
  initialRequestId: string;
  navigate?: (href: string) => void;
}

type LoginFormContentProps = Readonly<{
  apiUrl: string;
  initialRequestId: string;
  navigate: (href: string) => void;
}>;

function LoginFormContent({ apiUrl, initialRequestId, navigate }: LoginFormContentProps) {
  const [error, setError] = useState<string | null>(null);
  const [requestId] = useState(initialRequestId);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formValues, setFormValues] = useState({
    email: "owner.alpha@birthub.local",
    password: "password123",
    tenantId: "birthhub-alpha"
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const submit = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
          body: JSON.stringify(formValues),
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-request-id": requestId,
            "x-tenant-id": formValues.tenantId
          },
          method: "POST"
        });

        if (!response.ok) {
          throw new Error(`Falha ao autenticar (${response.status})`);
        }

        const payload = (await response.json()) as {
          challengeToken?: string;
          mfaRequired: boolean;
          session?: {
            csrfToken: string;
            refreshToken: string;
            tenantId: string;
            token: string;
            userId: string;
          };
        };

        if (payload.mfaRequired) {
          setResult("MFA requerido. Finalize o desafio antes de entrar no dashboard.");
          return;
        }

        if (!payload.session) {
          throw new Error("Sessao nao retornada pela API.");
        }

        localStorage.setItem("bh_csrf_token", payload.session.csrfToken);
        localStorage.setItem("bh_tenant_id", payload.session.tenantId);
        localStorage.setItem("bh_user_id", payload.session.userId);
        localStorage.removeItem("bh_access_token");
        localStorage.removeItem("bh_refresh_token");

        setResult(`Sessao criada para ${payload.session.userId}`);
        navigate("/settings/security");
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Falha desconhecida.");
      }
    };

    startTransition(() => {
      void submit();
    });
  }

  return (
    <section
      style={{
        display: "grid",
        gap: "1.5rem"
      }}
    >
      <header style={{ display: "grid", gap: "0.5rem" }}>
        <span
          style={{
            color: "var(--accent)",
            fontSize: "0.85rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}
        >
          BirthHub360
        </span>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", margin: 0 }}>Entrar na plataforma</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          O request ID desta sessao e propagado do browser para a API e o worker.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--card)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border)",
          borderRadius: "1.5rem",
          boxShadow: "0 24px 80px rgba(19, 93, 102, 0.08)",
          display: "grid",
          gap: "1rem",
          padding: "1.5rem"
        }}
      >
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Email</span>
          <input
            onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
            type="email"
            value={formValues.email}
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Senha</span>
          <input
            onChange={(event) =>
              setFormValues((current) => ({ ...current, password: event.target.value }))
            }
            type="password"
            value={formValues.password}
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Tenant</span>
          <input
            onChange={(event) =>
              setFormValues((current) => ({ ...current, tenantId: event.target.value }))
            }
            type="text"
            value={formValues.tenantId}
          />
        </label>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: "0.75rem",
            justifyContent: "space-between"
          }}
        >
          <code>{requestId}</code>
          <button
            disabled={isPending}
            style={{
              background: "var(--accent)",
              border: "none",
              borderRadius: "999px",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
              padding: "0.9rem 1.4rem"
            }}
            type="submit"
          >
            {isPending ? "Entrando..." : "Entrar"}
          </button>
        </div>
        {error ? <p style={{ color: "#a11d2d", margin: 0 }}>{error}</p> : null}
        {result ? <p style={{ color: "var(--accent-strong)", margin: 0 }}>{result}</p> : null}
      </form>
    </section>
  );
}

export function LoginForm({ apiUrl, initialRequestId, navigate }: Readonly<LoginFormProps>) {
  if (navigate) {
    return (
      <LoginFormContent
        apiUrl={apiUrl}
        initialRequestId={initialRequestId}
        navigate={navigate}
      />
    );
  }

  const router = useRouter();
  return (
    <LoginFormContent
      apiUrl={apiUrl}
      initialRequestId={initialRequestId}
      navigate={(href) => router.push(href)}
    />
  );
}
