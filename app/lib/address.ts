import { bech32 } from "bech32";

export function dsaPubkeyToAddress(pubB64: string, hrp = "qs"): string {
  const raw = Buffer.from(pubB64, "base64");          // raw DSA public key bytes
  // keep it small and stable: hash-trunc or use first 32 bytes
  const body = raw.subarray(0, 32);
  const words = bech32.toWords(body);
  return bech32.encode(hrp, words);
}
