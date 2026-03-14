"use client";

import { type ReactNode, useEffect, useState } from "react";

type PaywallState = {
  detail: string;
  open: boolean;
};

const DEFAULT_PAYWALL_MESSAGE =
  "Seu plano atual nao permite essa acao. Atualize para continuar.";

export function PaywallProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<PaywallState>({
    detail: DEFAULT_PAYWALL_MESSAGE,
    open: false
  });

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 402) {
        try {
          const payload = await response.clone().json();
          const detail =
            typeof payload?.detail === "string" ? payload.detail : DEFAULT_PAYWALL_MESSAGE;

          setState({
            detail,
            open: true
          });
        } catch {
          setState({
            detail: DEFAULT_PAYWALL_MESSAGE,
            open: true
          });
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <>
      {children}
      {state.open ? (
        <div className="paywall-overlay" role="dialog" aria-modal="true" aria-label="Plano insuficiente">
          <div className="paywall-modal">
            <span className="badge">Upgrade necessario</span>
            <h2>Esta funcionalidade exige um plano superior</h2>
            <p>{state.detail}</p>
            <div className="paywall-actions">
              <button
                className="action-button"
                type="button"
                onClick={() => {
                  window.location.href = "/settings/billing";
                }}
              >
                Ver opcoes de upgrade
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setState((current) => ({
                    ...current,
                    open: false
                  }));
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
