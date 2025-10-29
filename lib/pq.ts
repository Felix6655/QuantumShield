import { Buffer } from 'node:buffer';
type PQ = { ml_kem768?: any; ml_dsa65?: any };
export async function loadPQ() {
  try { const m: PQ = await import('@noble/post-quantum');
        if (m?.ml_kem768 && m?.ml_dsa65) return { kem: m, dsa: m, source: 'main' as const }; } catch {}
  try { const kem = await import('@noble/post-quantum/ml-kem.js');
        const dsa = await import('@noble/post-quantum/ml-dsa.js');
        return { kem, dsa, source: 'subpath-js' as const }; } catch {}
  try { const kem = await import('@noble/post-quantum/ml-kem');
        const dsa = await import('@noble/post-quantum/ml-dsa');
        return { kem, dsa, source: 'subpath-noext' as const }; } catch {}
  throw new Error('Could not resolve @noble/post-quantum exports');
}
export const b64e = (u8: Uint8Array) => Buffer.from(u8).toString('base64');
