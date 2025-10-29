"use client";
import type { QsKeyFile } from "./qskey";

const KEY = "qs.wallet.v1";

export function saveWalletToBrowser(qs: QsKeyFile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(qs));
}

export function loadWalletFromBrowser(): QsKeyFile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QsKeyFile;
  } catch {
    return null;
  }
}

export function clearBrowserWallet() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
