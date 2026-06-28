"use client";

import { useCallback, useState } from "react";
import { Lightbulb, IndianRupee } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function RecommendationsPage() {
  const { activeMeter } = useAuth();
  const [recs, setRecs] = useState<Awaited<ReturnType<typeof api.recommendations>>>([]);

  const load = useCallback(async () => {
    if (!activeMeter) return;
    setRecs(await api.recommendations(activeMeter.id));
  }, [activeMeter]);

  useAutoRefresh(load, 20_000, !!activeMeter);

  const priorityColor = {
    high: "border-red-500/30 bg-red-500/5",
    medium: "border-amber-500/30 bg-amber-500/5",
    low: "border-emerald-500/30 bg-emerald-500/5",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Energy Saving Recommendations</h2>
        <p className="section-desc">Suggestions based on your usage patterns</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {recs.map((rec) => (
          <div key={rec.id} className={cn("glass-card border p-6", priorityColor[rec.priority as keyof typeof priorityColor])}>
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-[var(--accent)]" />
              <div>
                <h3 className="font-semibold text-theme">{rec.title}</h3>
                <p className="mt-2 text-sm text-theme-muted">{rec.reason}</p>
                <p className="mt-3 text-sm text-theme">
                  <span className="font-medium text-[var(--accent)]">Action:</span> {rec.action}
                </p>
                {rec.estimated_savings_inr > 0 && (
                  <div className="mt-3 flex items-center gap-1 text-emerald-600">
                    <IndianRupee className="h-4 w-4" />
                    <span className="text-sm font-medium">Est. monthly savings: ₹{rec.estimated_savings_inr}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
