"use client";
import { useState, useEffect } from "react";
import { qsWalletd } from "@/lib/qs-walletd-client";

  const [name, setName] = useState("alice");
  const [password, setPassword] = useState("testpass");
  const [message, setMessage] = useState("hello quantumshield");
  const [address, setAddress] = useState("");
  const [sig, setSig] = useState("");
  const [verify, setVerify] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [daemon, setDaemon] = useState<"up"|"down"|"checking">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await qsWalletd.ready();
        if (!cancelled) setDaemon("up");
      } catch {
        if (!cancelled) setDaemon("down");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function run<T>(fn: () => Promise<T>) {
    try { setErr(null); return await fn(); }
    catch (e: any) { setErr(e?.message ?? "error"); }
  }

  return (
    <div className="p-6 max-w-xl space-y-4">
      {daemon !== "up" && (
        <div className="bg-yellow-100 border border-yellow-300 rounded p-2 text-sm">
          {daemon === "checking" ? "Checking wallet daemon..." :
           "Wallet daemon not ready. Start it with: cargo run -p qs-walletd"}
        </div>
      )}
      <h1 className="text-2xl font-semibold">QuantumShield Wallet</h1>

      <div className="grid gap-2">
        <label>Wallet Name</label>
        <input className="border rounded p-2" value={name} onChange={e=>setName(e.target.value)} />
        <label>Password</label>
        <input className="border rounded p-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <button className="border rounded px-3 py-2" onClick={() => run(async () => {
          const r = await qsWalletd.newWallet({ name, password }); setAddress(r.address);
        })}>New Wallet</button>

        <button className="border rounded px-3 py-2" onClick={() => run(async () => {
          const r = await qsWalletd.address(name); setAddress(r.address);
        })}>Get Address</button>
      </div>

      {address && <p className="text-sm break-all">Address: {address}</p>}

      <div className="grid gap-2">
        <label>Message</label>
        <input className="border rounded p-2" value={message} onChange={e=>setMessage(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <button className="border rounded px-3 py-2" onClick={() => run(async () => {
          const r = await qsWalletd.sign(name, { password, message }); setSig(r.signed_hex);
        })}>Sign</button>

        <button className="border rounded px-3 py-2" onClick={() => run(async () => {
          const r = await qsWalletd.verify(name, { signed_hex: sig }); setVerify(r.ok ? (r.message ?? "(ok)") : "(failed)");
        })}>Verify</button>
      </div>

      {sig && <p className="text-sm break-all">Signature (hex): {sig}</p>}
      {verify && <p className="text-sm break-all">Verify: {verify}</p>}
      {err && <p className="text-sm text-red-500">Error: {err}</p>}
      <p className="text-xs opacity-70">Make sure qs-walletd is running on 127.0.0.1:8787.</p>
    </div>
  );
}
