"use client";

import { ReactNode, Suspense } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { Bell, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DataSourceBadge } from "./DataSourceBadge";
import { ThemeSwitcher } from "./ThemeSwitcher";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Overview", subtitle: "Real-time consumption and meter status" },
  "/dashboard/predictions": { title: "Energy Forecast", subtitle: "Consumption predictions based on historical data" },
  "/dashboard/bills": { title: "Billing", subtitle: "Tariff calculation and bill estimates" },
  "/dashboard/analytics": { title: "Analytics", subtitle: "Usage patterns, peak hours, and trends" },
  "/dashboard/recommendations": { title: "Insights", subtitle: "Energy saving recommendations" },
  "/dashboard/alerts": { title: "Alerts", subtitle: "Threshold and anomaly notifications" },
  "/dashboard/carbon": { title: "Carbon Footprint", subtitle: "Environmental impact analysis" },
  "/dashboard/reports": { title: "Reports", subtitle: "Downloadable energy audit reports" },
  "/dashboard/chat": { title: "Support", subtitle: "Energy assistant and help" },
  "/dashboard/settings": { title: "Settings", subtitle: "Meter configuration and preferences" },
};

function SidebarFallback() {
  return <aside className="sidebar-shell fixed left-0 top-0 z-40 h-screen w-[248px] border-r" />;
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { activeMeter, user } = useAuth();
  const meta = pageMeta[pathname] || { title: "Dashboard", subtitle: "" };
  const isHome = pathname === "/dashboard";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mesh-bg min-h-screen">
      <Suspense fallback={<SidebarFallback />}>
        <Sidebar />
      </Suspense>
      <main className="ml-[248px] min-h-screen">
        <header className="app-header sticky top-0 z-30 border-b px-6 py-3.5 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {isHome && user ? (
                <>
                  <p className="text-xs font-medium text-theme-muted">{today}</p>
                  <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-theme">
                    Good {getGreeting()}, {user.name?.split(" ")[0]}
                  </h1>
                </>
              ) : (
                <>
                  <h1 className="text-lg font-semibold tracking-tight text-theme">{meta.title}</h1>
                  {meta.subtitle && <p className="mt-0.5 text-sm text-theme-muted">{meta.subtitle}</p>}
                </>
              )}
              {activeMeter && isHome && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs text-theme-muted">{activeMeter.label}</span>
                  <DataSourceBadge source={activeMeter.data_source} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher compact />
              <Link
                href="/dashboard/settings?tab=appearance"
                className="theme-chip rounded-lg p-2 transition hover:opacity-80"
                title="Settings"
              >
                <Settings className="h-[18px] w-[18px] text-theme-muted" strokeWidth={1.75} />
              </Link>
              <Link
                href="/dashboard/alerts"
                className="theme-chip rounded-lg p-2 transition hover:opacity-80"
                title="Alerts"
              >
                <Bell className="h-[18px] w-[18px] text-theme-muted" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </header>
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
