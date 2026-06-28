"use client";

import { memo, useEffect, useState, useCallback, useRef } from "react";
import { Activity, Zap, Gauge, Battery, Radio, Wifi } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { EnergyChart } from "@/components/EnergyChart";
import { ConsumptionSummaryCards, ConsumptionSummaryData, ConsumptionPeriod } from "@/components/ConsumptionSummaryCards";
import { ConsumptionDetailPanel } from "@/components/ConsumptionDetailPanel";
import { PrepaidBalanceCard, PrepaidStatusData } from "@/components/PrepaidBalanceCard";
import { LiveMeterGauge } from "@/components/LiveMeterGauge";
import { DashboardKpiStrip } from "@/components/DashboardKpiStrip";
import { EnergyInsightCard } from "@/components/EnergyInsightCard";
import { useAuth } from "@/context/AuthContext";
import { useLiveMeter } from "@/hooks/useLiveMeter";
import { api } from "@/lib/api";

function pctChange(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

const LiveChart = memo(function LiveChart({
  data,
  unit,
  title,
}: {
  data: { label: string; value: number }[];
  unit: string;
  title: string;
}) {
  return (
    <div className="glass-card p-5">
      <h2 className="section-title mb-4">{title}</h2>
      <EnergyChart data={data} unit={unit} />
    </div>
  );
});

export default function OverviewPage() {
  const { activeMeter } = useAuth();
  const meterId = activeMeter?.id;
  const dataSource = activeMeter?.data_source;
  const { reading, history, connected, lastUpdate, isStale, error: liveError } = useLiveMeter(meterId, dataSource);

  const [weekHistory, setWeekHistory] = useState<{ label: string; value: number }[]>([]);
  const [consumption, setConsumption] = useState<ConsumptionSummaryData | null>(null);
  const [consumptionLoading, setConsumptionLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<ConsumptionPeriod | null>(null);
  const [prepaid, setPrepaid] = useState<PrepaidStatusData | null>(null);
  const [billEstimate, setBillEstimate] = useState<number | null>(null);
  const [insight, setInsight] = useState<string | undefined>();
  const [savings, setSavings] = useState<number | undefined>();
  const mounted = useRef(true);
  const lastSummaryRefresh = useRef(0);

  const loadPrepaid = useCallback(async () => {
    if (!meterId) return;
    const s = await api.prepaidStatus(meterId);
    if (mounted.current) setPrepaid(s);
  }, [meterId]);

  const loadBill = useCallback(async () => {
    if (!meterId) return;
    try {
      const b = await api.bill(meterId);
      if (mounted.current) setBillEstimate(b.predicted_bill_inr);
    } catch {
      if (mounted.current) setBillEstimate(null);
    }
  }, [meterId]);

  const loadInsight = useCallback(async () => {
    if (!meterId) return;
    try {
      const recs = await api.recommendations(meterId);
      if (!mounted.current || !recs?.length) return;
      const top = recs[0];
      setInsight(`${top.title}. ${top.reason}`);
      const withSavings = recs.find((r) => r.estimated_savings_inr > 0);
      if (withSavings) setSavings(withSavings.estimated_savings_inr);
    } catch {
      /* optional */
    }
  }, [meterId]);

  const loadConsumption = useCallback(async (silent = false) => {
    if (!meterId) return;
    if (!silent) setConsumptionLoading(true);
    try {
      const data = await api.consumptionSummary(meterId);
      if (mounted.current) setConsumption(data);
    } finally {
      if (mounted.current && !silent) setConsumptionLoading(false);
    }
  }, [meterId]);

  const loadWeekHistory = useCallback(async () => {
    if (!meterId) return;
    const weekData = await api.history(meterId, "week");
    if (!mounted.current) return;
    setWeekHistory(
      weekData.points.map((p) => ({
        label: new Date(p.timestamp).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        value: p.value,
      }))
    );
  }, [meterId]);

  // Initial parallel load — one round trip batch
  useEffect(() => {
    mounted.current = true;
    if (!meterId) return;

    setConsumptionLoading(true);
    Promise.all([loadConsumption(true), loadPrepaid(), loadBill(), loadInsight(), loadWeekHistory()]).finally(() => {
      if (mounted.current) setConsumptionLoading(false);
    });

    const interval = setInterval(() => {
      loadConsumption(true);
      loadPrepaid();
      loadBill();
    }, 10_000);

    const weekInterval = setInterval(loadWeekHistory, 30_000);

    return () => {
      mounted.current = false;
      clearInterval(interval);
      clearInterval(weekInterval);
    };
  }, [meterId, loadConsumption, loadPrepaid, loadBill, loadInsight, loadWeekHistory]);

  // Refresh KPIs when live stream delivers new readings (throttled)
  useEffect(() => {
    if (!lastUpdate || !meterId) return;
    const now = Date.now();
    if (now - lastSummaryRefresh.current < 6_000) return;
    lastSummaryRefresh.current = now;
    loadConsumption(true);
    if (dataSource === "simulated") loadPrepaid();
  }, [lastUpdate, meterId, dataSource, loadConsumption, loadPrepaid]);

  // Sync prepaid balance from live reading without extra API call
  useEffect(() => {
    if (reading?.prepaid_balance_inr == null) return;
    setPrepaid((prev) =>
      prev
        ? {
            ...prev,
            balance_inr: reading.prepaid_balance_inr!,
            connection_status: reading.connection_status ?? prev.connection_status,
            is_connected:
              (reading.connection_status ?? prev.connection_status) === "connected" &&
              reading.prepaid_balance_inr! > 0,
          }
        : prev
    );
  }, [reading?.prepaid_balance_inr, reading?.connection_status]);

  if (!activeMeter) {
    return <p className="text-theme-muted">No meter configured. Register to create one.</p>;
  }

  const todayVsYesterday = consumption
    ? pctChange(consumption.daily_units, consumption.yesterday_units)
    : undefined;

  const isSimulated = dataSource === "simulated";
  const hasRecentData = lastUpdate != null && !isStale;
  const isLive = isSimulated ? connected && hasRecentData : hasRecentData || connected;

  const statusText = (() => {
    if (liveError && !reading) return `No readings yet — ${isSimulated ? "start simulator or connect a meter" : "push data via API or log manually"}`;
    if (isSimulated) {
      return isLive ? "Demo simulator active · Updates every 2s" : "Simulator idle — waiting for data";
    }
    if (isLive) return `Live meter (${dataSource?.toUpperCase()}) · ${lastUpdate?.toLocaleTimeString("en-IN")}`;
    return `Waiting for meter data — configure API push or manual entry in Settings`;
  })();

  return (
    <div className="space-y-6 md:space-y-8">
      <DashboardKpiStrip
        loading={consumptionLoading && !consumption}
        currentKw={reading ? reading.power_watts / 1000 : undefined}
        todayKwh={consumption?.daily_units}
        todayVsYesterday={todayVsYesterday}
        monthKwh={consumption?.monthly_units}
        estimatedBill={billEstimate ?? undefined}
        balance={isSimulated ? (prepaid?.balance_inr ?? reading?.prepaid_balance_inr) : undefined}
        lowBalance={isSimulated && (prepaid?.balance_inr ?? reading?.prepaid_balance_inr ?? 999) < 500}
      />

      <div className="status-bar">
        <span className={`live-dot h-2 w-2 shrink-0 rounded-full ${isLive ? "bg-emerald-500" : "bg-amber-500"}`} />
        <span className="text-theme-muted">{statusText}</span>
        {!isSimulated && (
          <span className="ml-auto rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-theme-muted">
            API Mode
          </span>
        )}
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-12 xl:gap-6">
        <div className="lg:col-span-1 xl:col-span-5" id="live-meter">
          <LiveMeterGauge
            powerWatts={reading?.power_watts ?? 0}
            voltage={reading?.voltage}
            current={reading?.current}
            powerFactor={reading?.power_factor}
            frequency={reading?.frequency}
          />
        </div>
        <div className="glass-card flex flex-col p-5 sm:p-6 lg:col-span-1 xl:col-span-4">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="section-title">Weekly Consumption</h3>
              <p className="section-desc">kWh · last 7 days</p>
            </div>
          </div>
          <div className="min-h-[220px] flex-1">
            <EnergyChart data={weekHistory} unit="kWh" height={240} />
          </div>
        </div>
        <div className="lg:col-span-2 xl:col-span-3">
          <EnergyInsightCard message={insight} savingsInr={savings} />
        </div>
      </div>

      {isSimulated && <PrepaidBalanceCard status={prepaid} />}

      <ConsumptionSummaryCards
        data={consumption}
        loading={consumptionLoading}
        activePeriod={selectedPeriod}
        onPeriodClick={(p) => setSelectedPeriod((prev) => (prev === p ? null : p))}
      />

      <ConsumptionDetailPanel
        period={selectedPeriod}
        meterId={activeMeter.id}
        summary={consumption}
        onClose={() => setSelectedPeriod(null)}
      />

      <div>
        <h2 className="section-title mb-3">Electrical Parameters</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard title="Voltage" value={reading?.voltage?.toFixed(1) ?? "—"} unit="V" icon={Zap} />
          <StatCard title="Current" value={reading?.current?.toFixed(2) ?? "—"} unit="A" icon={Activity} />
          <StatCard title="Power" value={reading?.power_watts?.toFixed(0) ?? "—"} unit="W" icon={Gauge} />
          <StatCard title="Energy" value={reading?.energy_kwh?.toFixed(2) ?? "—"} unit="kWh" icon={Battery} />
          <StatCard title="Power Factor" value={reading?.power_factor?.toFixed(2) ?? "—"} icon={Radio} />
          <StatCard title="Frequency" value={reading?.frequency?.toFixed(1) ?? "—"} unit="Hz" icon={Wifi} />
          <StatCard title="Connection" value={prepaid?.is_connected ? "Online" : "Offline"} icon={Activity} />
        </div>
      </div>

      <LiveChart data={history} unit="W" title="Live Power Consumption (24h)" />
    </div>
  );
}
