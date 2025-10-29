import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { deriveSol } from "./derivation";
import { unlockVault, promptForPassword } from "./vault";

async function main() {
  const rpc = process.env.SOL_RPC_URL || "https://api.devnet.solana.com";
  const to = process.env.TO!;
  const amount = Number(process.env.AMOUNT || "0"); // SOL
  const idx = Number(process.env.INDEX || 0);
  // Use vault if available, fallback to env
  const mnemonic = process.env.QS_MNEMONIC || await unlockVault(await promptForPassword());

  if (!mnemonic) throw new Error("Set QS_MNEMONIC or integrate vault unlock");
  if (!to || amount <= 0) throw new Error("Set TO and AMOUNT (>0)");

  const { keypair, address } = deriveSol(mnemonic, idx);
  const conn = new Connection(rpc, "confirmed");

  const ix = SystemProgram.transfer({
    fromPubkey: keypair.publicKey,
    toPubkey: new PublicKey(to),
    lamports: Math.round(amount * 1e9)
  });

  const tx = new Transaction().add(ix);
  const sig = await sendAndConfirmTransaction(conn, tx, [Keypair.fromSecretKey(keypair.secretKey)]);
  console.log(JSON.stringify({ from: address, to, amount, sig }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
