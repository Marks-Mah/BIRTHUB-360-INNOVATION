"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    void import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureException(error);
      })
      .catch(() => undefined);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          alignItems: "center",
          display: "grid",
          minHeight: "100vh",
          padding: "2rem"
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <h1>Falha inesperada</h1>
          <p>O erro foi enviado para monitoramento. Tente novamente.</p>
          <button onClick={() => reset()} type="button">
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
