"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { fetchWithSession } from "../lib/auth-client";

type MeResponse = {
  plan?: {
    hardLocked?: boolean;
    isWithinGracePeriod?: boolean;
    secondsUntilHardLock?: number | null;
    status?: string | null;
  };
};

function formatRemaining(seconds: number): string {
  const hours = Math.ceil(seconds / 3600);

  if (hours <= 1) {
    return "menos de 1 hora";
  }

  return `${hours} horas`;
}

export function DashboardBillingGate({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<MeResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetchWithSession("/api/v1/me", {
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as MeResponse;
      })
      .then((data) => {
        if (data) {
          setProfile(data);
        }
      })
      .catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [pathname]);

  useEffect(() => {
    const hardLocked = profile?.plan?.hardLocked;
    const onBillingPage = pathname.startsWith("/settings/billing");

    if (hardLocked && !onBillingPage) {
      router.replace("/settings/billing");
    }
  }, [pathname, profile?.plan?.hardLocked, router]);

  const bannerMessage = useMemo(() => {
    const plan = profile?.plan;
    if (!plan || plan.status !== "past_due" || !plan.isWithinGracePeriod) {
      return null;
    }

    const seconds = plan.secondsUntilHardLock;
    if (typeof seconds === "number" && seconds <= 24 * 60 * 60) {
      return `Seu pagamento falhou e o servico sera suspenso em ${formatRemaining(seconds)}. Atualize o cartao imediatamente.`;
    }

    return null;
  }, [profile]);

  return (
    <>
      {bannerMessage ? <div className="billing-banner">{bannerMessage}</div> : null}
      {children}
    </>
  );
}

