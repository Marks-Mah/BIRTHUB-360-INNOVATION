"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setError("Senha inválida. Tente novamente.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <main className="container"><article className="card" style={{ maxWidth: 460, margin: "80px auto" }}><h1>Acesso ao Dashboard</h1><form onSubmit={onSubmit}><label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error ? <p className="muted">{error}</p> : null}<button type="submit">Entrar</button></form></article></main>
  );
}
