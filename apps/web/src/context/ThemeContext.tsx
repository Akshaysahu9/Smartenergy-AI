"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeId = "dark" | "light" | "ocean" | "emerald";

export const THEMES: { id: ThemeId; label: string; desc: string; preview: string[] }[] = [
  { id: "light", label: "Light", desc: "Default — clean enterprise look", preview: ["#f4f6f9", "#ffffff", "#059669"] },
  { id: "dark", label: "Dark", desc: "Low-light environments", preview: ["#0c0f14", "#151921", "#34d399"] },
  { id: "ocean", label: "Ocean", desc: "Blue-toned dark theme", preview: ["#0b1220", "#111c2e", "#38bdf8"] },
  { id: "emerald", label: "Forest", desc: "Green-toned dark theme", preview: ["#0a120e", "#101a14", "#34d399"] },
];

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("se_theme") as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) setThemeState(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("se_theme", theme);
  }, [theme, ready]);

  const setTheme = (t: ThemeId) => setThemeState(t);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
