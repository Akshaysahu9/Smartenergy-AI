"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, BarChart3, Shield, Radio } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("demo@smartenergy.ai");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f4f6f9]">
      <div className="hidden w-[480px] shrink-0 flex-col justify-between bg-[#111827] p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
            <Zap className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-lg font-semibold text-white">SmartEnergy</span>
        </div>

        <div>
          <h2 className="text-3xl font-semibold leading-snug tracking-tight text-white">
            Smart energy monitoring for homes and businesses
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-gray-400">
            Connect meters via API, track real-time consumption, forecast bills, and manage alerts from one dashboard.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: Radio, text: "Live meter integration via HTTP API" },
              { icon: BarChart3, text: "Consumption analytics and bill forecasting" },
              { icon: Shield, text: "Threshold alerts and anomaly detection" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-gray-300">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-gray-600">© 2026 SmartEnergy · Akshay Sahu</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
              <Zap className="h-[18px] w-[18px] text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Sign in to SmartEnergy</h1>
          </div>
          <div className="hidden lg:block mb-8">
            <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>
            <p className="mt-1 text-sm text-gray-500">Access your energy dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            No account?{" "}
            <Link href="/register" className="font-medium text-emerald-700 hover:text-emerald-800">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
