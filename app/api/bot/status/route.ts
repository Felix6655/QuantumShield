import crypto from "node:crypto";

import { NextResponse } from "next/server";

type Signal = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: "long" | "short";
  reason: string;
  price: number;
  rsi: number;
  atr: number;
  sma50: number;
  sma200: number;
  createdAt: string;
};

type Trade = {
  id: string;
  symbol: string;
  qty: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  createdAt: string;
};

const SAMPLE_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT"] as const;

function makeSignal(): Signal {
  const symbol = SAMPLE_SYMBOLS[Math.floor(Math.random() * SAMPLE_SYMBOLS.length)];
  const basePrice = 1_000 + Math.random() * 60_000;
  return {
    id: crypto.randomUUID(),
    symbol,
    timeframe: ["1m", "5m", "1h", "4h"][Math.floor(Math.random() * 4)],
    direction: Math.random() > 0.5 ? "long" : "short",
    reason: "RSI + SMA crossover",
    price: Number(basePrice.toFixed(2)),
    rsi: Number((30 + Math.random() * 40).toFixed(2)),
    atr: Number((Math.random() * 250).toFixed(2)),
    sma50: Number((basePrice * (0.95 + Math.random() * 0.1)).toFixed(2)),
    sma200: Number((basePrice * (0.9 + Math.random() * 0.2)).toFixed(2)),
    createdAt: new Date().toISOString(),
  };
}

function makeTrade(signal: Signal): Trade {
  const entry = signal.price;
  const isLong = signal.direction === "long";
  const delta = entry * 0.01 * (0.5 + Math.random());
  return {
    id: crypto.randomUUID(),
    symbol: signal.symbol,
    qty: Number((Math.random() * 0.5).toFixed(3)),
    entryPrice: entry,
    stopPrice: Number((isLong ? entry - delta : entry + delta).toFixed(2)),
    targetPrice: Number((isLong ? entry + delta * 2 : entry - delta * 2).toFixed(2)),
    createdAt: new Date().toISOString(),
  };
}

export async function GET() {
  const signals = Array.from({ length: Math.floor(Math.random() * 4) }, () => makeSignal());
  const openTrades = signals.slice(0, Math.floor(Math.random() * signals.length)).map(makeTrade);

  return NextResponse.json({
    ok: true,
    updatedAt: new Date().toISOString(),
    signals,
    openTrades,
    pnl: Number((Math.random() * 5_000 - 2_500).toFixed(2)),
  });
}
