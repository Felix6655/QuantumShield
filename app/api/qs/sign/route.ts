import { NextResponse } from "next/server";
import { qsWalletd } from "@/lib/qs-walletd-client";

export async function POST(req: Request) {
  try {
    const { name, password, message } = await req.json();
    if (!name || !password || !message) {
      return NextResponse.json({ error: "name, password, message required" }, { status: 400 });
    }
    const res = await qsWalletd.sign(name, { password, message });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "sign failed" }, { status: 500 });
  }
}
