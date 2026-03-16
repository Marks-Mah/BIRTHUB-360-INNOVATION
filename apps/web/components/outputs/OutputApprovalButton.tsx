"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { approveOutput } from "../../lib/marketplace-api";

export function OutputApprovalButton({
  outputId,
  status
}: Readonly<{
  outputId: string;
  status: string;
}>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status !== "WAITING_APPROVAL") {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <button
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(() => {
            void (async () => {
              try {
                await approveOutput(outputId);
                router.refresh();
              } catch (approveError) {
                setError(
                  approveError instanceof Error
                    ? approveError.message
                    : "Falha ao aprovar output."
                );
              }
            })();
          });
        }}
        type="button"
      >
        {isPending ? "Aprovando..." : "Aprovar"}
      </button>
      {error ? <small style={{ color: "#9d0208" }}>{error}</small> : null}
    </div>
  );
}
