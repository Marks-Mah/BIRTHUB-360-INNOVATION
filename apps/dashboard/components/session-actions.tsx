"use client";

import { useRouter } from "next/navigation";
import { PlatformSettings } from "./platform-settings";
import { usePlatform } from "./platform-provider";
import { t } from "../lib/platform-i18n";

export function SessionActions() {
  const router = useRouter();
  const { language } = usePlatform();

  const logout = async () => {
    await fetch("/api/session/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
      <PlatformSettings />
      <button type="button" className="pill" onClick={logout}>
        {t(language, "logout")}
      </button>
    </div>
  );
}
