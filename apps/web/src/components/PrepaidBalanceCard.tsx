"use client";

import { Wifi, WifiOff, AlertTriangle, Zap, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconBox } from "./IconBox";

export interface PrepaidStatusData {
  balance_inr: number;
  connection_status: string;
  is_connected: boolean;
  is_low_balance: boolean;
  low_balance_threshold_inr: number;
  estimated_days_remaining?: number | null;
  tariff_rate: number;
  consumer_number: string;
  meter_serial: string;
}

interface Props {
  status: PrepaidStatusData | null;
  loading?: boolean;
}

export function PrepaidBalanceCard({ status, loading }: Props) {
  if (loading || !status) {
    return <div className="h-40 skeleton rounded-2xl" />;
  }

  const connected = status.is_connected && status.balance_inr > 0;

  return (
    <div className="space-y-4">
      {status.is_low_balance && connected && (
        <div className="flex items-center gap-4 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-yellow-500/10 px-5 py-4 shadow-lg shadow-amber-500/10">
          <div className="icon-box-md icon-amber shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-100">Low Balance Alert</p>
            <p className="text-sm text-amber-200/80">
              Simulated prepaid balance: ₹{status.balance_inr.toFixed(2)} remaining
            </p>
          </div>
        </div>
      )}

      {!connected && (
        <div className="flex items-center gap-4 rounded-2xl border-2 border-red-400/50 bg-gradient-to-r from-red-500/25 via-rose-500/15 to-pink-500/10 px-5 py-4 shadow-lg shadow-red-500/15">
          <div className="icon-box-md icon-red shrink-0">
            <WifiOff className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-100">Simulated Disconnection</p>
            <p className="text-sm text-red-200/80">Demo meter paused — balance depleted in simulation</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-gradient-emerald relative overflow-hidden p-6 md:col-span-1">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300/80">Simulated Balance</p>
              <div className="mt-2 flex items-baseline gap-1">
                <IndianRupee className="h-7 w-7 text-emerald-300" strokeWidth={2.5} />
                <p className="text-4xl font-black tracking-tight text-white">{status.balance_inr.toFixed(2)}</p>
              </div>
              <p className="mt-2 text-xs font-medium text-emerald-200/70">
                ₹{status.tariff_rate}/unit · ~{status.estimated_days_remaining ?? "—"} days left
              </p>
            </div>
            <IconBox icon={IndianRupee} color="emerald" size="lg" className="animate-float" />
          </div>
        </div>

        <div className={cn("relative overflow-hidden p-6", connected ? "card-gradient-blue" : "card-gradient-rose")}>
          <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/5 blur-xl" />
          <div className="relative flex items-center gap-4">
            <IconBox icon={connected ? Wifi : WifiOff} color={connected ? "blue" : "red"} size="lg" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">Connection</p>
              <p className={cn("mt-1 text-2xl font-black", connected ? "text-blue-200" : "text-red-200")}>
                {connected ? "● Connected" : "● Disconnected"}
              </p>
              <p className="mt-1 text-xs text-white/50">Live simulator status</p>
            </div>
          </div>
        </div>

        <div className="card-gradient-purple relative overflow-hidden p-6">
          <div className="absolute -left-4 -top-4 h-20 w-20 rounded-full bg-purple-400/10 blur-xl" />
          <div className="relative flex items-center gap-4">
            <IconBox icon={Zap} color="purple" size="lg" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-200/70">Smart Meter</p>
              <p className="mt-1 text-base font-bold text-white">{status.consumer_number}</p>
              <p className="text-xs font-medium text-purple-200/60">{status.meter_serial}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
