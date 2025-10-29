"use client";

import { useState } from "react";
import nacl from "tweetnacl";
import bs58 from "bs58";

type Props = {
  /** 64-byte secret key from a Solana Keypair (kp.secretKey) */
  secretKey: Uint8Array | null;
  /** 32-byte public key (kp.publicKey.toBytes()) */
  publicKey: Uint8Array | null;
};

function toBytes(str: string) {
  return new TextEncoder().encode(str);
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function QuantumShieldButton({ secretKey, publicKey }: Props) {
  const [message, setMessage] = useState("");
  const [signature58, setSignature58] = useState<string>("");
  const [verifyResult, setVerifyResult] = useState<"ok" | "fail" | "">("");

  const handleSign = () => {
    setVerifyResult("");
    if (!secretKey || !message.trim()) return;
    const msg = toBytes(message.trim());
    const sig = nacl.sign.detached(msg, secretKey);          // Uint8Array
    setSignature58(bs58.encode(sig));                        // base58
  };

  const handleVerify = () => {
    if (!publicKey || !signature58 || !message.trim()) return;
    const msg = toBytes(message.trim());
    const sig = bs58.decode(signature58);
    const ok = nacl.sign.detached.verify(msg, sig, publicKey);
    setVerifyResult(ok ? "ok" : "fail");
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm opacity-90">Message</label>
      <input
        className="w-full rounded-xl bg-black/40 border border-white/15 p-2 text-sm"
        placeholder="hello quantumshield"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          onClick={handleSign}
          disabled={!secretKey || !message.trim()}
          className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white hover:text-black transition"
        >
          Sign Locally
        </button>
        <button
          onClick={handleVerify}
          disabled={!publicKey || !signature58 || !message.trim()}
          className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white hover:text-black transition"
        >
          Verify
        </button>
      </div>

      {signature58 && (
        <div className="rounded-lg bg-white/10 p-3 text-xs break-all space-y-2">
          <div className="opacity-70">Signature (base58)</div>
          <div>{signature58}</div>
          <div className="flex gap-2">
            <button
              onClick={() => copy(signature58)}
              className="rounded-lg border border-white/20 px-3 py-1 hover:bg-white hover:text-black transition"
            >
              Copy signature
            </button>
            {verifyResult === "ok" && <span className="text-green-400">Verified ✔</span>}
            {verifyResult === "fail" && <span className="text-red-400">Invalid ✖</span>}
          </div>
        </div>
      )}
    </div>
  );
}
