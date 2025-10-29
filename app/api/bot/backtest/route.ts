import { NextResponse } from "next/server";

export async function POST() {
  const metrics = [
    { symbol: "BTCUSDT", trades: 142, winRate: "58%", return: "+24.2%" },
    { symbol: "ETHUSDT", trades: 116, winRate: "54%", return: "+18.9%" },
    { symbol: "SOLUSDT", trades: 98, winRate: "61%", return: "+32.4%" },
  ];

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    metrics,
  });
}
