/* Browser-side helpers for AES-GCM encryption of JSON payloads */
export type EncBlob = {
  v: 1;
  kdf: "pbkdf2-sha256";
  iter: number;
  cipher: "aes-256-gcm";
  salt: string;
  iv: string;
  ct: string;
};

export const b64e = (bytes: Uint8Array) =>
  typeof window === "undefined"
    ? Buffer.from(bytes).toString("base64")
    : btoa(String.fromCharCode(...bytes));

export const b64d = (b64: string) => {
  if (typeof window === "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

async function deriveKey(pass: string, salt: Uint8Array) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  const normalizedSalt = salt instanceof Uint8Array ? salt : new Uint8Array(salt);
  const saltBuffer = (normalizedSalt.buffer as ArrayBuffer).slice(0);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuffer, iterations: 250_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptJSON(obj: any, pass: string): Promise<EncBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt);
  const pt = new TextEncoder().encode(JSON.stringify(obj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, pt));
  return { v: 1, kdf: "pbkdf2-sha256", iter: 250000, cipher: "aes-256-gcm", salt: b64e(salt), iv: b64e(iv), ct: b64e(ct) };
}

export async function decryptJSON(blob: EncBlob, pass: string): Promise<any> {
  const salt = b64d(blob.salt);
  const iv = b64d(blob.iv);
  const key = await deriveKey(pass, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, b64d(blob.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
