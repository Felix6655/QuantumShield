"use client";
import { type ChangeEvent, useRef, useState } from "react";

import { buildQsKey, openQsKey, type QsKeyFile } from "../../lib/qskey";
import { clearBrowserWallet, loadWalletFromBrowser, saveWalletToBrowser } from "../../lib/storage";

type Keys = { scheme: string; publicKey: string; privateKey: string };

export default function LockBox({
	kem,
	dsa,
	onUnlock,
}: { kem: Keys | null; dsa: Keys | null; onUnlock: (next: { kem: Keys; dsa: Keys }) => void }) {
	const [p1, setP1] = useState("");
	const [p2, setP2] = useState("");
	const [note, setNote] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	const match = p1.length > 0 && p1 === p2;

	async function saveToBrowser() {
		try {
			if (!kem || !dsa) return setNote("Generate keys first.");
			if (!match) return setNote("Passphrases do not match.");
			const qs = await buildQsKey(p1, kem, dsa);
			saveWalletToBrowser(qs);
			setNote("Encrypted wallet saved to this browser.");
		} catch (e: any) {
			setNote("Save failed: " + e.message);
		}
	}

	async function downloadEncrypted() {
		try {
			if (!kem || !dsa) return setNote("Generate keys first.");
			if (!match) return setNote("Passphrases do not match.");
			const qs = await buildQsKey(p1, kem, dsa);
			const blob = new Blob([JSON.stringify(qs, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "quantumshield.qskey.json";
			a.rel = "noopener";
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			setNote("Encrypted wallet downloaded.");
		} catch (e: any) {
			setNote("Download failed: " + e.message);
		}
	}

	async function unlockFromBrowser() {
		try {
			const qs = loadWalletFromBrowser();
			if (!qs) return setNote("No wallet found in this browser.");
			const pass = prompt("Enter passphrase to unlock your browser wallet:");
			if (!pass) return;
			const { kem, dsa } = await openQsKey(qs, pass);
			onUnlock({ kem, dsa });
			setNote("Wallet unlocked from browser.");
		} catch (e: any) {
			setNote("Unlock failed: " + e.message);
		}
	}

	function wipeBrowserWallet() {
		clearBrowserWallet();
		setNote("Browser wallet cleared.");
	}

	function triggerImport() {
		fileRef.current?.click();
	}

	async function onImportChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		try {
			const text = await file.text();
			const qs = JSON.parse(text) as QsKeyFile;
			const pass = prompt("Enter passphrase for this wallet:");
			if (!pass) return;
			const { kem, dsa } = await openQsKey(qs, pass);
			onUnlock({ kem, dsa });
			saveWalletToBrowser(qs);
			setNote("Wallet imported, unlocked, and saved to browser.");
		} catch (err: any) {
			setNote("Import failed: " + (err?.message || String(err)));
		}
	}

	return (
		<div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #2a2a3d" }}>
			<h4 style={{ marginBottom: 8 }}>Protect your private keys with a passphrase</h4>
			<div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
				<input
					type="password"
					placeholder="Passphrase"
					value={p1}
					onChange={(e) => setP1(e.target.value)}
					style={{
						background: "transparent",
						color: "inherit",
						border: "1px solid #3b3b55",
						borderRadius: 10,
						padding: "10px",
					}}
				/>
				<input
					type="password"
					placeholder="Confirm passphrase"
					value={p2}
					onChange={(e) => setP2(e.target.value)}
					style={{
						background: "transparent",
						color: "inherit",
						border: "1px solid #3b3b55",
						borderRadius: 10,
						padding: "10px",
					}}
				/>

				<div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
					<button
						onClick={saveToBrowser}
						disabled={!kem || !dsa || !match}
						style={{
							padding: "0.6rem 0.9rem",
							border: "1px solid #3b3b55",
							borderRadius: 10,
							opacity: !kem || !dsa || !match ? 0.5 : 1,
						}}
					>
						Save Encrypted Wallet to Browser
					</button>
					<button
						onClick={downloadEncrypted}
						disabled={!kem || !dsa || !match}
						style={{
							padding: "0.6rem 0.9rem",
							border: "1px solid #3b3b55",
							borderRadius: 10,
							opacity: !kem || !dsa || !match ? 0.5 : 1,
						}}
					>
						Download Encrypted Wallet
					</button>
					<button
						onClick={unlockFromBrowser}
						style={{ padding: "0.6rem 0.9rem", border: "1px solid #3b3b55", borderRadius: 10 }}
					>
						Unlock from Browser
					</button>
					<button
						onClick={wipeBrowserWallet}
						style={{ padding: "0.6rem 0.9rem", border: "1px solid #3b3b55", borderRadius: 10 }}
					>
						Wipe Browser Wallet
					</button>
					<button
						onClick={triggerImport}
						style={{ padding: "0.6rem 0.9rem", border: "1px solid #3b3b55", borderRadius: 10 }}
					>
						Import Encrypted Wallet
					</button>
					<input
						ref={fileRef}
						type="file"
						accept=".json,application/json"
						onChange={onImportChange}
						style={{ display: "none" }}
					/>
				</div>
				{!match && (p1 || p2) && <div style={{ color: "#ff8a8a", fontSize: 14 }}>Passphrases do not match</div>}
				{note && <div style={{ color: "#f4d06f" }}>{note}</div>}
			</div>
		</div>
	);
}

