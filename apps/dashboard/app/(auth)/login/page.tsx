"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, tenantId }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      mfaRequired?: boolean;
    };

    if (!response.ok) {
      setError(payload.error ?? "Credenciais inválidas. Tente novamente.");
      return;
    }

    if (payload.mfaRequired) {
      setError("MFA obrigatória. Conclua o login pelo fluxo principal do apps/api.");
      return;
    }

    router.push(searchParams?.get("next") || "/");
    router.refresh();
  };

  return (
    <main className="container"><article className="card" style={{ maxWidth: 460, margin: "80px auto" }}><h1>Acesso ao Dashboard</h1><form onSubmit={onSubmit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Tenant<input type="text" value={tenantId} onChange={(event) => setTenantId(event.target.value)} placeholder="slug ou tenantId" /></label><label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error ? <p className="muted">{error}</p> : null}<button type="submit">Entrar</button></form></article></main>
  );
}
