"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, Meter } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { ThemePickerGrid } from "@/components/ThemeSwitcher";
import {
  Plug,
  Upload,
  Key,
  Save,
  Plus,
  Zap,
  Radio,
  FileSpreadsheet,
  Copy,
  Check,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "appearance" | "connect" | "manual" | "import" | "config";

const sources = [
  {
    id: "api" as const,
    title: "Live Smart Meter API",
    desc: "Push readings from Shelly, ESP32, Node-RED, or any IoT device via HTTP POST.",
    icon: Radio,
    color: "from-violet-500/20 to-purple-500/5 ring-violet-500/30",
  },
  {
    id: "manual" as const,
    title: "Manual Entry",
    desc: "Log readings from your physical meter display — ideal for monthly DISCOM meters.",
    icon: Zap,
    color: "from-amber-500/20 to-orange-500/5 ring-amber-500/30",
  },
  {
    id: "csv" as const,
    title: "CSV Import",
    desc: "Bulk upload historical data from utility bills or smart plug exports.",
    icon: FileSpreadsheet,
    color: "from-emerald-500/20 to-teal-500/5 ring-emerald-500/30",
  },
  {
    id: "simulated" as const,
    title: "Demo Simulator",
    desc: "Try the platform with realistic synthetic data — for demos & testing only.",
    icon: Plug,
    color: "from-slate-500/20 to-slate-600/5 ring-slate-500/30",
  },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const { activeMeter, meters, setActiveMeter, refreshMeters } = useAuth();
  const initialTab = (searchParams.get("tab") as Tab) || "appearance";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [label, setLabel] = useState("");
  const [location, setLocation] = useState("");
  const [utility, setUtility] = useState("");
  const [tariff, setTariff] = useState(6.5);
  const [alertWatts, setAlertWatts] = useState(5000);
  const [billThreshold, setBillThreshold] = useState(2000);
  const [dataSource, setDataSource] = useState<string>("simulated");
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [ingestUrl, setIngestUrl] = useState("");
  const [copied, setCopied] = useState("");
  const [manualPower, setManualPower] = useState("");
  const [manualEnergy, setManualEnergy] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [newMeterLabel, setNewMeterLabel] = useState("");

  useEffect(() => {
    const t = searchParams.get("tab") as Tab | null;
    if (t && ["appearance", "connect", "manual", "import", "config"].includes(t)) setTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (!activeMeter) return;
    setLabel(activeMeter.label);
    setLocation(activeMeter.location || "");
    setUtility(activeMeter.utility_provider || "");
    setTariff(activeMeter.tariff_rate);
    setAlertWatts(activeMeter.alert_threshold_watts);
    setBillThreshold(activeMeter.bill_threshold_inr);
    setDataSource(activeMeter.data_source || "simulated");
  }, [activeMeter]);

  const save = async () => {
    if (!activeMeter) return;
    setActionError("");
    try {
      await api.updateMeter(activeMeter.id, {
        label,
        location,
        utility_provider: utility,
        tariff_rate: tariff,
        alert_threshold_watts: alertWatts,
        bill_threshold_inr: billThreshold,
        data_source: dataSource as Meter["data_source"],
      });
      await refreshMeters();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to save configuration");
    }
  };

  const selectSource = async (source: string) => {
    setDataSource(source);
    if (!activeMeter) return;
    setActionError("");
    try {
      await api.updateMeter(activeMeter.id, { data_source: source as Meter["data_source"] });
      await refreshMeters();
      if (source === "api") setTab("connect");
      else if (source === "manual") setTab("manual");
      else if (source === "csv") setTab("import");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update data source");
    }
  };

  const genKey = async () => {
    if (!activeMeter) return;
    setActionError("");
    try {
      const res = await api.regenerateApiKey(activeMeter.id);
      setApiKey(res.api_key);
      setIngestUrl(res.ingest_url);
      await refreshMeters();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to generate API key");
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const submitManual = async () => {
    if (!activeMeter || !manualPower) return;
    setActionError("");
    try {
      await api.addReading(activeMeter.id, {
        power_watts: Number(manualPower),
        energy_kwh: manualEnergy ? Number(manualEnergy) : undefined,
      });
      setManualPower("");
      setManualEnergy("");
      setImportMsg("Reading logged successfully — dashboard will update live");
      setTimeout(() => setImportMsg(""), 4000);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to log reading");
    }
  };

  const handleCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeMeter) return;
    setActionError("");
    try {
      const res = await api.importCsv(activeMeter.id, file);
      setImportMsg(res.message);
      await refreshMeters();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "CSV import failed");
    }
    e.target.value = "";
  };

  const addProperty = async () => {
    if (!newMeterLabel.trim()) return;
    setActionError("");
    try {
      const meter = await api.createMeter({
        label: newMeterLabel,
        data_source: "api",
        location: "",
      });
      setActiveMeter(meter);
      setNewMeterLabel("");
      await refreshMeters();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to add property");
    }
  };

  if (!activeMeter) {
    return <p className="text-theme-muted">No meter configured.</p>;
  }

  const tabs: { id: Tab; label: string; icon: typeof Plug }[] = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "connect", label: "Connect Meter", icon: Plug },
    { id: "manual", label: "Manual Log", icon: Zap },
    { id: "import", label: "CSV Import", icon: Upload },
    { id: "config", label: "Configuration", icon: Save },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Settings"
        description="Customize appearance, connect your meter, and configure alerts & tariffs."
        badge={<DataSourceBadge source={activeMeter.data_source} />}
      />

      {actionError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b pb-1" style={{ borderColor: "var(--border)" }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-medium transition",
              tab === id ? "border-b-2 border-emerald-500 text-emerald-500" : "text-theme-muted hover:text-theme"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "appearance" && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass-card p-6">
            <h3 className="mb-1 text-lg font-bold text-theme">Theme & Appearance</h3>
            <p className="mb-6 text-sm text-theme-muted">
              Pick a look that suits you. Pro Light matches professional energy dashboards; dark themes are easier on the eyes at night.
            </p>
            <ThemePickerGrid />
          </div>
          <div className="glass-card p-6">
            <h3 className="mb-2 font-semibold text-theme">Quick tips</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-theme-muted">
              <li>Use the palette icon in the header to switch themes anytime.</li>
              <li>Your choice is saved automatically on this device.</li>
              <li>Pro Light uses a dark sidebar with a clean white dashboard — like top energy apps.</li>
            </ul>
          </div>
        </div>
      )}

      {tab === "connect" && (
        <div className="space-y-6 animate-slide-up">
          <div className="grid gap-4 sm:grid-cols-2">
            {sources.map(({ id, title, desc, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => selectSource(id)}
                className={cn(
                  "glass-card-hover gradient-border relative p-5 text-left ring-1 transition",
                  color,
                  dataSource === id && "ring-emerald-500/40"
                )}
              >
                <Icon className="mb-3 h-6 w-6 text-emerald-500" />
                <h3 className="font-semibold text-theme">{title}</h3>
                <p className="mt-1 text-sm text-theme-muted">{desc}</p>
                {dataSource === id && (
                  <span className="mt-3 inline-block text-xs font-semibold text-emerald-500">● Active</span>
                )}
              </button>
            ))}
          </div>

          {(dataSource === "api" || activeMeter.has_api_key) && (
            <div className="glass-card glow-cyan space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold text-theme">API Integration</h3>
              </div>
              <p className="text-sm text-theme-muted">
                Push readings from any device. Send POST requests with header{" "}
                <code className="rounded px-1.5 py-0.5 text-cyan-500" style={{ background: "var(--background-elevated)" }}>
                  X-Meter-Key
                </code>
              </p>
              <button onClick={genKey} className="btn-primary">
                {activeMeter.has_api_key ? "Regenerate API Key" : "Generate API Key"}
              </button>
              {ingestUrl && (
                <div className="space-y-3 rounded-xl p-4" style={{ background: "var(--background-elevated)" }}>
                  <div>
                    <p className="mb-1 text-xs text-theme-muted">Ingest URL</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate text-sm text-emerald-500">{ingestUrl}</code>
                      <button onClick={() => copyText(ingestUrl, "url")} className="btn-secondary px-3 py-1.5">
                        {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {apiKey && (
                    <div>
                      <p className="mb-1 text-xs text-theme-muted">API Key (shown once)</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate text-sm text-amber-500">{apiKey}</code>
                        <button onClick={() => copyText(apiKey, "key")} className="btn-secondary px-3 py-1.5">
                          {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                  <pre className="overflow-x-auto rounded-lg p-3 text-xs text-theme-muted" style={{ background: "var(--background)" }}>{`curl -X POST "${ingestUrl}" \\
  -H "X-Meter-Key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"power_watts": 1250, "voltage": 230, "energy_kwh": 4521.3}'`}</pre>
                </div>
              )}
            </div>
          )}

          <div className="glass-card p-6">
            <h3 className="mb-3 font-semibold text-theme">Add Another Property</h3>
            <div className="flex gap-3">
              <input
                value={newMeterLabel}
                onChange={(e) => setNewMeterLabel(e.target.value)}
                placeholder="e.g. Office Building, Shop Unit 2"
                className="input-field flex-1"
              />
              <button onClick={addProperty} className="btn-primary shrink-0">
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            {meters.length > 1 && (
              <p className="mt-2 text-xs text-theme-muted">{meters.length} properties connected</p>
            )}
          </div>
        </div>
      )}

      {tab === "manual" && (
        <div className="glass-card max-w-lg space-y-4 p-6 animate-slide-up">
          <h3 className="font-semibold text-theme">Log a Reading</h3>
          <p className="text-sm text-theme-muted">Enter values from your physical meter or smart plug app.</p>
          <div>
            <label className="mb-1 block text-sm text-theme-muted">Current Power (Watts)</label>
            <input
              type="number"
              value={manualPower}
              onChange={(e) => setManualPower(e.target.value)}
              className="input-field"
              placeholder="e.g. 1450"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-theme-muted">Cumulative Energy (kWh) — optional</label>
            <input
              type="number"
              step="0.01"
              value={manualEnergy}
              onChange={(e) => setManualEnergy(e.target.value)}
              className="input-field"
              placeholder="From meter display"
            />
          </div>
          <button onClick={submitManual} disabled={!manualPower} className="btn-primary w-full">
            Submit Reading
          </button>
          {importMsg && <p className="text-sm text-emerald-500">{importMsg}</p>}
        </div>
      )}

      {tab === "import" && (
        <div className="glass-card max-w-xl space-y-4 p-6 animate-slide-up">
          <h3 className="font-semibold text-theme">Import CSV Data</h3>
          <p className="text-sm text-theme-muted">
            Required columns: <code className="text-cyan-500">timestamp</code>,{" "}
            <code className="text-cyan-500">power_watts</code>. Optional: voltage, energy_kwh, current.
          </p>
          <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition hover:border-emerald-500/30 hover:bg-emerald-500/5" style={{ borderColor: "var(--border)" }}>
            <Upload className="mb-3 h-10 w-10 opacity-40" />
            <span className="text-sm font-medium text-theme">Drop CSV file or click to browse</span>
            <span className="mt-1 text-xs text-theme-muted">Supports utility exports & IoT device logs</span>
            <input type="file" accept=".csv" onChange={handleCsv} className="hidden" />
          </label>
          {importMsg && <p className="text-sm text-emerald-500">{importMsg}</p>}
        </div>
      )}

      {tab === "config" && (
        <div className="glass-card max-w-xl space-y-4 p-6 animate-slide-up">
          <div>
            <label className="mb-1 block text-sm text-theme-muted">Property / Meter Name</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-theme-muted">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="input-field" placeholder="e.g. Bhopal, MP" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-theme-muted">Utility Provider (DISCOM)</label>
            <input value={utility} onChange={(e) => setUtility(e.target.value)} className="input-field" placeholder="e.g. MPMKVVCL" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-theme-muted">Tariff Rate (₹/unit) — used for bill calc</label>
            <input type="number" step="0.1" value={tariff} onChange={(e) => setTariff(Number(e.target.value))} className="input-field" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-theme-muted">High Usage Alert (W)</label>
              <input type="number" value={alertWatts} onChange={(e) => setAlertWatts(Number(e.target.value))} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-theme-muted">Bill Alert (₹)</label>
              <input type="number" value={billThreshold} onChange={(e) => setBillThreshold(Number(e.target.value))} className="input-field" />
            </div>
          </div>
          <button onClick={save} className="btn-primary">
            {saved ? "Saved!" : "Save Configuration"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-theme-muted">Loading settings...</p>}>
      <SettingsContent />
    </Suspense>
  );
}
