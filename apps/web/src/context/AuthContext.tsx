"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, clearAuth, getStoredUser, saveAuth, User, Meter } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  meters: Meter[];
  activeMeter: Meter | null;
  setActiveMeter: (m: Meter | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshMeters: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [activeMeter, setActiveMeter] = useState<Meter | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMeters = async () => {
    const list = await api.meters();
    setMeters(list);
    if (list.length && !activeMeter) setActiveMeter(list[0]);
    else if (list.length && activeMeter) {
      const found = list.find((m) => m.id === activeMeter.id);
      setActiveMeter(found || list[0]);
    }
  };

  useEffect(() => {
    const init = async () => {
      const stored = getStoredUser();
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.me();
        setUser(me);
        await refreshMeters();
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    saveAuth(data);
    setUser(data.user);
    const list = await api.meters();
    if (!list.length) {
      const meter = await api.createMeter({ label: "Home Smart Meter", data_source: "simulated" });
      setMeters([meter]);
      setActiveMeter(meter);
    } else {
      setMeters(list);
      setActiveMeter(list[0]);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await api.register(email, password, name);
    saveAuth(data);
    setUser(data.user);
    const meter = await api.createMeter({ label: "Home Smart Meter", data_source: "simulated" });
    setMeters([meter]);
    setActiveMeter(meter);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    setMeters([]);
    setActiveMeter(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, meters, activeMeter, setActiveMeter, login, register, logout, refreshMeters, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
