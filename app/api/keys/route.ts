import { NextResponse } from 'next/server';

import { b64e, loadPQ } from '../../../lib/pq';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { kem, dsa } = await loadPQ();
    const K = kem.ml_kem768.keygen();
    const S = dsa.ml_dsa65.keygen();
    return NextResponse.json({
      kem: { scheme: 'ML-KEM-768', publicKey: b64e(K.publicKey), privateKey: b64e(K.secretKey) },
      dsa: { scheme: 'ML-DSA-65', publicKey: b64e(S.publicKey), privateKey: b64e(S.secretKey) }
    });
  } catch (e) {
    const crypto = await import('node:crypto');
    return NextResponse.json({
      kem: { scheme: 'ML-KEM-768 (stub)', publicKey: crypto.randomBytes(1184).toString('base64'), privateKey: crypto.randomBytes(2400).toString('base64') },
      dsa: { scheme: 'ML-DSA-65 (stub)', publicKey: crypto.randomBytes(1184).toString('base64'), privateKey: crypto.randomBytes(2400).toString('base64') },
      warning: 'Stub fallback – @noble/post-quantum unresolved.'
    });
  }
}
