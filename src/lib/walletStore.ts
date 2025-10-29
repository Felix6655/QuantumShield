import type { EncBlob } from "./secure";

const LS_KEY = "qs:dilithium:wallet";

export type WalletRecord = { id: string; createdAt: number; pkB64: string; skB64: string };

export function saveEncryptedWallet(enc: EncBlob) {
  localStorage.setItem(LS_KEY, JSON.stringify(enc));
}

export function loadEncryptedWallet(): EncBlob | null {
  const r = localStorage.getItem(LS_KEY);
  return r ? (JSON.parse(r) as EncBlob) : null;
}

export function clearWallet() {
  localStorage.removeItem(LS_KEY);
}

export function download(name: string, data: string) {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function uploadJson(file: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => res(String(r.result));
    r.readAsText(file);
  });
}
