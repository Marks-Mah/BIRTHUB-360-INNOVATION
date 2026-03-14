"use client";

import { ChangeEvent, useState } from "react";
import { SUPPORTED_LANGUAGES, t } from "../lib/platform-i18n";
import { usePlatform } from "./platform-provider";

export function PlatformSettings() {
  const { language, setLanguage, theme, setTheme, accent, setAccent, avatar, setAvatar } = usePlatform();
  const [open, setOpen] = useState(false);

  const onAvatarFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar({ ...avatar, imageDataUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button className="pill" onClick={() => setOpen((v) => !v)}>{t(language, "settings")}</button>
      <div className="pill" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {avatar.imageDataUrl ? <img src={avatar.imageDataUrl} alt="avatar" style={{ width: 24, height: 24, borderRadius: 999 }} /> : <span style={{ display: "inline-grid", placeItems: "center", width: 24, height: 24, borderRadius: 999, background: avatar.color, color: "#111" }}>{avatar.initials}</span>}
      </div>
      {open ? (
        <div className="card" style={{ position: "absolute", top: 58, right: 16, width: 320, zIndex: 80 }}>
          <label>{t(language, "language")}
            <select value={language} onChange={(e) => setLanguage(e.target.value as any)}>
              {SUPPORTED_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
          <label>{t(language, "theme")}
            <select value={theme} onChange={(e) => setTheme(e.target.value as any)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label>{t(language, "palette")}
            <select value={accent} onChange={(e) => setAccent(e.target.value as any)}>
              <option value="gold">Gold</option>
              <option value="blue">Blue</option>
              <option value="emerald">Emerald</option>
              <option value="rose">Rose</option>
            </select>
          </label>
          <label>{t(language, "avatar")}
            <input value={avatar.initials} maxLength={3} onChange={(e) => setAvatar({ ...avatar, initials: e.target.value.toUpperCase() })} />
            <input type="color" value={avatar.color} onChange={(e) => setAvatar({ ...avatar, color: e.target.value })} />
            <input type="file" accept="image/*" onChange={onAvatarFile} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
