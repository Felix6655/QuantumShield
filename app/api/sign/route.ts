import { signPayload } from '../../lib/sign';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await signPayload(body);
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'sign failed' }, { status: 500 });
  }
}
