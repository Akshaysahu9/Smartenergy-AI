"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart3, Table2, LayoutGrid, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ConsumptionSummaryData } from "@/components/ConsumptionSummaryCards";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Period = "daily" | "weekly" | "monthly" | "yearly";
type ViewMode = "split" | "chart" | "table";

const PERIOD_META: Record<Period, { title: string; subtitle: string }> = {
  daily: { title: "Today's Consumption", subtitle: "Hour-by-hour units breakdown" },
  weekly: { title: "Last 7 Days", subtitle: "Daily units for the past week" },
  monthly: { title: "This Month", subtitle: "Day-wise consumption this month" },
  yearly: { title: "This Year", subtitle: "Month-wise consumption this year" },
};

interface Row {
  label: string;
  units: number;
  timestamp: string;
}

interface Props {
  period: Period | null;
  meterId: string;
  summary: ConsumptionSummaryData | null;
  onClose: () => void;
}

export function ConsumptionDetailPanel({ period, meterId, summary, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [totalUnits, setTotalUnits] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [view, setView] = useState<ViewMode>("split");

  useEffect(() => {
    if (!period || !meterId) return;
    setLoading(true);
    api
      .consumptionBreakdown(meterId, period)
      .then((res) => {
        setTotalUnits(res.total_units);
        setRows(res.points);
      })
      .finally(() => setLoading(false));
  }, [period, meterId]);

  const meta = period ? PERIOD_META[period] : null;
  const summaryValue =
    period && summary
      ? { daily: summary.daily_units, weekly: summary.weekly_units, monthly: summary.monthly_units, yearly: summary.yearly_units }[period]
      : 0;

  const displayTotal = summaryValue || totalUnits;
  const avg = rows.length ? totalUnits / rows.length : 0;
  const peak = rows.length ? rows.reduce((a, b) => (b.units > a.units ? b : a), rows[0]) : null;
  const chartData = rows.map((r) => ({ name: r.label, units: r.units }));

  return (
    <AnimatePresence>
      {period && meta && (
        <motion.div
          key={period}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <div className="glass-card glow-cyan border-cyan-500/30 overflow-hidden">
            {/* Header */}
            <div className="border-b border-slate-800 bg-slate-900/40 px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-cyan-400" />
                    <h3 className="text-xl font-bold text-white">{meta.title}</h3>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-400">{meta.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ViewToggle view={view} setView={setView} />
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-slate-500 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <MiniStat label="Total Units" value={displayTotal.toFixed(2)} color="cyan" />
                <MiniStat label="Average" value={avg.toFixed(2)} color="emerald" />
                <MiniStat label="Peak" value={peak ? peak.units.toFixed(2) : "—"} color="amber" />
                <MiniStat label="Peak At" value={peak ? peak.label : "—"} color="violet" small />
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 p-6 lg:grid-cols-2">
                <div className="h-72 animate-pulse rounded-xl bg-slate-800/60" />
                <div className="h-72 animate-pulse rounded-xl bg-slate-800/60" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-slate-500">
                No data yet — simulator is collecting readings…
              </div>
            ) : (
              <div
                className={cn(
                  "gap-0 p-0",
                  view === "split" && "grid lg:grid-cols-2",
                  view === "chart" && "block",
                  view === "table" && "block"
                )}
              >
                {/* Graph panel */}
                {(view === "split" || view === "chart") && (
                  <div className={cn("border-slate-800 p-6", view === "split" && "border-b lg:border-b-0 lg:border-r")}>
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                      <TrendingUp className="h-4 w-4 text-cyan-400" />
                      Consumption Graph
                    </h4>
                    <div className="mb-4 h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id={`grad-${period}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" u" />
                          <Tooltip content={<ChartTooltip />} />
                          <Area type="monotone" dataKey="units" stroke="#06b6d4" fill={`url(#grad-${period})`} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barSize={view === "chart" ? 28 : 20}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="units" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Table panel */}
                {(view === "split" || view === "table") && (
                  <div className="p-6">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                      <Table2 className="h-4 w-4 text-cyan-400" />
                      Consumption Table
                    </h4>
                    <div className={cn("overflow-hidden rounded-xl border border-slate-800", view === "table" ? "max-h-[520px]" : "max-h-[420px]")}>
                      <div className="overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 z-10 bg-slate-900">
                            <tr className="border-b border-slate-800">
                              <th className="px-4 py-3 text-left font-medium text-slate-500">#</th>
                              <th className="px-4 py-3 text-left font-medium text-slate-500">Period</th>
                              <th className="px-4 py-3 text-right font-medium text-slate-500">Units</th>
                              <th className="px-4 py-3 text-left font-medium text-slate-500 min-w-[120px]">Usage</th>
                              <th className="px-4 py-3 text-right font-medium text-slate-500">Share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, i) => {
                              const pct = totalUnits > 0 ? (row.units / totalUnits) * 100 : 0;
                              return (
                                <tr
                                  key={row.timestamp}
                                  className="border-b border-slate-800/60 transition-colors hover:bg-cyan-500/5"
                                >
                                  <td className="px-4 py-3 text-slate-600">{i + 1}</td>
                                  <td className="px-4 py-3 font-medium text-slate-200">{row.label}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-cyan-400">
                                    {row.units.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all"
                                        style={{ width: `${Math.max(pct, 2)}%` }}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400">{pct.toFixed(1)}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="sticky bottom-0 bg-slate-900/95">
                            <tr className="border-t border-cyan-500/30">
                              <td colSpan={2} className="px-4 py-3 font-semibold text-white">
                                Total
                              </td>
                              <td className="px-4 py-3 text-right text-lg font-bold text-cyan-400">
                                {totalUnits.toFixed(2)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" />
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-400">100%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-bold text-cyan-400">{payload[0].value.toFixed(2)} units</p>
    </div>
  );
}

function ViewToggle({ view, setView }: { view: ViewMode; setView: (v: ViewMode) => void }) {
  const items: { id: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { id: "split", icon: LayoutGrid, label: "Both" },
    { id: "chart", icon: BarChart3, label: "Graph" },
    { id: "table", icon: Table2, label: "Table" },
  ];
  return (
    <div className="flex rounded-lg border border-slate-700 bg-slate-900/80 p-0.5">
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setView(id)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            view === id ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-white"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string;
  color: "cyan" | "emerald" | "amber" | "violet";
  small?: boolean;
}) {
  const colors = {
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    violet: "border-violet-500/20 bg-violet-500/5 text-violet-400",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3", colors[color])}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("mt-0.5 font-bold text-white", small ? "truncate text-sm" : "text-xl")}>{value}</p>
    </div>
  );
}
