// Browser-only helpers to encrypt/decrypt a wallet object with a passphrase
// Uses PBKDF2-SHA256 -> AES-GCM(256) with 12-byte IV.

const ENC_KEY = "qs.encwallet.v1"; // localStorage key

function enc(txt: string) { return new TextEncoder().encode(txt); }
function dec(buf: ArrayBuffer) { return new TextDecoder().decode(buf); }
function b64(b: ArrayBuffer | Uint8Array) { return Buffer.from(b as any).toString("base64"); }
function b64d(s: string) { return Uint8Array.from(Buffer.from(s, "base64")); }

async function deriveKey(pass: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc(pass), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function saveEncryptedWalletToBrowser(passphrase: string, wallet: unknown) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(passphrase, salt);

  const data = enc(JSON.stringify(wallet));
  const ct   = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

  const blob = {
    alg: "PBKDF2(SHA-256)->AES-GCM(256)",
    saltB64: b64(salt),
    ivB64:   b64(iv),
    dataB64: b64(ct),
  };

  localStorage.setItem(ENC_KEY, JSON.stringify(blob));
}

export function hasEncryptedWalletInBrowser(): boolean {
  return !!localStorage.getItem(ENC_KEY);
}

export function wipeEncryptedWalletInBrowser() {
  localStorage.removeItem(ENC_KEY);
}

export async function unlockEncryptedWalletFromBrowser(passphrase: string) {
  const raw = localStorage.getItem(ENC_KEY);
  if (!raw) throw new Error("No encrypted wallet in browser");
  const blob = JSON.parse(raw);
  const salt = b64d(blob.saltB64);
  const iv   = b64d(blob.ivB64);
  const data = b64d(blob.dataB64);
  const key  = await deriveKey(passphrase, salt);
  const pt   = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(dec(pt));
}
