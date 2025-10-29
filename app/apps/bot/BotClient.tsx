"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

type J = any;
const btn = (bg: string) => ({ padding: "6px 10px", border: "none", borderRadius: 6, background: bg, color: "#fff", cursor: "pointer" });
const card = { padding: "12px", border: "1px solid #333", borderRadius: 8, background: "#111", marginTop: 12 } as const;
const tableWrap = { overflow: "auto", maxWidth: "100%" } as const;
const thtd = { padding: "6px 10px", borderBottom: "1px solid #222", textAlign: "left", whiteSpace: "nowrap" } as const;

function fmt(n?: number | null, d = 2) {
  if (n == null) return "—";
  return Number.isFinite(n) ? Number(n).toFixed(d) : String(n);
}
function dt(s?: string) {
  if (!s) return "—";
  const t = new Date(s);
  return isNaN(+t) ? "—" : t.toLocaleString();
}

export default function BotClient() {
  const qc = useQueryClient();

  // --- QUERIES ---
  const statusQ = useQuery({
    queryKey: ["status"],
    queryFn: async () => {
      const r = await fetch("/api/bot/status", { cache: "no-store" });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 10_000,
  });

  // --- MUTATIONS ---
  const backtestM = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/bot/backtest", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json();
    },
  });

  const tickM = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/bot/tick", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["status"] }),
  });

  const closeTradeM = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch("/api/bot/trade/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["status"] }),
  });

  const backtest = backtestM.data;
  const status = statusQ.data;

  const hasOpenTrades = useMemo(() => !!status?.openTrades?.length, [status]);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Trading Bot</h1>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => tickM.mutate()} disabled={tickM.isPending} style={btn("#2563eb")}>
          {tickM.isPending ? "Running…" : "Run Tick"}
        </button>
        <button type="button" onClick={() => statusQ.refetch()} disabled={statusQ.isFetching} style={btn("#475569")}>
          {statusQ.isFetching ? "Loading…" : "Refresh Status"}
        </button>
        <button type="button" onClick={() => backtestM.mutate()} disabled={backtestM.isPending} style={btn("#16a34a")}>
          {backtestM.isPending ? "Backtesting…" : "Backtest"}
        </button>
      </div>

      {(statusQ.isError || backtestM.isError || tickM.isError || closeTradeM.isError) && (
        <div style={{ ...card, borderColor: "#7f1d1d", background: "#1b0f0f", color: "#fca5a5" }}>
          {String(
            (statusQ.error as Error)?.message ||
              (backtestM.error as Error)?.message ||
              (tickM.error as Error)?.message ||
              (closeTradeM.error as Error)?.message
          )}
        </div>
      )}

      {/* Backtest */}
      <div style={card}>
        <h2 style={{ margin: "8px 0" }}>Backtest</h2>
        {!backtest?.ok ? (
          <div style={{ opacity: 0.7, fontSize: 12 }}>— backtest —</div>
        ) : (
          <div style={tableWrap}>
            <table>
              <thead>
                <tr>
                  <th style={thtd}>Symbol</th>
                  <th style={thtd}>Trades</th>
                  <th style={thtd}>Win Rate</th>
                  <th style={thtd}>Return</th>
                </tr>
              </thead>
              <tbody>
                {backtest.metrics?.map((m: any) => (
                  <tr key={m.symbol}>
                    <td style={thtd}>{m.symbol}</td>
                    <td style={thtd}>{m.trades}</td>
                    <td style={thtd}>{m.winRate}</td>
                    <td style={thtd}>{m.return}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signals */}
      <div style={card}>
        <h2 style={{ margin: "8px 0" }}>Signals</h2>
        {statusQ.isLoading ? (
          <div style={{ opacity: 0.7, fontSize: 12 }}>Loading…</div>
        ) : !status?.ok ? (
          <div style={{ opacity: 0.7, fontSize: 12 }}>— status —</div>
        ) : (
          <div style={tableWrap}>
            <table>
              <thead>
                <tr>
                  <th style={thtd}>Time</th>
                  <th style={thtd}>Symbol</th>
                  <th style={thtd}>TF</th>
                  <th style={thtd}>Dir</th>
                  <th style={thtd}>Reason</th>
                  <th style={thtd}>Price</th>
                  <th style={thtd}>RSI</th>
                  <th style={thtd}>ATR</th>
                  <th style={thtd}>SMA50</th>
                  <th style={thtd}>SMA200</th>
                </tr>
              </thead>
              <tbody>
                {status.signals?.map((s: any) => (
                  <tr key={s.id}>
                    <td style={thtd}>{dt(s.createdAt)}</td>
                    <td style={thtd}>{s.symbol}</td>
                    <td style={thtd}>{s.timeframe}</td>
                    <td style={thtd}>{s.direction}</td>
                    <td style={thtd}>{s.reason}</td>
                    <td style={thtd}>{fmt(s.price)}</td>
                    <td style={thtd}>{fmt(s.rsi)}</td>
                    <td style={thtd}>{fmt(s.atr)}</td>
                    <td style={thtd}>{fmt(s.sma50)}</td>
                    <td style={thtd}>{fmt(s.sma200)}</td>
                  </tr>
                ))}
                {!status.signals?.length && (
                  <tr>
                    <td style={thtd} colSpan={10}>
                      (no signals yet)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open Trades */}
      <div style={card}>
        <h2 style={{ margin: "8px 0" }}>Open Trades</h2>
        {!status?.ok ? null : (
          <div style={tableWrap}>
            <table>
              <thead>
                <tr>
                  <th style={thtd}>Time</th>
                  <th style={thtd}>Symbol</th>
                  <th style={thtd}>Qty</th>
                  <th style={thtd}>Entry</th>
                  <th style={thtd}>Stop</th>
                  <th style={thtd}>Target</th>
                  <th style={thtd}>Action</th>
                </tr>
              </thead>
              <tbody>
                {status.openTrades?.map((t: any) => (
                  <tr key={t.id}>
                    <td style={thtd}>{dt(t.createdAt)}</td>
                    <td style={thtd}>{t.symbol}</td>
                    <td style={thtd}>{fmt(t.qty, 4)}</td>
                    <td style={thtd}>{fmt(t.entryPrice)}</td>
                    <td style={thtd}>{fmt(t.stopPrice)}</td>
                    <td style={thtd}>{fmt(t.targetPrice)}</td>
                    <td style={thtd}>
                      <button
                        type="button"
                        onClick={() => closeTradeM.mutate(t.id)}
                        disabled={closeTradeM.isPending}
                        style={btn("#dc2626")}
                      >
                        {closeTradeM.isPending ? "Closing…" : "Close"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!hasOpenTrades && (
                  <tr>
                    <td style={thtd} colSpan={7}>
                      No open trades
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
