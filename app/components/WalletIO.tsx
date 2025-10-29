"use client";
import React, { useRef, useState } from "react";
import { WalletKeys } from "../lib/types";
import {
  saveEncryptedWalletToBrowser, unlockEncryptedWalletFromBrowser,
  hasEncryptedWalletInBrowser, wipeEncryptedWalletInBrowser
} from "../lib/walletStore";

type Props = {
  keys: WalletKeys | null;
  setKeys: (w: WalletKeys | null) => void;
};

export default function WalletIO({ keys, setKeys }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const saved = hasEncryptedWalletInBrowser();

  async function saveBrowser() {
    try {
      if (!keys) throw new Error("no keys");
      if (!pass || pass !== pass2) throw new Error("passphrase mismatch");
      await saveEncryptedWalletToBrowser(pass, keys);
      setMsg("Saved encrypted wallet to browser.");
    } catch (e:any) { setMsg(e.message); }
  }

  async function unlockBrowser() {
    try {
      const w = await unlockEncryptedWalletFromBrowser(pass);
      setKeys(w);
      setMsg("Unlocked from browser.");
    } catch (e:any) { setMsg(e.message); }
  }

  function wipeBrowser() {
    wipeEncryptedWalletInBrowser();
    setMsg("Browser wallet removed.");
  }

  function downloadFile() {
    try {
      if (!keys) throw new Error("no keys");
      const blob = new Blob([JSON.stringify(keys, null, 2)], { type:"application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "qskey.json";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e:any) { setMsg(e.message); }
  }

  function openFile() {
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const w = JSON.parse(String(r.result)) as WalletKeys;
        if (!w?.kem?.publicKey || !w?.dsa?.publicKey) throw new Error("bad file");
        setKeys(w);
        setMsg("Wallet imported from file.");
      } catch (err:any) { setMsg(err.message); }
    };
    r.readAsText(f);
    e.target.value = "";
  }

  return (
    <section style={{marginTop:24}}>
      <h3>Wallet Storage</h3>

      <div style={{display:"grid", gap:8, maxWidth:520}}>
        <input type="password" placeholder="passphrase"
          value={pass} onChange={e=>setPass(e.target.value)} />
        <input type="password" placeholder="confirm passphrase"
          value={pass2} onChange={e=>setPass2(e.target.value)} />

        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <button onClick={saveBrowser}  disabled={!keys}>Save to Browser (encrypted)</button>
          <button onClick={unlockBrowser}>Unlock from Browser</button>
          <button onClick={wipeBrowser}  disabled={!saved}>Wipe Browser Wallet</button>
        </div>

        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <button onClick={downloadFile} disabled={!keys}>Download .qskey.json</button>
          <button onClick={openFile}>Import .qskey.json</button>
          <input ref={fileRef} type="file" accept="application/json"
            onChange={onFile} style={{display:"none"}} />
        </div>

        {msg && <div>{msg}</div>}
      </div>
    </section>
  );
}
