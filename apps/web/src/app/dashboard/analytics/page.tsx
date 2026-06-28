"use client";

import { useCallback, useState } from "react";
import { ConsumptionSummaryCards, ConsumptionSummaryData, ConsumptionPeriod } from "@/components/ConsumptionSummaryCards";
import { ConsumptionDetailPanel } from "@/components/ConsumptionDetailPanel";
import { useAuth } from "@/context/AuthContext";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { api } from "@/lib/api";

const periods: { key: ConsumptionPeriod; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

export default function AnalyticsPage() {
  const { activeMeter } = useAuth();
  const [period, setPeriod] = useState<ConsumptionPeriod>("weekly");
  const [summary, setSummary] = useState<ConsumptionSummaryData | null>(null);
  const [peaks, setPeaks] = useState<{ hour: number; avg_power_watts: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeMeter) return;
    try {
      const [sum, peakData] = await Promise.all([
        api.consumptionSummary(activeMeter.id),
        api.peakHours(activeMeter.id),
      ]);
      setSummary(sum);
      setPeaks(peakData);
    } finally {
      setLoading(false);
    }
  }, [activeMeter]);

  useAutoRefresh(load, 12_000, !!activeMeter);

  if (!activeMeter) {
    return <p className="text-theme-muted">No meter configured.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Analytics</h2>
          <p className="section-desc">Daily, weekly, and monthly usage breakdown</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {periods.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
                period === key
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] text-theme-muted hover:text-theme"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ConsumptionSummaryCards
        data={summary}
        loading={loading}
        activePeriod={period}
        onPeriodClick={setPeriod}
      />

      <ConsumptionDetailPanel
        period={period}
        meterId={activeMeter.id}
        summary={summary}
        onClose={() => setPeriod("weekly")}
      />

      <div className="glass-card p-6">
        <h3 className="mb-4 font-semibold text-theme">Peak Usage Hours</h3>
        <div className="grid gap-3 sm:grid-cols-5">
          {peaks.map((p, i) => (
            <div key={p.hour} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-center">
              <p className="text-xs text-theme-muted">#{i + 1} Peak</p>
              <p className="text-lg font-bold text-[var(--accent)]">{p.label}</p>
              <p className="text-sm text-theme-muted">{p.avg_power_watts.toFixed(0)} W avg</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
