"use client";

import { useCallback, useState } from "react";
import { Leaf, TreePine } from "lucide-react";
import { PieChartAppliances } from "@/components/EnergyChart";
import { useAuth } from "@/context/AuthContext";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { api } from "@/lib/api";

export default function CarbonPage() {
  const { activeMeter } = useAuth();
  const [carbon, setCarbon] = useState<Awaited<ReturnType<typeof api.carbon>> | null>(null);
  const [appliances, setAppliances] = useState<Awaited<ReturnType<typeof api.appliances>>>([]);

  const load = useCallback(async () => {
    if (!activeMeter) return;
    const [c, a] = await Promise.all([api.carbon(activeMeter.id), api.appliances(activeMeter.id)]);
    setCarbon(c);
    setAppliances(a);
  }, [activeMeter]);

  useAutoRefresh(load, 15_000, !!activeMeter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Carbon Footprint & Appliances</h2>
        <p className="section-desc">Monthly emissions and appliance estimates</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-6">
          <Leaf className="mb-3 h-8 w-8 text-emerald-500" />
          <p className="text-sm text-theme-muted">Monthly Consumption</p>
          <p className="text-2xl font-bold text-theme">{carbon?.monthly_kwh ?? "—"} kWh</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm text-theme-muted">Estimated CO₂ Emission</p>
          <p className="text-2xl font-bold text-amber-600">{carbon?.co2_kg ?? "—"} kg</p>
        </div>
        <div className="glass-card p-6">
          <TreePine className="mb-3 h-8 w-8 text-emerald-500" />
          <p className="text-sm text-theme-muted">Trees Required to Offset</p>
          <p className="text-2xl font-bold text-emerald-600">{carbon?.trees_required ?? "—"} trees</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="mb-4 font-semibold text-theme">Appliance Consumption Estimate</h3>
          <PieChartAppliances data={appliances} />
        </div>
        <div className="glass-card p-6">
          <h3 className="mb-4 font-semibold text-theme">Breakdown</h3>
          <div className="space-y-3">
            {appliances.map((a) => (
              <div key={a.name} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                <span className="text-theme-muted">{a.name}</span>
                <div className="text-right">
                  <p className="font-medium text-theme">{a.estimated_kwh} kWh</p>
                  <p className="text-xs text-theme-muted">{a.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
