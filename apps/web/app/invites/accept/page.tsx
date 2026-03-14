"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [state, setState] = useState<{
    error: string | null;
    loading: boolean;
    membershipId: string | null;
  }>({
    error: null,
    loading: Boolean(token),
    membershipId: null
  });

  useEffect(() => {
    if (!token) {
      setState({
        error: "Token de convite ausente.",
        loading: false,
        membershipId: null
      });
      return;
    }

    let active = true;

    void fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/invites/accept`, {
      body: JSON.stringify({
        token
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Falha ao aceitar convite (${response.status}).`);
        }

        const payload = (await response.json()) as {
          membershipId?: string;
        };

        if (!active) {
          return;
        }

        setState({
          error: null,
          loading: false,
          membershipId: payload.membershipId ?? null
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setState({
          error: error instanceof Error ? error.message : "Falha ao aceitar convite.",
          loading: false,
          membershipId: null
        });
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main
      style={{
        display: "grid",
        gap: "1rem",
        margin: "0 auto",
        maxWidth: 640,
        minHeight: "100vh",
        padding: "2rem 1.5rem"
      }}
    >
      <section
        style={{
          backdropFilter: "blur(18px)",
          background: "rgba(255,255,255,0.86)",
          border: "1px solid var(--border)",
          borderRadius: 28,
          display: "grid",
          gap: "0.75rem",
          padding: "1.5rem"
        }}
      >
        <span className="badge">Organization Invite</span>
        <h1 style={{ margin: 0 }}>Aceitacao de convite</h1>
        {state.loading ? <p style={{ margin: 0 }}>Validando token e criando acesso...</p> : null}
        {state.membershipId ? (
          <p style={{ margin: 0 }}>
            Convite aceito com sucesso. Membership criada: <strong>{state.membershipId}</strong>
          </p>
        ) : null}
        {state.error ? <p style={{ color: "#9b2f2f", margin: 0 }}>{state.error}</p> : null}
      </section>
    </main>
  );
}
