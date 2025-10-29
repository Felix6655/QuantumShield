import { Buffer } from 'node:buffer';
import { createCipheriv, randomBytes, hkdfSync } from 'node:crypto';

import { NextResponse } from 'next/server';

import { loadPQ } from '../../../../lib/pq';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { publicKeyB64, message } = await req.json();
    if (typeof publicKeyB64 !== 'string' || typeof message !== 'string') {
      return NextResponse.json({ error: 'publicKeyB64 and message required' }, { status: 400 });
    }

    const { kem } = await loadPQ();
    const pk = Buffer.from(publicKeyB64, 'base64');
    const EXPECTED = 1184; // ML-KEM-768 public key size
    if (pk.length !== EXPECTED) {
      return NextResponse.json(
        { error: 'invalid publicKey', detail: `Expected ML-KEM-768 public key of ${EXPECTED} bytes (base64), got ${pk.length}` },
        { status: 400 }
      );
    }

    const { sharedSecret, ciphertext } = kem.ml_kem768.encapsulate(pk);

    // Derive AES-256 key via HKDF(SHA-256)
    const salt = randomBytes(16);
    const info = Buffer.from('qs/aes-256-gcm');
    let keyBuf = hkdfSync('sha256', Buffer.from(sharedSecret), salt, info, 32);
    // Ensure keyBuf is a Node.js Buffer
    if (!Buffer.isBuffer(keyBuf)) {
      if (keyBuf instanceof Uint8Array || keyBuf instanceof ArrayBuffer) {
        keyBuf = Buffer.from(new Uint8Array(keyBuf));
      } else {
        throw new Error('Unable to convert derived key to Buffer');
      }
    }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBuf, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(message, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();

    return NextResponse.json({
      scheme: 'ML-KEM-768 + AES-256-GCM',
      kemCiphertextB64: Buffer.from(ciphertext).toString('base64'),
      saltB64: salt.toString('base64'),
      ivB64: iv.toString('base64'),
      tagB64: tag.toString('base64'),
      ciphertextB64: ct.toString('base64'),
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'encapsulate failed', detail: String(e?.message ?? e) }, { status: 500 });
  }
}
