"use client";

import { useCallback, useState } from "react";
import { EnergyChart } from "@/components/EnergyChart";
import { useAuth } from "@/context/AuthContext";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { api } from "@/lib/api";

const horizons = ["hour", "day", "week", "month"] as const;

export default function PredictionsPage() {
  const { activeMeter } = useAuth();
  const [horizon, setHorizon] = useState<string>("day");
  const [data, setData] = useState<{ label: string; value: number; lower?: number; upper?: number }[]>([]);
  const [mape, setMape] = useState<number | null>(null);
  const [model, setModel] = useState("");

  const load = useCallback(async () => {
    if (!activeMeter) return;
    const res = await api.predictions(activeMeter.id, horizon);
    setData(
      res.points.map((p) => ({
        label: new Date(p.timestamp).toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          hour: horizon === "hour" || horizon === "day" ? "2-digit" : undefined,
          minute: horizon === "hour" ? "2-digit" : undefined,
        }),
        value: p.value,
        lower: p.lower,
        upper: p.upper,
      }))
    );
    setMape(res.mape ?? null);
    setModel(res.model);
  }, [activeMeter, horizon]);

  useAutoRefresh(load, 20_000, !!activeMeter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h2 className="section-title">Energy Forecast</h2>
          <p className="section-desc">Forecasts from your recent consumption history</p>
        </div>
        <div className="flex gap-1.5">
          {horizons.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize transition ${
                horizon === h ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-theme-muted hover:text-theme"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {mape !== null && model && (
        <div className="flex flex-wrap gap-3 text-sm">
          {model !== "statistical" && (
            <span className="rounded-lg bg-cyan-500/10 px-3 py-1 text-cyan-600">MAPE: {mape}%</span>
          )}
          <span className="rounded-lg px-3 py-1" style={{ background: "var(--chip-bg)", color: "var(--muted)" }}>
            Model: {model === "statistical" ? "Statistical forecast (train ML models for LSTM/Prophet)" : model}
          </span>
        </div>
      )}

      <div className="glass-card p-6">
        <EnergyChart data={data} type="line" unit="W" height={350} />
      </div>
    </div>
  );
}
