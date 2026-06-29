import { API_URL } from "./utils";

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Meter {
  id: string;
  user_id: string;
  label: string;
  status: string;
  tariff_rate: number;
  alert_threshold_watts: number;
  bill_threshold_inr: number;
  data_source?: "simulated" | "manual" | "api" | "csv";
  location?: string;
  utility_provider?: string;
  has_api_key?: boolean;
  prepaid_balance_inr?: number;
  connection_status?: string;
  low_balance_threshold_inr?: number;
  consumer_number?: string;
  meter_serial?: string;
  created_at: string;
}

export interface MeterReading {
  id?: number;
  meter_id: string;
  recorded_at: string;
  voltage: number;
  current: number;
  power_watts: number;
  energy_kwh: number;
  power_factor: number;
  frequency: number;
  prepaid_balance_inr?: number;
  connection_status?: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      "Cannot reach the API. Start the backend: cd apps/api && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001"
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(", ")
          : "Request failed";
    throw new Error(message || "Request failed");
  }
  return res.json();
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>("/auth/me"),
  meters: () => request<Meter[]>("/meters"),
  createMeter: (data: { label: string; data_source?: string; location?: string; utility_provider?: string; tariff_rate?: number }) =>
    request<Meter>("/meters", { method: "POST", body: JSON.stringify(data) }),
  live: (meterId: string) => request<MeterReading>(`/meters/${meterId}/live`),
  history: (meterId: string, range: string) =>
    request<{ range: string; unit: string; points: { timestamp: string; value: number; label?: string }[] }>(
      `/meters/${meterId}/history?range=${range}`
    ),
  predictions: (meterId: string, horizon: string) =>
    request<{ horizon: string; points: { timestamp: string; value: number; lower?: number; upper?: number }[]; mape?: number; model: string }>(
      `/predictions/${meterId}?horizon=${horizon}`
    ),
  bill: (meterId: string) =>
    request<{ current_month_units: number; predicted_units: number; predicted_bill_inr: number; breakdown: { slab: string; units: number; rate: number; amount: number }[] }>(
      `/bills/${meterId}/estimate`
    ),
  recommendations: (meterId: string) =>
    request<{ id: string; title: string; reason: string; action: string; estimated_savings_inr: number; priority: string }[]>(
      `/recommendations/${meterId}`
    ),
  alerts: (meterId: string) =>
    request<{ id: string; type: string; message: string; severity: string; read: boolean; created_at: string }[]>(
      `/alerts/${meterId}`
    ),
  markAlertRead: (alertId: string) =>
    request<{ ok: boolean }>(`/alerts/${alertId}/read`, { method: "PATCH" }),
  carbon: (meterId: string) =>
    request<{ monthly_kwh: number; co2_kg: number; trees_required: number }>(`/analytics/${meterId}/carbon`),
  appliances: (meterId: string) =>
    request<{ name: string; estimated_kwh: number; percentage: number }[]>(`/analytics/${meterId}/appliances`),
  peakHours: (meterId: string) =>
    request<{ hour: number; avg_power_watts: number; label: string }[]>(`/analytics/${meterId}/peak-hours`),
  consumptionSummary: (meterId: string) =>
    request<{
      daily_units: number;
      weekly_units: number;
      monthly_units: number;
      yearly_units: number;
      yesterday_units: number;
      unit_label: string;
      period_labels: Record<string, string>;
    }>(`/analytics/${meterId}/consumption`),
  consumptionBreakdown: (meterId: string, period: "daily" | "weekly" | "monthly" | "yearly") =>
    request<{
      period: string;
      unit: string;
      total_units: number;
      points: { label: string; units: number; timestamp: string }[];
    }>(`/analytics/${meterId}/consumption/${period}`),
  generateReport: (meterId: string) =>
    request<{ id: string; title: string; created_at: string }>(`/reports/${meterId}/generate`, { method: "POST" }),
  chat: (message: string, meterId?: string) =>
    request<{ reply: string; sources: string[] }>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, meter_id: meterId }),
    }),
  updateMeter: (meterId: string, data: Partial<Meter>) =>
    request<Meter>(`/meters/${meterId}`, { method: "PATCH", body: JSON.stringify(data) }),
  addReading: (meterId: string, data: { power_watts: number; voltage?: number; energy_kwh?: number; recorded_at?: string }) =>
    request<MeterReading>(`/meters/${meterId}/readings`, { method: "POST", body: JSON.stringify(data) }),
  importCsv: async (meterId: string, file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/meters/${meterId}/import/csv`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Import failed");
    }
    return res.json() as Promise<{ imported: number; message: string }>;
  },
  regenerateApiKey: (meterId: string) =>
    request<{ api_key: string; ingest_url: string }>(`/meters/${meterId}/api-key`, { method: "POST" }),
  prepaidStatus: (meterId: string) =>
    request<{
      balance_inr: number;
      connection_status: string;
      is_connected: boolean;
      is_low_balance: boolean;
      low_balance_threshold_inr: number;
      estimated_days_remaining?: number | null;
      tariff_rate: number;
      consumer_number: string;
      meter_serial: string;
    }>(`/prepaid/${meterId}/status`),
  generateDiscomBill: (meterId: string) =>
    request<{ id: string; title: string; created_at: string }>(`/bills/${meterId}/discom-pdf`, { method: "POST" }),
};

export function saveAuth(data: AuthResponse) {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("user", JSON.stringify(data.user));
}

export function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
