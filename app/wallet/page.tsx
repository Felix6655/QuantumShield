
"use client";

import { useState, useEffect, useMemo } from "react";
import AddressCard from "../components/AddressCard";
import DsaBox from "../components/DsaBox";
import KemBox from "../components/KemBox";
import NetworkSelect from "../../components/NetworkSelect";

export default function WalletPage() {
  // Put your old top-level alert/decaps logic inside handlers or effects:
  const showDecapsResult = (ok: boolean, j: any) => {
    if (!ok) {
      alert(j?.error || "decaps failed");
      return;
    }
    alert(`Decrypted: ${j?.message}`);
  };
  type Keys = { scheme: string; publicKey: string; privateKey: string };

  const [kem, setKem] = useState<Keys | null>(null);
  const [dsa, setDsa] = useState<Keys | null>(null);
  // Unified wallet state for WalletIO and KEM panel
  const keys = kem && dsa ? { kem, dsa } : null;
  const setKeys = (w: typeof keys) => {
    setKem(w?.kem ?? null);
    setDsa(w?.dsa ?? null);
  };
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  // Encrypted wallet state
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [saved, setSaved] = useState(hasEncryptedWalletInBrowser());
  // Passphrase for derivation
  const [passphrase, setPassphrase] = useState("");

  // KEM panel UI state and handlers
  const [recipientPkB64, setRecipientPkB64] = useState("");
  const [kemEnc, setKemEnc] = useState<{ ctB64: string; dataB64: string } | null>(null);
  const [kemMsg, setKemMsg] = useState("hello quantum world");

  function useMyKem() {
    if (keys?.kem?.publicKey) setRecipientPkB64(keys.kem.publicKey);
  }

  async function doEncaps() {
    if (!recipientPkB64) return alert("paste recipient ML-KEM public key (base64)");
    const r = await fetch("/api/kem/encaps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicKeyB64: recipientPkB64, message: kemMsg }),
    });
    const j = await r.json();
    if (!r.ok) return alert(j.error || "encaps failed");
    setKemEnc({ ctB64: j.ctB64, dataB64: j.dataB64 });
  }

  // If you previously had this at top-level, move it inside:
  // if (!r.ok) return alert(j.error || "decaps failed");
  // alert(`Decrypted: ${j.message}`);

  const onDecapsFail = (msg?: string) => {
    alert(msg ? `Decrypted: ${msg}` : "decaps failed");
  };

  async function doDecaps() {
    if (!kemEnc) return alert("nothing to decrypt");
    if (!keys?.kem?.privateKey) return alert("need your KEM private key loaded");
    const r = await fetch("/api/kem/decaps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        privateKeyB64: keys.kem.privateKey,
        ctB64: kemEnc.ctB64,
        dataB64: kemEnc.dataB64,
      }),
    });
    const j = await r.json();
    if (!r.ok) return onDecapsFail(j.error);
    onDecapsFail(j.message);
  }
  async function onSave() {
    try {
      setNote(null);
      if (!keys) throw new Error("No keys in memory");
      if (!pass || pass !== pass2) throw new Error("Passphrase mismatch");
      await saveEncryptedWalletToBrowser(pass, keys);
      setSaved(true);
      setNote("Encrypted wallet saved to this browser.");
    } catch (e:any) { setNote(e.message); }
  }

  async function onUnlock() {
    try {
      setNote(null);
      if (!pass) throw new Error("Enter passphrase");
      const w = await unlockEncryptedWalletFromBrowser(pass);
      // restore into your key state
      setKem(w.kem);
      setDsa(w.dsa);
      setNote("Wallet unlocked.");
    } catch (e:any) { setNote(e.message); }
  }

  function onWipe() {
    wipeEncryptedWalletInBrowser();
    setSaved(false);
    setNote("Encrypted wallet removed from this browser.");
  }

  async function generateKeys() {
    setBusy(true);
    setNote(null);
    setKem(null);
    setDsa(null);

    const requestId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `req-${Date.now()}`;

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");

      if (!data?.kem?.publicKey || !data?.dsa?.publicKey) {
        throw new Error("Incomplete key material from API");
      }

      setKem({
        scheme: data.kem.scheme ?? "unknown",
        publicKey: data.kem.publicKey,
        privateKey: data.kem.privateKey,
      });
      setDsa({
        scheme: data.dsa.scheme ?? "unknown",
        publicKey: data.dsa.publicKey,
        privateKey: data.dsa.privateKey,
      });

      if (data.warning) {
        setNote(data.warning);
      }
    } catch (e: any) {
      setNote("Key generation failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }



  function downloadKey(contents: string | undefined | null, filename: string) {
    if (!contents) return;
    const blob = new Blob([contents], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const addr = keys?.dsa?.publicKey ? dsaPubkeyToAddress(keys.dsa.publicKey) : "";

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl">Wallet</h1>
        <NetworkSelect />
      </div>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        {(kem?.scheme?.includes("(stub)") || dsa?.scheme?.includes("(stub)"))
          ? "⚠️ Using stub fallback. Check server log and @noble/post-quantum install."
          : "Generates real post-quantum keys (ML-KEM for key agreement, ML-DSA for signatures)."}
      </p>

      <button
        onClick={generateKeys}
        disabled={busy}
        className="px-4 py-2 rounded-xl border border-[#3b3b55] disabled:opacity-60"
      >
        {busy ? "Generating…" : "Generate Wallet"}
      </button>

      {/* Minimal encrypted wallet UI */}
      <div style={{marginTop:18, marginBottom:18}}>
        {/* BIP39 passphrase input above Account/Change inputs */}
        <label className="block text-sm opacity-90">BIP39 passphrase (optional)</label>
        <input
          className="w-full rounded-xl bg-black/40 border border-white/15 p-2 text-sm"
          placeholder="passphrase (leave empty if none)"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
        <label>Passphrase</label>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} />
        <label>Confirm passphrase</label>
        <input type="password" value={pass2} onChange={e=>setPass2(e.target.value)} />
        <div style={{display:"flex", gap:8, marginTop:8}}>
          <button onClick={onSave}  disabled={!keys}>Save Encrypted Wallet to Browser</button>
          <button onClick={onUnlock} disabled={!saved}>Unlock from Browser</button>
          <button onClick={onWipe}   disabled={!saved}>Wipe Browser Wallet</button>
        </div>
        {note && <div style={{marginTop:8}}>{note}</div>}
      </div>

      {note && <p className="mt-3 text-yellow-300">{note}</p>}

      <LockBox
        kem={kem}
        dsa={dsa}
        onUnlock={({ kem: k, dsa: d }) => {
          setKem(k);
          setDsa(d);
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        }}
      />

      {kem && (
        <div className="mt-5 space-y-4">
          <div>
            <strong>Public Key (base64):</strong>
              <div className="break-all mt-1">{kem.publicKey}</div>
          </div>
          <div>
            <button
              onClick={() => setShowKeys((v) => !v)}
              style={{ padding:'0.45rem 0.7rem', border:'1px solid #3b3b55', borderRadius:10 }}
              className="mt-3"
            >
              {showKeys ? 'Hide private keys' : 'Show private keys'}
            </button>
            {showKeys && (
              <pre style={{ whiteSpace:'pre-wrap', marginTop:12 }}>
                ML-KEM Private (b64): {kem?.privateKey}
                {'\n'}
                ML-DSA Private (b64): {dsa?.privateKey}
              </pre>
            )}
            <button
              onClick={() => downloadKey(kem.privateKey, "qs-kyber-private-key.base64.txt")}
              className="mt-3 px-3 py-2 rounded-lg border border-[#3b3b55]"
            >
              Download Private Key
            </button>
          </div>
        </div>
      )}

      {/* Wallet import/export panel */}
      <WalletIO keys={keys} setKeys={setKeys} />

      {/* Show bech32 address from DSA pubkey */}
      {addr && (
        <div style={{marginTop:12}}>
          <b>Your QuantumShield Address</b>
          <div style={{fontFamily:"monospace"}}>{addr}</div>
        </div>
      )}

      {dsa && (
        <div className="mt-10 space-y-4">
          <div>
            <strong>ML-DSA Public Key (base64):</strong>
            <div className="break-all mt-1">{dsa.publicKey}</div>
          </div>
          <div>
            <strong>ML-DSA Private Key (base64, keep secret):</strong>
            <div className="break-all mt-1">{dsa.privateKey}</div>
            <button
              onClick={() => downloadKey(dsa.privateKey, "qs-dsa-private-key.base64.txt")}
              className="mt-3 px-3 py-2 rounded-lg border border-[#3b3b55]"
            >
              Download ML-DSA Private Key
            </button>
          </div>
          {/* DsaBox handles sign/verify UI */}
          <DsaBox dsaPublicKeyB64={dsa.publicKey} dsaPrivateKeyB64={dsa.privateKey} />
        </div>
      )}

      {dsa?.publicKey && <AddressCard dsaPubB64={dsa.publicKey} />}

      {/* Minimal KEM panel UI */}
      <section style={{marginTop:24}}>
        <h3>KEM Encrypt / Decrypt</h3>

        <label>Recipient ML-KEM Public Key (base64)</label>
        <textarea
          value={recipientPkB64}
          onChange={e=>setRecipientPkB64(e.target.value)}
          placeholder="base64 ML-KEM-768 public key"
          rows={3}
        />

        <div style={{display:"flex", gap:8, marginTop:8}}>
          <button onClick={useMyKem} disabled={!keys}>Use my key</button>
          <button onClick={()=>setRecipientPkB64("")}>Clear</button>
        </div>

        <label style={{marginTop:12}}>Message</label>
        <textarea value={kemMsg} onChange={e=>setKemMsg(e.target.value)} rows={3} />

        <div style={{display:"flex", gap:8, marginTop:8}}>
          <button onClick={doEncaps}>Encrypt</button>
          <button onClick={doDecaps} disabled={!kemEnc}>Decrypt with my private key</button>
        </div>

        {kemEnc && (
          <details style={{marginTop:8}}>
            <summary>Encrypted payload</summary>
            <div><b>ctB64</b>: {kemEnc.ctB64}</div>
            <div><b>dataB64</b>: {kemEnc.dataB64}</div>
          </details>
        )}
      </section>

      {kem && (
        <KemBox
          kemPublicKeyB64={kem.publicKey}
          kemPrivateKeyB64={kem.privateKey}
        />
      )}
    </main>
  );
}
