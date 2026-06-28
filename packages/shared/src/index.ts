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
}

export interface Meter {
  id: string;
  user_id: string;
  label: string;
  status: "online" | "offline" | "warning";
  tariff_rate: number;
  created_at: string;
}

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

export interface PredictionPoint {
  timestamp: string;
  value: number;
  lower?: number;
  upper?: number;
}

export interface PredictionResponse {
  horizon: string;
  points: PredictionPoint[];
  mape?: number;
  model: string;
}

export interface BillEstimate {
  current_month_units: number;
  predicted_units: number;
  predicted_bill_inr: number;
  breakdown: { slab: string; units: number; rate: number; amount: number }[];
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  action: string;
  estimated_savings_inr: number;
  priority: "high" | "medium" | "low";
}

export interface Alert {
  id: string;
  meter_id: string;
  type: string;
  message: string;
  severity: "info" | "warning" | "critical";
  created_at: string;
  read: boolean;
}

export interface CarbonFootprint {
  monthly_kwh: number;
  co2_kg: number;
  trees_required: number;
}

export interface ApplianceEstimate {
  name: string;
  estimated_kwh: number;
  percentage: number;
}

export interface PeakHour {
  hour: number;
  avg_power_watts: number;
  label: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  meter_id?: string;
}

export interface ChatResponse {
  reply: string;
  sources?: string[];
}
