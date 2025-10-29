import * as bip39 from "bip39";
import { Mnemonic, HDNodeWallet, ethers } from "ethers";
import { derivePath } from "ed25519-hd-key";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

// EVM: m/44'/60'/0'/0/index
export function deriveEvm(mnemonic: string, index = 0) {
  const m = Mnemonic.fromPhrase(mnemonic);
  const path = `m/44'/60'/0'/0/${index}`;
  const w = HDNodeWallet.fromMnemonic(m, path);
  return {
    path,
    address: w.address,    // 0x...
    privateKey: w.privateKey, // 0x... (do NOT log in prod)
    wallet: w,
  };
}

// Solana: m/44'/501'/index'/0'
export function deriveSol(mnemonic: string, index = 0) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const path = `m/44'/501'/${index}'/0'`;
  const { key } = derivePath(path, seed.toString("hex"));
  const kp = Keypair.fromSeed(key);
  const pub = kp.publicKey.toBase58();
  return {
    path,
    address: pub,
    secretKey: bs58.encode(kp.secretKey), // base58 (do NOT log in prod)
    keypair: kp,
  };
}
