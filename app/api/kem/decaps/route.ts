// app/api/kem/decaps/route.ts
import { Buffer } from 'node:buffer';
import { createDecipheriv, hkdfSync } from 'node:crypto';

import { NextResponse } from 'next/server';

import { loadPQ } from '../../../../lib/pq';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { privateKeyB64, kemCiphertextB64, saltB64, ivB64, tagB64, ciphertextB64 } = await req.json();
    for (const [key, value] of Object.entries({ privateKeyB64, kemCiphertextB64, saltB64, ivB64, tagB64, ciphertextB64 })) {
      if (typeof value !== 'string') {
        return NextResponse.json({ error: `${key} required` }, { status: 400 });
      }
    }

    const { kem } = await loadPQ();
    const sk = Buffer.from(privateKeyB64, 'base64');
    const cK = Buffer.from(kemCiphertextB64, 'base64');

    const sharedSecret = kem.ml_kem768.decapsulate(sk, cK);

    // HKDF(SHA-256) to get AES-256 key
    const salt = Buffer.from(saltB64, 'base64');
    const info = Buffer.from('qs/aes-256-gcm');
    const key = hkdfSync('sha256', Buffer.from(sharedSecret), salt, info, 32);

    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const ct = Buffer.from(ciphertextB64, 'base64');

    const dec = createDecipheriv('aes-256-gcm', key, iv);
    dec.setAuthTag(tag);
    const pt = Buffer.concat([dec.update(ct), dec.final()]);

    return NextResponse.json({ plaintext: pt.toString('utf8') });
  } catch (e: any) {
    return NextResponse.json({ error: 'decapsulate failed', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
