"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const { activeMeter } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! Ask me about your bill, usage, or carbon footprint." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const res = await api.chat(userMsg, activeMeter?.id);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't process that request." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ["Why is my bill high?", "What is my carbon footprint?", "Show current power usage"];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <h2 className="mb-4 text-xl font-semibold text-white">Energy Assistant</h2>
      <div className="glass-card flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
                  <Bot className="h-4 w-4 text-cyan-400" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user" ? "bg-cyan-500/20 text-white" : "bg-slate-800 text-slate-300"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
              )}
            </div>
          ))}
          {loading && <p className="text-sm text-slate-500">Thinking...</p>}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about your energy usage..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={loading}
              className="rounded-lg bg-cyan-500 px-4 py-2.5 text-white hover:bg-cyan-400 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
