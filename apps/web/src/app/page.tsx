import Link from "next/link";
import {
  Zap,
  TrendingUp,
  Shield,
  BarChart3,
  Brain,
  ArrowRight,
  Radio,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Radio,
    title: "Meter Integration",
    desc: "Connect Shelly, ESP32, or any IoT device via HTTP API. Push live readings directly to the platform.",
  },
  {
    icon: TrendingUp,
    title: "Consumption Forecasting",
    desc: "Predict hourly, daily, and monthly usage from historical data with confidence intervals.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Peak hour analysis, appliance breakdown, carbon footprint, and Indian DISCOM tariff billing.",
  },
  {
    icon: Shield,
    title: "Alert System",
    desc: "Configurable thresholds for high usage, voltage anomalies, and predicted bill limits.",
  },
  {
    icon: FileSpreadsheet,
    title: "Data Import",
    desc: "Bulk upload historical readings from utility exports or smart plug CSV files.",
  },
  {
    icon: Brain,
    title: "Energy Assistant",
    desc: "Query your consumption data and receive actionable efficiency recommendations.",
  },
];

const stats = [
  { value: "2s", label: "Live refresh" },
  { value: "4", label: "Data sources" },
  { value: "REST", label: "API-first" },
  { value: "Free", label: "To start" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f9] text-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
              <Zap className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="text-[15px] font-semibold">SmartEnergy</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary hidden px-4 py-2 text-sm sm:inline-flex">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary px-4 py-2 text-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-medium text-emerald-700">Energy Management Platform</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-gray-900 md:text-5xl">
            Monitor consumption.
            <br />
            Forecast costs. Reduce waste.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-600">
            A full-stack smart meter platform with real-time monitoring, bill estimation,
            analytics, and alerts — built for Indian homes and small businesses.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn-primary px-6 py-2.5">
              Start monitoring <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-secondary px-6 py-2.5">
              View demo
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-500">Demo: demo@smartenergy.ai / demo1234</p>
        </div>

        <div className="mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm">
              <p className="text-xl font-semibold text-emerald-700">{value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            <span className="ml-2 text-xs text-gray-400">app.smartenergy.io/dashboard</span>
          </div>
          <div className="grid gap-px bg-gray-100 p-4 md:grid-cols-4">
            {[
              { label: "Current Load", val: "1.65 kW" },
              { label: "Today", val: "12.4 kWh" },
              { label: "Est. Bill", val: "₹1,540" },
              { label: "Status", val: "Online" },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-md bg-white p-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Platform capabilities</h2>
            <p className="mt-2 text-gray-600">Everything needed to manage energy consumption in one place.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-lg border border-gray-200 p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                  <Icon className="h-4 w-4 text-emerald-700" strokeWidth={1.75} />
                </div>
                <h3 className="font-medium text-gray-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Ready to connect your meter?</h2>
          <p className="mt-2 text-gray-600">Set up in minutes with API push, manual entry, or CSV import.</p>
          <Link href="/register" className="btn-primary mt-6 inline-flex px-6 py-2.5">
            Create free account
          </Link>
          <ul className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            {["Free tier", "REST API", "Indian tariffs", "PDF reports"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
        <p className="font-medium text-gray-700">SmartEnergy Platform</p>
        <p className="mt-1">© 2026 SmartEnergy. All rights reserved.</p>
      </footer>
    </div>
  );
}
