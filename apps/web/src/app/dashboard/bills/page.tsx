"use client";

import { useCallback, useState } from "react";
import { Receipt, TrendingUp, Zap, FileDown, Loader2 } from "lucide-react";
import { IconBox } from "@/components/IconBox";
import { useAuth } from "@/context/AuthContext";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/utils";

export default function BillsPage() {
  const { activeMeter } = useAuth();
  const [bill, setBill] = useState<Awaited<ReturnType<typeof api.bill>> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [billMsg, setBillMsg] = useState("");

  const load = useCallback(async () => {
    if (!activeMeter) return;
    const data = await api.bill(activeMeter.id);
    setBill(data);
  }, [activeMeter]);

  useAutoRefresh(load, 15_000, !!activeMeter);

  const downloadDiscomBill = async () => {
    if (!activeMeter) return;
    setGenerating(true);
    setBillMsg("");
    try {
      const report = await api.generateDiscomBill(activeMeter.id);
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/reports/${activeMeter.id}/${report.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `electricity-bill-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      setBillMsg(`Bill generated: ${report.title}`);
    } catch {
      setBillMsg("Failed to generate bill");
    } finally {
      setGenerating(false);
    }
  };

  if (!bill) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 skeleton rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-theme-muted">Indian DISCOM tariff slabs · calculated from your meter data</p>
        <button onClick={downloadDiscomBill} disabled={generating} className="btn-primary shadow-lg">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {generating ? "Generating..." : "Download Electricity Bill (PDF)"}
        </button>
      </div>
      {billMsg && <p className="text-sm text-emerald-600">{billMsg}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-6">
          <IconBox icon={Zap} color="blue" size="md" className="mb-4" />
          <p className="text-xs font-bold uppercase tracking-wider text-theme-muted">Current Month</p>
          <p className="mt-2 text-3xl font-black text-theme">
            {bill.current_month_units}
            <span className="ml-2 text-base font-semibold text-theme-muted">units</span>
          </p>
        </div>
        <div className="glass-card p-6">
          <IconBox icon={TrendingUp} color="cyan" size="md" className="mb-4" />
          <p className="text-xs font-bold uppercase tracking-wider text-theme-muted">Predicted Units</p>
          <p className="mt-2 text-3xl font-black text-theme">
            {bill.predicted_units}
            <span className="ml-2 text-base font-semibold text-theme-muted">units</span>
          </p>
        </div>
        <div className="glass-card p-6">
          <IconBox icon={Receipt} color="emerald" size="md" className="mb-4" />
          <p className="text-xs font-bold uppercase tracking-wider text-theme-muted">Predicted Bill</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">₹{bill.predicted_bill_inr.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h3 className="font-bold text-theme">Tariff Breakdown — DISCOM Slabs</h3>
          <p className="text-xs text-theme-muted">Indian electricity tariff applied to projected consumption</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--background)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-theme-muted">Slab</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-theme-muted">Units</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-theme-muted">Rate (₹)</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-theme-muted">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {bill.breakdown.map((row, i) => (
              <tr key={i} className="border-t border-[var(--border)] transition hover:bg-[var(--background)]">
                <td className="px-6 py-4 font-medium text-theme">{row.slab}</td>
                <td className="px-6 py-4 text-theme-muted">{row.units}</td>
                <td className="px-6 py-4 text-theme-muted">{row.rate}</td>
                <td className="px-6 py-4 font-semibold text-[var(--accent)]">₹{row.amount.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
