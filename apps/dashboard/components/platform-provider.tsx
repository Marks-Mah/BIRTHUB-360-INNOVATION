"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { SupportedLanguage } from "../lib/platform-i18n";

type ThemeMode = "dark" | "light";
type Accent = "gold" | "blue" | "emerald" | "rose";

type AvatarState = { initials: string; imageDataUrl?: string; color: string };

type PlatformContext = {
  language: SupportedLanguage;
  setLanguage: (l: SupportedLanguage) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
  avatar: AvatarState;
  setAvatar: (a: AvatarState) => void;
};

const Ctx = createContext<PlatformContext | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<SupportedLanguage>("pt-BR");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [accent, setAccent] = useState<Accent>("gold");
  const [avatar, setAvatar] = useState<AvatarState>({ initials: "CA", color: "#7ec6ff" });

  useEffect(() => {
    const saved = localStorage.getItem("platform-settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      setLanguage(parsed.language ?? "pt-BR");
      setTheme(parsed.theme ?? "dark");
      setAccent(parsed.accent ?? "gold");
      setAvatar(parsed.avatar ?? { initials: "CA", color: "#7ec6ff" });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("platform-settings", JSON.stringify({ language, theme, accent, avatar }));
    document.documentElement.lang = language;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-accent", accent);
  }, [language, theme, accent, avatar]);

  const value = useMemo(
    () => ({ language, setLanguage, theme, setTheme, accent, setAccent, avatar, setAvatar }),
    [language, theme, accent, avatar],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlatform() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlatform deve ser usado com PlatformProvider");
  return ctx;
}
