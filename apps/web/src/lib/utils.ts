import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const defaultApi = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
export const API_URL = defaultApi;
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  defaultApi.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
