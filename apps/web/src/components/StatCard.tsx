import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  loading?: boolean;
}

export function StatCard({ title, value, unit, icon: Icon, loading }: StatCardProps) {
  return (
    <div className="kpi-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-theme-muted">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 skeleton rounded" />
          ) : (
            <p className="mt-1 truncate text-xl font-semibold tabular-nums text-theme">
              {value}
              {unit && <span className="ml-1 text-sm font-normal text-theme-muted">{unit}</span>}
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)]">
          <Icon className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
