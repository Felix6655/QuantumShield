  const refreshBalance = async () => {
    if (!pubkey) return;
    const conn = makeConnection();
    const lamports = await conn.getBalance(pubkey);
    setBalanceSol(lamports / LAMPORTS_PER_SOL);
  };



"use client";

import { useState } from "react";
import { PublicKey, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import { keypairFromMnemonic, solanaDerivationPath } from "@/lib/keys";
import SendSol from "@/components/SendSol";
import { makeConnection } from "@/lib/solana";

type Status = "idle" | "deriving" | "ready" | "error";

export default function WalletPage() {
  const [mnemonic, setMnemonic] = useState("");
  const [account, setAccount] = useState(0);
  const [change, setChange] = useState(0);
  const [pubkey, setPubkey] = useState<PublicKey | null>(null);
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");
  const [passphrase, setPassphrase] = useState("");

  const derive = async () => {
    try {
      setStatus("deriving");
      setMsg("");

      // Derive a real ed25519 keypair from the mnemonic
  const kp = keypairFromMnemonic(mnemonic, account, change, passphrase);

      // Quick ping to devnet so user sees it's live
      const conn = makeConnection();
      const s = await conn.getSlot();

  setPubkey(kp.publicKey);
  await refreshBalance();
      setSlot(s);
      setStatus("ready");
      setMsg(`Derived path ${solanaDerivationPath(account, change)}`);
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setMsg(e?.message ?? "Failed to derive keypair");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold">QuantumShield — Derive from Mnemonic</h1>

        <p className="text-sm opacity-80">
          RPC: {process.env.NEXT_PUBLIC_RPC_URL || "(default devnet)"} •
          &nbsp;Derivation: m/44&apos;/501&apos;/account&apos;/change&apos;
        </p>

        <div className="space-y-3">
          <label className="block text-sm opacity-90">BIP39 mnemonic (12/24 words)</label>
          <textarea
            className="w-full rounded-xl bg-black/40 border border-white/15 p-3 text-sm"
            placeholder="legal winner thank year wave sausage worth useful legal winner thank yellow"
            rows={3}
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
          />
          <div className="flex gap-3">
            <label className="text-sm opacity-90">
              Account:&nbsp;
              <input
                type="number"
                min={0}
                className="w-20 rounded-lg bg-black/40 border border-white/15 p-1 text-sm"
                value={account}
                onChange={(e) => setAccount(parseInt(e.target.value || "0"))}
              />
            </label>
            <label className="text-sm opacity-90">
              Change:&nbsp;
              <input
                type="number"
                min={0}
                className="w-20 rounded-lg bg-black/40 border border-white/15 p-1 text-sm"
                value={change}
                onChange={(e) => setChange(parseInt(e.target.value || "0"))}
              />
            </label>
            <button
              onClick={derive}
              disabled={status === "deriving"}
              className="ml-auto rounded-xl border border-white/20 px-4 py-2 hover:bg-white hover:text-black transition"
            >
              {status === "deriving" ? "Deriving…" : "Derive Address"}
            </button>
          </div>
        </div>

        {status === "ready" && pubkey && (
          <div className="space-y-2 text-sm">
            <div className="rounded-lg bg-white/10 p-3 overflow-x-auto">
              <div><span className="opacity-70">Path:</span> {solanaDerivationPath(account, change)}</div>
              <div className="flex items-center">
                <span className="opacity-70">Public Key:</span> {pubkey.toBase58()}
                <button
                  onClick={() => navigator.clipboard.writeText(pubkey!.toBase58())}
                  className="ml-2 rounded-lg border border-white/20 px-2 py-0.5 text-xs hover:bg-white hover:text-black transition"
                >
                  Copy
                </button>
              </div>
              <div><span className="opacity-70">Current Slot:</span> {slot}</div>
            </div>
            <div className="flex items-center gap-3 text-sm mt-2">
              <div>
                <span className="opacity-70">Balance:</span>{" "}
                {balanceSol === null ? "…" : `${balanceSol.toFixed(6)} SOL`}
              </div>
              <button
                onClick={refreshBalance}
                className="rounded-lg border border-white/20 px-3 py-1 hover:bg-white hover:text-black transition"
              >
                Refresh
              </button>
            </div>
            {/* Sign/Verify section would be here */}
            {/* Render SendSol below address/balance and Sign/Verify */}
            <SendSol secretKey={secretKey} fromPubkey={pubkey} />
          </div>
        )}

        {msg && (
          <div className={`text-sm ${status === "error" ? "text-red-400" : "text-green-400"}`}>
            {msg}
          </div>
        )}

        <p className="text-xs text-white/50 pt-2">
          Security tip: your mnemonic is kept only in memory in this page and never sent to a server.
          Don’t paste real funds mnemonics during development.
        </p>
      </div>
    </main>
  );
}
