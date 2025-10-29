import { Buffer } from 'node:buffer';

import { NextResponse } from 'next/server';

import { loadPQ } from '../../../lib/pq';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message, publicKeyB64, signatureB64 } = await req.json();
    if ([message, publicKeyB64, signatureB64].some(v => typeof v !== 'string')) {
      return NextResponse.json({ error: 'message, publicKeyB64, signatureB64 required' }, { status: 400 });
    }

    const msg = new TextEncoder().encode(message);
    const pk  = Buffer.from(publicKeyB64, 'base64');
    const sig = Buffer.from(signatureB64, 'base64');

    const { dsa } = await loadPQ();
    const valid = dsa.ml_dsa65.verify(pk, msg, sig);
    return NextResponse.json({ scheme: 'ML-DSA-65', valid });
  } catch (e: any) {
    return NextResponse.json({ error: 'verify failed', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
