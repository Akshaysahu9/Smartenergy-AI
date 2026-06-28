"use client";

import { memo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#059669", "#0ea5e9", "#d97706", "#dc2626", "#7c3aed", "#db2777"];

interface ChartProps {
  data: { label: string; value: number; lower?: number; upper?: number }[];
  type?: "line" | "area" | "bar";
  unit?: string;
  height?: number;
}

export const EnergyChart = memo(function EnergyChart({ data, type = "area", unit = "W", height = 300 }: ChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm text-theme-muted" style={{ height }}>
        No data available
      </div>
    );
  }

  const chartData = data.map((d) => ({ name: d.label, value: d.value, lower: d.lower, upper: d.upper }));
  const grid = "var(--chart-grid)";
  const text = "var(--chart-text)";
  const accent = "var(--accent)";
  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "bar" ? (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="name" stroke={text} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={text} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill={accent} radius={[3, 3, 0, 0]} />
        </BarChart>
      ) : type === "line" ? (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="name" stroke={text} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={text} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="value" stroke={accent} strokeWidth={2} dot={false} />
        </LineChart>
      ) : (
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accent} stopOpacity={0.15} />
              <stop offset="95%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="name" stroke={text} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke={text} fontSize={11} tickLine={false} axisLine={false} unit={` ${unit}`} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="value" stroke={accent} fill="url(#chartFill)" strokeWidth={2} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
});

export function PieChartAppliances({
  data,
}: {
  data: { name: string; estimated_kwh: number; percentage: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="estimated_kwh" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
