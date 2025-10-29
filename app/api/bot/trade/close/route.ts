import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ id: z.string().min(1) });

export async function POST(req: NextRequest) {
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid trade id", issues: body.error.issues },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, closedAt: new Date().toISOString(), tradeId: body.data.id });
}
