import { Keypair } from "@solana/web3.js";
import { mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { english } from "@scure/bip39/wordlists/english";
import { derivePath } from "ed25519-hd-key";

/** Convert bytes to hex without Buffer (works in browser) */
function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Standard Solana derivation path: m/44'/501'/{account}'/{change}'  */
export function solanaDerivationPath(account = 0, change = 0) {
  return `m/44'/501'/${account}'/${change}'`;
}

/**
 * Derive a Solana Keypair from a BIP39 mnemonic using SLIP-0010 (ed25519).
 * Never store the mnemonic; keep it in memory only.
 */
export function keypairFromMnemonic(
  mnemonic: string,
  account = 0,
  change = 0,
  bip39Passphrase = ""
): Keypair {
  if (!validateMnemonic(mnemonic.trim(), english)) {
    throw new Error("Invalid BIP39 mnemonic.");
  }
  // 64-byte seed from mnemonic (+ optional BIP39 passphrase)
  const seed = mnemonicToSeedSync(mnemonic.trim(), bip39Passphrase); // Uint8Array
  const seedHex = bytesToHex(seed);

  // SLIP-0010 derivation for ed25519
  const path = solanaDerivationPath(account, change);
  const { key /* 32-byte */, chainCode } = derivePath(path, seedHex);

  // For Solana, the 32-byte private key seed is enough to create a Keypair
  const secretSeed = new Uint8Array(key); // works in browser too
  return Keypair.fromSeed(secretSeed);
}
