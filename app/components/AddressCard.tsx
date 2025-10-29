"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

import { qsAddressFromDSAPub } from "../../lib/address";

type AddressCardProps = {
  dsaPubB64: string;
};

export default function AddressCard({ dsaPubB64 }: AddressCardProps) {
  const [addr, setAddr] = useState<string>("");
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const derived = await qsAddressFromDSAPub(dsaPubB64);
        if (cancelled) return;
        setAddr(derived);
        const { toDataURL } = await import("qrcode");
        if (cancelled) return;
        setQr(await toDataURL(derived, { margin: 1, scale: 5 }));
      } catch (error) {
        console.error("Address derivation failed", error);
        if (!cancelled) {
          setAddr("");
          setQr("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dsaPubB64]);

  async function copy() {
    if (!addr) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(addr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.warn("Clipboard copy failed", error);
    }
  }

  function downloadQR() {
    if (!qr) return;
    if (typeof window === "undefined") return;
    const link = document.createElement("a");
    link.href = qr;
    link.download = "qs-address.png";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  if (!addr) return null;

  return (
    <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #2a2a3d" }}>
      <h4 style={{ marginBottom: 8 }}>Your QuantumShield Address</h4>
      <div style={{ wordBreak: "break-all", marginBottom: 10 }}>{addr}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {qr && (
          <Image
            src={qr}
            alt="QuantumShield address QR"
            width={140}
            height={140}
            unoptimized
            style={{ borderRadius: 12, border: "1px solid #3b3b55" }}
          />
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={copy}
            style={{ padding: "0.5rem 0.9rem", border: "1px solid #3b3b55", borderRadius: 10 }}
          >
            {copied ? "Copied" : "Copy Address"}
          </button>
          <button
            type="button"
            onClick={downloadQR}
            style={{ padding: "0.5rem 0.9rem", border: "1px solid #3b3b55", borderRadius: 10 }}
          >
            Download QR
          </button>
        </div>
      </div>
      <p style={{ opacity: 0.8, marginTop: 8, fontSize: 13 }}>
        Bech32 format with hrp <code>qs</code>. Address is derived from your ML-DSA public key.
      </p>
    </div>
  );
}
