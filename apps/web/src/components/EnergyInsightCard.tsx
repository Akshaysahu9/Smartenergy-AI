"use client";

import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";

interface Props {
  message?: string;
  savingsInr?: number;
}

export function EnergyInsightCard({ message, savingsInr }: Props) {
  const text =
    message ||
    "Connect a meter and accumulate usage data to receive personalized efficiency recommendations.";

  return (
    <div className="glass-card flex h-full flex-col p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)]">
          <Lightbulb className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="section-title">Recommendations</h3>
          <p className="text-xs text-theme-muted">Based on your usage</p>
        </div>
      </div>
      <p className="flex-1 text-sm leading-relaxed text-theme-muted">{text}</p>
      {savingsInr != null && savingsInr > 0 && (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-theme-muted">Potential savings</p>
          <p className="text-lg font-semibold text-[var(--accent)]">₹{savingsInr.toFixed(2)}/mo</p>
        </div>
      )}
      <Link
        href="/dashboard/recommendations"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:opacity-80"
      >
        View all insights
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
