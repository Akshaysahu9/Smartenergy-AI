"use client";

import { useState } from "react";
import { FileDown, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/utils";

export default function ReportsPage() {
  const { activeMeter } = useAuth();
  const [report, setReport] = useState<{ id: string; title: string; created_at: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!activeMeter) return;
    setLoading(true);
    try {
      const r = await api.generateReport(activeMeter.id);
      setReport(r);
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    if (!activeMeter || !report) return;
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_URL}/reports/${activeMeter.id}/${report.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartenergy-report-${report.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Energy Reports</h2>
      <div className="glass-card max-w-lg p-8 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-cyan-400" />
        <p className="text-slate-400">PDF report with bill summary, carbon footprint, and savings tips.</p>
        <button
          onClick={generate}
          disabled={loading || !activeMeter}
          className="mt-6 rounded-lg bg-cyan-500 px-6 py-2.5 font-medium text-white hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Monthly Report"}
        </button>
        {report && (
          <div className="mt-6 rounded-lg bg-slate-800/60 p-4">
            <p className="text-sm text-white">{report.title}</p>
            <p className="text-xs text-slate-500">{new Date(report.created_at).toLocaleString("en-IN")}</p>
            <button
              onClick={download}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/30 py-2 text-sm text-cyan-400 hover:bg-cyan-500/10"
            >
              <FileDown className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
