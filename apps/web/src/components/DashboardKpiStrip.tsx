"use client";

import { memo } from "react";
import { Zap, Calendar, CalendarRange, Receipt, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  currentKw?: number;
  todayKwh?: number;
  todayVsYesterday?: number;
  monthKwh?: number;
  monthVsLast?: number;
  estimatedBill?: number;
  billVsLast?: number;
  balance?: number;
  lowBalance?: boolean;
  loading?: boolean;
}

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export const DashboardKpiStrip = memo(function DashboardKpiStrip({
  currentKw,
  todayKwh,
  todayVsYesterday,
  monthKwh,
  monthVsLast,
  estimatedBill,
  billVsLast,
  balance,
  lowBalance,
  loading,
}: Props) {
  const items = [
    { label: "Current Load", value: currentKw != null ? fmt(currentKw, 2) : "—", sub: "kW", icon: Zap, live: true, pct: undefined as number | undefined, trendLabel: "" },
    { label: "Today", value: todayKwh != null ? fmt(todayKwh, 2) : "—", sub: "kWh", icon: Calendar, pct: todayVsYesterday, trendLabel: "vs yesterday" },
    { label: "This Month", value: monthKwh != null ? fmt(monthKwh, 2) : "—", sub: "kWh", icon: CalendarRange, pct: monthVsLast, trendLabel: "vs last month" },
    { label: "Est. Bill", value: estimatedBill != null ? `₹${fmt(estimatedBill)}` : "—", sub: "", icon: Receipt, pct: billVsLast, trendLabel: "vs last month" },
    { label: "Balance", value: balance != null ? `₹${fmt(balance)}` : "—", sub: "", icon: Wallet, pct: undefined, trendLabel: "", hide: balance == null, warn: lowBalance },
  ].filter((i) => !("hide" in i && i.hide));

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map(({ label, value, sub, icon: Icon, live, pct, trendLabel, warn }) => (
        <div key={label} className="kpi-card relative p-4">
          {live && (
            <span className="absolute right-3 top-3">
              <span className="badge-live">Live</span>
            </span>
          )}
          {warn && (
            <span className="absolute right-3 top-3 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
              Low
            </span>
          )}
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)]">
              <Icon className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.75} />
            </div>
            <div className={cn("min-w-0 flex-1", (live || warn) && "pr-8")}>
              <p className="text-xs font-medium text-theme-muted">{label}</p>
              {loading ? (
                <div className="mt-2 h-7 w-20 skeleton rounded" />
              ) : (
                <p className="mt-0.5 text-xl font-semibold tabular-nums text-theme">
                  {value}
                  {sub && <span className="ml-1 text-xs font-normal text-theme-muted">{sub}</span>}
                </p>
              )}
              {!loading && pct != null && (
                <span className={cn("mt-1 flex items-center gap-0.5 text-[11px] font-medium", pct >= 0 ? "text-red-600" : "text-emerald-600")}>
                  {pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(pct).toFixed(1)}% {trendLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
