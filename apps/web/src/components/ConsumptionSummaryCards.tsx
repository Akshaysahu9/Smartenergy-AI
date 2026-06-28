"use client";

import { Calendar, CalendarDays, CalendarRange, CalendarClock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConsumptionSummaryData {
  daily_units: number;
  weekly_units: number;
  monthly_units: number;
  yearly_units: number;
  yesterday_units: number;
  unit_label: string;
  period_labels: Record<string, string>;
}

export type ConsumptionPeriod = "daily" | "weekly" | "monthly" | "yearly";

interface Props {
  data: ConsumptionSummaryData | null;
  loading?: boolean;
  activePeriod?: ConsumptionPeriod | null;
  onPeriodClick?: (period: ConsumptionPeriod) => void;
}

const cards = [
  { key: "daily" as const, field: "daily_units" as const, compare: "yesterday_units" as const, icon: Calendar, label: "Daily" },
  { key: "weekly" as const, field: "weekly_units" as const, icon: CalendarDays, label: "Weekly" },
  { key: "monthly" as const, field: "monthly_units" as const, icon: CalendarRange, label: "Monthly" },
  { key: "yearly" as const, field: "yearly_units" as const, icon: CalendarClock, label: "Yearly" },
];

export function ConsumptionSummaryCards({ data, loading, activePeriod, onPeriodClick }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Consumption Summary</h2>
          <p className="section-desc">Select a period for detailed breakdown</p>
        </div>
        <span className="text-xs text-theme-muted">Units (kWh)</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, field, compare, icon: Icon, label }) => {
          const periodLabel = data?.period_labels?.[key] ?? label;
          const units = typeof data?.[field] === "number" ? (data[field] as number) : 0;
          const yesterday = compare && data ? (data[compare] as number) : null;
          const isActive = activePeriod === key;
          const change =
            yesterday !== null && yesterday > 0 && key === "daily"
              ? (((units - yesterday) / yesterday) * 100).toFixed(1)
              : null;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onPeriodClick?.(key)}
              className={cn(
                "kpi-card group p-4 text-left transition",
                isActive && "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]",
                onPeriodClick && "hover:border-[var(--accent)]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium text-theme-muted">{periodLabel}</p>
                  {loading ? (
                    <div className="mt-2 h-8 w-20 skeleton rounded" />
                  ) : (
                    <>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-theme">
                        {units.toFixed(2)}
                      </p>
                      {change !== null && (
                        <p className={cn("mt-1 text-xs font-medium", Number(change) > 0 ? "text-red-600" : "text-emerald-600")}>
                          {Number(change) > 0 ? "+" : ""}{change}% vs yesterday
                        </p>
                      )}
                      <p className="mt-2 flex items-center gap-0.5 text-xs text-theme-muted opacity-0 transition group-hover:opacity-100">
                        Details <ChevronRight className="h-3 w-3" />
                      </p>
                    </>
                  )}
                </div>
                <Icon className="h-4 w-4 text-theme-muted" strokeWidth={1.75} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
