export type EncBlob = { saltB64: string; ivB64: string; ctB64: string };

function b64(b: ArrayBuffer) {
  return typeof window === "undefined"
    ? Buffer.from(b).toString("base64")
    : btoa(String.fromCharCode(...new Uint8Array(b)));
}

function unb64(s: string) {
  if (typeof window === "undefined") return Uint8Array.from(Buffer.from(s, "base64"));
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

function toArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength && data.buffer instanceof ArrayBuffer) {
    return data.buffer;
  }
  return data.slice().buffer;
}

export async function deriveKey(password: string, salt: Uint8Array) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations: 200_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptJson(obj: unknown, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return { saltB64: b64(toArrayBuffer(salt)), ivB64: b64(toArrayBuffer(iv)), ctB64: b64(ct) };
}

export async function decryptJson<T>(blob: EncBlob, password: string) {
  const salt = unb64(blob.saltB64);
  const iv = unb64(blob.ivB64);
  const ct = unb64(blob.ctB64);
  const key = await deriveKey(password, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}
