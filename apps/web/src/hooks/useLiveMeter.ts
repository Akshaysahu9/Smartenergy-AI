"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, MeterReading } from "@/lib/api";
import { WS_URL } from "@/lib/utils";

const POLL_MS = 5000;
const HISTORY_REFRESH_MS = 30_000;
const STALE_MS = 15_000;
const MAX_RECONNECT_MS = 10_000;

type DataSource = "simulated" | "manual" | "api" | "csv" | undefined;

export function useLiveMeter(meterId: string | undefined, dataSource?: DataSource) {
  const [reading, setReading] = useState<MeterReading | null>(null);
  const [history, setHistory] = useState<{ label: string; value: number }[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectMs = useRef(1000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const applyReading = useCallback((data: MeterReading) => {
    setReading(data);
    setLastUpdate(new Date());
    setError(null);

    const ts = data.recorded_at
      ? new Date(data.recorded_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last?.label === ts && last.value === data.power_watts) return prev;
      return [...prev, { label: ts, value: data.power_watts }].slice(-60);
    });
  }, []);

  const fetchLive = useCallback(async () => {
    if (!meterId) return;
    try {
      const data = await api.live(meterId);
      if (mounted.current) applyReading(data);
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Unable to fetch live reading");
    }
  }, [meterId, applyReading]);

  const loadHistory = useCallback(async () => {
    if (!meterId) return;
    try {
      const dayData = await api.history(meterId, "day");
      if (!mounted.current) return;
      setHistory(
        dayData.points.map((p) => ({
          label: new Date(p.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          value: p.value,
        }))
      );
    } catch {
      /* keep WS history */
    }
  }, [meterId]);

  useEffect(() => {
    mounted.current = true;
    if (!meterId) return;
    fetchLive();
    loadHistory();
    return () => {
      mounted.current = false;
    };
  }, [meterId, fetchLive, loadHistory]);

  // Poll fallback — keeps dashboard live even if WebSocket drops
  useEffect(() => {
    if (!meterId) return;
    const id = setInterval(fetchLive, POLL_MS);
    return () => clearInterval(id);
  }, [meterId, fetchLive]);

  // Refresh day chart from DB periodically
  useEffect(() => {
    if (!meterId) return;
    const id = setInterval(loadHistory, HISTORY_REFRESH_MS);
    return () => clearInterval(id);
  }, [meterId, loadHistory]);

  useEffect(() => {
    if (!meterId) return;

    const connect = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      const ws = new WebSocket(`${WS_URL}/meters/ws/${meterId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectMs.current = 1000;
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        reconnectTimer.current = setTimeout(() => {
          reconnectMs.current = Math.min(reconnectMs.current * 2, MAX_RECONNECT_MS);
          connect();
        }, reconnectMs.current);
      };

      ws.onerror = () => ws.close();

      ws.onmessage = (ev) => {
        const data = JSON.parse(ev.data);
        if (data.type === "ping") return;
        applyReading(data);
      };
    };

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [meterId, applyReading]);

  const isStale = lastUpdate != null && Date.now() - lastUpdate.getTime() > STALE_MS;

  return { reading, history, connected, lastUpdate, error, isStale, refresh: fetchLive, dataSource };
}
