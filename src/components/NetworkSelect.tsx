"use client";
import { useState, useEffect } from "react";

const OPTIONS = [
  { label: "Devnet", url: "https://api.devnet.solana.com" },
  { label: "Mainnet", url: "https://api.mainnet-beta.solana.com" }
];

export default function NetworkSelect() {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("rpc") : "";
    setUrl(saved || process.env.NEXT_PUBLIC_RPC_URL || OPTIONS[0].url);
  }, []);

  const onChange = (val: string) => {
    setUrl(val);
    if (typeof window !== "undefined") localStorage.setItem("rpc", val);
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="opacity-70">Network:</span>
      <select
        className="bg-black/40 border border-white/15 rounded-lg p-1"
        value={url}
        onChange={(e) => onChange(e.target.value)}
      >
        {OPTIONS.map(o => <option key={o.url} value={o.url}>{o.label}</option>)}
      </select>
    </div>
  );
}
