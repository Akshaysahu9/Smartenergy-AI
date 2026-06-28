"use client";

import { memo, useId } from "react";

interface Props {
  powerWatts: number;
  voltage?: number;
  current?: number;
  powerFactor?: number;
  frequency?: number;
}

const STATS = [
  { key: "voltage", label: "Voltage", short: "V" },
  { key: "current", label: "Current", short: "A" },
  { key: "powerFactor", label: "Power Factor", short: "PF" },
  { key: "frequency", label: "Frequency", short: "Hz" },
] as const;

function formatStat(
  key: (typeof STATS)[number]["key"],
  voltage?: number,
  current?: number,
  powerFactor?: number,
  frequency?: number
) {
  switch (key) {
    case "voltage":
      return voltage != null ? `${voltage.toFixed(1)} V` : "—";
    case "current":
      return current != null ? `${current.toFixed(2)} A` : "—";
    case "powerFactor":
      return powerFactor != null ? powerFactor.toFixed(2) : "—";
    case "frequency":
      return frequency != null ? `${frequency.toFixed(2)} Hz` : "—";
  }
}

export const LiveMeterGauge = memo(function LiveMeterGauge({
  powerWatts,
  voltage,
  current,
  powerFactor,
  frequency,
}: Props) {
  const gradId = useId().replace(/:/g, "");
  const kw = powerWatts / 1000;
  const maxKw = 5;
  const pct = Math.min(100, (kw / maxKw) * 100);
  const angle = -90 + (pct / 100) * 180;
  const arcLen = (pct / 100) * 251;

  return (
    <div className="glass-card flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="section-title">Live Meter</h3>
          <p className="section-desc">Real-time reading</p>
        </div>
        <span className="badge-live">Live</span>
      </div>

      <div className="mx-auto w-full max-w-[280px]">
        <div className="relative aspect-[2/1.1] w-full">
          <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
            <path d="M 24 100 A 76 76 0 0 1 176 100" fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
            <path
              d="M 24 100 A 76 76 0 0 1 176 100"
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${arcLen} 251`}
            />
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
            <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "100px 100px", transition: "transform 0.35s ease-out" }}>
              <line x1="100" y1="100" x2="100" y2="42" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" />
            </g>
            <circle cx="100" cy="100" r="4" fill="var(--foreground)" />
          </svg>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">
            <p className="text-3xl font-semibold tabular-nums text-theme">{kw.toFixed(2)}</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-theme-muted">kW</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {STATS.map(({ key, label, short }) => (
          <div key={key} className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-theme-muted">
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-theme">
              {formatStat(key, voltage, current, powerFactor, frequency)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});
