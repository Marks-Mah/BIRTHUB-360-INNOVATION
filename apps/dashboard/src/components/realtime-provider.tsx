"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Poll every 5 seconds to refresh server components
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  return <>{children}</>;
}
