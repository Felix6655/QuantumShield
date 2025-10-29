"use client";
import React, { useState } from "react";

type Props = {
  dsaPublicKeyB64?: string;
  dsaPrivateKeyB64?: string;
};

export default function DsaBox({ dsaPublicKeyB64, dsaPrivateKeyB64 }: Props) {
  const [message, setMessage] = useState("hello quantum world");
  const [signatureB64, setSignatureB64] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  async function sign() {
    try {
      setNote(null); setOk(null);
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ privateKeyB64: dsaPrivateKeyB64, message })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail || j?.error || res.statusText);
      setSignatureB64(j.signatureB64);
      setNote("Signed.");
    } catch (e: any) { setNote(e.message); }
  }

  async function verify() {
    try {
      setNote(null); setOk(null);
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicKeyB64: dsaPublicKeyB64, signatureB64, message })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail || j?.error || res.statusText);
      setOk(!!j.ok || !!j.valid);
    } catch (e: any) { setNote(e.message); }
  }

  return (
    <section style={{marginTop:24}}>
      <h3>Sign & Verify (ML-DSA)</h3>

      <label>Message</label>
      <textarea value={message} onChange={e => setMessage(e.target.value)} style={{width:"100%", height:44}} />

      <div style={{display:"flex", gap:8, marginTop:10}}>
        <button onClick={sign} disabled={!dsaPrivateKeyB64}>Sign with ML-DSA</button>
        <button onClick={verify} disabled={!dsaPublicKeyB64 || !signatureB64}>Verify</button>
      </div>

      <details style={{marginTop:10}}>
        <summary>Signature</summary>
        <textarea readOnly value={signatureB64} style={{width:"100%", height:60}} />
      </details>

      {ok !== null && <div style={{marginTop:10, color: ok ? "#0a0" : "#c33"}}>
        {ok ? "Signature is VALID" : "Signature is INVALID"}
      </div>}
      {note && <div style={{marginTop:10, color:"#09f"}}>{note}</div>}
    </section>
  );
}
