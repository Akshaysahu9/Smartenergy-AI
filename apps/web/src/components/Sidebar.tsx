"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  BarChart3,
  Lightbulb,
  Bell,
  Leaf,
  FileText,
  Zap,
  LogOut,
  ChevronDown,
  Plug,
  Plus,
  Settings,
  Gauge,
  HelpCircle,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { DataSourceBadge } from "./DataSourceBadge";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
};

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
  { href: "/dashboard#live-meter", label: "Live Meter", icon: Gauge },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/predictions", label: "Forecast", icon: TrendingUp },
  { href: "/dashboard/bills", label: "Billing", icon: Receipt },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/recommendations", label: "Insights", icon: Lightbulb },
  { href: "/dashboard/carbon", label: "Carbon", icon: Leaf },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
];

const bottomNav: NavItem[] = [
  { href: "/dashboard/settings?tab=appearance", label: "Settings", icon: Settings, match: (p) => p.startsWith("/dashboard/settings") },
  { href: "/dashboard/settings?tab=connect", label: "Meter Setup", icon: Plug, match: (p) => p.startsWith("/dashboard/settings") },
  { href: "/dashboard/chat", label: "Support", icon: HelpCircle },
];

function NavItemLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={cn("nav-item", active && "nav-item-active")}>
      <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" strokeWidth={1.75} />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { user, meters, activeMeter, setActiveMeter, logout } = useAuth();
  const [meterOpen, setMeterOpen] = useState(false);

  const isActive = (item: NavItem) => {
    if (item.match) return item.match(pathname);
    if (pathname.startsWith("/dashboard/settings")) {
      if (item.label === "Settings") return tab === "appearance" || !tab;
      if (item.label === "Meter Setup") return !!tab && tab !== "appearance";
    }
    return pathname === item.href.split("?")[0].split("#")[0];
  };

  return (
    <aside className="sidebar-shell fixed left-0 top-0 z-40 flex h-screen w-[248px] flex-col border-r">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
          <Zap className="h-[18px] w-[18px] text-white" strokeWidth={2} />
        </div>
        <div>
          <p className="text-[15px] font-semibold leading-tight text-white">SmartEnergy</p>
          <p className="text-[11px] text-gray-500">Energy Management</p>
        </div>
      </div>

      {activeMeter && (
        <div className="border-b border-white/10 p-3">
          <button
            type="button"
            onClick={() => setMeterOpen(!meterOpen)}
            className="flex w-full items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5 text-left transition hover:bg-white/[0.08]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
              <Zap className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">{activeMeter.label}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    activeMeter.connection_status === "connected" ? "bg-emerald-400 live-dot" : "bg-red-400"
                  )}
                />
                <DataSourceBadge source={activeMeter.data_source} />
              </div>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-gray-500 transition", meterOpen && "rotate-180")} />
          </button>
          {meterOpen && meters.length > 0 && (
            <div className="mt-1.5 space-y-0.5 rounded-lg bg-black/20 p-1">
              {meters.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setActiveMeter(m);
                    setMeterOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px]",
                    m.id === activeMeter.id ? "bg-white/10 font-medium text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  )}
                >
                  <span className="truncate">{m.label}</span>
                </button>
              ))}
              <Link
                href="/dashboard/settings?tab=connect"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[13px] text-emerald-400 hover:bg-white/5"
              >
                <Plus className="h-3.5 w-3.5" /> Add meter
              </Link>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Main</p>
        <div className="space-y-0.5">
          {mainNav.map((item) => (
            <NavItemLink key={item.label} item={item} active={isActive(item)} />
          ))}
        </div>
        <p className="mb-1.5 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">System</p>
        <div className="space-y-0.5">
          {bottomNav.map((item) => (
            <NavItemLink key={item.label} item={item} active={isActive(item)} />
          ))}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
            {user?.name?.charAt(0) ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">{user?.name}</p>
            <p className="truncate text-[11px] text-gray-500">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="nav-item w-full text-red-400 hover:text-red-300"
        >
          <LogOut className="h-[18px] w-[18px]" /> Sign out
        </button>
      </div>
    </aside>
  );
}
