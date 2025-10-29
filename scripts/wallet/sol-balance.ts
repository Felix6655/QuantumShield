import { Connection, PublicKey } from "@solana/web3.js";
import { deriveSol } from "./derivation";
import { unlockVault, promptForPassword } from "./vault";

async function main() {
  const rpc = process.env.SOL_RPC_URL || "https://api.devnet.solana.com";
  const idx = Number(process.env.INDEX || 0);
  // Use vault if available, fallback to env
  const mnemonic = process.env.QS_MNEMONIC || await unlockVault(await promptForPassword());
  if (!mnemonic) throw new Error("Set QS_MNEMONIC or integrate vault unlock");

  const { address } = deriveSol(mnemonic, idx);
  const conn = new Connection(rpc, "confirmed");
  const lamports = await conn.getBalance(new PublicKey(address));
  console.log(JSON.stringify({ address, sol: lamports / 1e9 }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
