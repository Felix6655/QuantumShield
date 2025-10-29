"use client";

import { useState } from "react";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { makeConnection } from "@/lib/solana";

type Props = {
  secretKey: Uint8Array | null;   // 64-byte secret key from derived Keypair
  fromPubkey: PublicKey | null;
};

export default function SendSol({ secretKey, fromPubkey }: Props) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState<string>("0.001"); // SOL
  const [sending, setSending] = useState(false);
  const [sig, setSig] = useState<string>("");            // tx signature
  const [err, setErr] = useState<string>("");

  const send = async () => {
    setErr("");
    setSig("");
    if (!secretKey || !fromPubkey) return;

    try {
      setSending(true);
      const conn = makeConnection();

      // Basic validation
      const toPub = new PublicKey(to.trim());
      const lamports = BigInt(Math.floor(Number(amount) * LAMPORTS_PER_SOL));
      if (lamports <= 0n) throw new Error("Amount must be > 0");

      // Recreate Keypair from secret key
      const signer = Keypair.fromSecretKey(secretKey);

      // Build legacy transaction
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: signer.publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: signer.publicKey,
          toPubkey: toPub,
          lamports: Number(lamports),
        })
      );

      tx.sign(signer);
      const raw = tx.serialize();
      const signature = await conn.sendRawTransaction(raw, { skipPreflight: false });
      await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

      setSig(signature);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSending(false);
    }
  };

  // Build a handy explorer link based on selected RPC (devnet/mainnet)
  const explorerUrl = (() => {
    if (!sig) return "";
    const saved = typeof window !== "undefined" ? localStorage.getItem("rpc") : "";
    const isDevnet = (saved || "").includes("devnet");
    const qs = isDevnet ? "?cluster=devnet" : "";
    return `https://explorer.solana.com/tx/${sig}${qs}`;
  })();

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Send SOL</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="rounded-xl bg-black/40 border border-white/15 p-2 text-sm"
          placeholder="Recipient address"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <input
          className="rounded-xl bg-black/40 border border-white/15 p-2 text-sm"
          placeholder="Amount in SOL"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          onClick={send}
          disabled={!secretKey || !fromPubkey || sending}
          className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white hover:text-black transition"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>

      {err && <div className="text-sm text-red-400">{err}</div>}
      {sig && (
        <div className="text-sm">
          <span className="opacity-70">Signature:</span> {sig}{" "}
          <a
            className="underline"
            target="_blank"
            href={explorerUrl}
            rel="noreferrer"
          >
            View in Explorer
          </a>
        </div>
      )}

      <p className="text-xs text-white/50">
        Tip: use a tiny amount on devnet first. You can airdrop SOL via CLI or a faucet.
      </p>
    </div>
  );
}
