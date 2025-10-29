function base64ToBytes(b64: string): Uint8Array {
  if (typeof window === "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function digestSHA256(data: Uint8Array): Promise<Uint8Array> {
  const subtle =
    typeof window !== "undefined" && window.crypto?.subtle
      ? window.crypto.subtle
      : typeof globalThis.crypto !== "undefined"
        ? globalThis.crypto.subtle
        : undefined;
  if (!subtle) {
    throw new Error("WebCrypto subtle API unavailable");
  }
  const normalized = new Uint8Array(data);
  const buf = await subtle.digest("SHA-256", normalized);
  return new Uint8Array(buf);
}

export async function qsAddressFromDSAPub(publicKeyB64: string): Promise<string> {
  const { bech32 } = await import("bech32");
  const bytes = base64ToBytes(publicKeyB64);
  const digest = await digestSHA256(bytes);
  const payload = digest.slice(0, 20);
  const words = bech32.toWords(payload);
  return bech32.encode("qs", words, 90);
}
