"use client";

import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Info, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AlertsPage() {
  const { activeMeter } = useAuth();
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof api.alerts>>>([]);

  const load = () => {
    if (!activeMeter) return;
    api.alerts(activeMeter.id).then(setAlerts).catch(() => setAlerts([]));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [activeMeter]);

  const markRead = async (id: string) => {
    await api.markAlertRead(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const icon = (severity: string) => {
    if (severity === "critical") return AlertTriangle;
    if (severity === "warning") return Bell;
    return Info;
  };

  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-theme">Smart Alerts</h2>
        {unread > 0 && (
          <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-500">
            {unread} unread
          </span>
        )}
      </div>
      {alerts.length === 0 ? (
        <div className="glass-card p-12 text-center text-theme-muted">No alerts — your consumption looks normal</div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = icon(alert.severity);
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => !alert.read && markRead(alert.id)}
                className={cn(
                  "glass-card flex w-full items-start gap-4 p-4 text-left transition hover:opacity-95",
                  !alert.read && "border-emerald-500/30 ring-1 ring-emerald-500/20"
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    alert.severity === "critical" ? "text-red-400" : alert.severity === "warning" ? "text-amber-400" : "text-cyan-400"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-theme capitalize">{alert.type.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm text-theme-muted">{alert.message}</p>
                  <p className="mt-2 text-xs text-theme-muted opacity-70">
                    {new Date(alert.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                {alert.read ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <span className="shrink-0 text-[10px] font-bold uppercase text-emerald-500">Mark read</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
