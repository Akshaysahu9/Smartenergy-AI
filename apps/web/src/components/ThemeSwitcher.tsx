"use client";

import { Palette, Check, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { THEMES, useTheme, ThemeId } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeSwitcher({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const current = THEMES.find((t) => t.id === theme)!;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="theme-chip flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium"
        title="Theme"
      >
        <Palette className="h-3.5 w-3.5" />
        {!compact && <span className="hidden sm:inline">{current.label}</span>}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>

      {open && (
        <div className="theme-dropdown absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg p-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTheme(t.id); setOpen(false); }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition",
                theme === t.id ? "theme-dropdown-active font-medium" : "hover:opacity-80"
              )}
            >
              {t.label}
              {theme === t.id && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThemePickerGrid() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id as ThemeId)}
          className={cn(
            "kpi-card p-4 text-left transition",
            theme === t.id && "ring-2 ring-[var(--accent)]"
          )}
        >
          <div className="mb-3 flex h-6 gap-1 overflow-hidden rounded">
            {t.preview.map((c) => (
              <div key={c} className="flex-1" style={{ background: c }} />
            ))}
          </div>
          <p className="text-sm font-medium text-theme">{t.label}</p>
          <p className="mt-0.5 text-xs text-theme-muted">{t.desc}</p>
        </button>
      ))}
    </div>
  );
}
