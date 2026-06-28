import { cn } from "@/lib/utils";

const labels: Record<string, { text: string; className: string }> = {
  simulated: { text: "Demo Sim", className: "badge-sim" },
  api: { text: "Live API", className: "badge-api" },
  manual: { text: "Manual", className: "badge-manual" },
  csv: { text: "CSV Import", className: "badge-manual" },
};

export function DataSourceBadge({ source }: { source?: string }) {
  const key = source || "simulated";
  const cfg = labels[key] || labels.simulated;
  return <span className={cn(cfg.className)}>{cfg.text}</span>;
}
